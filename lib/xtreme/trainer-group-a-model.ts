/** Shared types and pure alignment rules. PDF data is only imported by the authenticated API. */
export type GroupExercise = {
  id: string; muscle: string; name: string; equipment: string; sourceMachine: string;
  sets: number | null; reps: number | null; time: string; sourcePage: number;
};
export type GroupDay = { id: string; label: string; focus: string; exercises: GroupExercise[] };
export type GroupRoutine = {
  id: string; sourceFile: string; objective: string; startDate: string; endDate: string;
  coach: string; days: GroupDay[];
};
export type GroupEquipment = {
  id: string; code: string; name: string; status: string; machineGuideId?: string;
  location?: string; floor?: number;
};
export type GroupProfile = { id: string; name: string; routineId: string };
export const GROUP_A_PROFILES: GroupProfile[] = [
  { id: "tiffany", name: "Tiffany Salazar", routineId: "tiffany" },
  { id: "chermey", name: "Chermey Ocampo", routineId: "chermey" },
  { id: "yuslin", name: "Yuslin López", routineId: "yuslin-lauren" },
  { id: "lauren", name: "Lauren López", routineId: "yuslin-lauren" },
  { id: "melissa", name: "Melissa Arce", routineId: "melissa" },
  { id: "yadilet", name: "Yadilet Arroyo", routineId: "yadilet" },
];
export type GroupMapping = { exerciseId: string; assetId: string; revision: number; updatedBy: string };
export type GroupLink = { profileId: string; memberId: string; revision: number };
export type GroupExecution = { exerciseId: string; assetId: string; machineCode: string; machineName: string; weightKg: number | null };
export type GroupLog = {
  id: string; profileId: string; dayId: string; date: string; completedIds: string[];
  executions: GroupExecution[]; note: string; trainer: string; updatedAt: string; revision: number;
};
export type GroupDashboard = {
  date: string; profiles: GroupProfile[]; routines: GroupRoutine[]; inventory: GroupEquipment[];
  mappings: GroupMapping[]; links: GroupLink[]; logs: GroupLog[];
};
export function normalizeGroupName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Use movement AND equipment; a dumbbell press must never become a machine press. */
export function exerciseGuides(exercise: GroupExercise): string[] {
  const name = normalizeGroupName(exercise.name);
  const equipment = normalizeGroupName(exercise.equipment);
  if (exercise.muscle === "cardiovascular") {
    if (`${name} ${equipment}`.includes("caminadora")) return ["treadmill"];
    if (`${name} ${equipment}`.includes("eliptica")) return ["elliptical"];
    if (`${name} ${equipment}`.includes("bici")) return ["bicicleta-estatica"];
    if (equipment.includes("escaladora")) return ["stair-climber", "stair-stepper"];
    return []; // Gradas are not silently replaced by an escaladora.
  }
  if (/polea|polrea/.test(equipment)) return ["cable-station", "polea-crossover"];
  if (!equipment.includes("maquina")) return [];
  if (/abdyadd|add y abd/.test(name)) return ["hip-abductor-aductor-dual"];
  if (name.includes("abduccion")) return ["hip-abductor"];
  if (name.includes("aduccion")) return ["hip-adductor"];
  if (name.includes("hip thrust")) return ["hip-thrust"];
  if (name.includes("sissy")) return ["sissy-squat"];
  if (name.includes("perfecta")) return ["sentadilla-perfecta"];
  if (name.includes("sentadilla acostada")) return ["lying-squat"];
  if (name.includes("hack")) return ["hack-squat"];
  if (name.includes("prensa pantorrilla")) return ["calf-press-horizontal"];
  if (name === "potro") return ["donkey-calf-raise"];
  if (name.includes("prensa inclinada")) return ["leg-press-incline"];
  if (name.includes("prensa unilateral")) return ["horizontal-leg-press"];
  if (/ext de rodilla/.test(name)) return ["leg-extension"];
  if (/flex.*acostada/.test(name)) return ["lying-leg-curl"];
  if (/flex.*sentada/.test(name)) return ["leg-curl"];
  if (/flex.*(de pie)/.test(name)) return ["standing-leg-curl"];
  if (name.includes("patada gluteo")) return ["glute-hip-extension"];
  if (name.includes("dominadas")) return ["dominada-asistida"];
  if (name.includes("jalon")) return ["lat-pulldown"];
  if (/remo t /.test(name)) return ["remo-t"];
  if (name.includes("remo unilateral")) return ["remo-hammer"];
  if (name.includes("remo")) return ["remo-hammer-strength"];
  if (name.includes("press inclinado")) return ["incline-chest-press"];
  if (name.includes("press plano")) return ["chest-press"];
  if (name.includes("aperturas inclinadas")) return ["incline-fly-machine"];
  if (/aperturas|posteriores/.test(name)) return ["pec-deck-rear-delt-dual"];
  if (/press mili/.test(name)) return ["shoulder-press", "overhead-press-machine"];
  if (name.includes("laterales")) return ["lateral-raise-machine"];
  if (name.includes("predicador")) return ["preacher-curl"];
  if (name.includes("ext de codo")) return ["elbow-extension"];
  if (name.includes("fondos")) return ["dip-machine"];
  if (name.includes("lumbar")) return ["back-extension"];
  if (name.includes("abdominal")) return ["ab-machine"];
  return [];
}

export function isGroupEquipmentAvailable(asset: GroupEquipment) {
  return asset.status !== "fuera_de_servicio" && asset.status !== "pendiente";
}
export function alignGroupExercise(exercise: GroupExercise, inventory: GroupEquipment[], mapping?: GroupMapping) {
  const guides = exerciseGuides(exercise);
  const needsMachine = guides.length > 0 || normalizeGroupName(exercise.equipment).includes("maquina");
  const candidates = inventory.filter((asset) => guides.length ? guides.includes(asset.machineGuideId ?? "") : needsMachine);
  const usable = candidates.filter(isGroupEquipmentAvailable);
  const sourceNumbers = exercise.sourceMachine.match(/\d+/g) ?? [];
  const numbered = usable.filter((asset) => {
    const numbers = asset.code.match(/\d+/g) ?? [];
    return sourceNumbers.length > 0 && sourceNumbers.every((number) => numbers.some((n) => Number(n) === Number(number)));
  });
  const issues: string[] = [];
  if (exercise.time && !/\d/.test(exercise.time)) issues.push("El PDF no indica cuántos minutos.");
  if (/^\d+$/.test(exercise.time)) issues.push("El tiempo del PDF no tiene unidad.");
  if (sourceNumbers.length && !candidates.some((asset) => {
    const numbers = asset.code.match(/\d+/g) ?? [];
    return sourceNumbers.every((n) => numbers.some((x) => Number(x) === Number(n)));
  })) issues.push(`Revisá el número ${exercise.sourceMachine} del PDF: no coincide con este ejercicio en el inventario.`);
  let asset = mapping ? candidates.find((entry) => entry.id === mapping.assetId) : undefined;
  const confirmed = Boolean(asset && mapping);
  if (!mapping) {
    if (numbered.length === 1) asset = numbered[0];
    else if (!sourceNumbers.length && usable.length === 1) asset = usable[0];
  }
  if (mapping && !asset) issues.push("La unidad elegida ya no corresponde al ejercicio; revisá la vinculación.");
  if (asset && !isGroupEquipmentAvailable(asset)) issues.push("La unidad elegida está fuera de servicio o pendiente de revisión.");
  return {
    asset: asset ?? null, candidates, issues, confirmed,
    status: !needsMachine ? "free" as const : asset && isGroupEquipmentAvailable(asset) ? "linked" as const : !usable.length ? "unavailable" as const : "review" as const,
  };
}

/** Strict dates prevent impossible/future monitoring entries. */
export function validGroupDate(value: unknown, today: string): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
