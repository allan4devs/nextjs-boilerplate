import type { GuideWorkout, MachineGuide } from "../domain/training";

export const MACHINE_GUIDE: MachineGuide[] = [
  {
    id: "leg-press",
    name: "Prensa de pierna",
    zone: "Pierna",
    level: "Base",
    muscles: ["Cuadriceps", "Gluteo", "Femoral"],
    setup:
      "Espalda completa apoyada, pies al ancho de hombros y rodillas alineadas con los pies.",
    tips: [
      "Baje controlado sin despegar la cadera",
      "Empuje con todo el pie",
      "No bloquee las rodillas arriba",
    ],
    mistakes: [
      "Rodillas hacia adentro",
      "Rango corto sin control",
      "Levantar la cadera del asiento",
    ],
    starter: "3 series de 10 a 12 reps con peso que pueda controlar.",
    accent: "from-yellow-300 to-orange-400",
  },
  {
    id: "chest-press",
    name: "Press de pecho",
    zone: "Pecho",
    level: "Base",
    muscles: ["Pecho", "Triceps", "Hombro frontal"],
    setup: "Ajuste el asiento para que las agarraderas queden a media altura del pecho.",
    tips: [
      "Mantenga escapulas atras",
      "Empuje sin despegar la espalda",
      "Regrese lento hasta sentir estiramiento",
    ],
    mistakes: ["Subir los hombros", "Rebotar el peso", "Abrir demasiado los codos"],
    starter: "3 series de 8 a 12 reps, descansando 60 a 90 segundos.",
    accent: "from-red-400 to-rose-500",
  },
  {
    id: "lat-pulldown",
    name: "Jalon al pecho",
    zone: "Espalda",
    level: "Base",
    muscles: ["Dorsal", "Biceps", "Espalda media"],
    setup: "Asegure las piernas, pecho alto y agarre un poco mas ancho que hombros.",
    tips: [
      "Jale hacia la parte alta del pecho",
      "Piense en bajar los codos",
      "Controle el regreso sin soltar tension",
    ],
    mistakes: ["Jalar detras de la nuca", "Usar impulso del torso", "Encoger los hombros"],
    starter: "3 series de 10 reps con pausa corta abajo.",
    accent: "from-sky-300 to-cyan-500",
  },
  {
    id: "seated-row",
    name: "Remo sentado",
    zone: "Espalda",
    level: "Intermedio",
    muscles: ["Espalda media", "Dorsal", "Biceps"],
    setup: "Pecho firme, columna neutral y agarre con brazos estirados sin redondear la espalda.",
    tips: ["Lleve los codos atras", "Apriete espalda un segundo", "Vuelva lento al inicio"],
    mistakes: ["Balancear el cuerpo", "Redondear la espalda", "Jalar solo con brazos"],
    starter: "3 series de 10 a 12 reps con tempo controlado.",
    accent: "from-cyan-300 to-blue-500",
  },
  {
    id: "leg-curl",
    name: "Curl femoral",
    zone: "Pierna",
    level: "Base",
    muscles: ["Femoral", "Pantorrilla", "Gluteo estabilizador"],
    setup: "Alinee la rodilla con el eje de la maquina y el rodillo sobre la parte baja de la pierna.",
    tips: ["Contraiga atras sin arquear la espalda", "No deje caer el peso", "Use rango completo"],
    mistakes: ["Levantar la cadera", "Mover muy rapido", "Peso excesivo"],
    starter: "3 series de 12 reps, perfecto para cerrar pierna.",
    accent: "from-lime-300 to-emerald-500",
  },
  {
    id: "cable-station",
    name: "Polea ajustable",
    zone: "Full body",
    level: "Versatil",
    muscles: ["Core", "Hombros", "Brazos", "Gluteo"],
    setup: "Ajuste la polea segun el ejercicio y mantenga una postura estable antes de iniciar.",
    tips: [
      "Empiece liviano para sentir trayectoria",
      "Mantenga abdomen firme",
      "Evite tirones bruscos",
    ],
    mistakes: ["Perder postura", "Cambiar angulo a mitad de repeticion", "Usar impulso"],
    starter: "2 a 4 series de 12 reps segun el ejercicio elegido.",
    accent: "from-fuchsia-400 to-purple-500",
  },
];

export const GUIDE_WORKOUTS: GuideWorkout[] = [
  {
    goal: "Primer dia",
    steps: ["Prensa 3x10", "Press pecho 3x10", "Jalon 3x10", "Curl femoral 2x12"],
  },
  {
    goal: "Fuerza base",
    steps: ["Prensa 4x8", "Remo sentado 4x8", "Press pecho 4x8", "Polea core 3x12"],
  },
  {
    goal: "Control tecnico",
    steps: ["Jalon 3x12 lento", "Curl femoral 3x12", "Remo sentado 3x10", "Polea 3x15"],
  },
];

export function findMachineGuide(machineId: MachineGuide["id"]) {
  return MACHINE_GUIDE.find((machine) => machine.id === machineId) ?? null;
}
