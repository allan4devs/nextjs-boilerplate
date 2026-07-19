"use client";

/**
 * Inicio del Member OS: pantalla principal fija (sin scroll de "paneles de títulos").
 * Los detalles se abren en modales cerrables. Acciones atractivas siempre a la vista.
 */

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Dumbbell,
  Flame,
  Gauge,
  Loader2,
  LockKeyhole,
  MapPin,
  Medal,
  Ruler,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import { trackAction } from "@/app/lib/analytics/session-client";
import { BarTrendChart, CHART_LIME } from "../../../charts";
import { GameButton, GameLabel, GameModal } from "../../../GameOS";
import { StreakRing, XpBar } from "../../../gamification";
import type {
  ResumenActions,
  ResumenViewModel,
} from "../../view-models/useResumenViewModel";
import ActiveVisitPanel from "./ActiveVisitPanel";
import GymBenefitsShowcase from "./GymBenefitsShowcase";
import {
  MEMBER_HOME_ALGORITHM_VERSION,
  rankMemberHomePanels,
  type MemberHomePanelId,
} from "./home-priority";

type Props = {
  model: ResumenViewModel;
  actions: ResumenActions;
};

type DetailId = MemberHomePanelId | "quick-stats";

function MembershipHero({ model, actions }: Props) {
  if (!model.membership) return null;
  const membership = model.membership;
  const urgent = membership.daysRemaining <= 5;

  return (
    <div className={`relative overflow-hidden border-[3px] p-4 sm:p-5 ${membership.tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <GameLabel tone="white">Tu membresía</GameLabel>
        <span className="border-2 border-current/25 bg-black/15 px-2 py-1 text-[9px] font-black uppercase tracking-[.16em]">
          {membership.status}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <strong className="text-5xl font-black leading-none tracking-tight">{membership.daysRemaining}</strong>
        <span className="pb-1 text-xs font-black uppercase tracking-[.14em] opacity-70">
          días
          <br />
          disponibles
        </span>
      </div>
      <h3 className="mt-3 text-xl font-black uppercase">{membership.plan}</h3>
      <p className="mt-1 text-sm font-bold opacity-70">Activo hasta {membership.nextBillingDate}</p>
      <div className="mt-4">
        <div className="flex justify-between text-[9px] font-black uppercase tracking-[.15em] opacity-70">
          <span>{urgent ? "Renová a tiempo" : "Tiempo restante"}</span>
          <span>{membership.progressPct}%</span>
        </div>
        <div className="mt-2 h-3 border-[3px] border-current/25 bg-black/25">
          <div className="h-full bg-current transition-all" style={{ width: `${membership.progressPct}%` }} />
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <GameButton full onClick={actions.renewMembership}>
          <CreditCard className="h-4 w-4" />
          Renovar en línea
        </GameButton>
        <button
          type="button"
          onClick={actions.openMembership}
          className="min-h-11 text-[10px] font-black uppercase tracking-[.16em] opacity-70 transition hover:opacity-100"
        >
          Ver detalle de membresía
        </button>
      </div>
      <div className="mt-4 flex items-start gap-3 border-t border-current/20 pt-3">
        <WalletCards className="h-5 w-5 shrink-0 opacity-70" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.16em] opacity-55">Última forma de pago</p>
          <p className="mt-0.5 text-sm font-black uppercase">{membership.lastPaymentMethod}</p>
          <p className="text-xs font-bold opacity-60">{membership.lastPlanLabel}</p>
        </div>
      </div>
    </div>
  );
}

function LevelAndStreak({ model, actions }: Props) {
  if (!model.streak || !model.gamification) return null;
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={actions.openStreak}
        className="w-full border-[3px] border-orange-300/55 bg-gradient-to-br from-orange-400/[.16] to-[#0b0b0b] p-4 text-left"
      >
        <div className="grid items-center gap-3 sm:grid-cols-[140px_1fr]">
          <StreakRing
            streak={model.streak.value}
            freezes={model.streak.freezes}
            weekCount={model.streak.weekCount}
            weeklyGoal={model.streak.weeklyGoal}
          />
          <div>
            <GameLabel tone="orange">Racha activa</GameLabel>
            <p className="mt-2 text-xl font-black uppercase">No soltés el ritmo</p>
            <p className="mt-2 text-sm font-bold italic text-orange-100/75">"{model.streak.phrase}"</p>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={actions.openLevel}
        className="w-full border-[3px] border-cyan-300/45 bg-gradient-to-br from-cyan-300/[.09] to-[#0b0b0b] p-4 text-left"
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <GameLabel tone="cyan">Nivel y XP</GameLabel>
            <p className="mt-1 text-lg font-black uppercase">Tu avance Xtreme</p>
          </div>
          <Medal className="h-8 w-8 text-cyan-300" />
        </div>
        <XpBar xp={model.gamification.xp} level={model.gamification.level} />
        <p className="mt-3 text-xs font-bold text-white/45">{model.gamification.milestoneText}</p>
      </button>
    </div>
  );
}

function WeekCard({ model, actions }: Props) {
  if (!model.gamification) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1.5">
        {model.gamification.days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={actions.openWeek}
            className={`relative grid min-h-[64px] place-items-center border-[3px] p-1 ${
              day.done
                ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                : day.isToday
                  ? "border-orange-300 bg-orange-300/10 text-orange-200"
                  : "border-white/10 bg-white/[.025] text-white/35"
            }`}
          >
            <span className="absolute left-1 top-1 text-[8px] font-black uppercase">{day.label}</span>
            {day.done ? (
              <Check className="h-5 w-5" />
            ) : day.isToday ? (
              <Target className="h-5 w-5" />
            ) : (
              <span className="h-2 w-2 bg-white/15" />
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black uppercase">{model.gamification.weekLabel}</p>
        <p className="text-xs font-bold text-white/40">{model.gamification.freezesText ?? "Cada visita cuenta."}</p>
      </div>
      <GameButton full onClick={actions.openWeek}>
        Ajustar meta semanal
      </GameButton>
    </div>
  );
}

function TrainerPlan({ model, actions }: Props) {
  const plan = model.trainingPlan;
  return (
    <div className="space-y-4">
      {!plan ? (
        <div className="border-[3px] border-dashed border-white/15 p-5 text-sm font-bold text-white/45">
          Tu trainer todavía no te asignó un plan. Podés marcar un entreno libre ya.
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black uppercase">{plan.title}</h3>
            <span className="border-2 border-[#d8ff3e]/35 px-2 py-1 text-[9px] font-black uppercase text-[#eaff93]">
              {plan.progressPct}% completo
            </span>
          </div>
          {plan.nextItem ? (
            <div className="mt-4 border-l-4 border-orange-300 bg-black/25 p-3">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">Siguiente sesión</p>
              <p className="mt-1 font-black uppercase">
                {plan.nextItem.day || plan.nextItem.focus || "Entrenamiento asignado"}
              </p>
              <p className="mt-1 text-sm font-bold text-white/50">
                {plan.nextItem.exercises || plan.nextItem.focus}
                {plan.nextItem.targetMinutes > 0 ? ` · ${plan.nextItem.targetMinutes} min` : ""}
              </p>
            </div>
          ) : (
            <p className="mt-4 inline-flex items-center gap-2 font-black text-[#d8ff3e]">
              <Check className="h-5 w-5" /> Plan completado
            </p>
          )}
          {plan.coachNote && (
            <p className="mt-3 text-xs font-bold italic text-white/40">Nota del trainer: {plan.coachNote}</p>
          )}
        </div>
      )}
      <div className="grid gap-2">
        <GameButton full onClick={actions.openTrainingTab}>
          {plan && plan.pendingCount > 0 ? "Abrir mi entreno" : "Ir a Entrenar"}
          <ArrowRight className="h-4 w-4" />
        </GameButton>
        <GameButton full variant="ghost" onClick={actions.openQuickTraining}>
          <Zap className="h-4 w-4" />
          Entreno rápido / libre
        </GameButton>
      </div>
    </div>
  );
}

function ClassesPanel({ model, actions }: Props) {
  const relevantClasses = model.classes.filter(
    (classItem) => classItem.isMine || (classItem.isToday && !classItem.hasStarted),
  );

  if (!relevantClasses.length) {
    return (
      <p className="text-sm font-bold text-white/50">
        No hay clases abiertas para reservar en este momento. Volvé más tarde o mirá el tab Entrenar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {relevantClasses.map((classItem) => {
        const unavailable = !classItem.isToday || classItem.hasStarted;
        const disabled = unavailable || classItem.isFull || classItem.busy;
        return (
          <article
            key={classItem.id}
            className={`border-[3px] p-3 sm:p-4 ${
              classItem.isMine
                ? "border-[#d8ff3e] bg-[#d8ff3e]/[.07]"
                : unavailable
                  ? "border-white/10 bg-white/[.02] opacity-55"
                  : "border-white/15 bg-black/30"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-300">{classItem.time}</p>
                <h3 className="mt-1 text-lg font-black uppercase">{classItem.name}</h3>
                <p className="mt-1 text-xs font-bold text-white/45">
                  {classItem.coach} · {classItem.focus}
                </p>
              </div>
              <Clock3 className="h-5 w-5 shrink-0 text-white/30" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-xs font-black uppercase text-white/55">
                {unavailable
                  ? classItem.hasStarted
                    ? "Reserva cerrada"
                    : "No se imparte hoy"
                  : `${classItem.remaining}/${classItem.capacity} cupos`}
              </p>
              <button
                type="button"
                onClick={() =>
                  classItem.isMine ? actions.cancelClass(classItem.id) : actions.reserveClass(classItem.id)
                }
                disabled={disabled && !classItem.isMine}
                className={`inline-flex min-h-12 items-center gap-2 px-4 text-xs font-black uppercase transition ${
                  classItem.isMine
                    ? "border-2 border-[#d8ff3e] text-[#eaff93]"
                    : "bg-orange-300 text-black hover:bg-white"
                } disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30`}
              >
                {classItem.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : classItem.isMine ? (
                  <Check className="h-4 w-4" />
                ) : unavailable ? (
                  <LockKeyhole className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {classItem.isMine
                  ? "Reservada"
                  : classItem.isFull
                    ? "Llena"
                    : unavailable
                      ? "Cerrada"
                      : "Reservar"}
              </button>
            </div>
          </article>
        );
      })}
      <p className="flex items-center gap-2 text-[10px] font-bold text-white/35">
        <LockKeyhole className="h-3.5 w-3.5" /> Las reservas se cierran al iniciar cada clase.
      </p>
    </div>
  );
}

function ProgressPanel({ model, actions }: Props) {
  const change = model.progress.weightChange;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Entrenos este mes" value={String(model.progress.workoutsThisMonth)} icon={Dumbbell} />
        <Metric label="Minutos este mes" value={String(model.progress.minutesThisMonth)} icon={Timer} />
        <Metric
          label="Peso actual"
          value={model.progress.latestWeight !== null ? `${model.progress.latestWeight} kg` : "-"}
          icon={Ruler}
        />
        <Metric
          label="Último cambio"
          value={change !== null ? `${change > 0 ? "+" : ""}${change} kg` : "-"}
          icon={change !== null && change > 0 ? TrendingUp : TrendingDown}
        />
      </div>
      <div className="border-[3px] border-white/10 bg-black/35 p-2">
        <BarTrendChart data={model.progress.weeklyWorkouts} unit="entrenos" color={CHART_LIME} height={120} />
      </div>
      <GameButton full onClick={actions.openProgress}>
        Abrir tab Progreso
        <ArrowRight className="h-4 w-4" />
      </GameButton>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <div className="border-[3px] border-white/10 bg-white/[.03] p-3">
      <Icon className="h-4 w-4 text-cyan-300" />
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[.13em] text-white/35">{label}</p>
    </div>
  );
}

function OccupancyBody({ model, actions }: Props) {
  return (
    <button
      type="button"
      onClick={actions.openOccupancy}
      className="relative w-full overflow-hidden border-[3px] border-cyan-300/45 bg-gradient-to-br from-cyan-300/[.1] to-[#0b0b0b] p-4 text-left sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <GameLabel tone="cyan">Gym en vivo</GameLabel>
          <h2 className="mt-3 text-4xl font-black uppercase">{model.occupancy.level}</h2>
        </div>
        <span className="relative flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300/60" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-cyan-300" />
        </span>
      </div>
      <div className="mt-6 flex items-end justify-between gap-3">
        <strong className="text-5xl font-black tracking-[-.06em]">{model.occupancy.percentage}%</strong>
        <Gauge className="mb-1 h-9 w-9 text-cyan-300" />
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs font-bold text-white/50">
        <Users className="h-4 w-4" /> {model.occupancy.detail}
      </p>
    </button>
  );
}

function MemberHomeDashboardComponent({ model, actions }: Props) {
  const [detail, setDetail] = useState<DetailId | null>(null);

  const relevantClasses = model.classes.filter(
    (classItem) => classItem.isMine || (classItem.isToday && !classItem.hasStarted),
  );
  const reservedClass = relevantClasses.find((c) => c.isMine);
  const nextOpenClass = relevantClasses.find(
    (c) => !c.isMine && !c.isFull && !c.hasStarted && c.isToday,
  );
  const weekDone = model.gamification?.days.filter((d) => d.done).length ?? 0;
  const weeklyGoal = model.streak?.weeklyGoal ?? 3;
  const minutesMonth = model.progress.minutesThisMonth;
  const membershipDays = model.membership?.daysRemaining ?? null;

  const actionTiles = useMemo(() => {
    const tiles: Array<{
      id: DetailId | "primary-train" | "primary-quick";
      label: string;
      hint: string;
      icon: typeof Activity;
      tone: string;
      badge?: string;
      onClick: () => void;
      score: number;
    }> = [];

    if (model.activeVisit) {
      tiles.push({
        id: "visit",
        label: "Estoy dentro",
        hint: `${model.activeVisit.elapsedMinutes} min · salir`,
        icon: Clock3,
        tone: "border-orange-300/50 bg-orange-300/10 hover:border-orange-300",
        badge: "LIVE",
        score: 1000,
        onClick: () => setDetail("visit"),
      });
    }

    tiles.push({
      id: "primary-train",
      label: model.todayTraining.completed
        ? "Entreno listo"
        : model.trainingPlan?.pendingCount
          ? "Mi entreno"
          : "Entrenar hoy",
      hint: model.todayTraining.completed
        ? "Ya sumaste hoy"
        : model.trainingPlan?.nextItem?.targetMinutes
          ? `~${model.trainingPlan.nextItem.targetMinutes} min`
          : "Plan o libre",
      icon: Dumbbell,
      tone: model.todayTraining.completed
        ? "border-white/20 bg-white/[.04] hover:border-white/35"
        : "border-[#d8ff3e]/55 bg-[#d8ff3e]/12 hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/18",
      badge: model.todayTraining.completed ? "OK" : undefined,
      score: model.todayTraining.completed ? 400 : 900,
      onClick: () => {
        if (model.trainingPlan?.pendingCount || model.todayTraining.actionLabel === "Continuar entreno") {
          setDetail("training");
        } else if (!model.todayTraining.completed) {
          actions.openQuickTraining();
        } else {
          setDetail("training");
        }
      },
    });

    tiles.push({
      id: "primary-quick",
      label: "Tiempo libre",
      hint: "Marcá minutos ya",
      icon: Timer,
      tone: "border-cyan-300/45 bg-cyan-300/10 hover:border-cyan-300",
      score: 750,
      onClick: () => actions.openQuickTraining(),
    });

    tiles.push({
      id: "classes",
      label: reservedClass ? "Tu clase" : "Clases hoy",
      hint: reservedClass
        ? `${reservedClass.time} · ${reservedClass.name}`
        : nextOpenClass
          ? `${nextOpenClass.time} · cupos`
          : "Ver horarios",
      icon: Sparkles,
      tone: "border-orange-300/45 bg-orange-300/10 hover:border-orange-300",
      badge: reservedClass ? "RES" : undefined,
      score: reservedClass ? 860 : 640,
      onClick: () => setDetail("classes"),
    });

    tiles.push({
      id: "week",
      label: "Meta semanal",
      hint: `${weekDone}/${weeklyGoal} entrenos`,
      icon: CalendarDays,
      tone: "border-[#d8ff3e]/35 bg-[#d8ff3e]/[0.07] hover:border-[#d8ff3e]",
      score: 560,
      onClick: () => setDetail("week"),
    });

    tiles.push({
      id: "momentum",
      label: "Racha y nivel",
      hint: model.streak ? `${model.streak.value} días` : "Empezá hoy",
      icon: Flame,
      tone: "border-orange-400/40 bg-orange-400/[.08] hover:border-orange-300",
      score: 520,
      onClick: () => setDetail("momentum"),
    });

    if (model.membership) {
      tiles.push({
        id: "membership",
        label: "Membresía",
        hint:
          membershipDays !== null
            ? membershipDays <= 7
              ? `${membershipDays}d · renovar`
              : `${membershipDays} días`
            : model.membership.plan,
        icon: CreditCard,
        tone:
          membershipDays !== null && membershipDays <= 7
            ? "border-red-400/45 bg-red-500/10 hover:border-red-400"
            : "border-white/20 bg-white/[.04] hover:border-white/40",
        score: membershipDays !== null && membershipDays <= 7 ? 920 : 480,
        onClick: () => setDetail("membership"),
      });
    }

    tiles.push({
      id: "progress",
      label: "Progreso",
      hint: `${minutesMonth} min este mes`,
      icon: Activity,
      tone: "border-cyan-300/35 bg-cyan-300/[.07] hover:border-cyan-300",
      score: 420,
      onClick: () => setDetail("progress"),
    });

    tiles.push({
      id: "occupancy",
      label: "Gym en vivo",
      hint: `${model.occupancy.percentage}% · ${model.occupancy.level}`,
      icon: Gauge,
      tone: "border-cyan-300/40 bg-cyan-300/[.08] hover:border-cyan-300",
      score: 400,
      onClick: () => setDetail("occupancy"),
    });

    tiles.push({
      id: "gym",
      label: "Tu gym",
      hint: "Zonas · VIP · extras",
      icon: MapPin,
      tone: "border-white/20 bg-white/[.04] hover:border-white/40",
      score: 300,
      onClick: () => setDetail("gym"),
    });

    return tiles.sort((a, b) => b.score - a.score);
  }, [
    actions,
    membershipDays,
    minutesMonth,
    model,
    nextOpenClass,
    reservedClass,
    weekDone,
    weeklyGoal,
  ]);

  const primary = actionTiles[0];
  const secondary = actionTiles.slice(1);

  const priorities = useMemo(() => {
    return rankMemberHomePanels(
      ["visit", "membership", "training", "classes", "week", "momentum", "progress", "occupancy", "gym"],
      {
        activeVisit: Boolean(model.activeVisit),
        membershipDaysRemaining: membershipDays,
        membershipActive: Boolean(model.membership?.status.toLowerCase().includes("activ")),
        hasActiveWorkout: model.todayTraining.actionLabel === "Continuar entreno",
        trainedToday: model.todayTraining.completed,
        pendingPlanItems: model.trainingPlan?.pendingCount ?? 0,
        hasReservedClassToday: Boolean(reservedClass),
        hasAvailableClassToday: Boolean(nextOpenClass),
        weekDone,
        weeklyGoal,
        streak: model.streak?.value ?? 0,
      },
    );
  }, [membershipDays, model, nextOpenClass, reservedClass, weekDone, weeklyGoal]);

  const topReason = priorities[0]?.reason ?? "Elegí una acción y seguí sin scroll.";
  const tracked = useRef("");

  useEffect(() => {
    const top = priorities[0];
    if (!top) return;
    const key = `${MEMBER_HOME_ALGORITHM_VERSION}:${top.id}:${top.score}`;
    if (tracked.current === key) return;
    tracked.current = key;
    trackAction("home_priority_shown", {
      tab: "resumen",
      label: top.id,
      meta: { algorithm: MEMBER_HOME_ALGORITHM_VERSION, panel: top.id, score: top.score, reason: top.reason },
    });
  }, [priorities]);

  const openDetail = (id: DetailId) => {
    setDetail(id);
    trackAction("home_detail_opened", { tab: "resumen", label: id, meta: { panel: id } });
  };

  const modalTitle: Record<DetailId, string> = {
    visit: "Visita activa",
    membership: "Tu membresía",
    training: "Tu entreno",
    classes: "Clases de hoy",
    week: "Meta semanal",
    momentum: "Racha y nivel",
    progress: "Tu progreso",
    occupancy: "Gym en vivo",
    gym: "Tu gym",
    "quick-stats": "Resumen",
  };

  const modalSubtitle: Partial<Record<DetailId, string>> = {
    visit: model.activeVisit ? `${model.activeVisit.elapsedMinutes} min adentro` : undefined,
    membership: model.membership?.plan,
    training: model.trainingPlan?.title ?? "Libre o plan coach",
    classes: reservedClass ? "Con reserva" : "Cupos de hoy",
    week: `${weekDone} de ${weeklyGoal}`,
    momentum: model.streak ? `${model.streak.value} días` : undefined,
    progress: `${minutesMonth} min este mes`,
    occupancy: `${model.occupancy.percentage}%`,
    gym: "Zonas y beneficios",
  };

  return (
    <div className="flex min-h-0 flex-col gap-3 sm:gap-3.5">
      {/* Status strip - always visible, compact */}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip
          icon={Flame}
          label="Racha"
          value={model.streak ? `${model.streak.value}d` : "0"}
          onClick={() => openDetail("momentum")}
          tone="orange"
        />
        <StatChip
          icon={CalendarDays}
          label="Semana"
          value={`${weekDone}/${weeklyGoal}`}
          onClick={() => openDetail("week")}
          tone="lime"
        />
        <StatChip
          icon={Timer}
          label="Minutos"
          value={String(minutesMonth)}
          onClick={() => openDetail("progress")}
          tone="cyan"
        />
        <StatChip
          icon={Gauge}
          label="Gym"
          value={`${model.occupancy.percentage}%`}
          onClick={() => openDetail("occupancy")}
          tone="cyan"
        />
      </div>

      {/* Hero recommendation + primary CTA */}
      <section className="shrink-0 overflow-hidden border-[3px] border-[#d8ff3e]/40 bg-gradient-to-br from-[#d8ff3e]/[.12] via-[#0b0b0b] to-[#0b0b0b] p-3.5 shadow-[5px_5px_0_rgba(216,255,62,.12)] sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#d8ff3e]">Ahora mismo</p>
            <h1 className="mt-1 text-lg font-black uppercase leading-tight sm:text-2xl">
              {primary?.label ?? "Todo al día"}
            </h1>
            <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-snug text-white/55 sm:text-sm">
              {topReason}
            </p>
          </div>
          {model.activeVisit && (
            <span className="shrink-0 border-2 border-orange-300/50 bg-orange-300/15 px-2 py-1 text-[9px] font-black uppercase text-orange-100">
              {model.activeVisit.elapsedMinutes} min
            </span>
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              if (primary) {
                trackAction("home_primary_tap", { tab: "resumen", label: primary.label });
                primary.onClick();
              }
            }}
            disabled={model.todayTraining.disabled && primary?.id === "primary-train" && !model.todayTraining.completed}
            className="inline-flex min-h-14 items-center justify-center gap-2 bg-[#d8ff3e] px-4 text-sm font-black uppercase text-black shadow-[4px_4px_0_rgba(216,255,62,.25)] transition hover:bg-white active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            {model.todayTraining.saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : model.todayTraining.completed && primary?.id === "primary-train" ? (
              <Check className="h-5 w-5" />
            ) : (
              <Zap className="h-5 w-5" />
            )}
            {primary?.label ?? "Entrenar"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => actions.openQuickTraining()}
            className="inline-flex min-h-14 items-center justify-center gap-2 border-[3px] border-white/20 bg-black/40 px-4 text-sm font-black uppercase text-white transition hover:border-[#d8ff3e] hover:text-[#eaff93]"
          >
            <Timer className="h-5 w-5" />
            Marcar tiempo
          </button>
        </div>

        {model.nextAction && (
          <button
            type="button"
            onClick={actions.runNextAction}
            className="mt-2 flex min-h-11 w-full items-center justify-between gap-2 border border-white/10 bg-black/30 px-3 text-left text-[11px] font-bold text-white/60 transition hover:border-[#d8ff3e]/40 hover:text-white"
          >
            <span className="truncate">
              <span className="text-[#d8ff3e]">Siguiente · </span>
              {model.nextAction.title || "Acción recomendada"}
            </span>
            <ChevronMini />
          </button>
        )}
      </section>

      {/* Always-available big action grid - no inline expansion */}
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-3">
        {secondary.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => {
                trackAction("home_tile_tap", { tab: "resumen", label: tile.label, meta: { id: tile.id } });
                tile.onClick();
              }}
              data-analytics={`Inicio: ${tile.label}`}
              className={`relative flex min-h-[96px] flex-col items-start justify-between border-[3px] p-3 text-left shadow-[3px_3px_0_rgba(0,0,0,.45)] transition active:translate-y-px sm:min-h-[108px] sm:p-3.5 ${tile.tone}`}
            >
              {tile.badge && (
                <span className="absolute right-2 top-2 border border-white/20 bg-black/50 px-1.5 py-0.5 text-[8px] font-black uppercase text-white/70">
                  {tile.badge}
                </span>
              )}
              <Icon className="h-6 w-6 text-white/90" />
              <span>
                <span className="block text-xs font-black uppercase leading-tight sm:text-sm">{tile.label}</span>
                <span className="mt-1 block line-clamp-2 text-[10px] font-bold leading-snug text-white/40">
                  {tile.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail as closable modal - main screen stays put */}
      <GameModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? modalTitle[detail] : ""}
        subtitle={detail ? modalSubtitle[detail] : undefined}
        icon={
          detail === "visit"
            ? Clock3
            : detail === "membership"
              ? CreditCard
              : detail === "training"
                ? Dumbbell
                : detail === "classes"
                  ? Sparkles
                  : detail === "week"
                    ? CalendarDays
                    : detail === "momentum"
                      ? Flame
                      : detail === "progress"
                        ? Activity
                        : detail === "occupancy"
                          ? Gauge
                          : detail === "gym"
                            ? MapPin
                            : Target
        }
        tone={
          detail === "momentum" || detail === "visit" || detail === "classes"
            ? "orange"
            : detail === "progress" || detail === "occupancy"
              ? "cyan"
              : "lime"
        }
        size="lg"
      >
        {detail === "visit" && model.activeVisit && (
          <ActiveVisitPanel visit={model.activeVisit} onCheckout={actions.registerCheckout} />
        )}
        {detail === "membership" && <MembershipHero model={model} actions={actions} />}
        {detail === "training" && <TrainerPlan model={model} actions={actions} />}
        {detail === "classes" && <ClassesPanel model={model} actions={actions} />}
        {detail === "week" && <WeekCard model={model} actions={actions} />}
        {detail === "momentum" && <LevelAndStreak model={model} actions={actions} />}
        {detail === "progress" && <ProgressPanel model={model} actions={actions} />}
        {detail === "occupancy" && <OccupancyBody model={model} actions={actions} />}
        {detail === "gym" && <GymBenefitsShowcase onGoTab={actions.goTab} />}
      </GameModal>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  onClick,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  onClick: () => void;
  tone: "lime" | "cyan" | "orange";
}) {
  const tones = {
    lime: "border-[#d8ff3e]/30 hover:border-[#d8ff3e] text-[#eaff93]",
    cyan: "border-cyan-300/30 hover:border-cyan-300 text-cyan-200",
    orange: "border-orange-300/30 hover:border-orange-300 text-orange-200",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 items-center gap-2.5 border-[3px] bg-black/40 px-2.5 text-left transition sm:min-h-16 sm:px-3 ${tones[tone]}`}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-90" />
      <span className="min-w-0">
        <span className="block text-[9px] font-black uppercase tracking-[.14em] text-white/40">{label}</span>
        <span className="block truncate text-base font-black text-white sm:text-lg">{value}</span>
      </span>
    </button>
  );
}

function ChevronMini() {
  return <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" />;
}

export const MemberHomeDashboard = memo(MemberHomeDashboardComponent);
