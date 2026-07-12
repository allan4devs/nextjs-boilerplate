import { businessDate } from "@/lib/xtreme/business-date";
import {
  BADGES,
  WEEKLY_GOAL_DEFAULT,
  buildMemberView,
  computeWeeklyStats,
  computeXp,
  evaluateBadges,
  freezesAvailable,
  levelForXp,
  planFreezeUsage,
  reconcileBadges,
} from "@/lib/xtreme/gamification";
import { clampPinnedBadges } from "@/lib/xtreme/shared";
import type { MemberRepository } from "./repository";
import type { XtremeMemberDoc } from "./types";

export function buildMemberGamification(
  doc: XtremeMemberDoc | null,
  today: string,
) {
  const workouts = doc?.workouts ?? [];
  const freezeHistory = doc?.freezeHistory ?? [];
  const weeklyGoal = doc?.weeklyGoal ?? WEEKLY_GOAL_DEFAULT;
  const xpBonus = Number(doc?.xpBonus) || 0;
  const freezesBonus = Number(doc?.freezesBonus) || 0;
  const planItems = doc?.trainingPlan?.items ?? [];
  const planItemsDone = planItems.filter((item) => item.done).length;
  const planProgressPct = planItems.length
    ? Math.round((planItemsDone / planItems.length) * 100)
    : 0;
  const view = buildMemberView({
    workouts,
    weeklyGoal,
    freezeHistory,
    metricsCount: doc?.bodyMetrics?.length ?? 0,
    planProgressPct,
    today,
  });
  const weekly = computeWeeklyStats(workouts, weeklyGoal, today);
  const earned = doc?.earnedBadges ?? [];
  const earnedIds = earned.map((badge) => badge.badgeId);
  const xp = computeXp({
    totalWorkouts: view.totalWorkouts,
    totalMinutes: view.totalMinutes,
    metricsCount: view.metricsCount,
    planItemsDone,
    totalWeeksMet: weekly.totalWeeksMet,
    earnedBadgeIds: earnedIds,
    xpBonus,
  });
  const badges = BADGES.filter(
    (definition) => !definition.secret || earnedIds.includes(definition.id),
  ).map((definition) => {
    const entry = earned.find((badge) => badge.badgeId === definition.id);
    return {
      id: definition.id,
      name: definition.name,
      desc: definition.desc,
      icon: definition.icon,
      tier: definition.tier,
      secret: Boolean(definition.secret),
      earned: Boolean(entry),
      earnedAt: entry?.earnedAt ?? null,
      seen: entry?.seen ?? true,
      progress: definition.progress ? definition.progress(view) : null,
    };
  });
  const pinnedBadges = clampPinnedBadges(doc?.pinnedBadges).filter((id) =>
    earnedIds.includes(id),
  );

  return {
    streak: view.streak,
    weeklyGoal,
    weekCount: weekly.weekCount,
    weekMet: weekly.weekMet,
    weeksStreak: weekly.weeksStreak,
    totalWeeksMet: weekly.totalWeeksMet,
    freezesAvailable: freezesAvailable(
      view.totalWorkouts,
      freezeHistory,
      freezesBonus,
    ),
    freezesUsed: freezeHistory.length,
    freezeHistory,
    xp,
    level: levelForXp(xp),
    badges,
    earnedBadgeCount: earnedIds.length,
    unseenBadgeIds: earned
      .filter((badge) => !badge.seen)
      .map((badge) => badge.badgeId),
    pinnedBadges,
  };
}

export async function syncMemberGamification(
  repository: MemberRepository,
  memberKey: string,
  options: { today?: string; now?: Date } = {},
): Promise<string[]> {
  const doc = await repository.findByKey(memberKey);
  if (!doc) return [];

  const today = options.today ?? businessDate(options.now);
  const workouts = doc.workouts ?? [];
  const freezeHistory = doc.freezeHistory ?? [];
  const workoutDates = new Set(
    workouts.map((workout) => workout.completedDate).filter(Boolean),
  );
  const newFreezes = planFreezeUsage(
    workoutDates,
    freezeHistory,
    workouts.length,
    today,
    Number(doc.freezesBonus) || 0,
  );
  const allFreezes = [...freezeHistory, ...newFreezes];
  const planItems = doc.trainingPlan?.items ?? [];
  const planItemsDone = planItems.filter((item) => item.done).length;
  const view = buildMemberView({
    workouts,
    weeklyGoal: doc.weeklyGoal ?? WEEKLY_GOAL_DEFAULT,
    freezeHistory: allFreezes,
    metricsCount: doc.bodyMetrics?.length ?? 0,
    planProgressPct: planItems.length
      ? Math.round((planItemsDone / planItems.length) * 100)
      : 0,
    today,
  });
  const { all, newlyEarned } = reconcileBadges(
    evaluateBadges(view),
    doc.earnedBadges ?? [],
  );

  if (newFreezes.length || newlyEarned.length) {
    await repository.updateGamification(memberKey, {
      freezeHistory: allFreezes,
      earnedBadges: all,
      updatedAt: options.now ?? new Date(),
    });
  }
  return newlyEarned;
}
