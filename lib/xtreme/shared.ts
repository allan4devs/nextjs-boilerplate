import { createHash } from "crypto";
import type { Db } from "mongodb";

export const MEMBERS_COLLECTION = "xtreme_gym_members";
export const RESERVATIONS_COLLECTION = "xtreme_gym_class_reservations";
export const PINS_COLLECTION = "xtreme_gym_pins";
export const PAYMENTS_COLLECTION = "xtreme_gym_payments";
export const CHECKINS_COLLECTION = "xtreme_gym_checkins";

export const GYM_CAPACITY = 85;
export const PIN_PEPPER = "xtreme-gym-member-pin-v1";

export const ADMIN_CODE = process.env.XTREME_ADMIN_CODE || "xtreme-admin";
export const SUPER_ADMIN_CODE = process.env.XTREME_SUPER_ADMIN_CODE || "xtreme-super";

export const TRAININGS = [
  { id: "fuerza-total", name: "Fuerza Total", capacity: 8 },
  { id: "hiit-quemador", name: "HIIT Quemador", capacity: 12 },
  { id: "glute-lab", name: "Glute Lab", capacity: 10 },
  { id: "xtreme-core", name: "Xtreme Core", capacity: 15 },
] as const;

export type AdminRole = "admin" | "super";

export type Membership = {
  plan?: string;
  nextBillingDate?: string;
  startedAt?: string;
  status?: "active" | "warning" | "expired";
};

export type WorkoutEntry = {
  id?: string;
  trainingId?: string;
  trainingName?: string;
  intensity?: string;
  minutes?: number;
  completedDate?: string;
  completedAt?: Date | string;
};

export type BodyMetric = {
  id?: string;
  date: string;
  weightKg: number;
  waistCm: number;
  note?: string;
};

export type WorkoutHistoryItem = {
  id?: string;
  completedDate: string;
  trainingName: string;
  minutes: number;
  intensity?: string;
};

export type PlanItem = {
  id: string;
  day: string;
  focus: string;
  exercises: string;
  targetMinutes: number;
  done: boolean;
  doneDate: string | null;
};

export type TrainingPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type MemberDoc = {
  normalizedName?: string;
  memberName?: string;
  goal?: string;
  favoriteTraining?: string;
  phone?: string;
  email?: string;
  coach?: string;
  notes?: string;
  photoUrl?: string;
  workouts?: WorkoutEntry[];
  membership?: Membership;
  bodyMetrics?: BodyMetric[];
  trainingPlan?: TrainingPlan;
  seeded?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PaymentDoc = {
  id: string;
  memberName: string;
  normalizedName: string;
  customerName: string;
  phone: string;
  email: string;
  optionId: string;
  optionLabel: string;
  category: "Plan" | "Clase" | "Otro";
  amountCrc: number;
  amountUsd: number;
  currency: string;
  method: "paypal" | "cash" | "transfer" | "sinpe" | "other";
  status: "completed" | "pending" | "refunded";
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  note: string;
  date: string;
  createdAt: Date;
  recordedBy: "paypal" | "admin" | "seed";
};

export type CheckinDoc = {
  id: string;
  memberName: string;
  normalizedName: string;
  accessCode: string;
  method: "code" | "name" | "pin" | "admin";
  membershipStatus: "active" | "warning" | "expired" | "unknown";
  date: string;
  checkedInAt: Date;
  by: "kiosk" | "admin";
  note?: string;
};

export function normalizeName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

export function hashPin(pin: string, normalizedName: string) {
  return createHash("sha256").update(`${normalizedName}|${pin}|${PIN_PEPPER}`).digest("hex");
}

/** 8-digit access code derived from member name (matches carne digital). */
export function memberAccessCode(normalizedName: string) {
  let hash = 0;
  const key = normalizeKey(normalizedName) || "XTREME01";
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 100_000_000).toString().padStart(8, "0");
}

export function formatAccessCode(code: string) {
  const digits = code.replace(/\D/g, "").padStart(8, "0").slice(0, 8);
  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
}

export function resolveAdminRole(code: string): AdminRole | null {
  const value = code.trim();
  if (!value) return null;
  if (value === SUPER_ADMIN_CODE) return "super";
  if (value === ADMIN_CODE) return "admin";
  return null;
}

export function membershipStatus(membership?: Membership) {
  const plan = membership?.plan ?? "—";
  const nextBillingDate = membership?.nextBillingDate ?? todayIso();
  const today = toUtcDate(todayIso());
  const daysRemaining = Math.ceil(
    (toUtcDate(nextBillingDate).getTime() - today.getTime()) / 86_400_000,
  );
  const status: "active" | "warning" | "expired" =
    daysRemaining < 0 ? "expired" : daysRemaining <= 5 ? "warning" : "active";
  return { plan, nextBillingDate, daysRemaining, status, startedAt: membership?.startedAt ?? "" };
}

/**
 * Racha real: cuenta dias consecutivos terminando hoy (o ayer, si hoy aun
 * no entrena). Si el ultimo entreno fue antes de ayer, la racha esta rota (0).
 */
export function computeStreak(workouts: WorkoutEntry[]) {
  const dates = new Set(
    workouts.map((w) => w.completedDate).filter(Boolean) as string[],
  );
  if (!dates.size) return 0;
  let cursor = toUtcDate(todayIso());
  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor = addDays(cursor, -1);
    if (!dates.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Ventana en la que un check-in cuenta como "persona adentro". */
export const ACTIVE_CHECKIN_WINDOW_MIN = 90;

export type OccupancySnapshot = {
  date: string;
  capacity: number;
  currentPeople: number;
  occupancyPct: number;
  level: "Tranquilo" | "Medio" | "Lleno";
  checkinsToday: number;
  uniqueCheckins: number;
  reservationsToday: number;
  updatedAt: string;
  recent: Array<{
    id: string;
    memberName: string;
    accessCode: string;
    membershipStatus: string;
    checkedInAt: Date;
    method: string;
  }>;
};

/**
 * Ocupacion real del gym: personas unicas con check-in dentro de la ventana
 * activa. Sin estimados inventados — solo datos de la coleccion de ingresos.
 */
export async function computeOccupancy(db: Db): Promise<OccupancySnapshot> {
  const date = todayIso();
  const [checkinDocs, reservationsToday] = await Promise.all([
    db
      .collection<CheckinDoc>(CHECKINS_COLLECTION)
      .find({ date })
      .sort({ checkedInAt: -1 })
      .toArray(),
    db
      .collection(RESERVATIONS_COLLECTION)
      .countDocuments({ trainingDate: date, status: "reserved" }),
  ]);

  const activeSince = Date.now() - ACTIVE_CHECKIN_WINDOW_MIN * 60 * 1000;
  const activeNow = new Set(
    checkinDocs
      .filter((c) => new Date(c.checkedInAt).getTime() >= activeSince)
      .map((c) => c.normalizedName),
  ).size;

  const currentPeople = Math.min(GYM_CAPACITY, activeNow);
  const occupancyPct = Math.round((currentPeople / GYM_CAPACITY) * 100);
  const level = occupancyPct >= 78 ? "Lleno" : occupancyPct >= 48 ? "Medio" : "Tranquilo";

  return {
    date,
    capacity: GYM_CAPACITY,
    currentPeople,
    occupancyPct,
    level,
    checkinsToday: checkinDocs.length,
    uniqueCheckins: new Set(checkinDocs.map((c) => c.normalizedName)).size,
    reservationsToday,
    updatedAt: new Date().toISOString(),
    recent: checkinDocs.slice(0, 12).map((c) => ({
      id: c.id,
      memberName: c.memberName,
      accessCode: c.accessCode,
      membershipStatus: c.membershipStatus,
      checkedInAt: c.checkedInAt,
      method: c.method,
    })),
  };
}

export function toAdminPlan(plan?: TrainingPlan) {
  if (!plan) return null;
  const items = plan.items ?? [];
  const doneItems = items.filter((i) => i.done).length;
  const totalItems = items.length;
  return {
    title: plan.title ?? "",
    objective: plan.objective ?? "",
    coachNote: plan.coachNote ?? "",
    startDate: plan.startDate ?? "",
    endDate: plan.endDate ?? "",
    weeklySessions: plan.weeklySessions ?? 0,
    items,
    doneItems,
    totalItems,
    progressPct: totalItems ? Math.round((doneItems / totalItems) * 100) : 0,
    updatedAt: plan.updatedAt ?? null,
  };
}

export function toAdminMember(doc: MemberDoc) {
  const workouts = doc.workouts ?? [];
  const metrics = [...(doc.bodyMetrics ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const membership = membershipStatus(doc.membership);
  const name = doc.memberName ?? "";
  const key = doc.normalizedName ?? normalizeKey(name);

  // Recent workouts for admin detail view (last 8)
  const recentWorkouts: WorkoutHistoryItem[] = [...workouts]
    .sort((a, b) => (b.completedDate || "").localeCompare(a.completedDate || ""))
    .slice(0, 8)
    .map((w) => ({
      id: w.id,
      completedDate: w.completedDate || "",
      trainingName: w.trainingName || "Entrenamiento",
      minutes: w.minutes || 0,
      intensity: w.intensity,
    }));

  return {
    trainingPlan: toAdminPlan(doc.trainingPlan),
    memberName: name,
    normalizedName: key,
    goal: doc.goal ?? "",
    favoriteTraining: doc.favoriteTraining || workouts.at(-1)?.trainingName || "",
    phone: doc.phone ?? "",
    email: doc.email ?? "",
    coach: doc.coach ?? "",
    notes: doc.notes ?? "",
    photoUrl: doc.photoUrl ?? "",
    accessCode: formatAccessCode(memberAccessCode(key)),
    streak: computeStreak(workouts),
    totalWorkouts: workouts.length,
    totalMinutes: workouts.reduce((sum, w) => sum + (w.minutes || 0), 0),
    lastWorkoutDate:
      workouts
        .map((w) => w.completedDate)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null,
    plan: membership.plan,
    membershipStatus: membership.status,
    daysRemaining: membership.daysRemaining,
    nextBillingDate: membership.nextBillingDate,
    startedAt: membership.startedAt,
    latestWeight: metrics.at(-1)?.weightKg ?? null,
    latestWaist: metrics.at(-1)?.waistCm ?? null,
    seeded: Boolean(doc.seeded),
    createdAt: doc.createdAt ?? null,
    // Rich data for detailed view (entrenadora)
    bodyMetrics: metrics.slice(-10), // last 10 measurements
    recentWorkouts,
  };
}

export function sanitizePlan(input: unknown): TrainingPlan {
  const raw = (input ?? {}) as Record<string, unknown>;
  const now = new Date();
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items: PlanItem[] = rawItems.slice(0, 30).map((entry, index) => {
    const it = (entry ?? {}) as Record<string, unknown>;
    return {
      id: String(it.id ?? "").trim() || `plan-${now.getTime()}-${index}`,
      day: String(it.day ?? "").trim().slice(0, 40),
      focus: String(it.focus ?? "").trim().slice(0, 80),
      exercises: String(it.exercises ?? "").trim().slice(0, 500),
      targetMinutes: Math.max(0, Math.min(240, Number(it.targetMinutes) || 0)),
      done: Boolean(it.done),
      doneDate: isoDateOrEmpty(it.doneDate) || null,
    };
  });
  return {
    title: String(raw.title ?? "").trim().slice(0, 80),
    objective: String(raw.objective ?? "").trim().slice(0, 160),
    coachNote: String(raw.coachNote ?? "").trim().slice(0, 500),
    startDate: isoDateOrEmpty(raw.startDate),
    endDate: isoDateOrEmpty(raw.endDate),
    weeklySessions: Math.max(0, Math.min(14, Number(raw.weeklySessions) || 0)),
    items,
    updatedAt: now,
  };
}
