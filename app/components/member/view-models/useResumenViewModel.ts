"use client";

import { useCallback, useMemo } from "react";
import { TRAININGS } from "../constants";
import type { MemberOs } from "../useMemberOs";
import { dayLabel, membershipPlanDays, membershipRemainingPct, todayIso } from "../utils";

type SummaryStat = {
  id: "streak" | "month" | "week" | "league";
  label: string;
  value: string;
  hint: string;
};

export type ResumenViewModel = {
  streak: {
    value: number;
    phrase: string;
    freezes: number;
    weekCount: number;
    weeklyGoal: number;
  } | null;
  todayTraining: {
    completed: boolean;
    saving: boolean;
    disabled: boolean;
    actionLabel: string;
  };
  stats: SummaryStat[];
  nextClassName: string;
  nextAction: MemberOs["nextBestAction"];
  gamification: {
    xp: number;
    level: NonNullable<MemberOs["gami"]>["level"];
    milestoneText: string;
    weeksStreak: number;
    weekLabel: string;
    days: Array<{ date: string; label: string; done: boolean; isToday: boolean }>;
    freezesText: string | null;
  } | null;
  nextBadge: MemberOs["nextBadge"];
  membership: {
    tone: string;
    plan: string;
    nextBillingDate: string;
    status: string;
    daysRemaining: number;
    totalDays: number;
    progressPct: number;
  } | null;
  occupancy: {
    level: string;
    percentage: number;
    detail: string;
  };
};

export type ResumenActions = {
  openStreak: () => void;
  openLevel: () => void;
  markTodayTraining: () => void;
  openWeek: () => void;
  openLeague: () => void;
  openTrainingTab: () => void;
  openQuickTraining: () => void;
  openProgress: () => void;
  runNextAction: () => void;
  openBadges: () => void;
  openMembership: () => void;
  openOccupancy: () => void;
};

async function trackMemberEvent(
  type: string,
  memberName: string,
  properties: Record<string, unknown>,
) {
  await fetch("/api/xtreme/events/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, source: "member_app", memberName, properties }),
  });
}

/** View model y comandos exclusivos del tab Resumen. */
export function useResumenViewModel(os: MemberOs): {
  model: ResumenViewModel;
  actions: ResumenActions;
} {
  const {
    unlocked,
    currentMember,
    memberName,
    trainedToday,
    quickTraining,
    completeTraining,
    savingTrainingId,
    effectiveStreak,
    weekDoneCount,
    weeklyGoal,
    leaderboard,
    reservations,
    setTab,
    setOsModal,
    nextBestAction,
    gami,
    dayPhrase,
    milestoneLeft,
    level,
    weekDates,
    workoutDates,
    nextBadge,
    membershipTone,
    gymStatus,
  } = os;

  const model = useMemo<ResumenViewModel>(() => {
    const today = todayIso();
    const month = today.slice(0, 7);
    const daysRemaining = currentMember.membership.daysRemaining;
    const totalDays = membershipPlanDays(currentMember.membership.plan);
    const leaguePosition = Math.max(
      1,
      leaderboard.findIndex(
        (entry) => entry.normalizedName === currentMember.normalizedName,
      ) + 1 || 1,
    );
    const reservedTraining = TRAININGS.find(
      (training) => reservations[training.id]?.isMine,
    );

    return {
      streak: gami
        ? {
            value: gami.streak,
            phrase: dayPhrase,
            freezes: gami.freezesAvailable,
            weekCount: gami.weekCount,
            weeklyGoal: gami.weeklyGoal,
          }
        : null,
      todayTraining: {
        completed: trainedToday,
        saving: Boolean(savingTrainingId),
        disabled: !unlocked || trainedToday || Boolean(savingTrainingId),
        actionLabel: currentMember.activePlanWorkout
          ? "Continuar entreno"
          : currentMember.trainingPlan?.items.some((item) => !item.done)
            ? "Abrir mi plan"
            : "Marcar entreno",
      },
      stats: [
        { id: "streak", label: "Racha", value: String(effectiveStreak), hint: "días · toca" },
        {
          id: "month",
          label: "Mes",
          value: String(
            currentMember.workouts.filter((workout) =>
              workout.completedDate.startsWith(month),
            ).length,
          ),
          hint: "entrenos",
        },
        {
          id: "week",
          label: "Semana",
          value: `${weekDoneCount}/${weeklyGoal}`,
          hint: "meta · toca",
        },
        { id: "league", label: "Liga", value: `#${leaguePosition}`, hint: "ranking" },
      ],
      nextClassName: reservedTraining?.name ?? "Sin reserva",
      nextAction: nextBestAction?.kind === "renew_plan" ? null : nextBestAction,
      gamification: gami
        ? {
            xp: gami.xp,
            level: gami.level,
            milestoneText:
              milestoneLeft === 0
                ? "Llegaste al nivel máximo. Seguí entrenando para mantener tu racha."
                : `${milestoneLeft.toLocaleString()} XP para el nivel ${level + 1}.`,
            weeksStreak: gami.weeksStreak,
            weekLabel: `Esta semana — ${weekDoneCount}/${weeklyGoal}`,
            days: weekDates.map((date) => ({
              date,
              label: dayLabel(date),
              done: workoutDates.has(date),
              isToday: date === today,
            })),
            freezesText:
              gami.freezesAvailable > 0
                ? gami.freezesAvailable === 1
                  ? "1 protector de racha disponible."
                  : `${gami.freezesAvailable} protectores de racha.`
                : null,
          }
        : null,
      nextBadge,
      membership:
        unlocked
          ? {
              tone: membershipTone,
              plan: currentMember.membership.plan,
              nextBillingDate: currentMember.membership.nextBillingDate,
              status: currentMember.membership.status,
              daysRemaining: Math.max(0, daysRemaining),
              totalDays,
              progressPct: membershipRemainingPct(daysRemaining, totalDays),
            }
          : null,
      occupancy: {
        level: gymStatus?.level ?? "Cargando",
        percentage: gymStatus?.occupancyPct ?? 0,
        detail: gymStatus
          ? `${gymStatus.currentPeople}/${gymStatus.capacity} personas · reservas hoy: ${gymStatus.reservationsToday}`
          : "Leyendo el gym en vivo.",
      },
    };
  }, [
    currentMember,
    dayPhrase,
    effectiveStreak,
    gami,
    gymStatus,
    leaderboard,
    level,
    membershipTone,
    milestoneLeft,
    nextBadge,
    nextBestAction,
    reservations,
    savingTrainingId,
    trainedToday,
    unlocked,
    weekDates,
    weekDoneCount,
    weeklyGoal,
    workoutDates,
  ]);

  const openStreak = useCallback(
    () => setOsModal({ kind: "streak" }),
    [setOsModal],
  );
  const openLevel = useCallback(() => setOsModal({ kind: "level" }), [setOsModal]);
  const markTodayTraining = useCallback(() => {
    if (trainedToday) return;
    if (currentMember.activePlanWorkout || currentMember.trainingPlan?.items.some((item) => !item.done)) {
      setTab("entrenar");
      return;
    }
    void completeTraining(quickTraining);
  }, [completeTraining, currentMember.activePlanWorkout, currentMember.trainingPlan, quickTraining, setTab, trainedToday]);
  const openWeek = useCallback(() => setOsModal({ kind: "week" }), [setOsModal]);
  const openLeague = useCallback(() => {
    window.location.href = "/app/comunidad";
  }, []);
  const openTrainingTab = useCallback(() => setTab("entrenar"), [setTab]);
  const openQuickTraining = useCallback(
    () => setOsModal({ kind: "quick-train" }),
    [setOsModal],
  );
  const openProgress = useCallback(() => setTab("progreso"), [setTab]);
  const runNextAction = useCallback(() => {
    if (!nextBestAction) return;
    void trackMemberEvent("recommendation_acted", memberName, {
      kind: nextBestAction.kind,
    }).catch(() => {});
    if (
      nextBestAction.kind === "train_today" ||
      nextBestAction.kind === "protect_streak" ||
      nextBestAction.kind === "second_visit"
    ) {
      if (currentMember.activePlanWorkout || currentMember.trainingPlan?.items.some((item) => !item.done)) {
        setTab("entrenar");
      } else if (!trainedToday) {
        void completeTraining(quickTraining);
      }
      return;
    }
    if (nextBestAction.href === "/app/comunidad") {
      window.location.href = nextBestAction.href;
      return;
    }
    if (nextBestAction.href.startsWith("#")) {
      if (nextBestAction.kind === "coach_note" || nextBestAction.href === "#plan") {
        setTab("entrenar");
        return;
      }
      setTab(nextBestAction.href === "#progreso" ? "progreso" : "entrenar");
      return;
    }
    window.location.href = nextBestAction.href;
  }, [completeTraining, currentMember.activePlanWorkout, currentMember.trainingPlan, memberName, nextBestAction, quickTraining, setTab, trainedToday]);
  const openBadges = useCallback(
    () => setOsModal({ kind: "badges" }),
    [setOsModal],
  );
  const openMembership = useCallback(
    () => setOsModal({ kind: "membership" }),
    [setOsModal],
  );
  const openOccupancy = useCallback(
    () => setOsModal({ kind: "occupancy" }),
    [setOsModal],
  );

  return {
    model,
    actions: {
      openStreak,
      openLevel,
      markTodayTraining,
      openWeek,
      openLeague,
      openTrainingTab,
      openQuickTraining,
      openProgress,
      runNextAction,
      openBadges,
      openMembership,
      openOccupancy,
    },
  };
}
