import {
  WEEKLY_GOAL_DEFAULT,
  buildMemberView,
  computeXp,
  freezesAvailable,
  levelForXp,
} from "../gamification";
import { formatAccessCode, memberAccessCode, normalizeKey } from "./identity";
import {
  clampPinnedBadges,
  computeStreak,
  membershipStatus,
  mergeNotificationPrefs,
} from "./member-rules";
import type { MemberDoc, TrainingPlan, WorkoutHistoryItem } from "./types";

export function toAdminPlan(plan?: TrainingPlan) {
  if (!plan) return null;
  const items = plan.items ?? [];
  const doneItems = items.filter((item) => item.done).length;
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
  const earnedBadgeIds = earnedBadges.map((badge) => badge.badgeId);
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
  const recentWorkouts: WorkoutHistoryItem[] = [...workouts]
    .sort((a, b) => (b.completedDate || "").localeCompare(a.completedDate || ""))
    .slice(0, 8)
    .map((workout) => ({
      id: workout.id,
      completedDate: workout.completedDate || "",
      trainingName: workout.trainingName || "Entrenamiento",
      minutes: workout.minutes || 0,
      intensity: workout.intensity,
      planItemId: workout.planItemId,
      exercises: workout.exercises ?? [],
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
    totalMinutes: workouts.reduce((sum, workout) => sum + (workout.minutes || 0), 0),
    lastWorkoutDate: workouts.map((workout) => workout.completedDate).filter(Boolean).sort().at(-1) ?? null,
    plan: membership.plan,
    membershipStatus: membership.status,
    daysRemaining: membership.daysRemaining,
    nextBillingDate: membership.nextBillingDate,
    startedAt: membership.startedAt,
    latestWeight: metrics.at(-1)?.weightKg ?? null,
    latestWaist: metrics.at(-1)?.waistCm ?? null,
    seeded: Boolean(doc.seeded),
    createdAt: doc.createdAt ?? null,
    bodyMetrics: metrics.slice(-10),
    recentWorkouts,
  };
}
