export type FloorAssetKind = "machine" | "bench" | "plate";
export type FloorAssetStatus = "bueno" | "fuera_de_servicio" | "pendiente" | "sin_dato";

export type FloorInventoryItem = {
  id: string;
  area: string;
  kind: FloorAssetKind;
  code: string;
  name: string;
  location: string;
  status: FloorAssetStatus;
  machineGuideId?: string;
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
};

export type CustomElementType = "area" | "obstacle" | "access" | "equipment";

export type CustomElement = Geometry & {
  id: string;
  type: CustomElementType;
  label: string;
  color: string;
  locked: boolean;
};

export type PlanDocument = {
  version: 1;
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
export const PLAN_VERSION = 1;
export const MIN_ITEM_SIZE = 28;

const CANVAS_WIDTH_MIN = 1400;
const CANVAS_MIN_HEIGHT = 1000;
const OUTER_PADDING = 40;
const ITEM_GAP = 16;
const AREA_GAP = 34;
const AREA_HEADER = 58;
const COLUMN_GAP = 28;
const COLUMN_GROUP_GAP = 72;
const COLUMN_INNER_PAD = 16;
const MACHINE_UNIT = 112;
const NARROW_COLS_PER_ROW = 2;
const WIDE_COLS_PER_ROW = 4;

/**
 * El plano físico agrupa "Pesas - Bancos" + "Pesas - Discos" como una franja de
 * peso libre, "Cardio" como la franja de caminadoras, y el resto en columnas
 * lado a lado con "Piernas" aparte (más ancha). Los nombres de área son los
 * mismos del inventario; solo cambia cómo se acomodan al crear el plano inicial.
 */
const BAND_AREAS = ["Pesas - Bancos", "Pesas - Discos", "Cardio"];
const NARROW_COLUMN_AREAS = [
  "Recepción - Izquierda",
  "Recepción - Derecha",
  "Zona Central",
  "Poleas adicionales",
];
const WIDE_COLUMN_AREA = "Piernas";

const AREA_COLORS: Record<string, string> = {
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

function packFlowLayout(
  assets: FloorInventoryItem[],
  originX: number,
  originY: number,
  maxWidth: number,
): { placements: Record<string, AssetPlacement>; bottom: number } {
  const placements: Record<string, AssetPlacement> = {};
  let x = originX;
  let y = originY;
  let rowHeight = 0;

  for (const asset of assets) {
    const size = defaultSizeForKind(asset.kind);
    if (x !== originX && x + size.width > originX + maxWidth) {
      x = originX;
      y += rowHeight + ITEM_GAP;
      rowHeight = 0;
    }

    placements[asset.id] = { x, y, width: size.width, height: size.height, locked: false };
    x += size.width + ITEM_GAP;
    rowHeight = Math.max(rowHeight, size.height);
  }

  return { placements, bottom: rowHeight ? y + rowHeight : originY };
}

export function createInitialPlan(inventory: FloorInventoryItem[]): PlanDocument {
  const groups = new Map<string, FloorInventoryItem[]>();
  for (const asset of inventory) {
    const group = groups.get(asset.area) ?? [];
    group.push(asset);
    groups.set(asset.area, group);
  }

  const placements: Record<string, AssetPlacement> = {};
  const customElements: CustomElement[] = [];

  const narrowColWidth =
    COLUMN_INNER_PAD * 2 + NARROW_COLS_PER_ROW * MACHINE_UNIT + (NARROW_COLS_PER_ROW - 1) * ITEM_GAP;
  const wideColWidth =
    COLUMN_INNER_PAD * 2 + WIDE_COLS_PER_ROW * MACHINE_UNIT + (WIDE_COLS_PER_ROW - 1) * ITEM_GAP;
  const columnsRowWidth =
    NARROW_COLUMN_AREAS.length * narrowColWidth +
    (NARROW_COLUMN_AREAS.length - 1) * COLUMN_GAP +
    COLUMN_GROUP_GAP +
    wideColWidth;
  const canvasWidth = Math.max(CANVAS_WIDTH_MIN, columnsRowWidth + OUTER_PADDING * 2);

  let cursorY = OUTER_PADDING;

  // Franjas anchas arriba: "Pesas - Bancos" + "Pesas - Discos" juntas leen como
  // el bloque de peso libre; "Cardio" debajo lee como la franja de caminadoras.
  for (const area of BAND_AREAS) {
    const assets = groups.get(area) ?? [];
    const areaTop = cursorY;
    const innerX = OUTER_PADDING + 56;
    const innerWidth = canvasWidth - OUTER_PADDING * 2 - 56;
    const { placements: bandPlacements, bottom } = packFlowLayout(
      assets,
      innerX,
      areaTop + AREA_HEADER,
      innerWidth,
    );
    Object.assign(placements, bandPlacements);
    const areaBottom = Math.max(areaTop + 118, bottom + 32);
    customElements.push({
      id: `seed-area-${slug(area)}`,
      type: "area",
      label: area,
      color: colorForArea(area),
      x: OUTER_PADDING,
      y: areaTop,
      width: canvasWidth - OUTER_PADDING * 2,
      height: areaBottom - areaTop,
      locked: true,
    });
    cursorY = areaBottom + AREA_GAP;
  }

  // Fila de columnas abajo: 4 angostas una junto a otra y "Piernas" aparte,
  // más ancha, como el bloque PIERNA separado del plano físico.
  const columnsTop = cursorY;
  let columnX = OUTER_PADDING;
  let columnsBottom = columnsTop;

  for (const area of NARROW_COLUMN_AREAS) {
    const assets = groups.get(area) ?? [];
    const innerX = columnX + COLUMN_INNER_PAD;
    const innerWidth = narrowColWidth - COLUMN_INNER_PAD * 2;
    const contentTop = columnsTop + AREA_HEADER;

    let contentBottom: number;
    let gradasBox: CustomElement | null = null;

    if (area === "Recepción - Izquierda") {
      // Las 2 "gradas" (stair steppers) de esta área quedan aparte, en su
      // propia caja anidada, como el recuadro "2 gradas" del plano físico.
      const stairAssets = assets.filter((asset) => asset.machineGuideId === "stair-stepper");
      const restAssets = assets.filter((asset) => asset.machineGuideId !== "stair-stepper");
      const rest = packFlowLayout(restAssets, innerX, contentTop, innerWidth);
      Object.assign(placements, rest.placements);
      const gradasTop = rest.bottom + ITEM_GAP;
      const gradas = packFlowLayout(stairAssets, innerX, gradasTop, innerWidth);
      Object.assign(placements, gradas.placements);
      contentBottom = stairAssets.length ? gradas.bottom : rest.bottom;
      if (stairAssets.length) {
        gradasBox = {
          id: "seed-area-2-gradas",
          type: "area",
          label: `${stairAssets.length} gradas`,
          color: "#f8fafc",
          x: innerX - COLUMN_INNER_PAD / 2,
          y: gradasTop - COLUMN_INNER_PAD / 2,
          width: innerWidth + COLUMN_INNER_PAD,
          height: gradas.bottom - gradasTop + COLUMN_INNER_PAD,
          locked: true,
        };
      }
    } else {
      const result = packFlowLayout(assets, innerX, contentTop, innerWidth);
      Object.assign(placements, result.placements);
      contentBottom = result.bottom;
    }

    const columnBottom = Math.max(columnsTop + 160, contentBottom + 24);
    customElements.push({
      id: `seed-area-${slug(area)}`,
      type: "area",
      label: area,
      color: colorForArea(area),
      x: columnX,
      y: columnsTop,
      width: narrowColWidth,
      height: columnBottom - columnsTop,
      locked: true,
    });
    if (gradasBox) customElements.push(gradasBox);
    columnsBottom = Math.max(columnsBottom, columnBottom);
    columnX += narrowColWidth + COLUMN_GAP;
  }

  {
    const assets = groups.get(WIDE_COLUMN_AREA) ?? [];
    const wideX = columnX + COLUMN_GROUP_GAP - COLUMN_GAP;
    const innerX = wideX + COLUMN_INNER_PAD;
    const innerWidth = wideColWidth - COLUMN_INNER_PAD * 2;
    const { placements: widePlacements, bottom } = packFlowLayout(
      assets,
      innerX,
      columnsTop + AREA_HEADER,
      innerWidth,
    );
    Object.assign(placements, widePlacements);
    const columnBottom = Math.max(columnsTop + 160, bottom + 24);
    customElements.push({
      id: `seed-area-${slug(WIDE_COLUMN_AREA)}`,
      type: "area",
      label: WIDE_COLUMN_AREA,
      color: colorForArea(WIDE_COLUMN_AREA),
      x: wideX,
      y: columnsTop,
      width: wideColWidth,
      height: columnBottom - columnsTop,
      locked: true,
    });
    columnsBottom = Math.max(columnsBottom, columnBottom);
  }

  return {
    version: PLAN_VERSION,
    canvas: {
      width: canvasWidth,
      height: Math.max(CANVAS_MIN_HEIGHT, columnsBottom + OUTER_PADDING),
      gridSize: 20,
    },
    placements,
    customElements,
  };
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
          ? { label: rawPlacement.label.trim().slice(0, 120) }
          : {}),
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
      });
    }
  }

  return {
    version: PLAN_VERSION,
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
