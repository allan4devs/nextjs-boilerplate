import { Activity, Dumbbell, Goal, Sparkles, Zap } from "lucide-react";
import type { Training } from "../domain/training";

/**
 * Entreno de piso libre (sin cupo ni horario de clase).
 * Sirve para marcar la racha del día sin pretender check-in a una clase grupal.
 */
export const FREE_WORKOUT: Training = {
  id: "open-floor",
  name: "Entreno libre",
  coach: "Piso libre",
  time: "Cuando quieras",
  minutes: 45,
  intensity: "Variable",
  slots: 0,
  focus: "Tu sesión en el gym",
  color: "from-zinc-200 to-white",
  icon: Sparkles,
};

/** Clases grupales con horario y cupo (requieren reserva + ventana de check-in). */
export const TRAININGS: Training[] = [
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

/** Opciones al marcar entreno libre / modal de training (libre + clases). */
export const WORKOUT_OPTIONS: Training[] = [FREE_WORKOUT, ...TRAININGS];
