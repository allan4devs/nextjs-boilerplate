import { createHash } from "crypto";
import type { Db } from "mongodb";
import type { EarnedBadge } from "./gamification";
import {
  WEEKLY_GOAL_DEFAULT,
  buildMemberView,
  computeXp,
  freezesAvailable,
  levelForXp,
} from "./gamification";

export const MEMBERS_COLLECTION = "xtreme_gym_members";
export const RESERVATIONS_COLLECTION = "xtreme_gym_class_reservations";
export const PINS_COLLECTION = "xtreme_gym_pins";
export const PAYMENTS_COLLECTION = "xtreme_gym_payments";
export const CHECKINS_COLLECTION = "xtreme_gym_checkins";
export const OTPS_COLLECTION = "xtreme_gym_otps";
export const PENDING_REGISTRATIONS_COLLECTION = "xtreme_gym_pending_registrations";
export const AUDIT_COLLECTION = "xtreme_gym_audit";
export const BADGES_COLLECTION = "xtreme_gym_badges";
export const REFERRALS_COLLECTION = "xtreme_gym_referrals";
export const BUDDY_REQUESTS_COLLECTION = "xtreme_gym_buddy_requests";
/** Strategy 2.0 — trust + operations */
export const SESSIONS_COLLECTION = "xtreme_gym_sessions";
export const ENTITLEMENTS_COLLECTION = "xtreme_gym_entitlements";
export const ENTITLEMENT_LEDGER_COLLECTION = "xtreme_gym_entitlement_ledger";
export const CLASS_TEMPLATES_COLLECTION = "xtreme_gym_class_templates";
export const CLASS_SESSIONS_COLLECTION = "xtreme_gym_class_sessions";
export const BOOKINGS_COLLECTION = "xtreme_gym_bookings";
export const WAITLIST_COLLECTION = "xtreme_gym_waitlist";
/** Pending PayPal orders — bind capture optionId/amount server-side. */
export const PAYPAL_ORDERS_COLLECTION = "xtreme_gym_paypal_orders";
/** Live chat visita ↔ recepción */
export const CHAT_SESSIONS_COLLECTION = "xtreme_gym_chat_sessions";
export const CHAT_MESSAGES_COLLECTION = "xtreme_gym_chat_messages";

/** Catalog / entitlement id for the one-time free first day. */
export const FREE_FIRST_DAY_OFFER_ID = "free-first-day";
export const FREE_FIRST_DAY_PLAN_LABEL = "Primer día gratis";

export const GYM_CAPACITY = 85;
export const PIN_PEPPER = "xtreme-gym-member-pin-v1";

/**
 * Sin fallbacks en produccion (Fase 3 hygiene). En desarrollo se aceptan
 * defaults solo si las env no estan, con warning en consola.
 */
function adminEnv(name: "XTREME_ADMIN_CODE" | "XTREME_SUPER_ADMIN_CODE", devFallback: string) {
  const value = process.env[name]?.trim() ?? "";
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    console.error(`[xtreme] Missing required env ${name} — admin auth disabled for this role.`);
    return "";
  }
  console.warn(`[xtreme] ${name} not set; using dev fallback. Set it before production.`);
  return devFallback;
}

export const ADMIN_CODE = adminEnv("XTREME_ADMIN_CODE", "xtreme-admin");
export const SUPER_ADMIN_CODE = adminEnv("XTREME_SUPER_ADMIN_CODE", "xtreme-super");

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

export type NotificationPrefs = {
  streakRisk: boolean;
  milestones: boolean;
  renewalReminders: boolean;
  winBack: boolean;
  weeklyRecap: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  streakRisk: true,
  milestones: true,
  renewalReminders: true,
  winBack: true,
  weeklyRecap: true,
};

export type MemberDoc = {
  normalizedName?: string;
  memberName?: string;
  goal?: string;
  favoriteTraining?: string;
  phone?: string;
  email?: string;
  cedula?: string;
  /** Correo confirmado via link magico (registro double opt-in). */
  emailVerified?: boolean;
  coach?: string;
  notes?: string;
  photoUrl?: string;
  /**
   * Hash perceptual (dHash) del rostro para match rapido en recepcion.
   * Se genera en el cliente al enrolar foto de cara; no es un embedding ML.
   */
  faceHash?: string;
  workouts?: WorkoutEntry[];
  membership?: Membership;
  bodyMetrics?: BodyMetric[];
  trainingPlan?: TrainingPlan;
  /** Gamificacion (Fase 1) */
  weeklyGoal?: number;
  earnedBadges?: EarnedBadge[];
  freezeHistory?: string[];
  /** Ajustes manuales admin (Fase 3) */
  xpBonus?: number;
  freezesBonus?: number;
  /** Preferencias + showcase (Fase 3) */
  notificationPrefs?: Partial<NotificationPrefs>;
  pinnedBadges?: string[];
  /** Social (Fase 5) */
  leaderboardOptIn?: boolean;
  buddies?: string[];
  referredBy?: string;
  referralCount?: number;
  seeded?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type OtpDoc = {
  normalizedName: string;
  purpose: "pin_recovery";
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
};

/**
 * Registro pendiente de confirmacion (double opt-in). El usuario da su correo,
 * recibe un link magico con este token; al confirmarlo completa el perfil.
 */
export type PendingRegistrationDoc = {
  email: string;
  tokenHash: string;
  expiresAt: Date;
  confirmedAt?: Date | null;
  /** Perfil ya creado tras confirmar (para no duplicar). */
  memberNormalizedName?: string | null;
  createdAt: Date;
  source: "primer-dia" | "app";
};

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 80);
}

export function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/[^\d+]/g, "").slice(0, 24);
}

/** Cedula CR: solo digitos y guiones, longitud razonable. */
export function normalizeCedula(value: unknown) {
  return String(value ?? "").replace(/[^\d-]/g, "").slice(0, 20);
}

/** Solo digitos de cedula (para busqueda flexible 1-0111-0222 vs 101110222). */
export function cedulaDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 20);
}

/**
 * Match flexible de cedula (lector de barras / teclado).
 * Acepta 1-0111-0222, 101110222 o sufijos si el lector manda basura de prefijo.
 */
export function matchCedula(stored: unknown, raw: unknown) {
  const digits = cedulaDigits(raw);
  const formatted = normalizeCedula(raw);
  if (!digits && !formatted) return false;
  const docDigits = cedulaDigits(stored);
  const docFormatted = normalizeCedula(stored);
  if (!docDigits && !docFormatted) return false;
  if (
    digits &&
    docDigits &&
    (docDigits === digits || docDigits.endsWith(digits) || digits.endsWith(docDigits))
  ) {
    return true;
  }
  return Boolean(formatted && docFormatted && docFormatted === formatted);
}

export function findMemberByCedula<T extends { cedula?: string }>(
  docs: T[],
  raw: string,
): T | undefined {
  return docs.find((d) => matchCedula(d.cedula, raw));
}

/** Hamming distance entre dos hashes hex (face dHash). */
export function hammingHexDistance(a: string, b: string) {
  const left = String(a || "").toLowerCase().replace(/[^0-9a-f]/g, "");
  const right = String(b || "").toLowerCase().replace(/[^0-9a-f]/g, "");
  if (!left || !right || left.length !== right.length) return 64;
  let dist = 0;
  for (let i = 0; i < left.length; i += 1) {
    let x = parseInt(left[i], 16) ^ parseInt(right[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type AuditDoc = {
  id: string;
  at: Date;
  actorRole: AdminRole;
  action: string;
  targetType: "member" | "badge" | "payment" | "system";
  targetId: string;
  summary: string;
  meta?: Record<string, unknown>;
};

/** Definicion de badge personalizada / override de catalogo (Fase 3). */
export type BadgeDoc = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  /** manual = solo se otorga por admin; catalog = override de activo */
  source: "catalog" | "manual";
  active: boolean;
  secret?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
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
  method: "code" | "name" | "pin" | "admin" | "cedula" | "face";
  membershipStatus: "active" | "warning" | "expired" | "unknown";
  date: string;
  checkedInAt: Date;
  by: "kiosk" | "admin" | "reception";
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
  // Super primero: si ambos codigos coinciden por error, gana super.
  if (SUPER_ADMIN_CODE && value === SUPER_ADMIN_CODE) return "super";
  if (ADMIN_CODE && value === ADMIN_CODE) return "admin";
  return null;
}

export function mergeNotificationPrefs(prefs?: Partial<NotificationPrefs> | null): NotificationPrefs {
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(prefs ?? {}),
  };
}

export function clampPinnedBadges(ids: unknown, max = 3): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = String(raw ?? "").trim().slice(0, 64);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
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
  const freezeHistory = doc.freezeHistory ?? [];
  const weeklyGoal = doc.weeklyGoal ?? WEEKLY_GOAL_DEFAULT;
  const plan = toAdminPlan(doc.trainingPlan);
  const planItemsDone = plan?.doneItems ?? 0;
  const earnedBadges = doc.earnedBadges ?? [];
  const earnedBadgeIds = earnedBadges.map((b) => b.badgeId);
  const xpBonus = Number(doc.xpBonus) || 0;
  const freezesBonus = Number(doc.freezesBonus) || 0;

  const view = buildMemberView({
    workouts,
    weeklyGoal,
    freezeHistory,
    metricsCount: metrics.length,
    planProgressPct: plan?.progressPct ?? 0,
  });
  const xp = computeXp({
    totalWorkouts: view.totalWorkouts,
    totalMinutes: view.totalMinutes,
    metricsCount: view.metricsCount,
    planItemsDone,
    totalWeeksMet: view.totalWeeksMet,
    earnedBadgeIds,
    xpBonus,
  });
  const level = levelForXp(xp);
  const freezesBanked = freezesAvailable(view.totalWorkouts, freezeHistory, freezesBonus);

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
    trainingPlan: plan,
    memberName: name,
    normalizedName: key,
    goal: doc.goal ?? "",
    favoriteTraining: doc.favoriteTraining || workouts.at(-1)?.trainingName || "",
    phone: doc.phone ?? "",
    email: doc.email ?? "",
    cedula: doc.cedula ?? "",
    emailVerified: Boolean(doc.emailVerified),
    coach: doc.coach ?? "",
    notes: doc.notes ?? "",
    photoUrl: doc.photoUrl ?? "",
    hasFace: Boolean(doc.faceHash || doc.photoUrl),
    accessCode: formatAccessCode(memberAccessCode(key)),
    streak: view.streak || computeStreak(workouts),
    weeksStreak: view.weeksStreak,
    weeklyGoal,
    freezesBanked,
    freezesUsed: freezeHistory.length,
    freezesBonus,
    xp,
    xpBonus,
    levelName: level.name,
    levelIndex: level.index,
    earnedBadges,
    earnedBadgeCount: earnedBadgeIds.length,
    pinnedBadges: clampPinnedBadges(doc.pinnedBadges),
    notificationPrefs: mergeNotificationPrefs(doc.notificationPrefs),
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
