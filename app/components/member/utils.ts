/**
 * Member OS — helpers puros: fechas, formatos, codigo de acceso
 * y el socio inicial en blanco.
 */

import { DEFAULT_NOTIF_PREFS } from "./constants";
import type { Member } from "./types";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Reduce la foto a un cuadrado de 256px (JPEG) para guardarla en Mongo. */
export async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen.");
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

export function getWeekDates() {
  const today = new Date();
  const day = today.getDay() || 7;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function dayLabel(date: string) {
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const index = getWeekDates().indexOf(date);
  return labels[index] ?? "";
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 20);
}

export function formatCedulaInput(value: string) {
  // Conserva digitos y guiones (lector suele mandar solo digitos).
  return value.replace(/[^\d-]/g, "").slice(0, 20);
}

export function initialMember(name = ""): Member {
  return {
    memberName: name,
    normalizedName: name.toUpperCase(),
    goal: "",
    favoriteTraining: "",
    phone: "",
    email: "",
    cedula: "",
    photoUrl: "",
    workouts: [],
    streak: 0,
    totalWorkouts: 0,
    totalMinutes: 0,
    lastWorkoutDate: null,
    membership: {
      plan: "Xtreme Mensual",
      status: "active",
      startedAt: todayIso(),
      nextBillingDate: todayIso(),
      daysRemaining: 30,
    },
    bodyMetrics: [],
    latestBodyMetric: null,
    trainingPlan: null,
    notificationPrefs: { ...DEFAULT_NOTIF_PREFS },
    pinnedBadges: [],
  };
}

export function memberCode(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 100000000)
    .toString()
    .padStart(8, "0")
    .replace(/(\d{4})(\d{4})/, "$1 $2");
}

/** Error de API con el status HTTP y el `code` que devuelve el server (ej. "session_required"). */
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!response.ok) {
    throw new ApiError(data.error ?? "No se pudo conectar con Mongo.", response.status, data.code);
  }
  return data;
}
