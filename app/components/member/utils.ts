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
  normalizeName,
  onlyDigits,
  resizePhoto,
  todayIso,
} from "./helpers";
