/**
 * Member OS — datos estaticos del app de socios.
 * Catalogos de clases, rutinas, guia de maquinas, tabs y llaves de storage.
 */

import {
  Activity,
  Dumbbell,
  Flame,
  Goal,
  Medal,
  QrCode,
  Rocket,
  ShieldCheck,
  Star,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import type { TourStep } from "../OnboardingTour";
import type { Member, NotificationPrefs } from "./types";

export const STORAGE_KEY = "xtreme-gym-member-name";
export const CEDULA_KEY = "xtreme-gym-member-cedula";
export const SESSION_KEY = "xtreme-gym-session";
export const TOUR_KEY = "xtreme-gym-tour-done";
/** Digitos minimos para buscar cedula (lector de barras o teclado). */
export const CEDULA_MIN_DIGITS = 6;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const TOUR_STEPS: TourStep[] = [
  {
    target: "tab-resumen",
    tab: "resumen",
    title: "Tu resumen",
    body: "Aquí ves tu racha, tu nivel y tu próximo paso. Es tu punto de partida cada día que entrenás.",
    icon: Activity,
  },
  {
    target: "tab-entrenar",
    tab: "entrenar",
    title: "Marcá tu entreno",
    body: "Cada vez que entrenes, marcalo aquí. Así sumás tu racha 🔥 y desbloqueás logros.",
    icon: Dumbbell,
  },
  {
    target: "tab-maquinas",
    tab: "maquinas",
    title: "Guía de máquinas",
    body: "¿No sabés usar un equipo? Mirá la guía con videos y pasos para entrenar seguro.",
    icon: ShieldCheck,
  },
  {
    target: "tab-progreso",
    tab: "progreso",
    title: "Seguí tu progreso",
    body: "Registrá tu peso y medidas para ver tu avance en el tiempo, sesión tras sesión.",
    icon: TrendingUp,
  },
  {
    target: "tab-perfil",
    tab: "perfil",
    title: "Tu carné digital",
    body: "En tu perfil está tu carné con código de acceso. Mostralo en recepción para entrar. ¡Listo para arrancar!",
    icon: QrCode,
  },
];

export const TRAININGS = [
  {
    id: "fuerza-total",
    name: "Fuerza Total",
    coach: "Coach Xtreme",
    time: "5:30 AM",
    minutes: 55,
    intensity: "Pesado",
    slots: 8,
    focus: "Pierna, pecho y espalda",
    color: "from-red-500 to-orange-400",
    icon: Dumbbell,
  },
  {
    id: "hiit-quemador",
    name: "HIIT Quemador",
    coach: "Funcional",
    time: "6:00 PM",
    minutes: 35,
    intensity: "Alta",
    slots: 12,
    focus: "Cardio, core y velocidad",
    color: "from-lime-400 to-emerald-400",
    icon: Zap,
  },
  {
    id: "glute-lab",
    name: "Glute Lab",
    coach: "Zona lower",
    time: "7:00 PM",
    minutes: 45,
    intensity: "Media",
    slots: 10,
    focus: "Gluteo, femoral y estabilidad",
    color: "from-fuchsia-500 to-rose-400",
    icon: Activity,
  },
  {
    id: "xtreme-core",
    name: "Xtreme Core",
    coach: "Circuito",
    time: "Sabado 8:00 AM",
    minutes: 40,
    intensity: "Control",
    slots: 15,
    focus: "Abdomen, movilidad y postura",
    color: "from-sky-400 to-cyan-300",
    icon: Goal,
  },
];

export type Training = (typeof TRAININGS)[number];

export const GOALS = ["Ganar fuerza", "Bajar grasa", "Ser constante", "Volver al ritmo"];

export const ROUTINES = [
  {
    name: "Base Fuerza Xtreme",
    level: "Intermedio",
    exercises: ["Sentadilla 4x8", "Press banca 4x8", "Remo 3x10"],
    video: "Video coach",
  },
  {
    name: "Quemador 30",
    level: "Alta intensidad",
    exercises: ["Air bike 8x30s", "Burpees 4x12", "Plancha 3x45s"],
    video: "Video HIIT",
  },
  {
    name: "Lower Lab",
    level: "Control",
    exercises: ["Hip thrust 4x10", "Peso muerto rumano 3x10", "Abduccion 3x15"],
    video: "Video tecnica",
  },
];

export const MACHINE_GUIDE = [
  {
    id: "leg-press",
    name: "Prensa de pierna",
    zone: "Pierna",
    level: "Base",
    muscles: ["Cuadriceps", "Gluteo", "Femoral"],
    setup: "Espalda completa apoyada, pies al ancho de hombros y rodillas alineadas con los pies.",
    tips: ["Baje controlado sin despegar la cadera", "Empuje con todo el pie", "No bloquee las rodillas arriba"],
    mistakes: ["Rodillas hacia adentro", "Rango corto sin control", "Levantar la cadera del asiento"],
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
    tips: ["Mantenga escapulas atras", "Empuje sin despegar la espalda", "Regrese lento hasta sentir estiramiento"],
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
    tips: ["Jale hacia la parte alta del pecho", "Piense en bajar los codos", "Controle el regreso sin soltar tension"],
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
    tips: ["Empiece liviano para sentir trayectoria", "Mantenga abdomen firme", "Evite tirones bruscos"],
    mistakes: ["Perder postura", "Cambiar angulo a mitad de repeticion", "Usar impulso"],
    starter: "2 a 4 series de 12 reps segun el ejercicio elegido.",
    accent: "from-fuchsia-400 to-purple-500",
  },
];

export type MachineGuide = (typeof MACHINE_GUIDE)[number];

export const GUIDE_WORKOUTS = [
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

export const REMINDERS = [
  "Tu clase reservada es en 1 hora.",
  "No rompas la racha: hoy toca aunque sea suave.",
  "Tu membresia vence pronto, pasate por recepcion.",
];

export const TABS = [
  { id: "resumen", label: "Resumen", icon: Activity },
  { id: "entrenar", label: "Entrenar", icon: Dumbbell },
  { id: "maquinas", label: "Maquinas", icon: ShieldCheck },
  { id: "progreso", label: "Progreso", icon: TrendingUp },
  { id: "perfil", label: "Perfil", icon: UserRound },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export const TAB_SUBTITLES: Record<TabId, string> = {
  resumen: "Tu base de operaciones — toca los paneles",
  entrenar: "Plan, clases y check-in del día",
  maquinas: "Toca una máquina para abrir la guía",
  progreso: "Logros, medidas y ranking",
  perfil: "Carné, preferencias y seguridad",
};

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  streakRisk: true,
  milestones: true,
  renewalReminders: true,
  winBack: true,
  weeklyRecap: true,
};

/** Logros locales (fallback cuando el server aun no manda badges). */
export const ACHIEVEMENTS: {
  id: string;
  name: string;
  desc: string;
  icon: typeof Flame;
  test: (m: Member) => boolean;
}[] = [
  { id: "first", name: "Primer paso", desc: "Tu primer entreno marcado", icon: Star, test: (m) => m.totalWorkouts >= 1 },
  { id: "streak7", name: "En racha", desc: "7 dias seguidos, sin aflojar", icon: Flame, test: (m) => m.streak >= 7 },
  { id: "streak30", name: "Imparable", desc: "30 dias de racha pura vida", icon: Rocket, test: (m) => m.streak >= 30 },
  { id: "variety", name: "Todoterreno", desc: "Prueba las 4 clases", icon: Target, test: (m) => new Set(m.workouts.map((w) => w.trainingId)).size >= 4 },
  { id: "vet", name: "Veterano", desc: "50 entrenos", icon: Medal, test: (m) => m.totalWorkouts >= 50 },
  { id: "marathon", name: "Maratonico", desc: "1.000 minutos acumulados", icon: Timer, test: (m) => m.totalMinutes >= 1000 },
];
