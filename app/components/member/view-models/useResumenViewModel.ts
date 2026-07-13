"use client";

import { useCallback, useMemo } from "react";
import { TRAININGS } from "../constants";
import type { MemberOs } from "../useMemberOs";
import { dayLabel, todayIso } from "../utils";

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
  };
  renewal: {
    expired: boolean;
    daysRemaining: number;
    message: string;
  } | null;
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
  renewMembership: () => void;
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
      },
      renewal:
        unlocked && daysRemaining <= 5
          ? {
              expired: daysRemaining <= 0,
              daysRemaining,
              message:
                daysRemaining <= 0
                  ? "Renová en 1 toque y no perdás la racha."
                  : `Tu plan vence en ${daysRemaining} día${daysRemaining === 1 ? "" : "s"}.`,
            }
          : null,
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
      nextAction: nextBestAction,
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
        daysRemaining > 5
          ? {
              tone: membershipTone,
              plan: currentMember.membership.plan,
              nextBillingDate: currentMember.membership.nextBillingDate,
              status: currentMember.membership.status,
              daysRemaining: Math.max(0, daysRemaining),
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
    if (!trainedToday) void completeTraining(quickTraining);
  }, [completeTraining, quickTraining, trainedToday]);
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
  const renewMembership = useCallback(() => {
    void trackMemberEvent("cta_clicked", memberName, {
      cta: "one_tap_renewal",
      daysRemaining: currentMember.membership.daysRemaining,
    }).catch(() => {});
  }, [currentMember.membership.daysRemaining, memberName]);
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
      if (!trainedToday) void completeTraining(quickTraining);
      return;
    }
    if (nextBestAction.kind === "renew_plan") {
      window.location.href = "/precios#inscripcion";
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
  }, [completeTraining, memberName, nextBestAction, quickTraining, setTab, trainedToday]);
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
      renewMembership,
      openBadges,
      openMembership,
      openOccupancy,
    },
  };
}
