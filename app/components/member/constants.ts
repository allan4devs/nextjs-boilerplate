/**
 * Barrel de compatibilidad para catálogos y configuración del Member OS.
 * Las fuentes reales viven en catalog/, config/ y storage/.
 */

export {
  ACHIEVEMENTS,
  findMachineGuide,
  FREE_WORKOUT,
  GUIDE_WORKOUTS,
  MACHINE_GUIDE,
  ROUTINES,
  TRAININGS,
  WORKOUT_OPTIONS,
} from "./catalog";
export type { Achievement } from "./catalog";
export {
  DEFAULT_NOTIF_PREFS,
  GOALS,
  MSG,
  REMINDERS,
  TABS,
  TAB_SUBTITLES,
  TOUR_STEPS,
} from "./config";
export type { TabId } from "./config";
export {
  CEDULA_KEY,
  CEDULA_MIN_DIGITS,
  SESSION_KEY,
  SESSION_TTL_MS,
  STORAGE_KEY,
  TOUR_KEY,
} from "./storage";
export type { MachineGuide, Training } from "./domain/training";

/** Actividades sueltas del registro rápido de entreno. */
export const FREE_ACTIVITY_OPTIONS = [
  { id: "pesas", label: "Pesas", emoji: "🏋️" },
  { id: "maquinas", label: "Máquinas", emoji: "⚙️" },
  { id: "cardio", label: "Cardio", emoji: "🏃" },
  { id: "funcional", label: "Funcional", emoji: "🔥" },
  { id: "pierna", label: "Pierna", emoji: "🦵" },
  { id: "pecho", label: "Pecho / espalda", emoji: "💪" },
  { id: "core", label: "Core", emoji: "🎯" },
  { id: "movilidad", label: "Movilidad", emoji: "🧘" },
] as const;

/** Duraciones sugeridas del registro rápido. */
export const TIME_PRESETS = [
  { min: 20, label: "Rápido", hint: "20 min" },
  { min: 30, label: "Clásico", hint: "30 min" },
  { min: 45, label: "Bueno", hint: "45 min" },
  { min: 60, label: "Fuerte", hint: "1 h" },
  { min: 90, label: "Bestia", hint: "1.5 h" },
] as const;
