import { addDays, toUtcDate, todayIso } from "./dates";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type CheckinDoc,
  type Membership,
  type NotificationPrefs,
  type WorkoutEntry,
} from "./types";

const LEGACY_ACTIVE_CHECKIN_MINUTES = 90;

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
  const plan = membership?.plan ?? "—";
  const nextBillingDate = membership?.nextBillingDate ?? todayIso();
  const today = toUtcDate(todayIso());
  const daysRemaining = Math.ceil((toUtcDate(nextBillingDate).getTime() - today.getTime()) / 86_400_000);
  const status: "active" | "warning" | "expired" =
    daysRemaining < 0 ? "expired" : daysRemaining <= 5 ? "warning" : "active";
  return { plan, nextBillingDate, daysRemaining, status, startedAt: membership?.startedAt ?? "" };
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
