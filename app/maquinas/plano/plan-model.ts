import { migrateEquipmentCode } from "@/lib/xtreme/equipment-area-codes";

export type FloorAssetKind = "machine" | "bench" | "plate";
export type FloorAssetStatus = "bueno" | "fuera_de_servicio" | "pendiente" | "sin_dato";

export type FloorInventoryItem = {
  id: string;
  floor?: 1 | 2;
  area: string;
  kind: FloorAssetKind;
  code: string;
  name: string;
  location: string;
  status: FloorAssetStatus;
  machineGuideId?: string;
  trainingCategory?: string;
  muscleGroup?: string;
};

export type Geometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AssetPlacement = Geometry & {
  locked: boolean;
  label?: string;
  code?: string;
};

export type CustomElementType = "area" | "obstacle" | "access" | "equipment";

export type CustomElement = Geometry & {
  id: string;
  type: CustomElementType;
  label: string;
  color: string;
  locked: boolean;
  machineGuideId?: string;
};

export type PlanDocument = {
  version: 1;
  areaLayoutRevision?: number;
  secondFloorEquipmentRevision?: number;
  canvas: {
    width: number;
    height: number;
    gridSize: number;
  };
  placements: Record<string, AssetPlacement>;
  customElements: CustomElement[];
};

export type PlanTarget =
  | { kind: "asset"; id: string }
  | { kind: "custom"; id: string };

export const PLAN_STORAGE_KEY = "xtreme:machines-floor-plan:v1";
export function floorPlanStorageKey(floor: 1 | 2) {
  return floor === 1 ? PLAN_STORAGE_KEY : `${PLAN_STORAGE_KEY}:floor-2`;
}

export function createSecondFloorPlan(inventory: FloorInventoryItem[] = []): PlanDocument {
  const plan: PlanDocument = {
    version: 1, areaLayoutRevision: AREA_LAYOUT_REVISION,
    canvas: { width: 1600, height: 1000, gridSize: 20 },
    placements: {},
    customElements: [
      { id: "floor-2-bikes", label: "Bicicletas", color: "#22d3ee" },
      { id: "floor-2-calisthenics", label: "Calistenia", color: "#a78bfa" },
      { id: "floor-2-free-weights", label: "Peso libre", color: "#fbbf24" },
    ].map((block, index) => ({ ...block, type: "area", locked: false, x: 60 + index * 500, y: 100, width: 440, height: 400 })),
  };
  return completeSecondFloorPlan(plan, inventory);
}

/** Add newly confirmed units once, preserving edited blocks and every existing position. */
export function completeSecondFloorPlan(plan: PlanDocument, inventory: FloorInventoryItem[]): PlanDocument {
  if (plan.secondFloorEquipmentRevision === 1 || !inventory.length) return plan;
  let next: PlanDocument = { ...plan, placements: { ...plan.placements }, secondFloorEquipmentRevision: 1 };
  for (const asset of inventory) {
    if (next.placements[asset.id]) continue;
    const size = defaultSizeForKind(asset.kind);
    const position = findOpenPosition(next, size);
    next = { ...next, canvas: { ...next.canvas, height: position.requiredHeight }, placements: {
      ...next.placements, [asset.id]: { x: position.x, y: position.y, ...size, locked: false },
    } };
  }
  return next;
}

export function linkKnownPlanMachines(plan: PlanDocument, guides: Array<{ id: string; name: string }>): PlanDocument {
  let changed = false;
  const customElements = plan.customElements.map((element) => {
    if (element.type !== "equipment" || element.machineGuideId) return element;
    const normalized = normalizeForSearch(element.label).replace(/\s+copia$/, "").trim();
    const matches = new Set(guides.filter((guide) => normalizeForSearch(guide.name).trim() === normalized).map((guide) => guide.id));
    if (matches.size !== 1) return element;
    changed = true;
    return { ...element, machineGuideId: [...matches][0] };
  });
  return changed ? { ...plan, customElements } : plan;
}
export const PLAN_VERSION = 1;
export const MIN_ITEM_SIZE = 28;

export const AREA_LAYOUT_REVISION = 2;
const OUTER_PADDING = 40;
const ITEM_GAP = 16;
const AREA_HEADER = 58;
const AREA_ORDER = ["Tren superior", "Piernas", "Abs", "Cardio", "Poleas adicionales", "Pesas - Bancos", "Pesas - Discos"];
const AREA_PREFIX: Record<string, string> = { "Tren superior": "TS", Piernas: "PI", Abs: "AB", Cardio: "CA", "Poleas adicionales": "PA", "Pesas - Bancos": "PB", "Pesas - Discos": "PD" };

const AREA_COLORS: Record<string, string> = {
  "Tren superior": "#60a5fa",
  Abs: "#f472b6",
  Piernas: "#d8ff3e",
  "Pesas - Bancos": "#fbbf24",
  "Pesas - Discos": "#fb923c",
  Cardio: "#22d3ee",
  "Recepción - Izquierda": "#a78bfa",
  "Recepción - Derecha": "#f472b6",
  "Zona Central": "#60a5fa",
  "Poleas adicionales": "#34d399",
};

export const KIND_LABELS: Record<FloorAssetKind, string> = {
  machine: "Máquina",
  bench: "Banco",
  plate: "Disco",
};

export const STATUS_LABELS: Record<FloorAssetStatus, string> = {
  bueno: "Bueno",
  fuera_de_servicio: "Fuera de servicio",
  pendiente: "Pendiente",
  sin_dato: "Sin dato",
};

export const CUSTOM_TYPE_LABELS: Record<CustomElementType, string> = {
  area: "Área",
  obstacle: "Obstáculo",
  access: "Acceso",
  equipment: "Equipo manual",
};

export function colorForArea(area: string) {
  return AREA_COLORS[area] ?? "#d8ff3e";
}

export function defaultSizeForKind(kind: FloorAssetKind): Pick<Geometry, "width" | "height"> {
  if (kind === "plate") return { width: 36, height: 36 };
  if (kind === "bench") return { width: 94, height: 52 };
  return { width: 112, height: 72 };
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Categories come from each machine's existing guide, not from its editable name. */
function quadrantFor(asset: FloorInventoryItem): string {
  if (asset.area === "Piernas") return asset.muscleGroup || asset.trainingCategory || "Piernas";
  if (asset.area === "Abs") return "Abdominales y core";
  return asset.trainingCategory || asset.area;
}

export function createInitialPlan(inventory: FloorInventoryItem[], previous?: PlanDocument): PlanDocument {
  const placements: Record<string, AssetPlacement> = {};
  const customElements: CustomElement[] = [];
  // Two columns with enough room for readable category quadrants and machine labels.
  const largestWidth = Math.max(112, ...Object.values(previous?.placements ?? {}).map((item) => item.width));
  const blockWidth = Math.max(940, largestWidth + 96);
  const columns = blockWidth > 2300 ? 1 : 2;
  const canvasWidth = Math.min(5000, OUTER_PADDING * 2 + blockWidth * columns + 40 * (columns - 1));
  const columnBottoms = Array.from({ length: columns }, () => OUTER_PADDING);
  const areas = [...new Set(inventory.map((asset) => asset.area))].sort((a, b) => {
    const ai = AREA_ORDER.indexOf(a), bi = AREA_ORDER.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
  });
  for (const area of areas) {
    const column = columnBottoms.indexOf(Math.min(...columnBottoms));
    const x = OUTER_PADDING + column * (blockWidth + 40);
    const y = columnBottoms[column];
    const members = inventory.filter((asset) => asset.area === area);
    const categories = [...new Set(members.map(quadrantFor))].sort((a, b) => a.localeCompare(b));
    let cursorY = y + AREA_HEADER;
    const childAreas: CustomElement[] = [];
    for (const category of categories) {
      const group = members.filter((asset) => quadrantFor(asset) === category);
      const innerX = x + 32;
      const top = cursorY;
      let itemX = innerX + 16;
      let itemY = top + 44;
      let rowHeight = 0;
      for (const asset of group) {
        const old = previous?.placements[asset.id];
        const size = old ?? defaultSizeForKind(asset.kind);
        if (itemX > innerX + 16 && itemX + size.width > x + blockWidth - 48) {
          itemX = innerX + 16;
          itemY += rowHeight + ITEM_GAP;
          rowHeight = 0;
        }
        placements[asset.id] = { ...old, ...(old?.code !== undefined ? { code: migrateEquipmentCode(asset.id, old.code) } : {}), x: itemX, y: itemY, width: size.width, height: size.height, locked: old?.locked ?? false };
        itemX += size.width + ITEM_GAP;
        rowHeight = Math.max(rowHeight, size.height);
      }
      const height = itemY + rowHeight + 20 - top;
      childAreas.push({ id: `seed-category-${slug(area)}-${slug(category)}`, type: "area", label: category,
        color: colorForArea(area), locked: false, x: innerX, y: top, width: blockWidth - 64, height });
      cursorY += height + 20;
    }
    customElements.push({ id: `seed-area-${slug(area)}`, type: "area", label: AREA_PREFIX[area] ? `${AREA_PREFIX[area]} · ${area}` : area,
      color: colorForArea(area), locked: false, x, y, width: blockWidth, height: cursorY - y + 8 }, ...childAreas);
    columnBottoms[column] = cursorY + 48;
  }
  let height = Math.max(1000, ...columnBottoms);
  // Keep user-created rooms, obstacles, doors and manual equipment as editable objects.
  const extras = previous?.customElements.filter((element) => !element.id.startsWith("seed-area-") && !element.id.startsWith("seed-category-")) ?? [];
  if (extras.length) {
    const minX = Math.min(...extras.map((element) => element.x));
    const minY = Math.min(...extras.map((element) => element.y));
    const originY = height;
    for (const element of extras) {
      const moved = { ...element, x: element.x - minX + OUTER_PADDING, y: element.y - minY + originY };
      customElements.push(moved);
      height = Math.max(height, moved.y + moved.height + OUTER_PADDING);
    }
  }
  return { version: PLAN_VERSION, areaLayoutRevision: AREA_LAYOUT_REVISION,
    canvas: { width: Math.max(canvasWidth, ...customElements.map((element) => element.x + element.width + OUTER_PADDING)), height, gridSize: previous?.canvas.gridSize ?? 20 },
    placements, customElements };
}

/** Runs once for old saved layouts. Later hand edits keep their exact positions. */
export function migratePlanAreas(plan: PlanDocument, inventory: FloorInventoryItem[]): PlanDocument {
  if ((plan.areaLayoutRevision ?? 0) >= AREA_LAYOUT_REVISION) return plan;
  return createInitialPlan(inventory.filter((asset) => Boolean(plan.placements[asset.id])), plan);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function snap(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

export function clampGeometry(geometry: Geometry, plan: PlanDocument): Geometry {
  const width = clamp(Math.round(geometry.width), MIN_ITEM_SIZE, plan.canvas.width);
  const height = clamp(Math.round(geometry.height), MIN_ITEM_SIZE, plan.canvas.height);
  return {
    x: clamp(Math.round(geometry.x), 0, plan.canvas.width - width),
    y: clamp(Math.round(geometry.y), 0, plan.canvas.height - height),
    width,
    height,
  };
}

export function getTargetGeometry(plan: PlanDocument, target: PlanTarget): Geometry | null {
  if (target.kind === "asset") return plan.placements[target.id] ?? null;
  return plan.customElements.find((element) => element.id === target.id) ?? null;
}

export function updateTargetGeometry(
  plan: PlanDocument,
  target: PlanTarget,
  geometry: Geometry,
): PlanDocument {
  const nextGeometry = clampGeometry(geometry, plan);

  if (target.kind === "asset") {
    const current = plan.placements[target.id];
    if (!current) return plan;
    return {
      ...plan,
      placements: {
        ...plan.placements,
        [target.id]: { ...current, ...nextGeometry },
      },
    };
  }

  return {
    ...plan,
    customElements: plan.customElements.map((element) =>
      element.id === target.id ? { ...element, ...nextGeometry } : element,
    ),
  };
}

export function updateTargetGeometries(
  plan: PlanDocument,
  updates: Array<{ target: PlanTarget; geometry: Geometry }>,
): PlanDocument {
  let nextPlacements = plan.placements;
  let placementsChanged = false;
  const customMap = new Map<string, Geometry>();

  for (const update of updates) {
    const nextGeometry = clampGeometry(update.geometry, plan);
    if (update.target.kind === "asset") {
      const current = (placementsChanged ? nextPlacements : plan.placements)[update.target.id];
      if (current) {
        if (!placementsChanged) {
          nextPlacements = { ...plan.placements };
          placementsChanged = true;
        }
        nextPlacements[update.target.id] = { ...current, ...nextGeometry };
      }
    } else {
      customMap.set(update.target.id, nextGeometry);
    }
  }

  const nextCustomElements = customMap.size
    ? plan.customElements.map((element) => {
        const update = customMap.get(element.id);
        return update ? { ...element, ...update } : element;
      })
    : plan.customElements;

  return {
    ...plan,
    placements: nextPlacements,
    customElements: nextCustomElements,
  };
}

export function isPointInGeometry(px: number, py: number, bounds: Geometry): boolean {
  return px >= bounds.x && px <= bounds.x + bounds.width && py >= bounds.y && py <= bounds.y + bounds.height;
}

export function isItemInsideArea(item: Geometry, area: Geometry): boolean {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  return isPointInGeometry(cx, cy, area);
}

export function getAreaChildrenTargets(
  plan: PlanDocument,
  areaId: string,
  inventory: FloorInventoryItem[],
): PlanTarget[] {
  const area = plan.customElements.find((el) => el.id === areaId && el.type === "area");
  if (!area) return [];
  const targets: PlanTarget[] = [];

  // Asset placements inside area
  for (const asset of inventory) {
    const placement = plan.placements[asset.id];
    if (placement && isItemInsideArea(placement, area)) {
      targets.push({ kind: "asset", id: asset.id });
    }
  }

  // Other custom elements inside area (excluding the area itself)
  for (const custom of plan.customElements) {
    const inside = custom.type === "area"
      ? custom.x >= area.x && custom.y >= area.y && custom.x + custom.width <= area.x + area.width && custom.y + custom.height <= area.y + area.height
      : isItemInsideArea(custom, area);
    if (custom.id !== areaId && inside) {
      targets.push({ kind: "custom", id: custom.id });
    }
  }

  return targets;
}

export function clampGroupDelta(
  items: Geometry[],
  dx: number,
  dy: number,
  canvas: { width: number; height: number },
): { dx: number; dy: number } {
  if (!items.length) return { dx, dy };

  let minAllowedDx = -Infinity;
  let maxAllowedDx = Infinity;
  let minAllowedDy = -Infinity;
  let maxAllowedDy = Infinity;

  for (const item of items) {
    minAllowedDx = Math.max(minAllowedDx, -item.x);
    maxAllowedDx = Math.min(maxAllowedDx, canvas.width - (item.x + item.width));
    minAllowedDy = Math.max(minAllowedDy, -item.y);
    maxAllowedDy = Math.min(maxAllowedDy, canvas.height - (item.y + item.height));
  }

  return {
    dx: clamp(dx, minAllowedDx, maxAllowedDx),
    dy: clamp(dy, minAllowedDy, maxAllowedDy),
  };
}

export function reorganizeAreaChildren(
  plan: PlanDocument,
  areaId: string,
  inventory: FloorInventoryItem[],
  customAreaGeometry?: Geometry,
): {
  plan: PlanDocument;
  areaGeometry: Geometry;
  updates: Array<{ target: PlanTarget; geometry: Geometry }>;
} | null {
  const area = plan.customElements.find((el) => el.id === areaId && el.type === "area");
  if (!area) return null;

  const currentAreaGeom = customAreaGeometry ?? area;
  const allChildren = getAreaChildrenTargets(plan, areaId, inventory);
  const nestedAreas = allChildren.flatMap((target) => {
    const element = target.kind === "custom" ? plan.customElements.find((item) => item.id === target.id && item.type === "area") : undefined;
    return element ? [element] : [];
  });
  // Pack immediate children only. Nested quadrants carry their own contents together.
  const childTargets = allChildren.filter((target) => {
    const geometry = getTargetGeometry(plan, target);
    return geometry && !nestedAreas.some((nested) => nested.id !== target.id &&
      geometry.x >= nested.x && geometry.y >= nested.y &&
      geometry.x + geometry.width <= nested.x + nested.width &&
      geometry.y + geometry.height <= nested.y + nested.height);
  });
  if (!childTargets.length) {
    return {
      plan: customAreaGeometry
        ? updateTargetGeometry(plan, { kind: "custom", id: areaId }, currentAreaGeom)
        : plan,
      areaGeometry: currentAreaGeom,
      updates: [],
    };
  }

  // Obtenemos los elementos hijos ordenados por su posición visual actual (arriba-abajo, izq-der)
  const childItems = childTargets
    .map((target) => {
      const geometry = getTargetGeometry(plan, target);
      return geometry ? { target, geometry } : null;
    })
    .filter((item): item is { target: PlanTarget; geometry: Geometry } => item !== null)
    .sort((a, b) => {
      const rowDiff = Math.round(a.geometry.y / 24) - Math.round(b.geometry.y / 24);
      if (rowDiff !== 0) return rowDiff;
      return a.geometry.x - b.geometry.x;
    });

  const PADDING_X = 16;
  const PADDING_BOTTOM = 16;
  const HEADER_OFFSET = AREA_HEADER;
  const GAP_X = 14;
  const GAP_Y = 14;

  const startX = currentAreaGeom.x + PADDING_X;
  const startY = currentAreaGeom.y + HEADER_OFFSET;

  // El ancho debe ser suficiente para el elemento más ancho
  const maxChildWidth = childItems.reduce((max, c) => Math.max(max, c.geometry.width), 0);
  const minRequiredWidth = Math.max(MIN_ITEM_SIZE, maxChildWidth + PADDING_X * 2);
  const effectiveAreaWidth = Math.max(currentAreaGeom.width, minRequiredWidth);
  const maxInnerWidth = effectiveAreaWidth - PADDING_X * 2;

  let cursorX = startX;
  let cursorY = startY;
  let rowHeight = 0;
  const updates: Array<{ target: PlanTarget; geometry: Geometry }> = [];

  for (const child of childItems) {
    const w = child.geometry.width;
    const h = child.geometry.height;

    // Si no cabe en la fila actual, saltamos a la siguiente fila
    if (cursorX !== startX && cursorX + w > startX + maxInnerWidth) {
      cursorX = startX;
      cursorY += rowHeight + GAP_Y;
      rowHeight = 0;
    }

    updates.push({
      target: child.target,
      geometry: {
        x: cursorX,
        y: cursorY,
        width: w,
        height: h,
      },
    });

    if (child.target.kind === "custom" && nestedAreas.some((nested) => nested.id === child.target.id)) {
      for (const descendant of getAreaChildrenTargets(plan, child.target.id, inventory)) {
        const geometry = getTargetGeometry(plan, descendant);
        if (geometry) updates.push({ target: descendant, geometry: {
          ...geometry, x: geometry.x + cursorX - child.geometry.x, y: geometry.y + cursorY - child.geometry.y,
        } });
      }
    }

    cursorX += w + GAP_X;
    rowHeight = Math.max(rowHeight, h);
  }

  // La altura del cuadrante debe ajustarse para contener todas las filas sin que salgan del borde
  const totalHeightNeeded = rowHeight ? cursorY + rowHeight + PADDING_BOTTOM - currentAreaGeom.y : currentAreaGeom.height;
  const finalAreaHeight = Math.max(currentAreaGeom.height, totalHeightNeeded);

  const finalAreaGeom: Geometry = {
    x: currentAreaGeom.x,
    y: currentAreaGeom.y,
    width: effectiveAreaWidth,
    height: finalAreaHeight,
  };

  const nextPlan = updateTargetGeometries(plan, [
    { target: { kind: "custom", id: areaId }, geometry: finalAreaGeom },
    ...updates,
  ]);

  return {
    plan: nextPlan,
    areaGeometry: finalAreaGeom,
    updates,
  };
}

function overlaps(a: Geometry, b: Geometry, margin = 8) {
  return !(
    a.x + a.width + margin <= b.x ||
    b.x + b.width + margin <= a.x ||
    a.y + a.height + margin <= b.y ||
    b.y + b.height + margin <= a.y
  );
}

export function findOpenPosition(
  plan: PlanDocument,
  size: Pick<Geometry, "width" | "height">,
): { x: number; y: number; requiredHeight: number } {
  const occupied: Geometry[] = [
    ...Object.values(plan.placements),
    ...plan.customElements.filter((element) => element.type !== "area"),
  ];
  const stepX = Math.max(plan.canvas.gridSize, size.width + plan.canvas.gridSize);
  const stepY = Math.max(plan.canvas.gridSize, size.height + plan.canvas.gridSize);

  for (let y = OUTER_PADDING; y <= plan.canvas.height - size.height; y += stepY) {
    for (let x = OUTER_PADDING; x <= plan.canvas.width - size.width; x += stepX) {
      const candidate = { x, y, ...size };
      if (!occupied.some((item) => overlaps(candidate, item))) {
        return { x, y, requiredHeight: plan.canvas.height };
      }
    }
  }

  const maxBottom = occupied.reduce((max, item) => Math.max(max, item.y + item.height), 0);
  const y = snap(maxBottom + plan.canvas.gridSize * 2, plan.canvas.gridSize);
  return {
    x: OUTER_PADDING,
    y,
    requiredHeight: Math.max(plan.canvas.height, y + size.height + OUTER_PADDING),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseGeometry(value: unknown, canvas: PlanDocument["canvas"]): Geometry | null {
  if (!isRecord(value)) return null;
  if (
    !finiteNumber(value.x) ||
    !finiteNumber(value.y) ||
    !finiteNumber(value.width) ||
    !finiteNumber(value.height)
  ) {
    return null;
  }

  const shell: PlanDocument = {
    version: PLAN_VERSION,
    canvas,
    placements: {},
    customElements: [],
  };
  return clampGeometry(
    { x: value.x, y: value.y, width: value.width, height: value.height },
    shell,
  );
}

export function parsePlanDocument(
  value: unknown,
  inventory: FloorInventoryItem[],
): PlanDocument | null {
  if (!isRecord(value) || value.version !== PLAN_VERSION || !isRecord(value.canvas)) return null;
  if (
    !finiteNumber(value.canvas.width) ||
    !finiteNumber(value.canvas.height) ||
    !finiteNumber(value.canvas.gridSize)
  ) {
    return null;
  }

  const canvas = {
    width: clamp(Math.round(value.canvas.width), 900, 5000),
    height: clamp(Math.round(value.canvas.height), 700, 5000),
    gridSize: clamp(Math.round(value.canvas.gridSize), 5, 100),
  };
  const inventoryIds = new Set(inventory.map((asset) => asset.id));
  const placements: Record<string, AssetPlacement> = {};

  if (isRecord(value.placements)) {
    for (const [id, rawPlacement] of Object.entries(value.placements)) {
      if (!inventoryIds.has(id) || !isRecord(rawPlacement)) continue;
      const geometry = parseGeometry(rawPlacement, canvas);
      if (!geometry) continue;
      placements[id] = {
        ...geometry,
        locked: rawPlacement.locked === true,
        ...(typeof rawPlacement.label === "string" && rawPlacement.label.trim()
          ? { label: rawPlacement.label.trim().slice(0, 140) }
          : {}),
        ...(typeof rawPlacement.code === "string" ? { code: rawPlacement.code.slice(0, 32) } : {}),
      };
    }
  }

  const customElements: CustomElement[] = [];
  const customIds = new Set<string>();
  if (Array.isArray(value.customElements)) {
    for (const rawElement of value.customElements.slice(0, 500)) {
      if (!isRecord(rawElement)) continue;
      if (
        typeof rawElement.id !== "string" ||
        typeof rawElement.label !== "string" ||
        !["area", "obstacle", "access", "equipment"].includes(String(rawElement.type))
      ) {
        continue;
      }
      const id = rawElement.id.trim().slice(0, 100);
      if (!id || customIds.has(id)) continue;
      const geometry = parseGeometry(rawElement, canvas);
      if (!geometry) continue;
      customIds.add(id);
      customElements.push({
        ...geometry,
        id,
        type: rawElement.type as CustomElementType,
        label: rawElement.label.trim().slice(0, 120) || "Elemento",
        color:
          typeof rawElement.color === "string" && /^#[0-9a-f]{6}$/i.test(rawElement.color)
            ? rawElement.color
            : "#d8ff3e",
        locked: rawElement.locked === true,
        ...(typeof rawElement.machineGuideId === "string" && /^[a-z0-9-]{1,100}$/.test(rawElement.machineGuideId) ? { machineGuideId: rawElement.machineGuideId } : {}),
      });
    }
  }

  return {
    version: PLAN_VERSION,
    ...(finiteNumber(value.areaLayoutRevision) ? { areaLayoutRevision: value.areaLayoutRevision } : {}),
    ...(value.secondFloorEquipmentRevision === 1 ? { secondFloorEquipmentRevision: 1 } : {}),
    canvas,
    placements,
    customElements,
  };
}

export function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
