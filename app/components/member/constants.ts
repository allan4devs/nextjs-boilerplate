/**
 * Barrel de compatibilidad para catálogos y configuración del Member OS.
 * Las fuentes reales viven en catalog/, config/ y storage/.
 */

export {
  ACHIEVEMENTS,
  findMachineGuide,
  GUIDE_WORKOUTS,
  MACHINE_GUIDE,
  ROUTINES,
  TRAININGS,
} from "./catalog";
export type { Achievement } from "./catalog";
export {
  DEFAULT_NOTIF_PREFS,
  GOALS,
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
