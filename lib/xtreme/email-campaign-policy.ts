const COSTA_RICA_TIME_ZONE = "America/Costa_Rica";

/**
 * Inicio del día calendario actual en Costa Rica, expresado en UTC.
 * Costa Rica usa UTC-6 todo el año y no aplica horario de verano.
 */
export function currentCampaignDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: COSTA_RICA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day"), 6));
}
