"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Copy,
  DoorOpen,
  Download,
  Grid3X3,
  Lock,
  LockOpen,
  Minus,
  MousePointer2,
  Plus,
  Printer,
  Redo2,
  RotateCw,
  Save,
  Search,
  Square,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
} from "lucide-react";
import {
  CUSTOM_TYPE_LABELS,
  KIND_LABELS,
  MIN_ITEM_SIZE,
  PLAN_STORAGE_KEY,
  STATUS_LABELS,
  clamp,
  clampGeometry,
  colorForArea,
  createInitialPlan,
  defaultSizeForKind,
  findOpenPosition,
  getTargetGeometry,
  normalizeForSearch,
  parsePlanDocument,
  snap,
  updateTargetGeometry,
  type CustomElement,
  type CustomElementType,
  type FloorAssetKind,
  type FloorInventoryItem,
  type Geometry,
  type PlanDocument,
  type PlanTarget,
} from "./plan-model";
import styles from "./FloorPlanEditor.module.css";
import type {
  CSSProperties,
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

export type { FloorInventoryItem } from "./plan-model";

type HistoryState = {
  past: PlanDocument[];
  present: PlanDocument;
  future: PlanDocument[];
};

type HistoryAction =
  | { type: "load"; plan: PlanDocument }
  | { type: "commit"; plan: PlanDocument }
  | { type: "undo" }
  | { type: "redo" };

type PointerInteractionItem = {
  target: PlanTarget;
  initial: Geometry;
  node: HTMLElement;
  preview: Geometry;
};

type PointerInteraction = {
  pointerId: number;
  mode: "move" | "resize";
  items: PointerInteractionItem[];
  startClientX: number;
  startClientY: number;
  before: PlanDocument;
  previewPlan: PlanDocument;
  snapSize: number;
  changed: boolean;
};

type MarqueeInteraction = {
  pointerId: number;
  additive: boolean;
  originX: number;
  originY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SaveState = "loading" | "saving" | "saved" | "error";
type InventoryKindFilter = "all" | FloorAssetKind;

const MAX_HISTORY = 50;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 1.75;
const MARQUEE_DRAG_THRESHOLD = 4;

const PANEL_CLASS =
  "border-[3px] border-white/15 bg-[#0c0c0c] shadow-[5px_5px_0_rgba(0,0,0,0.55)]";
const TOOL_BUTTON =
  "inline-flex min-h-10 items-center justify-center gap-2 border-2 border-white/15 bg-white/[0.035] px-3 text-[10px] font-black uppercase tracking-[0.11em] text-white/65 transition hover:border-[#d8ff3e]/60 hover:text-white focus-visible:border-[#d8ff3e] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30";
const FIELD_CLASS =
  "min-h-10 w-full border-2 border-white/15 bg-black/35 px-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#d8ff3e] disabled:cursor-not-allowed disabled:opacity-35";

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "load":
      return { past: [], present: action.plan, future: [] };
    case "commit":
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
        present: action.plan,
        future: [],
      };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, MAX_HISTORY),
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
  }
}

function targetsMatch(a: PlanTarget | null, b: PlanTarget) {
  return a?.kind === b.kind && a.id === b.id;
}

function targetKey(target: PlanTarget) {
  return `${target.kind}:${target.id}`;
}

function parseTargetKey(key: string): PlanTarget {
  const separatorIndex = key.indexOf(":");
  const kind = key.slice(0, separatorIndex);
  const id = key.slice(separatorIndex + 1);
  return kind === "asset" ? { kind: "asset", id } : { kind: "custom", id };
}

function rectsIntersect(a: Geometry, b: Geometry) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function domIdFor(target: PlanTarget) {
  return `floor-plan-${target.kind}-${target.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function targetLocked(plan: PlanDocument, target: PlanTarget) {
  if (target.kind === "asset") return plan.placements[target.id]?.locked ?? false;
  return plan.customElements.find((element) => element.id === target.id)?.locked ?? false;
}

function geometryChanged(a: Geometry, b: Geometry) {
  return a.x !== b.x || a.y !== b.y || a.width !== b.width || a.height !== b.height;
}

function targetLabel(
  target: PlanTarget,
  plan: PlanDocument,
  inventoryById: Map<string, FloorInventoryItem>,
) {
  if (target.kind === "asset") {
    const asset = inventoryById.get(target.id);
    const placement = plan.placements[target.id];
    return placement?.label || asset?.name || target.id;
  }
  return plan.customElements.find((element) => element.id === target.id)?.label ?? "Elemento";
}

function statusDotClass(status: FloorInventoryItem["status"]) {
  if (status === "bueno") return "bg-emerald-400";
  if (status === "fuera_de_servicio") return "bg-red-400";
  if (status === "pendiente") return "bg-amber-300";
  return "bg-white/35";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createCustomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shortPlateLabel(name: string) {
  return name.match(/\d+(?:\.\d+)?\s*lb/i)?.[0] ?? "Disco";
}

export default function FloorPlanEditor({ inventory }: { inventory: FloorInventoryItem[] }) {
  const initialPlan = useMemo(() => createInitialPlan(inventory), [inventory]);
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialPlan,
    future: [],
  });
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [marqueeRect, setMarqueeRect] = useState<Geometry | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<InventoryKindFilter>("all");
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageTimerRef = useRef<number | null>(null);
  const interactionRef = useRef<PointerInteraction | null>(null);
  const marqueeRef = useRef<MarqueeInteraction | null>(null);
  const presentRef = useRef(history.present);
  const historyRef = useRef(history);
  const hydratedRef = useRef(false);

  presentRef.current = history.present;
  historyRef.current = history;

  const selectedTargets = useMemo(
    () => Array.from(selectedKeys, parseTargetKey),
    [selectedKeys],
  );
  const selected = selectedTargets.length === 1 ? selectedTargets[0] : null;
  const isMultiSelected = selectedTargets.length > 1;

  const inventoryById = useMemo(
    () => new Map(inventory.map((asset) => [asset.id, asset])),
    [inventory],
  );
  const areas = useMemo(() => Array.from(new Set(inventory.map((asset) => asset.area))), [inventory]);
  const placedIds = useMemo(
    () => new Set(Object.keys(history.present.placements)),
    [history.present.placements],
  );
  const placedCount = inventory.reduce((count, asset) => count + (placedIds.has(asset.id) ? 1 : 0), 0);
  const missingCount = inventory.length - placedCount;

  const filteredInventory = useMemo(() => {
    const query = normalizeForSearch(search.trim());
    return inventory.filter((asset) => {
      if (areaFilter !== "all" && asset.area !== areaFilter) return false;
      if (kindFilter !== "all" && asset.kind !== kindFilter) return false;
      if (!query) return true;
      return normalizeForSearch(
        `${asset.id} ${asset.code} ${asset.name} ${asset.area} ${asset.location}`,
      ).includes(query);
    });
  }, [areaFilter, inventory, kindFilter, search]);

  const selectedAsset =
    selected?.kind === "asset" ? inventoryById.get(selected.id) ?? null : null;
  const selectedPlacement =
    selected?.kind === "asset" ? history.present.placements[selected.id] ?? null : null;
  const selectedCustom =
    selected?.kind === "custom"
      ? history.present.customElements.find((element) => element.id === selected.id) ?? null
      : null;
  const selectedGeometry = selected
    ? getTargetGeometry(history.present, selected)
    : null;
  const selectedLocked = selected ? targetLocked(history.present, selected) : false;
  const keyboardTarget: PlanTarget | null =
    selectedTargets[0] ??
    (() => {
      const firstPlaced = inventory.find((asset) => placedIds.has(asset.id));
      return firstPlaced ? { kind: "asset", id: firstPlaced.id } : null;
    })();

  const planItems = useMemo(() => {
    const items: Array<{ target: PlanTarget; geometry: Geometry }> = [];
    for (const element of history.present.customElements) {
      items.push({ target: { kind: "custom", id: element.id }, geometry: element });
    }
    for (const asset of inventory) {
      const placement = history.present.placements[asset.id];
      if (placement) items.push({ target: { kind: "asset", id: asset.id }, geometry: placement });
    }
    return items;
  }, [history.present.customElements, history.present.placements, inventory]);

  const announce = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => setMessage(""), 2600);
  }, []);

  useEffect(
    () => () => {
      if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    },
    [],
  );

  const commitPlan = useCallback((plan: PlanDocument) => {
    if (plan === presentRef.current) return;
    presentRef.current = plan;
    dispatch({ type: "commit", plan });
  }, []);

  const undo = useCallback(() => {
    const previous = historyRef.current.past.at(-1);
    if (!previous) return;
    presentRef.current = previous;
    dispatch({ type: "undo" });
    announce("Cambio deshecho");
  }, [announce]);

  const redo = useCallback(() => {
    const next = historyRef.current.future[0];
    if (!next) return;
    presentRef.current = next;
    dispatch({ type: "redo" });
    announce("Cambio rehecho");
  }, [announce]);

  const removeTargets = useCallback(
    (targets: PlanTarget[]) => {
      const current = presentRef.current;
      const removable = targets.filter((target) => !targetLocked(current, target));
      if (!removable.length) {
        announce(
          targets.length > 1
            ? "Desbloqueá los elementos antes de quitarlos"
            : "Desbloqueá el elemento antes de quitarlo",
        );
        return;
      }
      let next = current;
      let removedAssets = 0;
      let removedCustom = 0;
      for (const target of removable) {
        if (target.kind === "asset") {
          if (!next.placements[target.id]) continue;
          const placements = { ...next.placements };
          delete placements[target.id];
          next = { ...next, placements };
          removedAssets += 1;
        } else {
          if (!next.customElements.some((element) => element.id === target.id)) continue;
          next = {
            ...next,
            customElements: next.customElements.filter((element) => element.id !== target.id),
          };
          removedCustom += 1;
        }
      }
      commitPlan(next);
      if (removedAssets && !removedCustom) {
        announce(removedAssets > 1 ? `${removedAssets} activos devueltos a Sin ubicar` : "Activo devuelto a Sin ubicar");
      } else if (removedCustom && !removedAssets) {
        announce(removedCustom > 1 ? `${removedCustom} elementos eliminados` : "Elemento eliminado");
      } else if (removedAssets || removedCustom) {
        announce("Selección eliminada del plano");
      }
      setSelectedKeys((prev) => {
        const nextKeys = new Set(prev);
        for (const target of removable) nextKeys.delete(targetKey(target));
        return nextKeys;
      });
    },
    [announce, commitPlan],
  );

  const removeTarget = useCallback((target: PlanTarget) => removeTargets([target]), [removeTargets]);

  const toggleLockForTargets = useCallback(
    (targets: PlanTarget[], locked: boolean) => {
      let next = presentRef.current;
      for (const target of targets) {
        if (target.kind === "asset") {
          const placement = next.placements[target.id];
          if (!placement) continue;
          next = { ...next, placements: { ...next.placements, [target.id]: { ...placement, locked } } };
        } else {
          next = {
            ...next,
            customElements: next.customElements.map((element) =>
              element.id === target.id ? { ...element, locked } : element,
            ),
          };
        }
      }
      commitPlan(next);
      announce(locked ? "Selección fijada" : "Selección liberada");
    },
    [announce, commitPlan],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      const editingText =
        element?.tagName === "INPUT" || element?.tagName === "TEXTAREA" || element?.tagName === "SELECT";
      const modifier = event.ctrlKey || event.metaKey;

      if (editingText) return;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === "Escape") {
        setSelectedKeys(new Set());
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedTargets.length) {
        event.preventDefault();
        removeTargets(selectedTargets);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, removeTargets, selectedTargets, undo]);

  useEffect(() => {
    let plan = initialPlan;
    try {
      const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        const candidate = isObject(parsed) && "plan" in parsed ? parsed.plan : parsed;
        plan = parsePlanDocument(candidate, inventory) ?? initialPlan;
        if (isObject(parsed) && typeof parsed.savedAt === "string") setSavedAt(parsed.savedAt);
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
    presentRef.current = plan;
    dispatch({ type: "load", plan });
    hydratedRef.current = true;
    setHydrated(true);
  }, [initialPlan, inventory]);

  useEffect(() => {
    const flushLatestPlan = () => {
      if (!hydratedRef.current) return;
      try {
        window.localStorage.setItem(
          PLAN_STORAGE_KEY,
          JSON.stringify({ savedAt: new Date().toISOString(), plan: presentRef.current }),
        );
      } catch {
        // El guardado visible reporta errores; al desmontar no actualizamos estado.
      }
    };

    window.addEventListener("pagehide", flushLatestPlan);
    return () => {
      window.removeEventListener("pagehide", flushLatestPlan);
      flushLatestPlan();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      try {
        const timestamp = new Date().toISOString();
        window.localStorage.setItem(
          PLAN_STORAGE_KEY,
          JSON.stringify({ savedAt: timestamp, plan: history.present }),
        );
        setSavedAt(timestamp);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 260);
    return () => window.clearTimeout(timeout);
  }, [history.present, hydrated]);

  const focusTarget = useCallback((target: PlanTarget) => {
    setSelectedKeys(new Set([targetKey(target)]));
    const geometry = getTargetGeometry(presentRef.current, target);
    const viewport = viewportRef.current;
    if (!geometry || !viewport) return;
    viewport.scrollTo({
      left: Math.max(0, (geometry.x + geometry.width / 2) * zoom - viewport.clientWidth / 2),
      top: Math.max(0, (geometry.y + geometry.height / 2) * zoom - viewport.clientHeight / 2),
      behavior: "smooth",
    });
    window.requestAnimationFrame(() => document.getElementById(domIdFor(target))?.focus());
  }, [zoom]);

  const addAsset = useCallback(
    (asset: FloorInventoryItem, shouldFocus = true) => {
      const current = presentRef.current;
      if (current.placements[asset.id]) {
        if (shouldFocus) focusTarget({ kind: "asset", id: asset.id });
        return current;
      }

      const size = defaultSizeForKind(asset.kind);
      const open = findOpenPosition(current, size);
      const next: PlanDocument = {
        ...current,
        canvas: { ...current.canvas, height: open.requiredHeight },
        placements: {
          ...current.placements,
          [asset.id]: {
            x: open.x,
            y: open.y,
            width: size.width,
            height: size.height,
            locked: false,
          },
        },
      };
      commitPlan(next);
      if (shouldFocus) {
        focusTarget({ kind: "asset", id: asset.id });
        announce(`${asset.name} ubicado`);
      }
      return next;
    },
    [announce, commitPlan, focusTarget],
  );

  const addAllMissing = () => {
    let next = presentRef.current;
    let added = 0;
    for (const asset of inventory) {
      if (next.placements[asset.id]) continue;
      const size = defaultSizeForKind(asset.kind);
      const open = findOpenPosition(next, size);
      next = {
        ...next,
        canvas: { ...next.canvas, height: open.requiredHeight },
        placements: {
          ...next.placements,
          [asset.id]: {
            x: open.x,
            y: open.y,
            width: size.width,
            height: size.height,
            locked: false,
          },
        },
      };
      added += 1;
    }
    if (!added) return;
    commitPlan(next);
    announce(`${added} ${added === 1 ? "activo ubicado" : "activos ubicados"}`);
  };

  const addCustomElement = (type: CustomElementType) => {
    const defaults: Record<CustomElementType, Pick<CustomElement, "label" | "color" | "width" | "height">> = {
      area: { label: "Nueva área", color: "#22d3ee", width: 360, height: 220 },
      obstacle: { label: "Columna", color: "#fb923c", width: 60, height: 60 },
      access: { label: "Acceso", color: "#f8fafc", width: 120, height: 44 },
      equipment: { label: "Equipo manual", color: "#d8ff3e", width: 92, height: 62 },
    };
    const current = presentRef.current;
    const values = defaults[type];
    const open = findOpenPosition(current, values);
    const element: CustomElement = {
      id: createCustomId(),
      type,
      label: values.label,
      color: values.color,
      x: open.x,
      y: open.y,
      width: values.width,
      height: values.height,
      locked: false,
    };
    const next = {
      ...current,
      canvas: { ...current.canvas, height: open.requiredHeight },
      customElements: [...current.customElements, element],
    };
    commitPlan(next);
    focusTarget({ kind: "custom", id: element.id });
    announce(`${CUSTOM_TYPE_LABELS[type]} agregado`);
  };

  const beginPointerInteraction = (
    event: ReactPointerEvent<HTMLElement>,
    target: PlanTarget,
    mode: PointerInteraction["mode"],
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const plan = presentRef.current;
    const key = targetKey(target);

    // Shift+clic agrega o quita este bloque del grupo seleccionado sin
    // tocar el resto; un clic normal reemplaza la selección, salvo que el
    // bloque ya sea parte de un grupo (para poder arrastrarlo sin perderlo).
    let nextKeys = selectedKeys;
    if (mode === "move" && event.shiftKey) {
      nextKeys = new Set(selectedKeys);
      if (nextKeys.has(key)) nextKeys.delete(key);
      else nextKeys.add(key);
      setSelectedKeys(nextKeys);
      if (!nextKeys.has(key)) return;
    } else if (!(mode === "move" && selectedKeys.size > 1 && selectedKeys.has(key))) {
      nextKeys = new Set([key]);
      setSelectedKeys(nextKeys);
    }

    const isGroupDrag = mode === "move" && nextKeys.size > 1 && nextKeys.has(key);
    const targets = isGroupDrag ? Array.from(nextKeys, parseTargetKey) : [target];

    const items: PointerInteractionItem[] = [];
    for (const groupTarget of targets) {
      const initial = getTargetGeometry(plan, groupTarget);
      if (!initial || targetLocked(plan, groupTarget)) continue;
      const node = document.getElementById(domIdFor(groupTarget));
      if (!node) continue;
      items.push({ target: groupTarget, initial, node, preview: initial });
    }
    if (!items.length) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      pointerId: event.pointerId,
      mode,
      items,
      startClientX: event.clientX,
      startClientY: event.clientY,
      before: plan,
      previewPlan: plan,
      snapSize: snapEnabled ? plan.canvas.gridSize : 1,
      changed: false,
    };
  };

  const movePointerInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    const active = interactionRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = (event.clientX - active.startClientX) / zoom;
    const dy = (event.clientY - active.startClientY) / zoom;
    let next = active.before;
    let anyChanged = false;

    for (const item of active.items) {
      let geometry: Geometry;
      if (active.mode === "move") {
        geometry = {
          ...item.initial,
          x: snap(item.initial.x + dx, active.snapSize),
          y: snap(item.initial.y + dy, active.snapSize),
        };
      } else {
        geometry = {
          ...item.initial,
          width: clamp(
            snap(item.initial.width + dx, active.snapSize),
            MIN_ITEM_SIZE,
            active.before.canvas.width - item.initial.x,
          ),
          height: clamp(
            snap(item.initial.height + dy, active.snapSize),
            MIN_ITEM_SIZE,
            active.before.canvas.height - item.initial.y,
          ),
        };
      }

      next = updateTargetGeometry(next, item.target, geometry);
      const applied = getTargetGeometry(next, item.target);
      if (!applied) continue;
      if (geometryChanged(item.initial, applied)) anyChanged = true;
      item.preview = applied;
      item.node.style.left = `${applied.x}px`;
      item.node.style.top = `${applied.y}px`;
      item.node.style.width = `${applied.width}px`;
      item.node.style.height = `${applied.height}px`;
    }

    active.previewPlan = next;
    active.changed = anyChanged;
  };

  const endPointerInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    const active = interactionRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (active.changed) {
      commitPlan(active.previewPlan);
      announce(
        active.items.length > 1
          ? `${active.items.length} elementos actualizados`
          : `${targetLabel(active.items[0].target, active.before, inventoryById)} actualizado`,
      );
    }
  };

  const cancelPointerInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    const active = interactionRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    for (const item of active.items) {
      item.node.style.left = `${item.initial.x}px`;
      item.node.style.top = `${item.initial.y}px`;
      item.node.style.width = `${item.initial.width}px`;
      item.node.style.height = `${item.initial.height}px`;
    }
  };

  const beginMarquee = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    const node = canvasRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const originX = (event.clientX - rect.left) / zoom;
    const originY = (event.clientY - rect.top) / zoom;
    node.setPointerCapture(event.pointerId);
    marqueeRef.current = {
      pointerId: event.pointerId,
      additive: event.shiftKey,
      originX,
      originY,
      x: originX,
      y: originY,
      width: 0,
      height: 0,
    };
    setMarqueeRect({ x: originX, y: originY, width: 0, height: 0 });
  };

  const updateMarquee = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = marqueeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const node = canvasRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const currentX = (event.clientX - rect.left) / zoom;
    const currentY = (event.clientY - rect.top) / zoom;
    active.x = Math.min(active.originX, currentX);
    active.y = Math.min(active.originY, currentY);
    active.width = Math.abs(currentX - active.originX);
    active.height = Math.abs(currentY - active.originY);
    setMarqueeRect({ x: active.x, y: active.y, width: active.width, height: active.height });
  };

  const finishMarquee = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = marqueeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    marqueeRef.current = null;
    setMarqueeRect(null);
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    const dragged = active.width > MARQUEE_DRAG_THRESHOLD || active.height > MARQUEE_DRAG_THRESHOLD;
    if (!dragged) {
      if (!active.additive) setSelectedKeys(new Set());
      return;
    }
    const box: Geometry = { x: active.x, y: active.y, width: active.width, height: active.height };
    const matched = planItems.filter((item) => rectsIntersect(item.geometry, box));
    setSelectedKeys((prev) => {
      const nextKeys = active.additive ? new Set(prev) : new Set<string>();
      for (const item of matched) nextKeys.add(targetKey(item.target));
      return nextKeys;
    });
    if (matched.length) {
      announce(matched.length === 1 ? "1 elemento seleccionado" : `${matched.length} elementos seleccionados`);
    }
  };

  const cancelMarquee = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = marqueeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    marqueeRef.current = null;
    setMarqueeRect(null);
  };

  const nudgeTarget = (target: PlanTarget, dx: number, dy: number) => {
    const current = presentRef.current;
    const geometry = getTargetGeometry(current, target);
    if (!geometry || targetLocked(current, target)) return;
    commitPlan(updateTargetGeometry(current, target, { ...geometry, x: geometry.x + dx, y: geometry.y + dy }));
  };

  const onItemKeyDown = (event: ReactKeyboardEvent<HTMLElement>, target: PlanTarget) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      setSelectedKeys(new Set([targetKey(target)]));
      return;
    }
    const baseStep = snapEnabled ? history.present.canvas.gridSize : 1;
    const step = baseStep * (event.shiftKey ? 5 : 1);
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      nudgeTarget(target, direction[0], direction[1]);
    }
  };

  const updateSelectedGeometry = (field: keyof Geometry, rawValue: string) => {
    if (!selected || !selectedGeometry) return;
    if (targetLocked(history.present, selected)) return;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const boundedValue =
      field === "width"
        ? clamp(value, MIN_ITEM_SIZE, history.present.canvas.width - selectedGeometry.x)
        : field === "height"
          ? clamp(value, MIN_ITEM_SIZE, history.present.canvas.height - selectedGeometry.y)
          : value;
    commitPlan(
      updateTargetGeometry(history.present, selected, {
        ...selectedGeometry,
        [field]: boundedValue,
      }),
    );
  };

  const updateSelectedLabel = (label: string) => {
    if (!selected) return;
    const current = history.present;
    if (selected.kind === "asset") {
      const placement = current.placements[selected.id];
      if (!placement) return;
      commitPlan({
        ...current,
        placements: {
          ...current.placements,
          [selected.id]: { ...placement, ...(label ? { label } : { label: undefined }) },
        },
      });
      return;
    }
    commitPlan({
      ...current,
      customElements: current.customElements.map((element) =>
        element.id === selected.id ? { ...element, label } : element,
      ),
    });
  };

  const toggleSelectedLock = () => {
    if (!selected) return;
    const current = history.present;
    if (selected.kind === "asset") {
      const placement = current.placements[selected.id];
      if (!placement) return;
      commitPlan({
        ...current,
        placements: {
          ...current.placements,
          [selected.id]: { ...placement, locked: !placement.locked },
        },
      });
      return;
    }
    commitPlan({
      ...current,
      customElements: current.customElements.map((element) =>
        element.id === selected.id ? { ...element, locked: !element.locked } : element,
      ),
    });
  };

  const rotateSelected = () => {
    if (!selected || !selectedGeometry) return;
    if (targetLocked(history.present, selected)) return;
    commitPlan(
      updateTargetGeometry(history.present, selected, {
        ...selectedGeometry,
        width: selectedGeometry.height,
        height: selectedGeometry.width,
      }),
    );
    announce("Bloque girado 90°");
  };

  const duplicateSelectedCustom = () => {
    if (!selectedCustom) return;
    const current = history.present;
    const offset = current.canvas.gridSize * 2;
    const geometry = clampGeometry(
      {
        ...selectedCustom,
        x:
          selectedCustom.x + selectedCustom.width + offset <= current.canvas.width
            ? selectedCustom.x + offset
            : selectedCustom.x - offset,
        y:
          selectedCustom.y + selectedCustom.height + offset <= current.canvas.height
            ? selectedCustom.y + offset
            : selectedCustom.y - offset,
      },
      current,
    );
    const element: CustomElement = {
      ...selectedCustom,
      ...geometry,
      id: createCustomId(),
      label: `${selectedCustom.label} copia`,
      locked: false,
    };
    const next = { ...current, customElements: [...current.customElements, element] };
    commitPlan(next);
    focusTarget({ kind: "custom", id: element.id });
    announce("Elemento duplicado");
  };

  const updateCanvas = (field: "width" | "height" | "gridSize", rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const current = history.present;
    const canvas = {
      ...current.canvas,
      [field]:
        field === "gridSize"
          ? clamp(Math.round(value), 5, 100)
          : clamp(Math.round(value), field === "width" ? 900 : 700, 5000),
    };
    const shell = { ...current, canvas };
    const placements = Object.fromEntries(
      Object.entries(current.placements).map(([id, placement]) => [
        id,
        { ...placement, ...clampGeometry(placement, shell) },
      ]),
    );
    const customElements = current.customElements.map((element) => ({
      ...element,
      ...clampGeometry(element, shell),
    }));
    commitPlan({ ...shell, placements, customElements });
  };

  const fitCanvas = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextZoom = Math.min(
      1,
      (viewport.clientWidth - 28) / history.present.canvas.width,
      (viewport.clientHeight - 28) / history.present.canvas.height,
    );
    setZoom(clamp(Number(nextZoom.toFixed(2)), MIN_ZOOM, MAX_ZOOM));
    viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  };

  const exportPlan = () => {
    const payload = {
      schema: "xtreme-gym-floor-plan",
      exportedAt: new Date().toISOString(),
      inventoryCount: inventory.length,
      plan: history.present,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `plano-xtreme-gym-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    announce("Plano exportado en JSON");
  };

  const importPlan = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) {
      announce("El archivo supera el máximo de 2 MB");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const candidate = isObject(parsed) && "plan" in parsed ? parsed.plan : parsed;
      const plan = parsePlanDocument(candidate, inventory);
      if (!plan) throw new Error("invalid-plan");
      if (!window.confirm("¿Reemplazar el plano actual con el archivo importado? Podés deshacer después.")) {
        return;
      }
      commitPlan(plan);
      setSelectedKeys(new Set());
      announce("Plano importado");
    } catch {
      announce("No pude leer ese archivo de plano");
    }
  };

  const resetPlan = () => {
    if (!window.confirm(`¿Restablecer la distribución inicial de los ${inventory.length} activos?`)) return;
    commitPlan(createInitialPlan(inventory));
    setSelectedKeys(new Set());
    announce("Plano restablecido desde el inventario");
  };

  const printScale = Math.min(
    1,
    1450 / history.present.canvas.width,
    920 / history.present.canvas.height,
  );
  const canvasFrameStyle = {
    width: history.present.canvas.width * zoom,
    height: history.present.canvas.height * zoom,
    "--print-frame-width": `${history.present.canvas.width * printScale}px`,
    "--print-frame-height": `${history.present.canvas.height * printScale}px`,
  } as CSSProperties;
  const canvasStyle = {
    width: history.present.canvas.width,
    height: history.present.canvas.height,
    transform: `scale(${zoom})`,
    "--grid-size": `${history.present.canvas.gridSize}px`,
    "--major-grid-size": `${history.present.canvas.gridSize * 5}px`,
    "--print-scale": printScale,
  } as CSSProperties;

  return (
    <section className={`${styles.editorPage} mx-auto w-full max-w-[1900px] px-3 py-6 sm:px-5 lg:px-7`}>
      <header className={`${styles.pageHeader} mb-5`}>
        <Link
          href="/maquinas"
          className="inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/50 transition hover:text-[#d8ff3e] focus-visible:text-[#d8ff3e] focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" /> Catálogo de máquinas
        </Link>
        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="border-2 border-[#d8ff3e]/45 bg-[#d8ff3e]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#eaff93]">
                Piso 1
              </span>
              <span className="border-2 border-white/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
                Borrador esquemático
              </span>
            </div>
            <h1 className="mt-4 max-w-4xl text-[clamp(2.2rem,5vw,4.8rem)] font-black uppercase leading-[0.84] tracking-[-0.04em]">
              Plano editable del gimnasio
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/58 sm:text-base">
              Los {inventory.length} activos de la auditoría ya están agrupados por área. Arrastrá, cambiá el tamaño
              y acomodá cada bloque según el piso real; las unidades son visuales, no metros.
            </p>
          </div>
          <dl className="grid shrink-0 grid-cols-3 border-[3px] border-white/15 bg-black/30">
            {[
              { value: inventory.length, label: "inventario" },
              { value: placedCount, label: "ubicados" },
              { value: missingCount, label: "sin ubicar" },
            ].map((stat, index) => (
              <div key={stat.label} className={`min-w-24 px-3 py-3 ${index < 2 ? "border-r border-white/12" : ""}`}>
                <dt className="text-[8px] font-black uppercase tracking-[0.14em] text-white/35">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-black text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-5 flex items-start gap-3 border-l-4 border-amber-300 bg-amber-300/[0.07] px-4 py-3 text-xs font-bold leading-5 text-amber-50/75">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>
            La agrupación inicial viene del inventario, pero no hay medidas ni coordenadas físicas
            confirmadas. Guardá una copia JSON cuando terminés: el autoguardado vive solo en este navegador.
          </p>
        </div>
      </header>

      <div className={`${styles.toolbar} ${PANEL_CLASS} mb-4 flex flex-wrap items-center gap-2 p-2.5`}>
        <button type="button" onClick={undo} disabled={!history.past.length} className={TOOL_BUTTON} title="Deshacer (Ctrl+Z)">
          <Undo2 className="h-4 w-4" /> <span className="hidden sm:inline">Deshacer</span>
        </button>
        <button type="button" onClick={redo} disabled={!history.future.length} className={TOOL_BUTTON} title="Rehacer (Ctrl+Y)">
          <Redo2 className="h-4 w-4" /> <span className="hidden sm:inline">Rehacer</span>
        </button>
        <span className="mx-1 hidden h-7 w-px bg-white/12 sm:block" />
        <button
          type="button"
          onClick={() => setSnapEnabled((value) => !value)}
          className={`${TOOL_BUTTON} ${snapEnabled ? "border-[#d8ff3e]/55 bg-[#d8ff3e]/10 text-[#eaff93]" : ""}`}
          aria-pressed={snapEnabled}
        >
          <Grid3X3 className="h-4 w-4" /> Imán {snapEnabled ? "sí" : "no"}
        </button>
        <div className="flex items-center border-2 border-white/15">
          <button
            type="button"
            onClick={() => setZoom((value) => clamp(Number((value - 0.1).toFixed(2)), MIN_ZOOM, MAX_ZOOM))}
            className="grid h-10 w-10 place-items-center text-white/60 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d8ff3e]"
            aria-label="Alejar"
          >
            <Minus className="h-4 w-4" />
          </button>
          <output className="min-w-14 text-center text-[10px] font-black text-white/70">{Math.round(zoom * 100)}%</output>
          <button
            type="button"
            onClick={() => setZoom((value) => clamp(Number((value + 0.1).toFixed(2)), MIN_ZOOM, MAX_ZOOM))}
            className="grid h-10 w-10 place-items-center text-white/60 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d8ff3e]"
            aria-label="Acercar"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={fitCanvas} className={TOOL_BUTTON}>Ajustar</button>
        <span className="mx-1 hidden h-7 w-px bg-white/12 lg:block" />
        <button type="button" onClick={exportPlan} className={TOOL_BUTTON}>
          <Download className="h-4 w-4" /> Exportar
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={TOOL_BUTTON}>
          <Upload className="h-4 w-4" /> Importar
        </button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importPlan} className="sr-only" />
        <button type="button" onClick={() => window.print()} className={TOOL_BUTTON}>
          <Printer className="h-4 w-4" /> Imprimir
        </button>
        <button type="button" onClick={resetPlan} className={`${TOOL_BUTTON} ml-auto border-red-400/25 hover:border-red-400 hover:text-red-200`}>
          Restablecer
        </button>
        <div className="flex min-h-10 items-center gap-2 px-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/38" title={savedAt ?? undefined}>
          {saveState === "error" ? <CircleAlert className="h-4 w-4 text-red-400" /> : saveState === "saved" ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4 text-[#d8ff3e]" />}
          {saveState === "loading" ? "Cargando" : saveState === "saving" ? "Guardando" : saveState === "error" ? "Sin guardar" : "Guardado local"}
        </div>
      </div>

      <div className={styles.workbench}>
        <aside className={`${styles.inventoryPanel} ${PANEL_CLASS}`} aria-label="Inventario de activos">
          <div className="border-b-2 border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Bandeja</p>
                <h2 className="mt-1 text-lg font-black uppercase">Inventario</h2>
              </div>
              {missingCount > 0 && (
                <button type="button" onClick={addAllMissing} className="border-2 border-[#d8ff3e]/40 px-2 py-1.5 text-[9px] font-black uppercase text-[#eaff93] hover:border-[#d8ff3e]">
                  Ubicar {missingCount}
                </button>
              )}
            </div>
            <label className="relative mt-4 block">
              <span className="sr-only">Buscar en el inventario</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, nombre o ubicación" className={`${FIELD_CLASS} pl-9`} />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label>
                <span className="sr-only">Filtrar por área</span>
                <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className={`${FIELD_CLASS} text-xs`}>
                  <option value="all">Todas las áreas</option>
                  {areas.map((area) => <option key={area} value={area}>{area}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Filtrar por tipo</span>
                <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as InventoryKindFilter)} className={`${FIELD_CLASS} text-xs`}>
                  <option value="all">Todos los tipos</option>
                  <option value="machine">Máquinas</option>
                  <option value="bench">Bancos</option>
                  <option value="plate">Discos</option>
                </select>
              </label>
            </div>
          </div>
          <div className={styles.inventoryList}>
            {filteredInventory.map((asset) => {
              const isPlaced = placedIds.has(asset.id);
              const isSelected = selectedKeys.has(targetKey({ kind: "asset", id: asset.id }));
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => isPlaced ? focusTarget({ kind: "asset", id: asset.id }) : addAsset(asset)}
                  className={`${styles.inventoryRow} group flex w-full items-start gap-3 border-b border-white/[0.07] px-3 py-3 text-left transition hover:bg-white/[0.045] focus-visible:bg-white/[0.06] focus-visible:outline-none ${isSelected ? "bg-[#d8ff3e]/10" : ""}`}
                  title={asset.location}
                >
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass(asset.status)}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/38">
                      {asset.id} {asset.code ? `· #${asset.code}` : ""} · {KIND_LABELS[asset.kind]} · {STATUS_LABELS[asset.status]}
                    </span>
                    <span className="mt-1 block text-xs font-extrabold leading-4 text-white/78 group-hover:text-white">{asset.name}</span>
                    <span className="mt-1 block truncate text-[9px] font-bold text-white/30">{asset.area}</span>
                  </span>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center border ${isPlaced ? "border-emerald-400/30 text-emerald-300" : "border-[#d8ff3e]/35 text-[#d8ff3e]"}`} aria-label={isPlaced ? "Ubicado" : "Agregar al plano"}>
                    {isPlaced ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
            {!filteredInventory.length && <p className="p-5 text-center text-xs font-bold text-white/35">No hay coincidencias.</p>}
          </div>
        </aside>

        <section className={`${styles.canvasPanel} ${PANEL_CLASS}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-white/10 px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">Lienzo · Piso 1</p>
              <p className="mt-0.5 text-xs font-bold text-white/42">Arrastrá el bloque; usá la esquina inferior derecha para redimensionar.</p>
            </div>
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/35">
              <MousePointer2 className="h-4 w-4" /> Arrastrá sobre el lienzo para seleccionar varios · Shift suma
            </p>
          </div>
          <div ref={viewportRef} className={styles.canvasViewport}>
            <div className={styles.canvasScaleFrame} style={canvasFrameStyle}>
              <div
                ref={canvasRef}
                className={styles.canvas}
                style={canvasStyle}
                onPointerDown={beginMarquee}
                onPointerMove={updateMarquee}
                onPointerUp={finishMarquee}
                onPointerCancel={cancelMarquee}
                aria-label="Plano editable del piso 1"
              >
                <div className={styles.floorStamp}>
                  <strong>Piso 1</strong>
                  <span>{history.present.canvas.width} × {history.present.canvas.height} u</span>
                </div>

                {marqueeRect && (
                  <div
                    className={styles.marqueeBox}
                    style={{
                      left: marqueeRect.x,
                      top: marqueeRect.y,
                      width: marqueeRect.width,
                      height: marqueeRect.height,
                    }}
                  />
                )}

                {history.present.customElements.map((element) => {
                  const target: PlanTarget = { kind: "custom", id: element.id };
                  const key = targetKey(target);
                  const isSelected = selectedKeys.has(key);
                  return (
                    <div
                      id={domIdFor(target)}
                      key={element.id}
                      role="button"
                      tabIndex={keyboardTarget && targetsMatch(keyboardTarget, target) ? 0 : -1}
                      aria-label={`${CUSTOM_TYPE_LABELS[element.type]} ${element.label}. ${element.locked ? "Posición fijada; liberala desde el inspector." : "Usá las flechas para mover."}`}
                      aria-pressed={isSelected}
                      className={`${styles.planItem} ${styles.customItem} ${styles[element.type]} ${isSelected ? styles.selected : ""} ${element.locked ? styles.locked : ""}`}
                      style={{
                        left: element.x,
                        top: element.y,
                        width: element.width,
                        height: element.height,
                        "--item-color": element.color,
                      } as CSSProperties}
                      onPointerDown={(event) => beginPointerInteraction(event, target, "move")}
                      onPointerMove={movePointerInteraction}
                      onPointerUp={endPointerInteraction}
                      onPointerCancel={cancelPointerInteraction}
                      onKeyDown={(event) => onItemKeyDown(event, target)}
                      onFocus={() => setSelectedKeys((prev) => (prev.has(key) ? prev : new Set([key])))}
                    >
                      <span className={styles.customType}>{CUSTOM_TYPE_LABELS[element.type]}</span>
                      <span className={styles.itemName}>{element.label}</span>
                      {element.locked && <Lock className={styles.lockIcon} aria-hidden="true" />}
                      {!element.locked && (
                        <button
                          type="button"
                          className={styles.resizeHandle}
                          tabIndex={-1}
                          aria-hidden="true"
                          onPointerDown={(event) => beginPointerInteraction(event, target, "resize")}
                          onPointerMove={movePointerInteraction}
                          onPointerUp={endPointerInteraction}
                          onPointerCancel={cancelPointerInteraction}
                        />
                      )}
                    </div>
                  );
                })}

                {inventory.map((asset) => {
                  const placement = history.present.placements[asset.id];
                  if (!placement) return null;
                  const target: PlanTarget = { kind: "asset", id: asset.id };
                  const key = targetKey(target);
                  const isSelected = selectedKeys.has(key);
                  const displayName = placement.label || asset.name;
                  const itemColor = colorForArea(asset.area);
                  return (
                    <div
                      id={domIdFor(target)}
                      key={asset.id}
                      role="button"
                      tabIndex={keyboardTarget && targetsMatch(keyboardTarget, target) ? 0 : -1}
                      aria-label={`${KIND_LABELS[asset.kind]} ${displayName}, ${asset.id}${asset.code ? `, código ${asset.code}` : ""}, estado ${STATUS_LABELS[asset.status]}. ${placement.locked ? "Posición fijada; liberala desde el inspector." : "Usá las flechas para mover."}`}
                      aria-pressed={isSelected}
                      className={`${styles.planItem} ${styles.assetItem} ${asset.kind === "bench" ? styles.benchItem : asset.kind === "plate" ? styles.plateItem : ""} ${isSelected ? styles.selected : ""} ${placement.locked ? styles.locked : ""} ${asset.status === "fuera_de_servicio" ? styles.outOfService : ""}`}
                      style={{
                        left: placement.x,
                        top: placement.y,
                        width: placement.width,
                        height: placement.height,
                        "--item-color": itemColor,
                      } as CSSProperties}
                      onPointerDown={(event) => beginPointerInteraction(event, target, "move")}
                      onPointerMove={movePointerInteraction}
                      onPointerUp={endPointerInteraction}
                      onPointerCancel={cancelPointerInteraction}
                      onKeyDown={(event) => onItemKeyDown(event, target)}
                      onFocus={() => setSelectedKeys((prev) => (prev.has(key) ? prev : new Set([key])))}
                    >
                      <span className={styles.itemMeta}>{asset.code ? `#${asset.code}` : asset.id}</span>
                      <span className={styles.itemName}>{asset.kind === "plate" ? shortPlateLabel(displayName) : displayName}</span>
                      <span className={styles.itemKind}>{KIND_LABELS[asset.kind]}</span>
                      {placement.locked && <Lock className={styles.lockIcon} aria-hidden="true" />}
                      {!placement.locked && (
                        <button
                          type="button"
                          className={styles.resizeHandle}
                          tabIndex={-1}
                          aria-hidden="true"
                          onPointerDown={(event) => beginPointerInteraction(event, target, "resize")}
                          onPointerMove={movePointerInteraction}
                          onPointerUp={endPointerInteraction}
                          onPointerCancel={cancelPointerInteraction}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <aside className={`${styles.inspectorPanel} ${PANEL_CLASS}`} aria-label="Inspector del plano">
          <section className="border-b-2 border-white/10 p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Agregar al lienzo</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => addCustomElement("area")} className={TOOL_BUTTON}><Square className="h-4 w-4" /> Área</button>
              <button type="button" onClick={() => addCustomElement("obstacle")} className={TOOL_BUTTON}><Grid3X3 className="h-4 w-4" /> Columna</button>
              <button type="button" onClick={() => addCustomElement("access")} className={TOOL_BUTTON}><DoorOpen className="h-4 w-4" /> Acceso</button>
              <button type="button" onClick={() => addCustomElement("equipment")} className={TOOL_BUTTON}><Plus className="h-4 w-4" /> Equipo</button>
            </div>
          </section>

          {isMultiSelected ? (
            <section className={styles.inspectorScroll}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">Selección múltiple</p>
                    <h2 className="mt-1 text-lg font-black uppercase leading-5">{selectedTargets.length} elementos</h2>
                  </div>
                  <button type="button" onClick={() => setSelectedKeys(new Set())} className="text-xl leading-none text-white/35 hover:text-white" aria-label="Vaciar selección">×</button>
                </div>
                <p className="mt-3 text-xs font-semibold leading-5 text-white/42">
                  Arrastrá cualquiera de los bloques seleccionados para moverlos juntos. Shift+clic suma o quita un bloque del grupo.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => toggleLockForTargets(selectedTargets, true)} className={TOOL_BUTTON}>
                    <Lock className="h-4 w-4" /> Fijar todos
                  </button>
                  <button type="button" onClick={() => toggleLockForTargets(selectedTargets, false)} className={TOOL_BUTTON}>
                    <LockOpen className="h-4 w-4" /> Liberar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTargets(selectedTargets)}
                    className={`${TOOL_BUTTON} col-span-2 border-red-400/25 hover:border-red-400 hover:text-red-200`}
                  >
                    <Trash2 className="h-4 w-4" /> Quitar del plano
                  </button>
                </div>
              </div>
            </section>
          ) : selected && selectedGeometry ? (
            <section className={styles.inspectorScroll}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">
                      {selectedAsset ? KIND_LABELS[selectedAsset.kind] : selectedCustom ? CUSTOM_TYPE_LABELS[selectedCustom.type] : "Elemento"}
                    </p>
                    <h2 className="mt-1 break-words text-lg font-black uppercase leading-5">
                      {selectedAsset ? selectedPlacement?.label || selectedAsset.name : selectedCustom?.label}
                    </h2>
                  </div>
                  <button type="button" onClick={() => setSelectedKeys(new Set())} className="text-xl leading-none text-white/35 hover:text-white" aria-label="Cerrar inspector">×</button>
                </div>

                {selectedAsset && (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-[0.1em]">
                    <span className="border border-white/15 px-2 py-1 text-white/50">{selectedAsset.id}</span>
                    {selectedAsset.code && <span className="border border-white/15 px-2 py-1 text-white/50">Código #{selectedAsset.code}</span>}
                    <span className="inline-flex items-center gap-1.5 border border-white/15 px-2 py-1 text-white/50">
                      <span className={`h-2 w-2 rounded-full ${statusDotClass(selectedAsset.status)}`} />
                      {STATUS_LABELS[selectedAsset.status]}
                    </span>
                  </div>
                )}

                <label className="mt-5 block">
                  <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-white/38">Etiqueta del bloque</span>
                  <input
                    value={selectedAsset ? selectedPlacement?.label ?? "" : selectedCustom?.label ?? ""}
                    placeholder={selectedAsset?.name}
                    onChange={(event) => updateSelectedLabel(event.target.value)}
                    className={FIELD_CLASS}
                  />
                  {selectedAsset && <span className="mt-1.5 block text-[9px] font-bold text-white/28">Dejala vacía para usar el nombre del inventario.</span>}
                </label>

                {selectedCustom && (
                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-white/38">Color</span>
                    <input
                      type="color"
                      value={selectedCustom.color}
                      onChange={(event) => {
                        const current = history.present;
                        commitPlan({
                          ...current,
                          customElements: current.customElements.map((element) =>
                            element.id === selectedCustom.id ? { ...element, color: event.target.value } : element,
                          ),
                        });
                      }}
                      className="h-10 w-full cursor-pointer border-2 border-white/15 bg-black p-1"
                    />
                  </label>
                )}

                <fieldset className="mt-5">
                  <legend className="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">Posición y tamaño · unidades visuales</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([
                      ["x", "X"],
                      ["y", "Y"],
                      ["width", "Ancho"],
                      ["height", "Fondo"],
                    ] as const).map(([field, label]) => (
                      <label key={field}>
                        <span className="mb-1 block text-[9px] font-black uppercase text-white/30">{label}</span>
                        <input
                          key={`${selected.kind}-${selected.id}-${field}-${Math.round(selectedGeometry[field])}`}
                          type="number"
                          defaultValue={Math.round(selectedGeometry[field])}
                          disabled={selectedLocked}
                          onBlur={(event) => updateSelectedGeometry(field, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                          className={FIELD_CLASS}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={rotateSelected} disabled={selectedLocked} className={TOOL_BUTTON}><RotateCw className="h-4 w-4" /> Girar 90°</button>
                  <button type="button" onClick={toggleSelectedLock} className={TOOL_BUTTON}>
                    {targetLocked(history.present, selected) ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {targetLocked(history.present, selected) ? "Liberar" : "Fijar posición"}
                  </button>
                  {selectedCustom && <button type="button" onClick={duplicateSelectedCustom} disabled={selectedLocked} className={TOOL_BUTTON}><Copy className="h-4 w-4" /> Duplicar</button>}
                  <button type="button" onClick={() => removeTarget(selected)} disabled={selectedLocked} className={`${TOOL_BUTTON} border-red-400/25 hover:border-red-400 hover:text-red-200`}>
                    <Trash2 className="h-4 w-4" /> {selectedAsset ? "Sin ubicar" : "Eliminar"}
                  </button>
                </div>

                {selectedAsset && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Área inventariada</p>
                    <p className="mt-1 text-xs font-extrabold text-white/70">{selectedAsset.area}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-white/42">{selectedAsset.location}</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className={styles.inspectorScroll}>
              <div className="p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Lienzo</p>
                <h2 className="mt-1 text-lg font-black uppercase">Configuración</h2>
                <p className="mt-2 text-xs font-semibold leading-5 text-white/42">Seleccioná cualquier bloque para editarlo. Las áreas iniciales vienen bloqueadas para evitar moverlas por accidente.</p>
                <div className="mt-5 space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-white/38">Ancho del lienzo</span>
                    <input type="number" min={900} max={5000} value={history.present.canvas.width} onChange={(event) => updateCanvas("width", event.target.value)} className={FIELD_CLASS} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-white/38">Fondo del lienzo</span>
                    <input type="number" min={700} max={5000} value={history.present.canvas.height} onChange={(event) => updateCanvas("height", event.target.value)} className={FIELD_CLASS} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-white/38">Cuadrícula</span>
                    <select value={history.present.canvas.gridSize} onChange={(event) => updateCanvas("gridSize", event.target.value)} className={FIELD_CLASS}>
                      <option value={10}>10 u · fina</option>
                      <option value={20}>20 u · normal</option>
                      <option value={40}>40 u · amplia</option>
                    </select>
                  </label>
                </div>
                <div className="mt-6 border-2 border-white/10 bg-white/[0.025] p-3 text-[10px] font-semibold leading-5 text-white/40">
                  <p className="font-black uppercase tracking-[0.12em] text-white/60">Tamaños iniciales</p>
                  <p className="mt-2">Máquina: bloque grande</p>
                  <p>Banco: bloque mediano</p>
                  <p>Disco: cuadrado pequeño</p>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>

      <div className={styles.printHeading}>
        <strong>Xtreme Gym · Plano esquemático · Piso 1</strong>
        <span>Inventario: {inventory.length} activos · Escala visual, no arquitectónica</span>
      </div>
      <p className="sr-only" aria-live="polite">{message}</p>
      {message && <div className={styles.toast} aria-hidden="true">{message}</div>}
    </section>
  );
}
