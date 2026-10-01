export type TrainingProgramMachineTemplate = {
  id: string;
  machineId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg?: number;
  targetSeconds?: number;
  notes?: string;
};

export type TrainingProgramSessionTemplate = {
  id: string;
  day: string;
  focus: string;
  targetMinutes: number;
  exercises: string;
  machines: TrainingProgramMachineTemplate[];
};

export type TrainingProgramTemplate = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  objective: string;
  coachNote: string;
  weeklySessions: number;
  durationWeeks: number;
  level: string;
  audience: string;
  accent: "lime" | "cyan" | "orange" | "violet";
  sessions: TrainingProgramSessionTemplate[];
};

/**
 * Catálogo inicial. Mongo conserva la versión operativa: estos documentos solo
 * se insertan si todavía no existen y luego pueden evolucionar sin redeploy.
 * Todos los machineId corresponden a unidades reales del inventario físico.
 */
export const DEFAULT_TRAINING_PROGRAMS = [
  {
    id: "starter",
    name: "Base técnica",
    shortName: "Base",
    description: "Adaptación de cuerpo completo y dominio de las máquinas.",
    objective: "Construir técnica, confianza y constancia sin fatiga excesiva.",
    coachNote: "Empezá liviano. La prioridad es aprender ajustes y recorrido antes de subir carga.",
    weeklySessions: 3,
    durationWeeks: 6,
    level: "Inicial",
    audience: "Primeros meses, regreso al gym o meta general",
    accent: "cyan",
    sessions: [
      {
        id: "full-body-a", day: "Día A", focus: "Full body base", targetMinutes: 45,
        exercises: "Tempo controlado y dos repeticiones en reserva.",
        machines: [
          { id: "press-pierna", machineId: "leg-press-incline", exerciseName: "Prensa inclinada", sets: 3, reps: 10 },
          { id: "press-pecho", machineId: "chest-press", exerciseName: "Press de pecho", sets: 3, reps: 10 },
          { id: "jalon", machineId: "lat-pulldown", exerciseName: "Jalón al pecho", sets: 3, reps: 10 },
        ],
      },
      {
        id: "postura-b", day: "Día B", focus: "Posterior y postura", targetMinutes: 45,
        exercises: "Priorizá rango completo y control escapular.",
        machines: [
          { id: "curl-femoral", machineId: "leg-curl", exerciseName: "Curl femoral sentado", sets: 3, reps: 12 },
          { id: "remo", machineId: "remo-hammer-strength", exerciseName: "Remo cerrado", sets: 3, reps: 10 },
          { id: "core-polea", machineId: "cable-station", exerciseName: "Core en polea", sets: 3, reps: 12 },
        ],
      },
      {
        id: "full-body-c", day: "Día C", focus: "Full body progreso", targetMinutes: 50,
        exercises: "Repetí patrones y subí carga solo con técnica limpia.",
        machines: [
          { id: "sentadilla", machineId: "hack-squat", exerciseName: "Hack squat", sets: 3, reps: 12 },
          { id: "hombro", machineId: "shoulder-press", exerciseName: "Press de hombros", sets: 3, reps: 10 },
          { id: "cardio", machineId: "treadmill", exerciseName: "Caminadora", sets: 1, reps: 0, targetSeconds: 600 },
        ],
      },
    ],
  },
  {
    id: "strength",
    name: "Fuerza base",
    shortName: "Fuerza",
    description: "Compuestos guiados, descansos amplios y progresión medible.",
    objective: "Aumentar fuerza general manteniendo una ejecución estable.",
    coachNote: "Registrá la carga. Cuando completés todas las repeticiones con control, progresá poco a poco.",
    weeklySessions: 3,
    durationWeeks: 8,
    level: "Intermedio",
    audience: "Metas de fuerza, potencia o mejora de cargas",
    accent: "lime",
    sessions: [
      {
        id: "fuerza-1", day: "Fuerza 1", focus: "Pierna + empuje", targetMinutes: 60,
        exercises: "Descansá 90-120 segundos en las series principales.",
        machines: [
          { id: "pendulo", machineId: "pendulum-squat", exerciseName: "Sentadilla péndulo", sets: 4, reps: 8 },
          { id: "pecho", machineId: "chest-press", exerciseName: "Press de pecho", sets: 4, reps: 8 },
          { id: "femoral", machineId: "leg-curl", exerciseName: "Curl femoral", sets: 3, reps: 10 },
        ],
      },
      {
        id: "fuerza-2", day: "Fuerza 2", focus: "Espalda + core", targetMinutes: 55,
        exercises: "Hacé una pausa de un segundo en la contracción.",
        machines: [
          { id: "jalon", machineId: "lat-pulldown", exerciseName: "Jalón al pecho", sets: 4, reps: 8 },
          { id: "remo-t", machineId: "remo-t", exerciseName: "Remo T", sets: 4, reps: 8 },
          { id: "rotacion", machineId: "torso-rotation", exerciseName: "Rotación de tronco", sets: 3, reps: 10 },
        ],
      },
      {
        id: "fuerza-3", day: "Fuerza 3", focus: "Full body", targetMinutes: 65,
        exercises: "Buscá una mejora pequeña por semana sin sacrificar técnica.",
        machines: [
          { id: "hack", machineId: "hack-squat", exerciseName: "Hack squat", sets: 5, reps: 6 },
          { id: "hombro", machineId: "shoulder-press", exerciseName: "Press de hombros", sets: 4, reps: 8 },
          { id: "remo", machineId: "remo-hammer", exerciseName: "Remo Hammer", sets: 4, reps: 8 },
        ],
      },
    ],
  },
  {
    id: "hypertrophy",
    name: "Hipertrofia",
    shortName: "Masa",
    description: "Volumen moderado, rangos de 8-15 y trabajo por zonas.",
    objective: "Ganar masa muscular con volumen progresivo y buena recuperación.",
    coachNote: "Dejá una o dos repeticiones en reserva y registrá peso y repeticiones en cada visita.",
    weeklySessions: 4,
    durationWeeks: 8,
    level: "Intermedio",
    audience: "Metas de masa muscular, volumen o definición",
    accent: "violet",
    sessions: [
      {
        id: "superior-a", day: "Superior A", focus: "Pecho y espalda", targetMinutes: 65,
        exercises: "Alterná empuje y jalón.",
        machines: [
          { id: "pecho", machineId: "chest-press", exerciseName: "Press de pecho", sets: 4, reps: 10 },
          { id: "jalon", machineId: "lat-pulldown", exerciseName: "Jalón al pecho", sets: 4, reps: 10 },
          { id: "pec-deck", machineId: "pec-deck", exerciseName: "Aperturas de pecho", sets: 3, reps: 12 },
        ],
      },
      {
        id: "inferior-a", day: "Inferior A", focus: "Cuádriceps y femoral", targetMinutes: 60,
        exercises: "Controlá la fase excéntrica durante tres segundos.",
        machines: [
          { id: "extension", machineId: "leg-extension", exerciseName: "Extensión de pierna", sets: 4, reps: 12 },
          { id: "curl", machineId: "leg-curl", exerciseName: "Curl femoral", sets: 4, reps: 12 },
          { id: "abductor", machineId: "hip-abductor", exerciseName: "Abductor", sets: 3, reps: 15 },
        ],
      },
      {
        id: "superior-b", day: "Superior B", focus: "Espalda y brazos", targetMinutes: 60,
        exercises: "Mantené tensión continua y evitá usar impulso.",
        machines: [
          { id: "remo", machineId: "remo-hammer-strength", exerciseName: "Remo cerrado", sets: 4, reps: 10 },
          { id: "predicador", machineId: "preacher-curl", exerciseName: "Curl predicador", sets: 3, reps: 12 },
          { id: "triceps", machineId: "elbow-extension", exerciseName: "Extensión de codo", sets: 3, reps: 12 },
        ],
      },
      {
        id: "inferior-b", day: "Inferior B", focus: "Glúteo y posterior", targetMinutes: 60,
        exercises: "Finalizá con el core estable.",
        machines: [
          { id: "hip-thrust", machineId: "hip-thrust", exerciseName: "Hip thrust", sets: 4, reps: 10 },
          { id: "prensa", machineId: "leg-press-incline", exerciseName: "Prensa inclinada", sets: 3, reps: 15 },
          { id: "pull-through", machineId: "cable-station", exerciseName: "Pull-through en polea", sets: 3, reps: 12 },
        ],
      },
    ],
  },
  {
    id: "conditioning",
    name: "Acondicionamiento",
    shortName: "Cardio",
    description: "Circuitos eficientes para capacidad de trabajo y adherencia.",
    objective: "Mejorar resistencia, movilidad y tolerancia al esfuerzo.",
    coachNote: "Mantené un ritmo que podás sostener. Técnica primero, velocidad después.",
    weeklySessions: 3,
    durationWeeks: 6,
    level: "Todos",
    audience: "Metas de resistencia, bajar grasa, salud o regreso activo",
    accent: "orange",
    sessions: [
      {
        id: "circuito-a", day: "Circuito A", focus: "Full body", targetMinutes: 40,
        exercises: "Tres vueltas; descansá 45 segundos entre estaciones.",
        machines: [
          { id: "cardio", machineId: "treadmill", exerciseName: "Caminadora", sets: 1, reps: 0, targetSeconds: 600 },
          { id: "pecho", machineId: "chest-press", exerciseName: "Press de pecho", sets: 3, reps: 12 },
          { id: "remo", machineId: "remo-hammer-strength", exerciseName: "Remo cerrado", sets: 3, reps: 12 },
        ],
      },
      {
        id: "circuito-b", day: "Circuito B", focus: "Posterior + core", targetMinutes: 40,
        exercises: "Ritmo sostenible, sin perder postura.",
        machines: [
          { id: "femoral", machineId: "leg-curl", exerciseName: "Curl femoral", sets: 3, reps: 15 },
          { id: "jalon", machineId: "lat-pulldown", exerciseName: "Jalón al pecho", sets: 3, reps: 12 },
          { id: "core", machineId: "ab-machine", exerciseName: "Abdominal", sets: 3, reps: 15 },
        ],
      },
      {
        id: "circuito-c", day: "Circuito C", focus: "Densidad", targetMinutes: 45,
        exercises: "Completá el trabajo con descansos de 30-45 segundos.",
        machines: [
          { id: "gradas", machineId: "stair-climber", exerciseName: "Máquina de gradas", sets: 1, reps: 0, targetSeconds: 480 },
          { id: "hombro", machineId: "shoulder-press", exerciseName: "Press de hombros", sets: 3, reps: 12 },
          { id: "polea", machineId: "cable-station", exerciseName: "Trabajo en polea", sets: 3, reps: 12 },
        ],
      },
    ],
  },
] as const satisfies readonly TrainingProgramTemplate[];

export type DefaultTrainingProgramId = (typeof DEFAULT_TRAINING_PROGRAMS)[number]["id"];
