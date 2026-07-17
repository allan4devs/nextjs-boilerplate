import { businessDate } from "../business-date";

export function todayIso() {
  return businessDate();
}

export function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isoDateOrEmpty(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}
