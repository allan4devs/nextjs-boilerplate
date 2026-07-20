import { addDays, isoDateOrEmpty, toUtcDate, todayIso } from "./dates";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type CheckinDoc,
  type Membership,
  type NotificationPrefs,
  type WorkoutEntry,
} from "./types";

import { FREE_FIRST_DAY_PLAN_LABEL } from "./config";

const LEGACY_ACTIVE_CHECKIN_MINUTES = 90;

/** Plan labels that must never unlock class booking by themselves. */
export function isInactivePlanLabel(plan: string | undefined | null) {
  const value = String(plan ?? "").trim();
  return !value || value === "-" || /^sin\s*plan/i.test(value);
}

/** Labels / offer ids that grant a single training day, activated on first gym entry. */
export function isOneDayPlanLabel(plan: string | undefined | null) {
  const value = String(plan ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!value) return false;
  if (value === FREE_FIRST_DAY_PLAN_LABEL.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) {
    return true;
  }
  return (
    /primer\s*d[ií]?a/.test(value) ||
    /pase\s*(del\s*)?d[ií]?a/.test(value) ||
    value === "pase dia" ||
    value === "day-pass" ||
    value === "day pass"
  );
}

export function isCheckinOpen(checkin: CheckinDoc, now = Date.now()) {
  if (checkin.checkedOutAt instanceof Date) return false;
  if (checkin.checkedOutAt === null) return true;
  return now - new Date(checkin.checkedInAt).getTime() <= LEGACY_ACTIVE_CHECKIN_MINUTES * 60_000;
}

export function mergeNotificationPrefs(prefs?: Partial<NotificationPrefs> | null): NotificationPrefs {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(prefs ?? {}) };
}

export function clampPinnedBadges(ids: unknown, max = 3): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of ids) {
    const id = String(raw ?? "").trim().slice(0, 64);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(id);
    if (output.length >= max) break;
  }
  return output;
}

export function membershipStatus(membership?: Membership) {
  const planRaw = String(membership?.plan ?? "").trim();
  const plan = planRaw || "-";
  const nextBillingDate = isoDateOrEmpty(membership?.nextBillingDate);
  const startedAt = isoDateOrEmpty(membership?.startedAt) || String(membership?.startedAt ?? "");

  // Sin fecha de vencimiento real o sin plan usable = sin acceso (no inventar "hoy").
  if (isInactivePlanLabel(plan) || !nextBillingDate) {
    return {
      plan: isInactivePlanLabel(plan) && plan === "-" ? "Sin plan activo" : plan,
      nextBillingDate: nextBillingDate || "",
      daysRemaining: -1,
      status: "expired" as const,
      startedAt,
    };
  }

  const today = toUtcDate(todayIso());
  const daysRemaining = Math.ceil((toUtcDate(nextBillingDate).getTime() - today.getTime()) / 86_400_000);
  const isOneDay = isOneDayPlanLabel(plan);
  const status: "active" | "warning" | "expired" =
    daysRemaining < 0
      ? "expired"
      : isOneDay
        ? "active"
        : daysRemaining <= 5
          ? "warning"
          : "active";
  return { plan, nextBillingDate, daysRemaining, status, startedAt };
}

/** True when membership fields alone cover booking on the gym's business day. */
export function membershipCoversToday(membership?: Membership) {
  const ms = membershipStatus(membership);
  return ms.daysRemaining >= 0 && !isInactivePlanLabel(ms.plan);
}

export function computeStreak(workouts: WorkoutEntry[]) {
  const dates = new Set(workouts.map((workout) => workout.completedDate).filter(Boolean) as string[]);
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
