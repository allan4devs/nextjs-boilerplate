import type { Db } from "mongodb";
import { EQUIPMENT_ASSETS_COLLECTION } from "./shared";

export type EquipmentArea =
  | "Piernas"
  | "Pesas - Bancos"
  | "Pesas - Discos"
  | "Cardio"
  | "Recepción - Izquierda"
  | "Recepción - Derecha"
  | "Zona Central"
  | "Poleas adicionales";

export type EquipmentKind = "machine" | "bench" | "plate";

export type EquipmentStatus = "bueno" | "fuera_de_servicio" | "pendiente" | "sin_dato";

export type EquipmentAssetDoc = {
  /** Estable: `eq-001`..`eq-131`, número de fila de la auditoría física original. No es único el código impreso (hay duplicados reales, ej. dos "#25"), así que no se usa como llave. */
  id: string;
  area: EquipmentArea;
  kind: EquipmentKind;
  /** Código impreso en el piso, tal como está hoy (puede estar vacío o duplicado). */
  code: string;
  name: string;
  description?: string;
  location: string;
  status: EquipmentStatus;
  /** Solo `kind: "machine"`: id de la ficha pública en MACHINE_GUIDE que le corresponde. */
  machineGuideId?: string;
  brand?: string;
  serial?: string;
  supplier?: string;
  invoiceNumber?: string;
  year?: number;
  cost?: number;
  depreciation?: string;
  maintenance?: string;
  warranty?: string;
  createdAt: Date;
  updatedAt: Date;
};

type SeedRow = Pick<
  EquipmentAssetDoc,
  "id" | "area" | "kind" | "code" | "name" | "location" | "status"
> &
  Partial<Pick<EquipmentAssetDoc, "description" | "machineGuideId">>;

/**
 * Transcripción 1:1 de la auditoría física de activos fijos de Xtreme Gym
 * (131 equipos, 8 áreas). Es la fuente de verdad inicial del inventario; a
 * partir de acá el staff completa marca/costo/serie/etc. desde
 * `/admin/equipo`. Pesas y discos (`kind: "bench" | "plate"`) no tienen
 * `machineGuideId`: no entran al catálogo público ni al QR de sala.
 */
export const DEFAULT_EQUIPMENT_ASSETS: SeedRow[] = [
  // ── Piernas (22) ───────────────────────────────────────────────────
  { id: "eq-001", area: "Piernas", kind: "machine", code: "18", name: "Glúteo / extensión de cadera", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "glute-hip-extension" },
  { id: "eq-002", area: "Piernas", kind: "machine", code: "19", name: "Hip Abductor", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "hip-abductor" },
  { id: "eq-003", area: "Piernas", kind: "machine", code: "19-20", name: "Abductor / Aductor (dual)", description: "Un equipo, dos estaciones.", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "hip-abductor-aductor-dual" },
  { id: "eq-004", area: "Piernas", kind: "machine", code: "21", name: "Sentadilla péndulo", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "pendulum-squat" },
  { id: "eq-005", area: "Piernas", kind: "machine", code: "22", name: "Prensa inclinada", description: "Número compartido con otra prensa en otra zona.", location: "Planta baja - frente a bronceado / venta de batidos", status: "bueno", machineGuideId: "leg-press-incline" },
  { id: "eq-006", area: "Piernas", kind: "machine", code: "23", name: "Prensa horizontal", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "fuera_de_servicio", machineGuideId: "horizontal-leg-press" },
  { id: "eq-007", area: "Piernas", kind: "machine", code: "24", name: "Sentadilla acostado", description: "Confirmada por rótulo en foto.", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "lying-squat" },
  { id: "eq-008", area: "Piernas", kind: "machine", code: "25", name: "Leg Extension", description: "Primera unidad registrada.", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "leg-extension" },
  { id: "eq-009", area: "Piernas", kind: "machine", code: "25", name: "Leg Extension", description: "Segunda unidad, morada/amarilla, rótulo Xtreme Gym.", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "leg-extension" },
  { id: "eq-010", area: "Piernas", kind: "machine", code: "26", name: "Leg Curl sentado", description: "Confirmado en ficha física llenada por Kengie.", location: "Planta baja - cerca de los sanitarios", status: "bueno", machineGuideId: "leg-curl" },
  { id: "eq-011", area: "Piernas", kind: "machine", code: "26-dual", name: "Leg Curl + Leg Extension (dual)", description: "Un equipo, dos estaciones — distinta a la #26 Cybex.", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "leg-curl-extension-dual" },
  { id: "eq-012", area: "Piernas", kind: "machine", code: "28", name: "Leg Curl acostado (camilla)", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "lying-leg-curl" },
  { id: "eq-013", area: "Piernas", kind: "machine", code: "29", name: "Máquina Smith libre", location: "Planta baja - frente a bronceado / venta de batidos", status: "bueno", machineGuideId: "smith-machine" },
  { id: "eq-014", area: "Piernas", kind: "machine", code: "30", name: "Sentadilla potro", location: "Planta baja - frente a bronceado / venta de batidos", status: "bueno", machineGuideId: "sentadilla-potro" },
  { id: "eq-015", area: "Piernas", kind: "machine", code: "31", name: "Pantorrilla horizontal", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "calf-press-horizontal" },
  { id: "eq-016", area: "Piernas", kind: "machine", code: "32", name: "Sissy Squats", description: "Confirmada por rótulo en foto.", location: "Planta baja - frente a bronceado / venta de batidos", status: "bueno", machineGuideId: "sissy-squat" },
  { id: "eq-017", area: "Piernas", kind: "machine", code: "35", name: "Hack Squat", description: "Corregido de 'sentadilla AC'.", location: "Planta baja - frente a bronceado / venta de batidos", status: "bueno", machineGuideId: "hack-squat" },
  { id: "eq-018", area: "Piernas", kind: "machine", code: "37", name: "Sentadilla Perfecta", description: "Confirmada por rótulo en foto.", location: "Planta baja - frente a bronceado / venta de batidos", status: "bueno", machineGuideId: "sentadilla-perfecta" },
  { id: "eq-019", area: "Piernas", kind: "machine", code: "", name: "Máquina pequeña, tubo con pesas en extremos", description: "Sin etiqueta ni número.", location: "Planta baja - zona techada (cerca de comidas)", status: "pendiente", machineGuideId: "tubo-pesas-pendiente" },
  { id: "eq-020", area: "Piernas", kind: "machine", code: "", name: "Máquina de pie tipo multi-estación", description: "Nota 'dejar máquina descargada'; sin etiqueta.", location: "Planta baja - frente a bronceado / venta de batidos", status: "pendiente", machineGuideId: "multiestacion-pie-pendiente" },
  { id: "eq-021", area: "Piernas", kind: "machine", code: "", name: "Hip Thrust (rack con plataforma)", description: "Sin etiqueta ni número.", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "hip-thrust" },
  { id: "eq-022", area: "Piernas", kind: "machine", code: "91-03", name: "Hip Abduction", description: "Misma familia que #19, sin etiqueta de número.", location: "Planta baja - zona techada (frente a juegos/comida/baños)", status: "bueno", machineGuideId: "hip-abductor" },

  // ── Pesas - Bancos (17) ────────────────────────────────────────────
  { id: "eq-023", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco de prensa de pecho (plano), con postes para sostener la barra", description: "La persona se acuesta; dos postes inclinados adelante y dos atrás para sostener el peso.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-024", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco inclinado con postes laterales para barra (press inclinado)", description: "Modificación de una banca para que sea inclinada, con dos postes a los lados para la barra.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-025", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco pequeño con leve inclinación", description: "Banquita pequeña, levemente inclinada, no completamente recta.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-026", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco con respaldo alargado y bastante inclinado (mismo estilo que banco #3)", description: "Igual a la banquita pequeña (#3), pero con el respaldar mucho más alargado y bastante más inclinada.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-027", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco con respaldo más pequeño, inclinación ajustable", description: "Igual a las dos anteriores, pero con el respaldar un poco más pequeño; la inclinación se puede acomodar.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-028", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco pequeño con leve inclinación (réplica del banco #3)", description: "Réplica de la banca #3.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-029", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco plano simple, sin postes", description: "Banco simple y plano, solo para acostarse, sin postes laterales.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-030", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco plano con postes laterales para barra", description: "Modificación del banco plano (#7), con postes laterales para colocar la barra.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-031", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco pequeño con leve inclinación, base/pies distintos (similar al #3 y #6)", description: "Parecida a la #3 y #6, pero con la base/los pies modificados de forma diferente.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-032", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco predicador para curl de bíceps", description: "Banquita donde uno se sienta y apoya los codos hacia una barra curl.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-033", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco inclinado, similar al banco #4", description: "Banca inclinada, con el largo del respaldo muy parecido a la #4.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-034", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco plano con postes laterales para barra (similar al #8)", description: "Banquita para acostarse con dos postes a los lados para colocar la barra. Igual a la #8.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-035", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco pequeño", description: "Banquita pequeña.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-036", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco pequeño para acostarse", description: "Banca pequeña, igual para acostarse.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-037", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco predicador para curl de bíceps (similar al #10)", description: "Otro banco predicador, igual a la #10.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-038", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco declinado, con soporte para pies y postes laterales para barra", description: "Banca con soporte para asegurar los pies en la parte alta (declinado) y dos postes laterales para la barra.", location: "Planta baja - área de pesas", status: "sin_dato" },
  { id: "eq-039", area: "Pesas - Bancos", kind: "bench", code: "", name: "Banco con leve inclinación y postes laterales a dos alturas (similar al #6)", description: "Banca con leve inclinación, parecida a la #1, #2, #3 y #6, con postes laterales que sostienen la barra en dos alturas diferentes.", location: "Planta baja - área de pesas", status: "sin_dato" },

  // ── Pesas - Discos (38) ────────────────────────────────────────────
  { id: "eq-040", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 5 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 1", status: "sin_dato" },
  { id: "eq-041", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 10 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 1", status: "sin_dato" },
  { id: "eq-042", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 10 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 1", status: "sin_dato" },
  { id: "eq-043", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 10 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 1", status: "sin_dato" },
  { id: "eq-044", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 25 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 1", status: "sin_dato" },
  { id: "eq-045", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 25 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 1", status: "sin_dato" },
  { id: "eq-046", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 2", status: "sin_dato" },
  { id: "eq-047", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 2", status: "sin_dato" },
  { id: "eq-048", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 2", status: "sin_dato" },
  { id: "eq-049", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 2", status: "sin_dato" },
  { id: "eq-050", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 3", status: "sin_dato" },
  { id: "eq-051", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 25 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 3", status: "sin_dato" },
  { id: "eq-052", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 25 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 3", status: "sin_dato" },
  { id: "eq-053", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 25 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 3", status: "sin_dato" },
  { id: "eq-054", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 25 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 3", status: "sin_dato" },
  { id: "eq-055", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 5 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 4", status: "sin_dato" },
  { id: "eq-056", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 2.5 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 4", status: "sin_dato" },
  { id: "eq-057", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 2.5 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 4", status: "sin_dato" },
  { id: "eq-058", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 10 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 4", status: "sin_dato" },
  { id: "eq-059", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 10 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 4", status: "sin_dato" },
  { id: "eq-060", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 10 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 4", status: "sin_dato" },
  { id: "eq-061", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 10 lb", location: "Planta baja - área de pesas - rack de discos, track derecho, agarre 4", status: "sin_dato" },
  { id: "eq-062", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 35 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 1", status: "sin_dato" },
  { id: "eq-063", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 35 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 1", status: "sin_dato" },
  { id: "eq-064", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 35 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 1", status: "sin_dato" },
  { id: "eq-065", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 35 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 2", status: "sin_dato" },
  { id: "eq-066", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 35 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 2", status: "sin_dato" },
  { id: "eq-067", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 25 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 3", status: "sin_dato" },
  { id: "eq-068", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 25 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 3", status: "sin_dato" },
  { id: "eq-069", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 4", status: "sin_dato" },
  { id: "eq-070", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 4", status: "sin_dato" },
  { id: "eq-071", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 4", status: "sin_dato" },
  { id: "eq-072", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - rack de discos, track izquierdo, agarre 4", status: "sin_dato" },
  { id: "eq-073", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - suelo (sueltos, fuera de racks)", status: "sin_dato" },
  { id: "eq-074", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - suelo (sueltos, fuera de racks)", status: "sin_dato" },
  { id: "eq-075", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - suelo (sueltos, fuera de racks)", status: "sin_dato" },
  { id: "eq-076", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - suelo (sueltos, fuera de racks)", status: "sin_dato" },
  { id: "eq-077", area: "Pesas - Discos", kind: "plate", code: "", name: "Disco de peso 45 lb", location: "Planta baja - área de pesas - suelo (sueltos, fuera de racks)", status: "sin_dato" },

  // ── Cardio (23) ────────────────────────────────────────────────────
  { id: "eq-078", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #1", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-079", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #2", location: "Planta baja - área de máquinas de correr", status: "fuera_de_servicio", machineGuideId: "treadmill" },
  { id: "eq-080", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #3", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-081", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #4", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-082", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #5", location: "Planta baja - área de máquinas de correr", status: "fuera_de_servicio", machineGuideId: "treadmill" },
  { id: "eq-083", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #6", location: "Planta baja - área de máquinas de correr", status: "fuera_de_servicio", machineGuideId: "treadmill" },
  { id: "eq-084", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #7", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-085", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #8", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-086", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #9", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-087", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #10", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-088", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #11", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-089", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #12", description: "Estado no mencionado explícitamente en el recuento de voz.", location: "Planta baja - área de máquinas de correr", status: "pendiente", machineGuideId: "treadmill" },
  { id: "eq-090", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #13", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-091", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) #14", location: "Planta baja - área de máquinas de correr", status: "bueno", machineGuideId: "treadmill" },
  { id: "eq-092", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) - otro lado #1", description: "Marca por confirmar en campo.", location: "Planta baja - área de máquinas de correr", status: "fuera_de_servicio", machineGuideId: "treadmill" },
  { id: "eq-093", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) - otro lado #2", description: "Marca por confirmar en campo.", location: "Planta baja - área de máquinas de correr", status: "fuera_de_servicio", machineGuideId: "treadmill" },
  { id: "eq-094", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) - otro lado #3", description: "Marca por confirmar en campo.", location: "Planta baja - área de máquinas de correr", status: "fuera_de_servicio", machineGuideId: "treadmill" },
  { id: "eq-095", area: "Cardio", kind: "machine", code: "", name: "Cinta de correr (caminadora) - otro lado #4", description: "Marca por confirmar en campo.", location: "Planta baja - área de máquinas de correr", status: "fuera_de_servicio", machineGuideId: "treadmill" },
  { id: "eq-096", area: "Cardio", kind: "machine", code: "", name: "Caminadora tipo escalera/pasos (stepper)", location: "Planta baja - área de máquinas de correr", status: "sin_dato", machineGuideId: "stair-stepper" },
  { id: "eq-097", area: "Cardio", kind: "machine", code: "", name: "Caminadora tipo escalera/pasos (stepper)", location: "Planta baja - área de máquinas de correr", status: "sin_dato", machineGuideId: "stair-stepper" },
  { id: "eq-098", area: "Cardio", kind: "machine", code: "", name: "Caminadora tipo escalera/pasos (stepper)", location: "Planta baja - área de máquinas de correr", status: "sin_dato", machineGuideId: "stair-stepper" },
  { id: "eq-099", area: "Cardio", kind: "machine", code: "", name: "Máquina de gradas (stair climber)", location: "Planta baja - área de máquinas de correr", status: "sin_dato", machineGuideId: "stair-climber" },
  { id: "eq-100", area: "Cardio", kind: "machine", code: "", name: "Máquina de gradas (stair climber)", location: "Planta baja - área de máquinas de correr", status: "sin_dato", machineGuideId: "stair-climber" },

  // ── Recepción - Izquierda (12) ─────────────────────────────────────
  { id: "eq-101", area: "Recepción - Izquierda", kind: "machine", code: "1", name: "Remo cerrado (Hammer Strength)", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "remo-hammer-strength" },
  { id: "eq-102", area: "Recepción - Izquierda", kind: "machine", code: "2", name: "Dominada asistida", description: "Hay dos unidades marcadas como #2.", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "dominada-asistida" },
  { id: "eq-103", area: "Recepción - Izquierda", kind: "machine", code: "2", name: "Dominada asistida (segunda unidad)", description: "Duplicado del número 2.", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "dominada-asistida" },
  { id: "eq-104", area: "Recepción - Izquierda", kind: "machine", code: "3", name: "Jalón (polea)", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "lat-pulldown" },
  { id: "eq-105", area: "Recepción - Izquierda", kind: "machine", code: "6", name: "Remo Hammer", description: "Número dañado / difícil de leer, probable #6.", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "remo-hammer" },
  { id: "eq-106", area: "Recepción - Izquierda", kind: "machine", code: "7", name: "Remo T", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "remo-t" },
  { id: "eq-107", area: "Recepción - Izquierda", kind: "machine", code: "", name: "Prensa de hombros (asiento, peso atrás, empuje hacia arriba y al frente)", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "shoulder-press" },
  { id: "eq-108", area: "Recepción - Izquierda", kind: "machine", code: "", name: "Bicicleta", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "bicicleta-estatica" },
  { id: "eq-109", area: "Recepción - Izquierda", kind: "machine", code: "", name: "Caminadora", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "treadmill" },
  { id: "eq-110", area: "Recepción - Izquierda", kind: "machine", code: "", name: "Máquina multi-estación (asiento ajustable, soporte de espalda, plataforma frontal, agarraderas múltiples)", description: "Nombre/uso exacto pendiente de definir.", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "multiestacion-recepcion" },
  { id: "eq-111", area: "Recepción - Izquierda", kind: "machine", code: "", name: "Máquina de gradas (stepper) - unidad 1", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "stair-stepper" },
  { id: "eq-112", area: "Recepción - Izquierda", kind: "machine", code: "", name: "Máquina de gradas (stepper) - unidad 2", location: "Recepción - Izquierda - Piso", status: "sin_dato", machineGuideId: "stair-stepper" },

  // ── Recepción - Derecha (10) ───────────────────────────────────────
  { id: "eq-113", area: "Recepción - Derecha", kind: "machine", code: "10", name: "Press plano", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "chest-press" },
  { id: "eq-114", area: "Recepción - Derecha", kind: "machine", code: "11", name: "Aperturas posteriores / Pec Deck Rear Delt (Fly Rear Delt)", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "rear-delt-fly" },
  { id: "eq-115", area: "Recepción - Derecha", kind: "machine", code: "14", name: "Overhead press (press militar)", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "overhead-press-machine" },
  { id: "eq-116", area: "Recepción - Derecha", kind: "machine", code: "15", name: "Rotación de tronco", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "torso-rotation" },
  { id: "eq-117", area: "Recepción - Derecha", kind: "machine", code: "16", name: "Abdominal", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "ab-machine" },
  { id: "eq-118", area: "Recepción - Derecha", kind: "machine", code: "17", name: "Back extension", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "back-extension" },
  { id: "eq-119", area: "Recepción - Derecha", kind: "machine", code: "9", name: "Press inclinado", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "incline-chest-press" },
  { id: "eq-120", area: "Recepción - Derecha", kind: "machine", code: "", name: "Aperturas de pecho (Titanium) - brazos hacia el frente", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "pec-deck" },
  { id: "eq-121", area: "Recepción - Derecha", kind: "machine", code: "", name: "Chest Incline Press (más nueva, similar a la Titanium)", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "incline-chest-press" },
  { id: "eq-122", area: "Recepción - Derecha", kind: "machine", code: "", name: "Banca inclinada con postes en ángulo hacia arriba, pesos a los lados", description: "Uso/nombre exacto pendiente de definir.", location: "Recepción - Derecha - Piso", status: "sin_dato", machineGuideId: "banca-inclinada-pendiente" },

  // ── Zona Central (5) ───────────────────────────────────────────────
  { id: "eq-123", area: "Zona Central", kind: "machine", code: "12", name: "Predicador (Pressure Curve), asistido", location: "Zona Central - Debajo del reloj", status: "sin_dato", machineGuideId: "preacher-curl" },
  { id: "eq-124", area: "Zona Central", kind: "machine", code: "12", name: "Predicador (marca amarilla)", description: "Duplicado del número 12.", location: "Zona Central - Debajo del reloj", status: "sin_dato", machineGuideId: "preacher-curl" },
  { id: "eq-125", area: "Zona Central", kind: "machine", code: "13", name: "Extensión de codo", location: "Zona Central - Debajo del reloj", status: "sin_dato", machineGuideId: "elbow-extension" },
  { id: "eq-126", area: "Zona Central", kind: "machine", code: "13", name: "Fondos (dips)", description: "Duplicado del número 13.", location: "Zona Central - Debajo del reloj", status: "sin_dato", machineGuideId: "dip-machine" },
  { id: "eq-127", area: "Zona Central", kind: "machine", code: "", name: "Polea crossover, 4 estaciones (banquita, apoyo de rodillas, poleas abajo, polea arriba)", location: "Zona Central - Debajo del reloj", status: "sin_dato", machineGuideId: "polea-crossover" },

  // ── Poleas adicionales (4) ─────────────────────────────────────────
  { id: "eq-128", area: "Poleas adicionales", kind: "machine", code: "", name: "Polea (cable)", location: "Poleas adicionales - Frente a caminadoras", status: "sin_dato", machineGuideId: "cable-station" },
  { id: "eq-129", area: "Poleas adicionales", kind: "machine", code: "", name: "Polea roja - unidad 1", location: "Poleas adicionales - Frente al VIP", status: "sin_dato", machineGuideId: "cable-station" },
  { id: "eq-130", area: "Poleas adicionales", kind: "machine", code: "", name: "Polea roja - unidad 2", location: "Poleas adicionales - Frente al VIP", status: "sin_dato", machineGuideId: "cable-station" },
  { id: "eq-131", area: "Poleas adicionales", kind: "machine", code: "", name: "Polea azul", location: "Poleas adicionales - Frente al VIP", status: "sin_dato", machineGuideId: "cable-station" },
];

/** Upsert idempotente: no duplica si se corre de nuevo (mismo patrón que `ensureDefaultProducts`). */
export async function ensureDefaultEquipmentAssets(db: Db) {
  if (!DEFAULT_EQUIPMENT_ASSETS.length) return;
  const now = new Date();
  const collection = db.collection<EquipmentAssetDoc>(EQUIPMENT_ASSETS_COLLECTION);
  await collection.bulkWrite(
    DEFAULT_EQUIPMENT_ASSETS.map((row) => ({
      updateOne: {
        filter: { id: row.id },
        update: {
          $setOnInsert: {
            id: row.id,
            area: row.area,
            kind: row.kind,
            code: row.code,
            name: row.name,
            ...(row.description ? { description: row.description } : {}),
            location: row.location,
            status: row.status,
            ...(row.machineGuideId ? { machineGuideId: row.machineGuideId } : {}),
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    })),
  );
}

export async function listEquipmentAssets(
  db: Db,
  opts: { area?: EquipmentArea; kind?: EquipmentKind; status?: EquipmentStatus } = {},
) {
  await ensureDefaultEquipmentAssets(db);
  const collection = db.collection<EquipmentAssetDoc>(EQUIPMENT_ASSETS_COLLECTION);
  const filter: Record<string, unknown> = {};
  if (opts.area) filter.area = opts.area;
  if (opts.kind) filter.kind = opts.kind;
  if (opts.status) filter.status = opts.status;
  return collection.find(filter).sort({ area: 1, code: 1, name: 1 }).toArray();
}

export type EquipmentAssetPatch = Partial<
  Pick<
    EquipmentAssetDoc,
    | "name"
    | "description"
    | "location"
    | "status"
    | "code"
    | "brand"
    | "serial"
    | "supplier"
    | "invoiceNumber"
    | "year"
    | "cost"
    | "depreciation"
    | "maintenance"
    | "warranty"
  >
>;

export async function updateEquipmentAsset(db: Db, id: string, patch: EquipmentAssetPatch) {
  const collection = db.collection<EquipmentAssetDoc>(EQUIPMENT_ASSETS_COLLECTION);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    set[key] = typeof value === "string" ? value.trim() : value;
  }
  return collection.findOneAndUpdate({ id }, { $set: set }, { returnDocument: "after" });
}

export async function createEquipmentAsset(
  db: Db,
  input: Pick<EquipmentAssetDoc, "area" | "kind" | "name"> &
    Partial<Pick<EquipmentAssetDoc, "code" | "description" | "location" | "status" | "machineGuideId">>,
) {
  const now = new Date();
  const collection = db.collection<EquipmentAssetDoc>(EQUIPMENT_ASSETS_COLLECTION);
  const count = await collection.countDocuments({});
  const doc: EquipmentAssetDoc = {
    id: `eq-${String(count + 1).padStart(3, "0")}-${now.getTime().toString(36)}`,
    area: input.area,
    kind: input.kind,
    code: input.code?.trim() ?? "",
    name: input.name.trim(),
    ...(input.description ? { description: input.description.trim() } : {}),
    location: input.location?.trim() ?? "",
    status: input.status ?? "sin_dato",
    ...(input.machineGuideId ? { machineGuideId: input.machineGuideId } : {}),
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(doc);
  return doc;
}
