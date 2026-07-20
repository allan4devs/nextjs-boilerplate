import {
  computeStreak,
  membershipStatus,
  mergeNotificationPrefs,
  type MemberDoc,
} from "./shared";

export type LifecycleTrigger =
  | { kind: "streak-risk"; key: string; streak: number }
  | { kind: "milestone"; key: string; streak: number }
  | { kind: "renewal"; key: string; daysRemaining: number; nextBillingDate: string; plan: string }
  | { kind: "win-back"; key: string; inactiveDays: 7 | 21 }
  | { kind: "monthly-recap"; key: string; month: string; workouts: number; minutes: number };

function dateDiffDays(laterIso: string, earlierIso: string) {
  const later = Date.parse(`${laterIso}T00:00:00.000Z`);
  const earlier = Date.parse(`${earlierIso}T00:00:00.000Z`);
  return Math.floor((later - earlier) / 86_400_000);
}

export function evaluateLifecycle(member: MemberDoc, today: string): LifecycleTrigger[] {
  const triggers: LifecycleTrigger[] = [];
  const prefs = mergeNotificationPrefs(member.notificationPrefs);
  const workouts = member.workouts ?? [];
  const workoutDates = workouts.map((workout) => workout.completedDate ?? "").filter(Boolean).sort();
  const lastWorkoutDate = workoutDates.at(-1);

  if (prefs.streakRisk && lastWorkoutDate && dateDiffDays(today, lastWorkoutDate) === 1) {
    const streak = computeStreak(workouts);
    if (streak >= 3) triggers.push({ kind: "streak-risk", key: `streak-risk:${today}`, streak });
  }

  if (prefs.milestones && lastWorkoutDate === today) {
    const streak = computeStreak(workouts);
    if ([3, 7, 14, 30, 60, 100, 365].includes(streak)) {
      triggers.push({ kind: "milestone", key: `milestone:${streak}:${today}`, streak });
    }
  }

  // Pausado a solicitud del usuario ("no mandes el correo ahorita de los que están pronto a expirar").
  const RENEWAL_REMINDERS_ENABLED = false;

  if (RENEWAL_REMINDERS_ENABLED && prefs.renewalReminders && member.membership?.nextBillingDate) {
    const membership = membershipStatus(member.membership);
    if (membership.daysRemaining === 5 || membership.daysRemaining === -3) {
      triggers.push({
        kind: "renewal",
        key: `renewal:${membership.nextBillingDate}:${membership.daysRemaining}`,
        daysRemaining: membership.daysRemaining,
        nextBillingDate: membership.nextBillingDate,
        plan: membership.plan,
      });
    }
  }

  if (prefs.winBack && lastWorkoutDate) {
    const inactiveDays = dateDiffDays(today, lastWorkoutDate);
    if (inactiveDays === 7 || inactiveDays === 21) {
      triggers.push({ kind: "win-back", key: `win-back:${lastWorkoutDate}:${inactiveDays}`, inactiveDays });
    }
  }

  if (prefs.weeklyRecap && today.endsWith("-01")) {
    const previousMonthDate = new Date(`${today}T00:00:00.000Z`);
    previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);
    const month = previousMonthDate.toISOString().slice(0, 7);
    const monthlyWorkouts = workouts.filter((workout) => workout.completedDate?.startsWith(month));
    if (monthlyWorkouts.length) {
      triggers.push({
        kind: "monthly-recap",
        key: `monthly-recap:${month}`,
        month,
        workouts: monthlyWorkouts.length,
        minutes: monthlyWorkouts.reduce((sum, workout) => sum + (workout.minutes || 0), 0),
      });
    }
  }

  return triggers;
}
