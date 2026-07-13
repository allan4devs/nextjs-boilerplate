"use client";

import { useMemo } from "react";
import { Award } from "lucide-react";
import { pickPhrase } from "@/lib/xtreme/phrases";
import { nextBadgeUp, phraseContextFor } from "../../gamification";
import {
  ACHIEVEMENTS,
  DEFAULT_NOTIF_PREFS,
  TRAININGS,
} from "../constants";
import type { Member, OsModal } from "../types";
import {
  getWeekDates,
  initialMember,
  memberCode,
  todayIso,
} from "../utils";

type UseMemberDerivedStateParams = {
  member: Member | null;
  memberName: string;
  osModal: OsModal;
  showPin: boolean;
};

/**
 * View model puro del Member OS.
 * Centraliza todos los valores que la UI consume ya calculados.
 */
export function useMemberDerivedState({
  member,
  memberName,
  osModal,
  showPin,
}: UseMemberDerivedStateParams) {
  const unlocked = Boolean(memberName) && !showPin;
  const currentMember = useMemo(
    () => member ?? initialMember(memberName),
    [member, memberName],
  );
  const completedToday = useMemo(
    () =>
      new Set(
        currentMember.workouts
          .filter((workout) => workout.completedDate === todayIso())
          .map((workout) => workout.trainingId),
      ),
    [currentMember.workouts],
  );
  const recentWorkouts = useMemo(
    () => [...currentMember.workouts].reverse().slice(0, 5),
    [currentMember.workouts],
  );
  const workoutDates = useMemo(
    () => new Set(currentMember.workouts.map((workout) => workout.completedDate)),
    [currentMember.workouts],
  );
  const weekDates = useMemo(() => getWeekDates(), []);
  const gami = currentMember.gamification;
  const weekDoneCount =
    gami?.weekCount ?? weekDates.filter((date) => workoutDates.has(date)).length;
  const weeklyGoal = gami?.weeklyGoal ?? 4;
  const level = gami?.level?.index ?? Math.floor(currentMember.totalWorkouts / 10) + 1;
  const levelName = gami?.level?.name ?? "Novato";
  const nextMilestone = gami?.level?.nextXp ?? level * 10;
  const milestoneLeft = gami
    ? Math.max(0, (gami.level.nextXp ?? gami.xp) - gami.xp)
    : Math.max(0, nextMilestone - currentMember.totalWorkouts);
  const serverBadges = gami?.badges ?? [];
  const achievements = serverBadges.length
    ? serverBadges.map((badge) => ({
        id: badge.id,
        name: badge.name,
        desc: badge.desc,
        icon: Award,
        done: badge.earned,
      }))
    : ACHIEVEMENTS.map((achievement) => ({
        ...achievement,
        done: achievement.test(currentMember),
      }));
  const unlockedCount = achievements.filter((achievement) => achievement.done).length;
  const pinnedBadgeIds = currentMember.pinnedBadges ?? gami?.pinnedBadges ?? [];
  const notifPrefs = currentMember.notificationPrefs ?? DEFAULT_NOTIF_PREFS;
  const accessCode =
    currentMember.accessCode ||
    memberCode(currentMember.normalizedName || memberName.trim().toUpperCase() || "XTREME01");
  const latestMetric = currentMember.latestBodyMetric;
  const metricTrend = currentMember.bodyMetrics.slice(-12);
  const membershipTone =
    currentMember.membership.status === "expired"
      ? "border-red-400/40 bg-red-500/10 text-red-200"
      : currentMember.membership.status === "warning"
        ? "border-orange-300/40 bg-orange-300/10 text-orange-100"
        : "border-[#d8ff3e]/35 bg-[#d8ff3e]/10 text-[#efffb8]";
  const trainedToday = completedToday.size > 0;
  const effectiveStreak = gami?.streak ?? currentMember.streak;
  const dayPhrase = pickPhrase(
    phraseContextFor({
      trainedToday,
      streak: effectiveStreak,
      totalWorkouts: currentMember.totalWorkouts,
      lastWorkoutDate: currentMember.lastWorkoutDate,
    }),
    memberName || "Xtreme",
    { streak: effectiveStreak },
  );
  const nextBadge = nextBadgeUp(serverBadges);
  const quickTraining =
    TRAININGS.find((training) => training.name === currentMember.favoriteTraining) ??
    TRAININGS[0];
  const selectedTraining =
    osModal?.kind === "training"
      ? TRAININGS.find((training) => training.id === osModal.trainingId) ?? null
      : null;

  return {
    unlocked,
    currentMember,
    completedToday,
    recentWorkouts,
    workoutDates,
    weekDates,
    gami,
    weekDoneCount,
    weeklyGoal,
    level,
    levelName,
    milestoneLeft,
    serverBadges,
    achievements,
    unlockedCount,
    pinnedBadgeIds,
    notifPrefs,
    accessCode,
    latestMetric,
    metricTrend,
    membershipTone,
    trainedToday,
    effectiveStreak,
    dayPhrase,
    nextBadge,
    quickTraining,
    selectedTraining,
  };
}
