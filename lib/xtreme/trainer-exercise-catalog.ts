import type { GroupExercise } from "./trainer-group-a-model";

const muscleNames: Record<string, string> = {
  articulacion: "Movilidad y articulaciones",
  abductores: "Abductores",
  aductores: "Aductores",
  biceps: "Bíceps",
  cardiovascular: "Cardio",
  core: "Core",
  cuadriceps: "Cuádriceps",
  espalda: "Espalda",
  gluteo: "Glúteos",
  hombro: "Hombros",
  hombros: "Hombros",
  isquio: "Isquiotibiales",
  isquios: "Isquiotibiales",
  pantorrila: "Pantorrillas",
  pantorrilla: "Pantorrillas",
  pecho: "Pecho",
  posteriores: "Hombros posteriores",
  triceps: "Tríceps",
};

const exerciseNames: Record<string, string> = {
  "abdyadd": "Abducción y aducción de cadera",
  "add y abd": "Abducción y aducción de cadera",
  "abduccion de cadera": "Abducción de cadera",
  "aduccion de cadera": "Aducción de cadera",
  "aerobico": "Cardio",
  "aperturas": "Aperturas de pecho",
  "bici": "Bicicleta estática",
  "copa": "Extensión de tríceps sobre la cabeza",
  "desplante cangrejo": "Desplante lateral con banda",
  "desplantes estaticos": "Desplantes estáticos",
  "ext de codo": "Extensión de tríceps",
  "ext de codo agarre v": "Extensión de tríceps con agarre V",
  "ext de rodilla": "Extensión de piernas",
  "ext de rodilla 2s up": "Extensión de piernas (2 segundos arriba)",
  "flex acostada": "Curl femoral acostado",
  "flex de rodilla acostada": "Curl femoral acostado",
  "flex de rodilla de pie": "Curl femoral de pie",
  "flex de rodilla sentada": "Curl femoral sentado",
  "fondos": "Fondos para tríceps",
  "hip thrust": "Empuje de cadera (hip thrust)",
  "jalon agarre v": "Jalón al pecho con agarre V",
  "jalon abierto neutro": "Jalón al pecho con agarre neutro",
  "jalon abierto prono": "Jalón al pecho con agarre prono",
  "jalon al pecho neutro": "Jalón al pecho con agarre neutro",
  "jalon al pecho prono": "Jalón al pecho con agarre prono",
  "laterales": "Elevaciones laterales",
  "lumbar": "Extensión lumbar",
  "movilidad articular": "Movilidad articular",
  "patada gluteo": "Patada de glúteo",
  "peso muerto": "Peso muerto",
  "potro": "Elevación de pantorrilla tipo potro",
  "posteriores": "Aperturas para hombro posterior",
  "prensa inclinada": "Prensa de piernas inclinada",
  "prensa pantorrilla": "Prensa para pantorrillas",
  "prensa unilateral": "Prensa de piernas unilateral",
  "press inclinado": "Press de pecho inclinado",
  "press militar": "Press de hombros",
  "press plano": "Press de pecho plano",
  "pull dowm": "Jalón al pecho",
  "remo cerrado neutro": "Remo cerrado con agarre neutro",
  "remo t prono": "Remo en T con agarre prono",
  "sentadilla acostada": "Sentadilla en máquina acostada",
  "sentadilla perfecta": "Sentadilla perfecta",
  "sentadilla sissy": "Sentadilla sissy",
};

function key(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeExerciseMuscle(value: string) {
  return muscleNames[key(value)] ?? value.trim();
}

export function normalizeExerciseName(value: string, equipment = "") {
  const normalized = exerciseNames[key(value)] ?? value.trim();
  if (key(normalized) === "aerobico" || key(normalized) === "cardio") {
    const equipmentKey = key(equipment);
    if (equipmentKey.includes("caminadora")) return "Cardio en caminadora";
    if (equipmentKey.includes("escaladora") || equipmentKey.includes("gradas")) return "Cardio en escaladora";
    if (equipmentKey.includes("bici")) return "Cardio en bicicleta";
    if (equipmentKey.includes("eliptica")) return "Cardio en elíptica";
  }
  return normalized;
}

export function normalizeGroupExercise(exercise: GroupExercise): GroupExercise {
  return {
    ...exercise,
    muscle: normalizeExerciseMuscle(exercise.muscle),
    name: normalizeExerciseName(exercise.name, exercise.equipment),
    equipment: exercise.equipment.trim().replace(/^maquina$/i, "Máquina"),
  };
}

export function recommendedMachineGuideId(exercise: Pick<GroupExercise, "name" | "muscle" | "equipment">) {
  const name = key(exercise.name);
  const equipment = key(exercise.equipment);
  if (name.includes("caminadora")) return "treadmill";
  if (name.includes("eliptica")) return "elliptical";
  if (name.includes("bicicleta")) return "bicicleta-estatica";
  if (name.includes("escaladora") || name.includes("gradas")) return "stair-climber";
  if (name.includes("abduccion y aduccion")) return "hip-abductor-aductor-dual";
  if (name.includes("abduccion")) return "hip-abductor";
  if (name.includes("aduccion")) return "hip-adductor";
  if (name.includes("hip thrust") || name.includes("empuje de cadera")) return "hip-thrust";
  if (name.includes("sentadilla en maquina acostada")) return "lying-squat";
  if (name.includes("prensa de piernas inclinada")) return "leg-press-incline";
  if (name.includes("extension de piernas")) return "leg-extension";
  if (name.includes("curl femoral acostado")) return "lying-leg-curl";
  if (name.includes("curl femoral sentado")) return "leg-curl";
  if (name.includes("patada de gluteo")) return "glute-hip-extension";
  if (name.includes("jalon al pecho")) return "lat-pulldown";
  if (name.includes("remo cerrado")) return "remo-hammer-strength";
  if (name.includes("press de pecho inclinado")) return "incline-chest-press";
  if (name.includes("press de pecho plano")) return "chest-press";
  if (name.includes("press de hombros")) return "shoulder-press";
  if (equipment.includes("polea")) return "cable-station";
  return undefined;
}
