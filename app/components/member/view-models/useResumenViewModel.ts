"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { classStartAt, classTimeLabel } from "@/lib/xtreme/class-schedule";
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
    lastPaymentMethod: string;
    lastPlanLabel: string;
    renewPlanId: "week" | "fortnight" | "month";
  } | null;
  trainingPlan: {
    title: string;
    coachNote: string;
    pendingCount: number;
    totalCount: number;
    progressPct: number;
    nextItem: { day: string; focus: string; exercises: string; targetMinutes: number } | null;
  } | null;
  classes: Array<{
    id: string;
    name: string;
    time: string;
    coach: string;
    focus: string;
    remaining: number;
    capacity: number;
    isMine: boolean;
    isFull: boolean;
    hasStarted: boolean;
    isToday: boolean;
    busy: boolean;
  }>;
  progress: {
    workoutsThisMonth: number;
    minutesThisMonth: number;
    latestWeight: number | null;
    latestWaist: number | null;
    weightChange: number | null;
    weeklyWorkouts: Array<{ date: string; value: number }>;
  };
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
  renewMembership: () => void;
  reserveClass: (trainingId: string) => void;
  cancelClass: (trainingId: string) => void;
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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
    paymentHistory,
    reservingTrainingId,
    reserveTraining,
    cancelReservation,
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
    const planPayments = (paymentHistory?.payments ?? [])
      .filter((payment) => payment.category === "Plan" && payment.status === "completed")
      .sort((a, b) => b.date.localeCompare(a.date));
    const lastPlanPayment = planPayments[0];
    const planText = `${lastPlanPayment?.optionLabel ?? currentMember.membership.plan}`.toLowerCase();
    const renewPlanId = planText.includes("quinc")
      ? "fortnight"
      : planText.includes("seman") && !planText.includes("quinc")
        ? "week"
        : "month";
    const methodLabels: Record<string, string> = {
      paypal: "PayPal",
      cash: "Efectivo",
      transfer: "Transferencia",
      sinpe: "SINPE Móvil",
      other: "Otro",
    };
    const pendingPlanItems = currentMember.trainingPlan?.items.filter((item) => !item.done) ?? [];
    const monthWorkouts = currentMember.workouts.filter((workout) =>
      workout.completedDate.startsWith(month),
    );
    const metrics = currentMember.bodyMetrics
      .filter((metric) => metric.weightKg > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const latestWeight = metrics.at(-1)?.weightKg ?? null;
    const previousWeight = metrics.at(-2)?.weightKg ?? null;
    const weeklyWorkouts = weekDates.map((date) => ({
      date,
      value: currentMember.workouts.filter((workout) => workout.completedDate === date).length,
    }));

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
              lastPaymentMethod: lastPlanPayment
                ? methodLabels[lastPlanPayment.method] ?? lastPlanPayment.method
                : "Sin pago registrado",
              lastPlanLabel: lastPlanPayment?.optionLabel ?? currentMember.membership.plan,
              renewPlanId,
            }
          : null,
      trainingPlan: currentMember.trainingPlan
        ? {
            title: currentMember.trainingPlan.title,
            coachNote: currentMember.trainingPlan.coachNote,
            pendingCount: pendingPlanItems.length,
            totalCount: currentMember.trainingPlan.totalItems,
            progressPct: currentMember.trainingPlan.progressPct,
            nextItem: pendingPlanItems[0]
              ? {
                  day: pendingPlanItems[0].day,
                  focus: pendingPlanItems[0].focus,
                  exercises: pendingPlanItems[0].exercises,
                  targetMinutes: pendingPlanItems[0].targetMinutes,
                }
              : null,
          }
        : null,
      classes: TRAININGS.map((training) => {
        const reservation = reservations[training.id] ?? {
          reserved: 0,
          capacity: training.slots,
          remaining: training.slots,
          isMine: false,
        };
        const startsAt = classStartAt(training.id, today);
        return {
          id: training.id,
          name: training.name,
          time: classTimeLabel(training.id),
          coach: training.coach,
          focus: training.focus,
          remaining: reservation.remaining,
          capacity: reservation.capacity,
          isMine: reservation.isMine,
          isFull: reservation.remaining <= 0 && !reservation.isMine,
          hasStarted: Boolean(startsAt && now >= startsAt.getTime()),
          isToday: Boolean(startsAt),
          busy: reservingTrainingId === training.id,
        };
      }),
      progress: {
        workoutsThisMonth: monthWorkouts.length,
        minutesThisMonth: monthWorkouts.reduce((sum, workout) => sum + workout.minutes, 0),
        latestWeight,
        latestWaist: currentMember.latestBodyMetric?.waistCm ?? null,
        weightChange:
          latestWeight !== null && previousWeight !== null
            ? Math.round((latestWeight - previousWeight) * 10) / 10
            : null,
        weeklyWorkouts,
      },
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
    now,
    paymentHistory,
    reservations,
    reservingTrainingId,
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
  const renewMembership = useCallback(() => {
    const plan = model.membership?.renewPlanId ?? "month";
    window.location.href = `/precios?plan=${plan}#checkout-form`;
  }, [model.membership?.renewPlanId]);
  const reserveClass = useCallback(
    (trainingId: string) => {
      const training = TRAININGS.find((entry) => entry.id === trainingId);
      const classModel = model.classes.find((entry) => entry.id === trainingId);
      if (!training || !classModel?.isToday || classModel.hasStarted) return;
      void reserveTraining(training);
    },
    [model.classes, reserveTraining],
  );
  const cancelClass = useCallback(
    (trainingId: string) => {
      const training = TRAININGS.find((entry) => entry.id === trainingId);
      if (training) void cancelReservation(training);
    },
    [cancelReservation],
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
      renewMembership,
      reserveClass,
      cancelClass,
    },
  };
}
