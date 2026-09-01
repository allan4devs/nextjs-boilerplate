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
const ZONE_ORDER = ["Pierna", "Pecho", "Espalda", "Hombro", "Full body", "Cardio"];

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
