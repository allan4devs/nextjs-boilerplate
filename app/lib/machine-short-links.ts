/**
 * Alias públicos permanentes de las guías, independientes del texto editable
 * de las etiquetas y del orden del catálogo. Una clave ya impresa no se debe
 * reasignar a otra guía aunque cambie el código o la ubicación de un equipo.
 *
 * Las claves iniciales conservan el primer código del inventario físico por
 * guía. LP01 y SR01 identifican guías sin un código físico en ese inventario.
 */
export const MACHINE_SHORT_KEYS: Readonly<Record<string, string>> = {
  "leg-press": "LP01",
  "leg-extension": "PI08",
  "leg-curl": "PI10",
  "hip-abductor": "PI02",
  "glute-hip-extension": "PI01",
  "hip-abductor-aductor-dual": "PI03",
  "pendulum-squat": "PI04",
  "leg-press-incline": "PI05",
  "horizontal-leg-press": "PI06",
  "lying-squat": "PI07",
  "leg-curl-extension-dual": "PI11",
  "lying-leg-curl": "PI12",
  "smith-machine": "PI13",
  "sentadilla-potro": "PI14",
  "calf-press-horizontal": "PI15",
  "sissy-squat": "PI16",
  "hack-squat": "PI17",
  "sentadilla-perfecta": "PI18",
  "tubo-pesas-pendiente": "PI19",
  "multiestacion-pie-pendiente": "PI20",
  "hip-thrust": "PI21",
  treadmill: "CA01",
  "stair-stepper": "CA19",
  "stair-climber": "CA22",
  "lat-pulldown": "RI04",
  "seated-row": "SR01",
  "remo-hammer-strength": "RI01",
  "remo-hammer": "RI05",
  "remo-t": "RI06",
  "back-extension": "RD06",
  "dominada-asistida": "RI02",
  "rear-delt-fly": "RD02",
  "chest-press": "RD01",
  "incline-chest-press": "RD07",
  "pec-deck": "RD08",
  "shoulder-press": "RI07",
  "overhead-press-machine": "RD03",
  "torso-rotation": "RD04",
  "ab-machine": "RD05",
  "preacher-curl": "ZC01",
  "elbow-extension": "ZC03",
  "dip-machine": "ZC04",
  "cable-station": "PA01",
  "polea-crossover": "ZC05",
  "bicicleta-estatica": "RI08",
  "multiestacion-recepcion": "RI10",
  "banca-inclinada-pendiente": "RD10",
};

const keysByGuide = new Map(Object.entries(MACHINE_SHORT_KEYS));
const guidesByKey = new Map(
  Object.entries(MACHINE_SHORT_KEYS).map(([guideId, key]) => [key, guideId]),
);

/** Acepta también minúsculas al escribir una dirección desde la etiqueta. */
export function getMachineGuideIdFromShortKey(key: string): string | undefined {
  return guidesByKey.get(key.toUpperCase());
}

/** URL legible de respaldo, conservando el origen de la URL real del QR. */
export function getMachineShortUrl(guideId: string, canonicalUrl: string): string {
  const key = keysByGuide.get(guideId);
  if (!key) return canonicalUrl;

  try {
    const canonical = new URL(canonicalUrl);
    if (canonical.protocol !== "http:" && canonical.protocol !== "https:") {
      return canonicalUrl;
    }
    return new URL(`/m/${key}`, canonical.origin).href;
  } catch {
    return canonicalUrl;
  }
}
