import type { QuickWorkoutMode } from "./types";
/**
 * Barrel de compatibilidad para helpers del Member OS.
 * HTTP vive en api/http y los helpers puros/browser en helpers/.
 */

export { ApiError, errorText, isNetworkError, readJson } from "./api/http";
export {
  dayLabel,
  formatCedulaInput,
  getWeekDates,
  initialMember,
  initialsOf,
  memberCode,
  membershipAllowsClassBooking,
  membershipPlanDays,
  membershipRemainingPct,
  normalizeName,
  onlyDigits,
  resizePhoto,
  todayIso,
} from "./helpers";

/** Frase del coach para el registro rápido, según lo que la persona eligió. */
export function quickCoachLine(args: {
  trainedToday: boolean;
  streak: number;
  minutes: number;
  mode: QuickWorkoutMode;
  activities: string[];
}) {
  if (args.trainedToday) return "Hoy ya sumaste. Mañana se repite la magia.";
  if (args.mode === "tap") {
    if (args.streak >= 5) return `Racha de ${args.streak}. Un toque y la cuidás.`;
    if (args.streak > 0) return "Sin vueltas: tocá y queda marcado.";
    return "Primera de la racha puede ser un solo toque.";
  }
  if (args.mode === "plan") return "Seguí lo que te armó el coach. Sin inventar.";
  if (args.minutes <= 20) return "Cortito pero cuenta. Mejor 20 min que cero.";
  if (args.minutes >= 60) return "Sesión larga: ese cuerpo se va a enterar.";
  if (args.activities.length >= 2) return `${args.activities.length} cosas en la lista. Se ve serio.`;
  if (args.activities.length === 1) return `${args.activities[0]} · ${args.minutes} min. Listo para guardar.`;
  return "Elegí minutos (y opcional qué hiciste). Un toque y listo.";
}

/** "2026-07-11" → 11 (sin pasar por Date: evita corrimientos de zona horaria). */
export function dayOfMonth(date: string) {
  return Number(date.slice(8, 10));
}
