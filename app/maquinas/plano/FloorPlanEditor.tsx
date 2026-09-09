"use client";

import Link from "next/link";
import AssetConnectionPanel from "./AssetConnectionPanel";
import { usePlanAutosave } from "./usePlanAutosave";
import { useMachineTexts } from "../_components/useMachineTexts";
import { applyMachineTexts, readMachineTexts, type MachineTexts } from "../_components/machine-label-store";
import {
  AlignCenter,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowLeft,
  Boxes,
  Check,
  CheckSquare,
  CircleAlert,
  Copy,
  DoorOpen,
  Download,
  Grid3X3,
  Hand,
  Layers,
  LayoutGrid,
  Lock,
  LockOpen,
  Minus,
  MousePointer2,
  Move,
  Plus,
  Printer,
  Redo2,
  RotateCw,
  Save,
  Search,
  Settings2,
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
  floorPlanStorageKey,
  createSecondFloorPlan,
  STATUS_LABELS,
  clamp,
  clampGeometry,
  clampGroupDelta,
  colorForArea,
  createInitialPlan,
  defaultSizeForKind,
  findOpenPosition,
  getAreaChildrenTargets,
  getTargetGeometry,
  normalizeForSearch,
  parsePlanDocument,
  migratePlanAreas,
  reorganizeAreaChildren,
  snap,
  updateTargetGeometries,
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
    return placement?.label ?? asset?.name ?? target.id;
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

export default function FloorPlanEditor({ inventory, floor = 1 }: { inventory: FloorInventoryItem[]; floor?: 1 | 2 }) {
  const storageKey = floorPlanStorageKey(floor);
  const initialPlan = useMemo(() => floor === 2 ? createSecondFloorPlan() : createInitialPlan(inventory), [inventory, floor]);
  const { labels, error: labelsError, updateTexts } = useMachineTexts();
  const [rawHistory, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialPlan,
    future: [],
  });
  const history = useMemo(() => ({
    present: applyMachineTexts(rawHistory.present, labels),
    past: rawHistory.past.map((plan) => applyMachineTexts(plan, labels)),
    future: rawHistory.future.map((plan) => applyMachineTexts(plan, labels)),
  }), [rawHistory, labels]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [moveWithChildren, setMoveWithChildren] = useState(true);
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
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageTimerRef = useRef<number | null>(null);
  const interactionRef = useRef<PointerInteraction | null>(null);
  const marqueeRef = useRef<MarqueeInteraction | null>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const presentRef = useRef(history.present);
  const historyRef = useRef(history);
  const hydratedRef = useRef(false);

  presentRef.current = history.present;
  historyRef.current = history;

  const cloud = usePlanAutosave(history.present, hydrated, inventory, (savedPlan) => {
    const plan = floor === 2 ? savedPlan : migratePlanAreas(savedPlan, inventory);
    updateTexts(Object.fromEntries(Object.entries(plan.placements).map(([id, placement]) => {
      const asset = inventory.find((item) => item.id === id);
      return [id, { name: placement.label ?? asset?.name ?? "", code: placement.code ?? asset?.code ?? "" }];
    })));
    presentRef.current = plan;
    dispatch({ type: "load", plan });
  }, floor);

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
        `${asset.id} ${history.present.placements[asset.id]?.code ?? labels[asset.id]?.code ?? asset.code} ${history.present.placements[asset.id]?.label ?? asset.name} ${asset.name} ${asset.area} ${asset.location}`,
      ).includes(query);
    });
  }, [areaFilter, inventory, kindFilter, search, history.present.placements, labels]);

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
    const changes: MachineTexts = {};
    for (const [id, placement] of Object.entries(plan.placements)) {
      const before = presentRef.current.placements[id];
      const change: MachineTexts[string] = {};
      if (placement.label !== undefined && placement.label !== before?.label) change.name = placement.label;
      if (placement.code !== undefined && placement.code !== before?.code) change.code = placement.code;
      if (Object.keys(change).length) changes[id] = change;
    }
    if (Object.keys(changes).length && !updateTexts(changes)) return;
    presentRef.current = plan;
    dispatch({ type: "commit", plan });
  }, [updateTexts]);

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

  const nudgeTargets = useCallback(
    (targets: PlanTarget[], dx: number, dy: number) => {
      const current = presentRef.current;
      const targetsMap = new Map<string, PlanTarget>();
      for (const t of targets) targetsMap.set(targetKey(t), t);

      if (moveWithChildren) {
        for (const t of targets) {
          if (t.kind === "custom") {
            const el = current.customElements.find((e) => e.id === t.id);
            if (el?.type === "area" && !el.locked) {
              const children = getAreaChildrenTargets(current, el.id, inventory);
              for (const child of children) {
                targetsMap.set(targetKey(child), child);
              }
            }
          }
        }
      }

      const allTargets = Array.from(targetsMap.values());
      const initialGeometries: Geometry[] = [];
      const validTargets: PlanTarget[] = [];

      for (const t of allTargets) {
        const isDirect = targets.some((dt) => targetsMatch(dt, t));
        if (isDirect && targetLocked(current, t)) continue;
        const geom = getTargetGeometry(current, t);
        if (!geom) continue;
        initialGeometries.push(geom);
        validTargets.push(t);
      }

      if (!validTargets.length) return;

      const { dx: clampedDx, dy: clampedDy } = clampGroupDelta(
        initialGeometries,
        dx,
        dy,
        current.canvas,
      );
      if (clampedDx === 0 && clampedDy === 0) return;

      const updates = validTargets.map((t, index) => ({
        target: t,
        geometry: {
          ...initialGeometries[index],
          x: initialGeometries[index].x + clampedDx,
          y: initialGeometries[index].y + clampedDy,
        },
      }));

      commitPlan(updateTargetGeometries(current, updates));
    },
    [commitPlan, inventory, moveWithChildren],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      const editingText =
        element?.tagName === "INPUT" || element?.tagName === "TEXTAREA" || element?.tagName === "SELECT";
      const modifier = event.ctrlKey || event.metaKey;

      if (editingText) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) setSpacePressed(true);
        return;
      }
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
      if (modifier && event.key.toLowerCase() === "a") {
        event.preventDefault();
        if (selected?.kind === "custom") {
          const el = presentRef.current.customElements.find((e) => e.id === selected.id);
          if (el?.type === "area") {
            const children = getAreaChildrenTargets(presentRef.current, el.id, inventory);
            if (children.length) {
              setSelectedKeys(new Set(children.map(targetKey)));
              announce(`${children.length} elementos seleccionados en ${el.label}`);
              return;
            }
          }
        }
        const allKeys = new Set<string>();
        for (const asset of inventory) {
          if (presentRef.current.placements[asset.id]) {
            allKeys.add(targetKey({ kind: "asset", id: asset.id }));
          }
        }
        for (const el of presentRef.current.customElements) {
          allKeys.add(targetKey({ kind: "custom", id: el.id }));
        }
        setSelectedKeys(allKeys);
        announce(`${allKeys.size} elementos seleccionados`);
        return;
      }
      if (selectedTargets.length && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        const baseStep = snapEnabled ? presentRef.current.canvas.gridSize : 1;
        const step = baseStep * (event.shiftKey ? 5 : 1);
        const directions: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        };
        const dir = directions[event.key];
        if (dir) {
          event.preventDefault();
          nudgeTargets(selectedTargets, dir[0], dir[1]);
          return;
        }
      }
      if (event.key === "Escape") {
        setSelectedKeys(new Set());
        setInspectorOpen(false);
        setInventoryOpen(false);
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedTargets.length) {
        event.preventDefault();
        removeTargets(selectedTargets);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePressed(false);
    };
    const onBlur = () => setSpacePressed(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [announce, inventory, nudgeTargets, redo, removeTargets, selected, selectedTargets, snapEnabled, undo]);

  useEffect(() => {
    if (selectedTargets.length) setInspectorOpen(true);
  }, [selectedTargets.length]);

  useEffect(() => {
    let plan = initialPlan;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        const candidate = isObject(parsed) && "plan" in parsed ? parsed.plan : parsed;
        const saved = parsePlanDocument(candidate, inventory);
        if (saved) plan = saved;
        if (saved && !saved.areaLayoutRevision) {
          window.localStorage.setItem(`${storageKey}:before-area-reorganization`, raw);
        }
        plan = saved ? (floor === 2 ? saved : migratePlanAreas(saved, inventory)) : initialPlan;
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
    const assetId = new URLSearchParams(window.location.search).get("asset");
    if (assetId && inventory.some((asset) => asset.id === assetId)) {
      setSelectedKeys(new Set([targetKey({ kind: "asset", id: assetId })]));
      setInspectorOpen(true);
    }
  }, [initialPlan, inventory, floor, storageKey]);

  useEffect(() => {
    const flushLatestPlan = () => {
      if (!hydratedRef.current) return;
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ savedAt: new Date().toISOString(), plan: applyMachineTexts(presentRef.current, readMachineTexts()) }),
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
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      try {
        const timestamp = new Date().toISOString();
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ savedAt: timestamp, plan: applyMachineTexts(presentRef.current, readMachineTexts()) }),
        );
        setSavedAt(timestamp);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 260);
    return () => window.clearTimeout(timeout);
  }, [history.present, hydrated, storageKey]);

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

  const openedLinkedAsset = useRef(false);
  useEffect(() => {
    if (!hydrated || openedLinkedAsset.current) return;
    const assetId = new URLSearchParams(window.location.search).get("asset");
    if (!assetId || !inventoryById.has(assetId)) return;
    openedLinkedAsset.current = true;
    focusTarget({ kind: "asset", id: assetId });
  }, [focusTarget, hydrated, inventoryById]);

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
    if (spacePressed) return;
    event.stopPropagation();
    const plan = presentRef.current;
    const key = targetKey(target);
    const isMultiModifier = event.shiftKey || event.ctrlKey || event.metaKey;

    // Control/Cmd/Shift+clic agrega o quita este bloque del grupo seleccionado sin
    // tocar el resto; un clic normal reemplaza la selección, salvo que el
    // bloque ya sea parte de un grupo (para poder arrastrarlo sin perderlo).
    let nextKeys = selectedKeys;
    if (mode === "move" && isMultiModifier) {
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
    const initialTargets = isGroupDrag ? Array.from(nextKeys, parseTargetKey) : [target];

    // Si algún objetivo es un área/cuadrante y mover con hijos está activo, incluimos a todos sus hijos
    const targetsToMoveMap = new Map<string, PlanTarget>();
    for (const t of initialTargets) {
      targetsToMoveMap.set(targetKey(t), t);
      if (mode === "move" && moveWithChildren && t.kind === "custom") {
        const el = plan.customElements.find((e) => e.id === t.id);
        if (el?.type === "area" && !el.locked) {
          const children = getAreaChildrenTargets(plan, el.id, inventory);
          for (const child of children) {
            targetsToMoveMap.set(targetKey(child), child);
          }
        }
      }
    }

    const targetsToMove = Array.from(targetsToMoveMap.values());
    const items: PointerInteractionItem[] = [];

    for (const groupTarget of targetsToMove) {
      const initial = getTargetGeometry(plan, groupTarget);
      if (!initial) continue;
      // Si fue seleccionado directamente y está bloqueado, no se mueve
      // (a menos que sea un hijo moviéndose junto a su área desbloqueada)
      const isDirect = initialTargets.some((it) => targetsMatch(it, groupTarget));
      if (isDirect && targetLocked(plan, groupTarget)) continue;

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
    const rawDx = (event.clientX - active.startClientX) / zoom;
    const rawDy = (event.clientY - active.startClientY) / zoom;

    if (active.mode === "resize") {
      const item = active.items[0];
      if (!item) return;

      const isArea =
        item.target.kind === "custom" &&
        active.before.customElements.find((e) => e.id === item.target.id)?.type === "area";

      if (isArea) {
        const proposedGeometry: Geometry = {
          ...item.initial,
          width: clamp(
            snap(item.initial.width + rawDx, active.snapSize),
            MIN_ITEM_SIZE,
            active.before.canvas.width - item.initial.x,
          ),
          height: clamp(
            snap(item.initial.height + rawDy, active.snapSize),
            MIN_ITEM_SIZE,
            active.before.canvas.height - item.initial.y,
          ),
        };

        const result = reorganizeAreaChildren(
          active.before,
          item.target.id,
          inventory,
          proposedGeometry,
        );

        if (result) {
          item.preview = result.areaGeometry;
          item.node.style.width = `${result.areaGeometry.width}px`;
          item.node.style.height = `${result.areaGeometry.height}px`;

          for (const update of result.updates) {
            const childNode = document.getElementById(domIdFor(update.target));
            if (childNode) {
              childNode.style.left = `${update.geometry.x}px`;
              childNode.style.top = `${update.geometry.y}px`;
            }
          }

          active.previewPlan = result.plan;
          active.changed = true;
          return;
        }
      }

      const geometry: Geometry = {
        ...item.initial,
        width: clamp(
          snap(item.initial.width + rawDx, active.snapSize),
          MIN_ITEM_SIZE,
          active.before.canvas.width - item.initial.x,
        ),
        height: clamp(
          snap(item.initial.height + rawDy, active.snapSize),
          MIN_ITEM_SIZE,
          active.before.canvas.height - item.initial.y,
        ),
      };
      const next = updateTargetGeometry(active.before, item.target, geometry);
      const applied = getTargetGeometry(next, item.target);
      if (!applied) return;
      item.preview = applied;
      item.node.style.left = `${applied.x}px`;
      item.node.style.top = `${applied.y}px`;
      item.node.style.width = `${applied.width}px`;
      item.node.style.height = `${applied.height}px`;
      active.previewPlan = next;
      active.changed = geometryChanged(item.initial, applied);
      return;
    }

    // Modo mover (individual, múltiple con Control o cuadrante completo con hijos):
    const snappedDx = snap(rawDx, active.snapSize);
    const snappedDy = snap(rawDy, active.snapSize);

    const allInitials = active.items.map((it) => it.initial);
    const { dx: clampedDx, dy: clampedDy } = clampGroupDelta(
      allInitials,
      snappedDx,
      snappedDy,
      active.before.canvas,
    );

    const updates: Array<{ target: PlanTarget; geometry: Geometry }> = [];
    let anyChanged = false;

    for (const item of active.items) {
      const geometry: Geometry = {
        ...item.initial,
        x: item.initial.x + clampedDx,
        y: item.initial.y + clampedDy,
      };
      updates.push({ target: item.target, geometry });
      if (geometry.x !== item.initial.x || geometry.y !== item.initial.y) {
        anyChanged = true;
      }
      item.preview = geometry;
      item.node.style.left = `${geometry.x}px`;
      item.node.style.top = `${geometry.y}px`;
    }

    active.previewPlan = updateTargetGeometries(active.before, updates);
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
      additive: event.shiftKey || event.ctrlKey || event.metaKey,
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
      if (!active.additive) {
        setSelectedKeys(new Set());
        setInspectorOpen(false);
      }
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

  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    setIsPanning(true);
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = panRef.current;
    const viewport = viewportRef.current;
    if (!active || !viewport || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    viewport.scrollLeft = active.scrollLeft - (event.clientX - active.startX);
    viewport.scrollTop = active.scrollTop - (event.clientY - active.startY);
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = panRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    panRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button === 1 || (event.button === 0 && spacePressed)) {
      beginPan(event);
      return;
    }
    beginMarquee(event);
  };

  const onCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      movePan(event);
      return;
    }
    updateMarquee(event);
  };

  const onCanvasPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      endPan(event);
      return;
    }
    finishMarquee(event);
  };

  const onCanvasPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      endPan(event);
      return;
    }
    cancelMarquee(event);
  };

  const onItemKeyDown = (event: ReactKeyboardEvent<HTMLElement>, target: PlanTarget) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      const isMulti = event.ctrlKey || event.metaKey || event.shiftKey;
      const key = targetKey(target);
      if (isMulti) {
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      } else {
        setSelectedKeys(new Set([key]));
      }
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
      const targetsToNudge =
        selectedKeys.size > 1 && selectedKeys.has(targetKey(target))
          ? selectedTargets
          : [target];
      nudgeTargets(targetsToNudge, direction[0], direction[1]);
    }
  };

  const alignSelected = useCallback(
    (alignment: "left" | "centerH" | "right" | "top" | "centerV" | "bottom" | "distributeH" | "distributeV") => {
      if (selectedTargets.length < 2) return;
      const current = presentRef.current;
      const unlockedTargets = selectedTargets.filter((t) => !targetLocked(current, t));
      if (unlockedTargets.length < 2) {
        announce("Desbloqueá al menos 2 elementos para alinearlos");
        return;
      }

      const items = unlockedTargets
        .map((target) => ({
          target,
          geometry: getTargetGeometry(current, target)!,
        }))
        .filter((item) => item.geometry !== null);

      if (items.length < 2) return;

      const minX = Math.min(...items.map((i) => i.geometry.x));
      const maxX = Math.max(...items.map((i) => i.geometry.x + i.geometry.width));
      const minY = Math.min(...items.map((i) => i.geometry.y));
      const maxY = Math.max(...items.map((i) => i.geometry.y + i.geometry.height));

      const snapSize = snapEnabled ? current.canvas.gridSize : 1;
      const updates: Array<{ target: PlanTarget; geometry: Geometry }> = [];

      if (alignment === "left") {
        for (const item of items) {
          updates.push({ target: item.target, geometry: { ...item.geometry, x: minX } });
        }
      } else if (alignment === "right") {
        for (const item of items) {
          updates.push({ target: item.target, geometry: { ...item.geometry, x: maxX - item.geometry.width } });
        }
      } else if (alignment === "centerH") {
        const midX = (minX + maxX) / 2;
        for (const item of items) {
          updates.push({
            target: item.target,
            geometry: { ...item.geometry, x: snap(midX - item.geometry.width / 2, snapSize) },
          });
        }
      } else if (alignment === "top") {
        for (const item of items) {
          updates.push({ target: item.target, geometry: { ...item.geometry, y: minY } });
        }
      } else if (alignment === "bottom") {
        for (const item of items) {
          updates.push({ target: item.target, geometry: { ...item.geometry, y: maxY - item.geometry.height } });
        }
      } else if (alignment === "centerV") {
        const midY = (minY + maxY) / 2;
        for (const item of items) {
          updates.push({
            target: item.target,
            geometry: { ...item.geometry, y: snap(midY - item.geometry.height / 2, snapSize) },
          });
        }
      } else if (alignment === "distributeH") {
        if (items.length < 3) {
          announce("Se necesitan al menos 3 elementos para distribuir");
          return;
        }
        const sorted = [...items].sort((a, b) => a.geometry.x - b.geometry.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalItemsWidth = sorted.reduce((sum, item) => sum + item.geometry.width, 0);
        const totalSpan = last.geometry.x + last.geometry.width - first.geometry.x;
        const availableGap = totalSpan - totalItemsWidth;
        const gap = availableGap / (sorted.length - 1);
        let curX = first.geometry.x;
        for (const item of sorted) {
          updates.push({ target: item.target, geometry: { ...item.geometry, x: snap(curX, snapSize) } });
          curX += item.geometry.width + gap;
        }
      } else if (alignment === "distributeV") {
        if (items.length < 3) {
          announce("Se necesitan al menos 3 elementos para distribuir");
          return;
        }
        const sorted = [...items].sort((a, b) => a.geometry.y - b.geometry.y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalItemsHeight = sorted.reduce((sum, item) => sum + item.geometry.height, 0);
        const totalSpan = last.geometry.y + last.geometry.height - first.geometry.y;
        const availableGap = totalSpan - totalItemsHeight;
        const gap = availableGap / (sorted.length - 1);
        let curY = first.geometry.y;
        for (const item of sorted) {
          updates.push({ target: item.target, geometry: { ...item.geometry, y: snap(curY, snapSize) } });
          curY += item.geometry.height + gap;
        }
      }

      if (updates.length) {
        commitPlan(updateTargetGeometries(current, updates));
        announce("Elementos alineados");
      }
    },
    [announce, commitPlan, selectedTargets, snapEnabled],
  );

  const selectAreaChildren = useCallback(
    (areaId: string) => {
      const children = getAreaChildrenTargets(history.present, areaId, inventory);
      if (!children.length) {
        announce("Este cuadrante no tiene elementos adentro");
        return;
      }
      setSelectedKeys(new Set(children.map(targetKey)));
      announce(`${children.length} elementos seleccionados en el cuadrante`);
    },
    [announce, history.present, inventory],
  );

  const handleReorganizeArea = useCallback(
    (areaId: string) => {
      const result = reorganizeAreaChildren(history.present, areaId, inventory);
      if (!result || !result.updates.length) {
        announce("El cuadrante no tiene elementos para reorganizar");
        return;
      }
      commitPlan(result.plan);
      announce(`${result.updates.length} elementos reorganizados dentro del cuadrante`);
    },
    [announce, commitPlan, history.present, inventory],
  );

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

    const nextGeom = {
      ...selectedGeometry,
      [field]: boundedValue,
    };

    if (
      selected.kind === "custom" &&
      selectedCustom?.type === "area" &&
      (field === "width" || field === "height")
    ) {
      const result = reorganizeAreaChildren(history.present, selected.id, inventory, nextGeom);
      if (result) {
        commitPlan(result.plan);
        return;
      }
    }

    commitPlan(updateTargetGeometry(history.present, selected, nextGeom));
  };

  const updateSelectedLabel = (label: string) => {
    if (!selected) return;
    const current = history.present;
    if (selected.kind === "asset") {
      updateTexts({ [selected.id]: { name: label } });
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
    anchor.download = `plano-xtreme-gym-piso-${floor}-${new Date().toISOString().slice(0, 10)}.json`;
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
      commitPlan(floor === 2 ? plan : migratePlanAreas(plan, inventory));
      setSelectedKeys(new Set());
      announce("Plano importado");
    } catch {
      announce("No pude leer ese archivo de plano");
    }
  };

  const resetPlan = () => {
    if (!window.confirm(floor === 2 ? "¿Restablecer los tres bloques del piso 2?" : `¿Restablecer la distribución inicial de los ${inventory.length} activos?`)) return;
    commitPlan(floor === 2 ? createSecondFloorPlan() : createInitialPlan(inventory));
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
    <section className={`${styles.editorPage} w-full px-3 py-2.5 sm:px-4`}>
      <header className={`${styles.pageHeader} mb-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2`}>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/maquinas"
            className="inline-flex min-h-9 items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/50 transition hover:text-[#d8ff3e] focus-visible:text-[#d8ff3e] focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" /> Catálogo
          </Link>
          <span className="hidden h-5 w-px bg-white/15 sm:block" />
          <h1 className="text-sm font-black uppercase leading-none tracking-[-0.01em] text-white sm:text-base">
            Plano editable del gimnasio
          </h1>
          <span className="border-2 border-[#d8ff3e]/45 bg-[#d8ff3e]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#eaff93]">
            Piso {floor}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
          <span>{inventory.length} inventario</span>
          <span className="text-emerald-300">{placedCount} ubicados</span>
          {missingCount > 0 && <span className="text-amber-300">{missingCount} sin ubicar</span>}
          <span className="hidden items-center gap-1.5 text-amber-200/70 md:flex" title="Los cambios se guardan en MongoDB con tu sesión de admin y se respaldan en este navegador.">
            <Save className="h-3.5 w-3.5 text-amber-300" /> Autoguardado MongoDB
          </span>
        </div>
      </header>

      <div className={`${styles.toolbar} ${PANEL_CLASS} mb-2.5 flex flex-wrap items-center gap-2 p-2.5`}>
        <button
          type="button"
          onClick={() => setInventoryOpen((value) => !value)}
          className={`${TOOL_BUTTON} ${inventoryOpen ? "border-[#d8ff3e]/55 bg-[#d8ff3e]/10 text-[#eaff93]" : ""}`}
          aria-pressed={inventoryOpen}
        >
          <Boxes className="h-4 w-4" /> Inventario
          {missingCount > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#d8ff3e] px-1 text-[8px] font-black text-black">
              {missingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setInspectorOpen((value) => !value)}
          className={`${TOOL_BUTTON} ${inspectorOpen ? "border-[#d8ff3e]/55 bg-[#d8ff3e]/10 text-[#eaff93]" : ""}`}
          aria-pressed={inspectorOpen}
        >
          <Settings2 className="h-4 w-4" /> {selected || isMultiSelected ? "Inspector" : "Lienzo"}
        </button>
        <span className="mx-1 hidden h-7 w-px bg-white/12 sm:block" />
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
        <button
          type="button"
          onClick={() => {
            setMoveWithChildren((val) => {
              const next = !val;
              announce(next ? "Cuadrantes moverán sus elementos hijos" : "Cuadrantes se moverán solos");
              return next;
            });
          }}
          className={`${TOOL_BUTTON} ${moveWithChildren ? "border-[#d8ff3e]/55 bg-[#d8ff3e]/10 text-[#eaff93]" : ""}`}
          title="Al mover un cuadrante (área), arrastra automáticamente todas las máquinas y elementos adentro"
          aria-pressed={moveWithChildren}
        >
          <Layers className="h-4 w-4" /> Cuadrante con hijos {moveWithChildren ? "sí" : "no"}
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

      <div role="status" aria-live="polite" className="mb-3 flex flex-wrap items-center gap-3 border-2 border-white/15 p-3 text-xs">
        <span className={cloud.error ? "text-amber-200" : "text-emerald-300"}>{cloud.status}</span>
        {cloud.error && <span className="text-amber-200">{cloud.error}</span>}
        {cloud.error && !cloud.conflict && <button type="button" className={TOOL_BUTTON} onClick={() => void cloud.retry()}>Reintentar</button>}
        {cloud.error && <Link href="/admin" target="_blank" className={TOOL_BUTTON}>Abrir Admin</Link>}
        <button type="button" className={TOOL_BUTTON} onClick={() => {
          if (window.confirm("¿Restaurar el último plano guardado en MongoDB? La copia actual quedará como respaldo local de recuperación.")) void cloud.restore();
        }}>Restaurar desde MongoDB</button>
        {cloud.conflict && <button type="button" className={TOOL_BUTTON} onClick={() => {
          if (window.confirm("¿Reemplazar el plano de MongoDB con esta copia local?")) void cloud.keepLocal();
        }}>Conservar mi plano local</button>}
      </div>

      <div className={styles.workbench}>
        <aside
          className={`${styles.inventoryPanel} ${inventoryOpen ? styles.panelOpen : ""} ${PANEL_CLASS}`}
          aria-label="Inventario de activos"
          aria-hidden={!inventoryOpen}
          inert={!inventoryOpen}
        >
          <div className="border-b-2 border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Bandeja</p>
                <h2 className="mt-1 text-lg font-black uppercase">Inventario</h2>
              </div>
              <div className="flex items-center gap-2">
                {missingCount > 0 && (
                  <button type="button" onClick={addAllMissing} className="border-2 border-[#d8ff3e]/40 px-2 py-1.5 text-[9px] font-black uppercase text-[#eaff93] hover:border-[#d8ff3e]">
                    Ubicar {missingCount}
                  </button>
                )}
                <button type="button" onClick={() => setInventoryOpen(false)} className="text-xl leading-none text-white/35 hover:text-white" aria-label="Cerrar inventario">×</button>
              </div>
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
                      {asset.id} · {history.present.placements[asset.id]?.code ?? labels[asset.id]?.code ?? asset.code} · {KIND_LABELS[asset.kind]} · {STATUS_LABELS[asset.status]}
                    </span>
                    <span className="mt-1 block text-xs font-extrabold leading-4 text-white/78 group-hover:text-white">{history.present.placements[asset.id]?.label ?? labels[asset.id]?.name ?? asset.name}</span>
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
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">Lienzo · Piso {floor}</p>
              <p className="mt-0.5 text-xs font-bold text-white/42">Arrastrá el bloque; usá la esquina inferior derecha para redimensionar.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/35">
              <p className="flex items-center gap-2">
                <MousePointer2 className="h-4 w-4" /> Arrastrá para seleccionar varios · Shift suma
              </p>
              <p className="flex items-center gap-2">
                <Hand className="h-4 w-4" /> Espacio + arrastrar o clic central para desplazarte
              </p>
            </div>
          </div>
          <div
            ref={viewportRef}
            className={`${styles.canvasViewport} ${spacePressed ? styles.panReady : ""} ${isPanning ? styles.panning : ""}`}
          >
            <div className={styles.canvasScaleFrame} style={canvasFrameStyle}>
              <div
                ref={canvasRef}
                className={styles.canvas}
                style={canvasStyle}
                onPointerDown={onCanvasPointerDown}
                onPointerMove={onCanvasPointerMove}
                onPointerUp={onCanvasPointerUp}
                onPointerCancel={onCanvasPointerCancel}
                aria-label={`Plano editable del piso ${floor}`}
              >
                <div className={styles.floorStamp}>
                  <strong>Piso {floor}</strong>
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
                  const isArea = element.type === "area";
                  const areaChildrenCount = isArea
                    ? getAreaChildrenTargets(history.present, element.id, inventory).length
                    : 0;
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
                      {isArea ? (
                        <div className={styles.areaHeaderBar}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={styles.itemName}>{element.label}</span>
                            <span className={styles.areaBadge} title={`${areaChildrenCount} elementos dentro de este cuadrante`}>
                              <Boxes className="h-2.5 w-2.5" />
                              {areaChildrenCount} {areaChildrenCount === 1 ? "elem" : "elems"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!element.locked && (
                              <span className="hidden items-center gap-1 text-[8px] font-extrabold uppercase tracking-wider text-[#d8ff3e]/80 sm:flex" title="Arrastrá para mover el cuadrante con sus hijos">
                                <Move className="h-2.5 w-2.5" /> Mover
                              </span>
                            )}
                            {!element.locked && areaChildrenCount > 0 && (
                              <button
                                type="button"
                                className={styles.areaLockBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReorganizeArea(element.id);
                                }}
                                title="Reorganizar elementos dentro del cuadrante"
                              >
                                <LayoutGrid className="h-3 w-3 text-[#d8ff3e]" />
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.areaLockBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLockForTargets([target], !element.locked);
                              }}
                              title={element.locked ? "Desbloquear cuadrante para mover con sus hijos" : "Fijar posición del cuadrante"}
                            >
                              {element.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3 text-[#d8ff3e]" />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className={styles.customType}>{CUSTOM_TYPE_LABELS[element.type]}</span>
                          <span className={styles.itemName}>{element.label}</span>
                          {element.locked && <Lock className={styles.lockIcon} aria-hidden="true" />}
                        </>
                      )}
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
                  const displayName = placement.label ?? asset.name;
                  const displayCode = placement.code ?? asset.code;
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
                      <span className={styles.itemMeta}>{displayCode || asset.id}</span>
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

        <aside
          className={`${styles.inspectorPanel} ${inspectorOpen ? styles.panelOpen : ""} ${PANEL_CLASS}`}
          aria-label="Inspector del plano"
          aria-hidden={!inspectorOpen}
          inert={!inspectorOpen}
        >
          <section className="flex items-start justify-between gap-3 border-b-2 border-white/10 p-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Agregar al lienzo</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => addCustomElement("area")} className={TOOL_BUTTON}><Square className="h-4 w-4" /> Área</button>
                <button type="button" onClick={() => addCustomElement("obstacle")} className={TOOL_BUTTON}><Grid3X3 className="h-4 w-4" /> Columna</button>
                <button type="button" onClick={() => addCustomElement("access")} className={TOOL_BUTTON}><DoorOpen className="h-4 w-4" /> Acceso</button>
                <button type="button" onClick={() => addCustomElement("equipment")} className={TOOL_BUTTON}><Plus className="h-4 w-4" /> Equipo</button>
              </div>
            </div>
            <button type="button" onClick={() => setInspectorOpen(false)} className="text-xl leading-none text-white/35 hover:text-white" aria-label="Cerrar inspector">×</button>
          </section>

          {isMultiSelected ? (
            <section className={styles.inspectorScroll}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">Selección múltiple</p>
                    <h2 className="mt-1 text-lg font-black uppercase leading-5">{selectedTargets.length} elementos</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKeys(new Set());
                      setInspectorOpen(false);
                    }}
                    className="text-xl leading-none text-white/35 hover:text-white"
                    aria-label="Vaciar selección"
                  >
                    ×
                  </button>
                </div>
                <p className="mt-3 text-xs font-semibold leading-5 text-white/42">
                  Arrastrá cualquiera de los bloques seleccionados para moverlos juntos (o usá las flechas del teclado). Control+clic o Shift+clic suma o quita bloques.
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
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/40">Alinear y distribuir</p>
                  <div className={styles.alignToolGrid}>
                    <button type="button" onClick={() => alignSelected("left")} className={styles.alignBtn} title="Alinear a la izquierda">
                      <AlignStartVertical className="h-4 w-4" /> Izq
                    </button>
                    <button type="button" onClick={() => alignSelected("centerH")} className={styles.alignBtn} title="Centrar horizontalmente">
                      <AlignCenter className="h-4 w-4" /> Centro H
                    </button>
                    <button type="button" onClick={() => alignSelected("right")} className={styles.alignBtn} title="Alinear a la derecha">
                      <AlignEndVertical className="h-4 w-4" /> Der
                    </button>
                    <button type="button" onClick={() => alignSelected("distributeH")} className={styles.alignBtn} title="Distribuir horizontalmente">
                      <AlignHorizontalDistributeCenter className="h-4 w-4" /> Dist H
                    </button>
                    <button type="button" onClick={() => alignSelected("top")} className={styles.alignBtn} title="Alinear arriba">
                      <AlignStartHorizontal className="h-4 w-4" /> Arriba
                    </button>
                    <button type="button" onClick={() => alignSelected("centerV")} className={styles.alignBtn} title="Centrar verticalmente">
                      <AlignCenter className="h-4 w-4" /> Centro V
                    </button>
                    <button type="button" onClick={() => alignSelected("bottom")} className={styles.alignBtn} title="Alinear abajo">
                      <AlignEndHorizontal className="h-4 w-4" /> Abajo
                    </button>
                    <button type="button" onClick={() => alignSelected("distributeV")} className={styles.alignBtn} title="Distribuir verticalmente">
                      <AlignVerticalDistributeCenter className="h-4 w-4" /> Dist V
                    </button>
                  </div>
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
                      {selectedAsset ? selectedPlacement?.label ?? selectedAsset.name : selectedCustom?.label}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKeys(new Set());
                      setInspectorOpen(false);
                    }}
                    className="text-xl leading-none text-white/35 hover:text-white"
                    aria-label="Cerrar inspector"
                  >
                    ×
                  </button>
                </div>

                {selectedAsset && (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-[0.1em]">
                    <span className="border border-white/15 px-2 py-1 text-white/50">{selectedAsset.id}</span>
                    <span className="border border-white/15 px-2 py-1 text-white/50">Código {selectedPlacement?.code ?? selectedAsset.code}</span>
                    <span className="inline-flex items-center gap-1.5 border border-white/15 px-2 py-1 text-white/50">
                      <span className={`h-2 w-2 rounded-full ${statusDotClass(selectedAsset.status)}`} />
                      {STATUS_LABELS[selectedAsset.status]}
                    </span>
                  </div>
                )}

                {selectedAsset && selectedPlacement && (
                  <AssetConnectionPanel
                    key={selectedAsset.id}
                    asset={selectedAsset}
                    name={selectedPlacement.label ?? selectedAsset.name}
                    code={selectedPlacement.code ?? selectedAsset.code}
                    duplicateCode={inventory.some((other) => other.id !== selectedAsset.id &&
                      (history.present.placements[other.id]?.code ?? other.code).trim().toLowerCase() ===
                      (selectedPlacement.code ?? selectedAsset.code).trim().toLowerCase() &&
                      Boolean((selectedPlacement.code ?? selectedAsset.code).trim()))}
                    onCode={(code) => { updateTexts({ [selectedAsset.id]: { code } }); }}
                  />
                )}

                {labelsError && <p role="alert" className="mt-3 text-xs text-red-300">{labelsError}</p>}
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-white/38">{selectedAsset ? "Nombre de la máquina" : "Etiqueta del bloque"}</span>
                  <input
                    maxLength={140}
                    value={selectedAsset ? selectedPlacement?.label ?? selectedAsset.name : selectedCustom?.label ?? ""}
                    placeholder={selectedAsset?.name}
                    onChange={(event) => updateSelectedLabel(event.target.value)}
                    className={FIELD_CLASS}
                  />
                  {selectedAsset && <span className="mt-1.5 block text-[9px] font-bold text-white/45">Este nombre se actualiza también en la etiqueta QR.</span>}
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

                {selectedCustom && selectedCustom.type === "area" && (
                  <div className="mt-4 border border-[#d8ff3e]/30 bg-[#d8ff3e]/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-[#d8ff3e]" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#d8ff3e]">Cuadrante con hijos</span>
                      </div>
                      <span className="border border-[#d8ff3e]/40 bg-black/60 px-2 py-0.5 text-[9px] font-extrabold text-[#eaff93]">
                        {getAreaChildrenTargets(history.present, selectedCustom.id, inventory).length} elementos
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold leading-4 text-white/50">
                      Al arrastrar o mover con flechas este cuadrante, todas las máquinas y bloques adentro se moverán juntos.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => selectAreaChildren(selectedCustom.id)}
                        className={`${TOOL_BUTTON} w-full justify-start text-[9px]`}
                      >
                        <CheckSquare className="h-3.5 w-3.5 text-[#d8ff3e]" /> Seleccionar elementos del cuadrante (Ctrl+A)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorganizeArea(selectedCustom.id)}
                        disabled={selectedLocked}
                        className={`${TOOL_BUTTON} w-full justify-start text-[9px]`}
                        title="Reorganiza y empaca las máquinas dentro del cuadrante para que no salgan de los bordes"
                      >
                        <LayoutGrid className="h-3.5 w-3.5 text-[#d8ff3e]" /> Reorganizar elementos en el cuadrante
                      </button>
                      <label className="mt-1 flex cursor-pointer select-none items-center gap-2 text-[10px] font-extrabold text-white/75 hover:text-white">
                        <input
                          type="checkbox"
                          checked={moveWithChildren}
                          onChange={(e) => setMoveWithChildren(e.target.checked)}
                          className="h-4 w-4 accent-[#d8ff3e]"
                        />
                        Arrastrar cuadrante con sus elementos hijos
                      </label>
                    </div>
                  </div>
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
        <strong>Xtreme Gym · Plano esquemático · Piso {floor}</strong>
        <span>Inventario: {inventory.length} activos · Escala visual, no arquitectónica</span>
      </div>
      <p className="sr-only" aria-live="polite">{message}</p>
      {message && <div className={styles.toast} aria-hidden="true">{message}</div>}
    </section>
  );
}
