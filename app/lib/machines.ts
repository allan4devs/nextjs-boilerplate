/**
 * Punto de acceso del subsistema /maquinas al catálogo de equipos.
 *
 * La fuente de verdad sigue siendo el catálogo del Member OS
 * (`app/components/member/catalog/machines.ts`); acá sólo se re-exporta y se
 * agregan los helpers de ruta/QR propios de esta superficie pública.
 */

import { absoluteAppUrl } from "@/lib/constants/app-url";

export {
  MACHINE_GUIDE,
  findMachineGuide,
  youtubeThumb,
  youtubeVideoId,
} from "@/app/components/member/catalog/machines";
export type { MachineGuide } from "@/app/components/member/domain/training";

import { MACHINE_GUIDE } from "@/app/components/member/catalog/machines";

/** Ruta interna de la ficha de una máquina. */
export function machinePath(id: string) {
  return `/maquinas/${id}`;
}

/** URL absoluta que codifica el QR pegado en la máquina. */
export function machineQrValue(id: string) {
  return absoluteAppUrl(`/maquinas/${id}`);
}

/** Slug estable de una zona, para anclas `#zona-...` del catálogo. Pura, usable en cliente y servidor. */
export function zoneSlug(zone: string) {
  const plain = zone
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `zona-${plain}`;
}

/** Orden de zonas para el catálogo (las que no aparezcan van al final, alfabéticas). */
const ZONE_ORDER = ["Pierna", "Pecho", "Espalda", "Hombro", "Brazo", "Core", "Full body", "Cardio"];

export type MachineZoneGroup = {
  zone: string;
  machines: typeof MACHINE_GUIDE;
};

/** Agrupa el catálogo por zona respetando `ZONE_ORDER`. */
export function machinesByZone(): MachineZoneGroup[] {
  const zones = Array.from(new Set(MACHINE_GUIDE.map((m) => m.zone)));
  zones.sort((a, b) => {
    const ia = ZONE_ORDER.indexOf(a);
    const ib = ZONE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "es");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return zones.map((zone) => ({
    zone,
    machines: MACHINE_GUIDE.filter((m) => m.zone === zone),
  }));
}

/** Máquina anterior / siguiente en el orden del catálogo (con wrap). */
export function machineNeighbors(id: string) {
  const index = MACHINE_GUIDE.findIndex((m) => m.id === id);
  if (index === -1) return { prev: null, next: null };
  const prev = MACHINE_GUIDE[(index - 1 + MACHINE_GUIDE.length) % MACHINE_GUIDE.length];
  const next = MACHINE_GUIDE[(index + 1) % MACHINE_GUIDE.length];
  return { prev, next };
}

/**
 * Inventario físico de sala: código estable (según la auditoría de activos
 * fijos) + cuántas unidades hay de cada equipo. Es la fuente de verdad de las
 * etiquetas QR que se pegan en las máquinas.
 *
 * - `code` es el código impreso en el piso, tal como está hoy en la
 *   auditoría física. La mayoría de equipos todavía NO tiene código asignado
 *   (`""`) — el QR funciona igual porque el payload es la URL
 *   (`machineQrValue`), no el código impreso; cuando el staff le pegue un
 *   número físico a una máquina, actualizá su `code` acá.
 * - `units` es cuántas máquinas iguales hay en el piso. Si es > 1, cada unidad
 *   recibe una letra consecutiva (A, B, C…) al imprimir. Pesas sueltas y
 *   discos NO están acá — se manejan como inventario aparte en
 *   `xtreme_gym_equipment_assets` (`lib/xtreme/equipment.ts`, panel
 *   `/admin/equipo`), junto con el estado (funcionando/fuera de servicio),
 *   marca, costo, etc. de cada activo físico, máquinas incluidas.
 */
type MachineInventory = { code: string; units: number };

const MACHINE_INVENTORY: Record<string, MachineInventory> = {
  // Piernas
  "leg-press": { code: "", units: 1 },
  "leg-extension": { code: "25", units: 2 },
  "leg-curl": { code: "26", units: 1 },
  "hip-abductor": { code: "19", units: 2 },
  "glute-hip-extension": { code: "18", units: 1 },
  "hip-abductor-aductor-dual": { code: "19-20", units: 1 },
  "pendulum-squat": { code: "21", units: 1 },
  "leg-press-incline": { code: "22", units: 1 },
  "horizontal-leg-press": { code: "23", units: 1 },
  "lying-squat": { code: "24", units: 1 },
  "leg-curl-extension-dual": { code: "26-dual", units: 1 },
  "lying-leg-curl": { code: "28", units: 1 },
  "smith-machine": { code: "29", units: 1 },
  "sentadilla-potro": { code: "30", units: 1 },
  "calf-press-horizontal": { code: "31", units: 1 },
  "sissy-squat": { code: "32", units: 1 },
  "hack-squat": { code: "35", units: 1 },
  "sentadilla-perfecta": { code: "37", units: 1 },
  "tubo-pesas-pendiente": { code: "", units: 1 },
  "multiestacion-pie-pendiente": { code: "", units: 1 },
  "hip-thrust": { code: "", units: 1 },
  // Cardio (+ steppers/caminadora que también hay en Recepción)
  treadmill: { code: "", units: 19 },
  "stair-stepper": { code: "", units: 5 },
  "stair-climber": { code: "", units: 2 },
  // Espalda / poleas
  "lat-pulldown": { code: "3", units: 1 },
  "seated-row": { code: "", units: 1 },
  "remo-hammer-strength": { code: "1", units: 1 },
  "remo-hammer": { code: "6", units: 1 },
  "remo-t": { code: "7", units: 1 },
  "back-extension": { code: "17", units: 1 },
  "dominada-asistida": { code: "2", units: 2 },
  "rear-delt-fly": { code: "11", units: 1 },
  // Pecho / hombro
  "chest-press": { code: "10", units: 1 },
  "incline-chest-press": { code: "9", units: 2 },
  "pec-deck": { code: "", units: 1 },
  "shoulder-press": { code: "", units: 1 },
  "overhead-press-machine": { code: "14", units: 1 },
  // Core / brazo
  "torso-rotation": { code: "15", units: 1 },
  "ab-machine": { code: "16", units: 1 },
  "preacher-curl": { code: "12", units: 2 },
  "elbow-extension": { code: "13", units: 1 },
  "dip-machine": { code: "13-dips", units: 1 },
  // Full body / poleas / Recepción
  "cable-station": { code: "", units: 4 },
  "polea-crossover": { code: "", units: 1 },
  "bicicleta-estatica": { code: "", units: 1 },
  "multiestacion-recepcion": { code: "", units: 1 },
  "banca-inclinada-pendiente": { code: "", units: 1 },
};

const UNIT_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Código base (numérico) asignado a una máquina, o "" si no está en el inventario. */
export function machineBaseCode(id: string) {
  return MACHINE_INVENTORY[id]?.code ?? "";
}

export type MachineLabel = {
  /** Id de la máquina en el catálogo. */
  id: string;
  name: string;
  zone: string;
  /** Código impreso: numérico ("05") o numérico + letra si se repite ("05A"). */
  code: string;
  /** Código base sin letra ("05"). */
  baseCode: string;
  /** Letra de la unidad ("A") o `null` cuando la máquina es única. */
  unitLetter: string | null;
  /** Posición de la unidad (1-based) y total de unidades del modelo. */
  unit: number;
  units: number;
  /** Payload del QR: la URL de la ficha pública (la misma para todas las unidades). */
  url: string;
};

/**
 * Expande el catálogo a una etiqueta por unidad física, respetando el orden del
 * catálogo. Cada modelo con `units > 1` genera varias filas (05A, 05B…); todas
 * apuntan al mismo QR (la ficha de la máquina), pero con su código único.
 */
export function machineLabels(): MachineLabel[] {
  const labels: MachineLabel[] = [];
  for (const machine of MACHINE_GUIDE) {
    const inv = MACHINE_INVENTORY[machine.id];
    const baseCode = inv?.code ?? "";
    const units = Math.max(1, inv?.units ?? 1);
    const url = machineQrValue(machine.id);
    for (let i = 0; i < units; i += 1) {
      const unitLetter = units > 1 ? (UNIT_LETTERS[i] ?? String(i + 1)) : null;
      const code = unitLetter ? `${baseCode}${unitLetter}` : baseCode;
      labels.push({
        id: machine.id,
        name: machine.name,
        zone: machine.zone,
        code,
        baseCode,
        unitLetter,
        unit: i + 1,
        units,
        url,
      });
    }
  }
  return labels;
}
