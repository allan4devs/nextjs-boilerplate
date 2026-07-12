import { businessDate } from "@/lib/xtreme/business-date";

const MAX_PHOTO_CHARS = 400_000;

export function normalizeMemberName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeMemberKey(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeMemberPhone(value: unknown) {
  return String(value ?? "").replace(/[^\d+]/g, "").slice(0, 24);
}

export function normalizeMemberEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 80);
}

export function normalizeIsoDate(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : businessDate();
}

export function normalizeMemberPhoto(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw || !raw.startsWith("data:image/") || raw.length > MAX_PHOTO_CHARS) {
    return "";
  }
  return raw;
}
