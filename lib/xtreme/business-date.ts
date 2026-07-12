export const XTREME_TIME_ZONE = "America/Costa_Rica";

const BUSINESS_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: XTREME_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date used by the gym, independent from the server's UTC clock. */
export function businessDate(now: Date = new Date()) {
  const parts = BUSINESS_DATE_FORMATTER.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("No se pudo calcular la fecha de negocio de Xtreme Gym.");
  }

  return `${year}-${month}-${day}`;
}
