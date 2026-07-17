"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Dumbbell,
  Gauge,
  Loader2,
  LockKeyhole,
  Medal,
  Ruler,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { BarTrendChart, CHART_LIME } from "../../../charts";
import { GameLabel } from "../../../GameOS";
import { StreakRing, XpBar } from "../../../gamification";
import type {
  ResumenActions,
  ResumenViewModel,
} from "../../view-models/useResumenViewModel";

type Props = {
  model: ResumenViewModel;
  actions: ResumenActions;
};

function SectionHeading({
  eyebrow,
  title,
  icon: Icon,
  aside,
}: {
  eyebrow: string;
  title: string;
  icon: typeof Activity;
  aside?: React.ReactNode;
}) {
  return (
    <header className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center border-[3px] border-white/15 bg-white/[0.06]">
          <Icon className="h-5 w-5 text-[#d8ff3e]" />
        </span>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">{eyebrow}</p>
          <h2 className="mt-0.5 text-lg font-black uppercase sm:text-2xl">{title}</h2>
        </div>
      </div>
      {aside}
    </header>
  );
}

function MembershipHero({ model, actions }: Props) {
  if (!model.membership) return null;
  const membership = model.membership;
  const urgent = membership.daysRemaining <= 5;

  return (
    <section className={`relative overflow-hidden border-[3px] p-4 shadow-[6px_6px_0_rgba(0,0,0,.55)] sm:p-5 ${membership.tone}`}>
      <div aria-hidden className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative grid gap-4 lg:grid-cols-[1.2fr_.8fr] lg:items-stretch">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <GameLabel tone="white">Tu membresía</GameLabel>
            <span className="border-2 border-current/25 bg-black/15 px-2 py-1 text-[9px] font-black uppercase tracking-[.16em]">
              {membership.status}
            </span>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <strong className="text-5xl font-black leading-[.78] tracking-[-.07em] sm:text-7xl">
              {membership.daysRemaining}
            </strong>
            <span className="pb-1 text-sm font-black uppercase tracking-[.18em] opacity-70">
              días<br />disponibles
            </span>
          </div>
          <h1 className="mt-4 text-xl font-black uppercase sm:text-3xl">{membership.plan}</h1>
          <p className="mt-2 text-sm font-bold opacity-70">Activo hasta {membership.nextBillingDate}</p>
          <div className="mt-4 max-w-2xl">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-[.15em] opacity-70">
              <span>{urgent ? "Renová a tiempo y no perdás continuidad" : "Tiempo restante"}</span>
              <span>{membership.progressPct}%</span>
            </div>
            <div className="mt-2 h-4 border-[3px] border-current/25 bg-black/25">
              <div className="h-full bg-current transition-all" style={{ width: `${membership.progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-col border-[3px] border-current/25 bg-black/20 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.18em] opacity-55">Última forma de pago</p>
              <p className="mt-1 text-lg font-black uppercase">{membership.lastPaymentMethod}</p>
              <p className="mt-1 text-xs font-bold opacity-60">{membership.lastPlanLabel}</p>
            </div>
            <WalletCards className="h-7 w-7" />
          </div>
          <button
            type="button"
            onClick={actions.renewMembership}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 text-xs font-black uppercase text-white transition hover:bg-white hover:text-black sm:text-sm"
          >
            <CreditCard className="h-5 w-5" />
            Renovar en línea
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={actions.openMembership}
            className="mt-2 min-h-10 text-[10px] font-black uppercase tracking-[.16em] opacity-60 transition hover:opacity-100"
          >
            Ver detalle de membresía
          </button>
        </div>
      </div>
    </section>
  );
}

function LevelAndStreak({ model, actions }: Props) {
  if (!model.streak || !model.gamification) return null;
  return (
    <section className="grid gap-3 lg:grid-cols-[.9fr_1.1fr]">
      <button
        type="button"
        onClick={actions.openStreak}
        className="relative overflow-hidden border-[3px] border-orange-300/55 bg-gradient-to-br from-orange-400/[.16] to-[#0b0b0b] p-4 text-left shadow-[5px_5px_0_rgba(251,146,60,.18)] sm:p-5"
      >
        <div className="grid items-center gap-3 sm:grid-cols-[180px_1fr]">
          <StreakRing
            streak={model.streak.value}
            freezes={model.streak.freezes}
            weekCount={model.streak.weekCount}
            weeklyGoal={model.streak.weeklyGoal}
          />
          <div>
            <GameLabel tone="orange">Racha activa</GameLabel>
            <p className="mt-2 text-2xl font-black uppercase sm:text-3xl">No soltés el ritmo</p>
            <p className="mt-3 text-sm font-bold italic text-orange-100/75">“{model.streak.phrase}”</p>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={actions.openLevel}
        className="border-[3px] border-cyan-300/45 bg-gradient-to-br from-cyan-300/[.09] to-[#0b0b0b] p-4 text-left shadow-[5px_5px_0_rgba(34,211,238,.14)] sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <GameLabel tone="cyan">Nivel y XP</GameLabel>
            <p className="mt-2 text-xl font-black uppercase">Tu avance Xtreme</p>
          </div>
          <Medal className="h-9 w-9 text-cyan-300" />
        </div>
        <XpBar xp={model.gamification.xp} level={model.gamification.level} />
        <p className="mt-4 text-xs font-bold text-white/45">{model.gamification.milestoneText}</p>
      </button>
    </section>
  );
}

function WeekCard({ model, actions }: Props) {
  if (!model.gamification) return null;
  return (
    <section className="border-[3px] border-white/15 bg-[#0b0b0b] p-4 shadow-[5px_5px_0_rgba(0,0,0,.45)] sm:p-5">
      <SectionHeading
        eyebrow="Tu ritmo"
        title="Esta semana"
        icon={CalendarDays}
        aside={<button type="button" onClick={actions.openWeek} className="text-[10px] font-black uppercase tracking-[.15em] text-[#d8ff3e]">Ver detalle →</button>}
      />
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
        {model.gamification.days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={actions.openWeek}
            className={`relative grid min-h-20 place-items-center border-[3px] p-1 sm:min-h-24 ${
              day.done
                ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                : day.isToday
                  ? "border-orange-300 bg-orange-300/10 text-orange-200"
                  : "border-white/10 bg-white/[.025] text-white/35"
            }`}
          >
            <span className="absolute left-1.5 top-1.5 text-[8px] font-black uppercase sm:text-[10px]">{day.label}</span>
            {day.done ? <Check className="h-6 w-6" /> : day.isToday ? <Target className="h-6 w-6" /> : <span className="h-2 w-2 bg-white/15" />}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black uppercase">{model.gamification.weekLabel}</p>
        <p className="text-xs font-bold text-white/40">{model.gamification.freezesText ?? "Cada visita cuenta."}</p>
      </div>
    </section>
  );
}

function TrainerPlan({ model, actions }: Props) {
  const plan = model.trainingPlan;
  return (
    <section className="border-[3px] border-[#d8ff3e]/45 bg-[#d8ff3e]/[.055] p-4 shadow-[5px_5px_0_rgba(216,255,62,.16)] sm:p-5">
      <SectionHeading
        eyebrow="Training OS · asignado por tu trainer"
        title="Entrenamientos pendientes"
        icon={Dumbbell}
        aside={plan ? <span className="grid h-10 min-w-10 place-items-center bg-[#d8ff3e] px-2 text-lg font-black text-black">{plan.pendingCount}</span> : undefined}
      />
      {!plan ? (
        <div className="border-[3px] border-dashed border-white/15 p-5 text-sm font-bold text-white/45">
          Tu trainer todavía no te asignó un plan. Cuando lo haga, aparece aquí automáticamente.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black uppercase">{plan.title}</h3>
              <span className="border-2 border-[#d8ff3e]/35 px-2 py-1 text-[9px] font-black uppercase text-[#eaff93]">{plan.progressPct}% completo</span>
            </div>
            {plan.nextItem ? (
              <div className="mt-4 border-l-4 border-orange-300 bg-black/25 p-3">
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">Siguiente sesión</p>
                <p className="mt-1 font-black uppercase">{plan.nextItem.day || plan.nextItem.focus || "Entrenamiento asignado"}</p>
                <p className="mt-1 text-sm font-bold text-white/50">{plan.nextItem.exercises || plan.nextItem.focus} {plan.nextItem.targetMinutes > 0 ? `· ${plan.nextItem.targetMinutes} min` : ""}</p>
              </div>
            ) : (
              <p className="mt-4 inline-flex items-center gap-2 font-black text-[#d8ff3e]"><Check className="h-5 w-5" /> Plan completado</p>
            )}
            {plan.coachNote && <p className="mt-3 text-xs font-bold italic text-white/40">Nota del trainer: {plan.coachNote}</p>}
          </div>
          <button
            type="button"
            onClick={actions.openTrainingTab}
            className="inline-flex min-h-14 items-center justify-center gap-2 bg-[#d8ff3e] px-5 text-sm font-black uppercase text-black transition hover:bg-white"
          >
            {plan.pendingCount > 0 ? "Abrir mi entreno" : "Ver mi plan"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}

function ClassesPanel({ model, actions }: Props) {
  const relevantClasses = model.classes.filter(
    (classItem) => classItem.isMine || (classItem.isToday && !classItem.hasStarted),
  );

  return (
    <section className="border-[3px] border-orange-300/35 bg-[#0b0b0b] p-4 shadow-[5px_5px_0_rgba(251,146,60,.12)] sm:p-5">
      <SectionHeading eyebrow="Suscripciones por separado" title="Clases de hoy" icon={Sparkles} />
      <div className="grid gap-3 lg:grid-cols-2">
        {relevantClasses.map((classItem) => {
          const unavailable = !classItem.isToday || classItem.hasStarted;
          const disabled = unavailable || classItem.isFull || classItem.busy;
          return (
            <article key={classItem.id} className={`border-[3px] p-3 sm:p-4 ${classItem.isMine ? "border-[#d8ff3e] bg-[#d8ff3e]/[.07]" : unavailable ? "border-white/10 bg-white/[.02] opacity-55" : "border-white/15 bg-black/30"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-300">{classItem.time}</p>
                  <h3 className="mt-1 text-lg font-black uppercase">{classItem.name}</h3>
                  <p className="mt-1 text-xs font-bold text-white/45">{classItem.coach} · {classItem.focus}</p>
                </div>
                <Clock3 className="h-5 w-5 shrink-0 text-white/30" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <p className="text-xs font-black uppercase text-white/55">
                  {unavailable ? (classItem.hasStarted ? "Reserva cerrada" : "No se imparte hoy") : `${classItem.remaining}/${classItem.capacity} cupos`}
                </p>
                <button
                  type="button"
                  onClick={() => classItem.isMine ? actions.cancelClass(classItem.id) : actions.reserveClass(classItem.id)}
                  disabled={disabled && !classItem.isMine}
                  className={`inline-flex min-h-11 items-center gap-2 px-4 text-xs font-black uppercase transition ${classItem.isMine ? "border-2 border-[#d8ff3e] text-[#eaff93]" : "bg-orange-300 text-black hover:bg-white"} disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30`}
                >
                  {classItem.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : classItem.isMine ? <Check className="h-4 w-4" /> : unavailable ? <LockKeyhole className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  {classItem.isMine ? "Reservada" : classItem.isFull ? "Llena" : unavailable ? "Cerrada" : "Suscribirme"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[10px] font-bold text-white/35"><LockKeyhole className="h-3.5 w-3.5" /> Las reservas se cierran automáticamente al iniciar cada clase.</p>
    </section>
  );
}

function ProgressPanel({ model, actions }: Props) {
  const change = model.progress.weightChange;
  return (
    <section>
      <button type="button" onClick={actions.openProgress} className="w-full border-[3px] border-cyan-300/35 bg-[#0b0b0b] p-4 text-left shadow-[5px_5px_0_rgba(34,211,238,.12)] sm:p-5">
        <SectionHeading eyebrow="Datos que sí se sienten" title="Tu progreso" icon={Activity} aside={<span className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-300">Abrir progreso →</span>} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Entrenos este mes" value={String(model.progress.workoutsThisMonth)} icon={Dumbbell} />
          <Metric label="Minutos este mes" value={String(model.progress.minutesThisMonth)} icon={Clock3} />
          <Metric label="Peso actual" value={model.progress.latestWeight !== null ? `${model.progress.latestWeight} kg` : "—"} icon={Ruler} />
          <Metric label="Último cambio" value={change !== null ? `${change > 0 ? "+" : ""}${change} kg` : "—"} icon={change !== null && change > 0 ? TrendingUp : TrendingDown} />
        </div>
        <div className="mt-4 border-[3px] border-white/10 bg-black/35 p-2">
          <BarTrendChart data={model.progress.weeklyWorkouts} unit="entrenos" color={CHART_LIME} height={135} />
        </div>
      </button>
    </section>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <div className="border-[3px] border-white/10 bg-white/[.03] p-3">
      <Icon className="h-4 w-4 text-cyan-300" />
      <p className="mt-3 text-xl font-black sm:text-2xl">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[.13em] text-white/35">{label}</p>
    </div>
  );
}

function MemberHomeDashboardComponent({ model, actions }: Props) {
  type PanelId = "membership" | "training" | "classes" | "week" | "momentum" | "progress" | "occupancy";
  type PanelOption = {
    id: PanelId;
    label: string;
    hint: string;
    icon: typeof Activity;
    content: React.ReactNode;
  };

  const relevantClasses = model.classes.filter(
    (classItem) => classItem.isMine || (classItem.isToday && !classItem.hasStarted),
  );
  const membershipNeedsAttention = Boolean(
    model.membership &&
      (model.membership.daysRemaining <= 7 ||
        !model.membership.status.toLowerCase().includes("activ")),
  );
  const weekIsComplete = Boolean(
    model.gamification &&
      model.streak &&
      model.gamification.days.filter((day) => day.done).length >= model.streak.weeklyGoal,
  );

  const panels = useMemo<PanelOption[]>(() => {
    const options: PanelOption[] = [];

    if (membershipNeedsAttention && model.membership) {
      options.push({
        id: "membership",
        label: "Renovar",
        hint: `${model.membership.daysRemaining} días`,
        icon: CreditCard,
        content: <MembershipHero model={model} actions={actions} />,
      });
    }
    if (model.trainingPlan && model.trainingPlan.pendingCount > 0) {
      options.push({
        id: "training",
        label: "Mi entreno",
        hint: `${model.trainingPlan.pendingCount} pendiente${model.trainingPlan.pendingCount === 1 ? "" : "s"}`,
        icon: Dumbbell,
        content: <TrainerPlan model={model} actions={actions} />,
      });
    }
    if (relevantClasses.length > 0) {
      options.push({
        id: "classes",
        label: "Clases hoy",
        hint: relevantClasses.some((classItem) => classItem.isMine) ? "Tenés reserva" : "Ver cupos",
        icon: Sparkles,
        content: <ClassesPanel model={model} actions={actions} />,
      });
    }
    if (model.gamification && !weekIsComplete) {
      options.push({
        id: "week",
        label: "Meta semanal",
        hint: model.gamification.weekLabel.replace("Esta semana — ", ""),
        icon: CalendarDays,
        content: <WeekCard model={model} actions={actions} />,
      });
    }
    if (model.streak && model.gamification && (model.streak.value > 0 || model.gamification.xp > 0)) {
      options.push({
        id: "momentum",
        label: "Racha y nivel",
        hint: `${model.streak.value} días`,
        icon: Medal,
        content: <LevelAndStreak model={model} actions={actions} />,
      });
    }
    if (model.progress.workoutsThisMonth > 0 || model.progress.latestWeight !== null) {
      options.push({
        id: "progress",
        label: "Mi progreso",
        hint: `${model.progress.workoutsThisMonth} este mes`,
        icon: Activity,
        content: <ProgressPanel model={model} actions={actions} />,
      });
    }

    options.push({
      id: "occupancy",
      label: "Gym en vivo",
      hint: `${model.occupancy.percentage}% ocupado`,
      icon: Gauge,
      content: (
        <button type="button" onClick={actions.openOccupancy} className="relative w-full overflow-hidden border-[3px] border-cyan-300/45 bg-gradient-to-br from-cyan-300/[.1] to-[#0b0b0b] p-4 text-left shadow-[5px_5px_0_rgba(34,211,238,.15)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div><GameLabel tone="cyan">Gym en vivo</GameLabel><h2 className="mt-3 text-4xl font-black uppercase">{model.occupancy.level}</h2></div>
            <span className="relative flex h-4 w-4"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300/60" /><span className="relative inline-flex h-4 w-4 rounded-full bg-cyan-300" /></span>
          </div>
          <div className="mt-6 flex items-end justify-between gap-3"><strong className="text-5xl font-black tracking-[-.06em]">{model.occupancy.percentage}%</strong><Gauge className="mb-1 h-9 w-9 text-cyan-300" /></div>
          <p className="mt-4 flex items-center gap-2 text-xs font-bold text-white/50"><Users className="h-4 w-4" /> {model.occupancy.detail}</p>
        </button>
      ),
    });
    return options;
  }, [actions, membershipNeedsAttention, model, relevantClasses, weekIsComplete]);

  const storageKey = "xg-member-home-dismissed-v1";
  const [dismissed, setDismissed] = useState<PanelId[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<PanelId | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as {
        date?: string;
        panels?: PanelId[];
      };
      const today = new Date().toISOString().slice(0, 10);
      if (saved.date === today && Array.isArray(saved.panels)) setDismissed(saved.panels);
    } catch {
      // Una preferencia dañada no debe bloquear el dashboard.
    }
  }, []);

  const visiblePanels = panels.filter((panel) => !dismissed.includes(panel.id));
  const activePanel = visiblePanels.find((panel) => panel.id === selectedPanel) ?? visiblePanels[0] ?? null;

  function dismissPanel(panelId: PanelId) {
    const next = Array.from(new Set([...dismissed, panelId]));
    setDismissed(next);
    setSelectedPanel(null);
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ date: new Date().toISOString().slice(0, 10), panels: next }),
      );
    } catch {
      // El modo privado puede impedir localStorage; el estado actual sigue funcionando.
    }
  }

  function restorePanels() {
    setDismissed([]);
    setSelectedPanel(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // El dashboard puede restaurarse en memoria aunque localStorage no esté disponible.
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="border-[3px] border-white/10 bg-[#0b0b0b] p-3 sm:p-4">
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#d8ff3e]">Tu siguiente movimiento</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black uppercase sm:text-2xl">Elegí qué querés hacer</h1>
            <p className="mt-1 text-xs font-bold text-white/40">Una acción a la vez. Sin paneles estorbando.</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-[10px] font-black uppercase text-white/35">{visiblePanels.length} activas</span>
            {dismissed.length > 0 && (
              <button
                type="button"
                onClick={restorePanels}
                className="mt-1 text-[9px] font-black uppercase text-[#d8ff3e] underline decoration-[#d8ff3e]/40 underline-offset-2"
              >
                Mostrar ocultas
              </button>
            )}
          </div>
        </div>
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visiblePanels.map((panel) => {
            const Icon = panel.icon;
            const active = panel.id === activePanel?.id;
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => setSelectedPanel(panel.id)}
                aria-pressed={active}
                className={`min-w-[132px] border-[3px] p-3 text-left transition ${active ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/10 bg-white/[.03] text-white hover:border-white/30"}`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-3 block text-xs font-black uppercase">{panel.label}</span>
                <span className={`mt-1 block text-[9px] font-bold ${active ? "text-black/55" : "text-white/35"}`}>{panel.hint}</span>
              </button>
            );
          })}
        </div>
      </header>

      {activePanel ? (
        <div className="relative xg-tab-in">
          <button
            type="button"
            onClick={() => dismissPanel(activePanel.id)}
            aria-label={`Ocultar ${activePanel.label} por hoy`}
            title="Ocultar por hoy"
            className="absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center border-2 border-white/20 bg-black/80 text-white transition hover:border-[#d8ff3e] hover:text-[#d8ff3e] sm:right-3 sm:top-3"
          >
            <X className="h-4 w-4" />
          </button>
          {activePanel.content}
        </div>
      ) : (
        <div className="border-[3px] border-dashed border-white/15 bg-white/[.02] p-8 text-center">
          <Check className="mx-auto h-8 w-8 text-[#d8ff3e]" />
          <p className="mt-3 text-lg font-black uppercase">Todo listo por hoy</p>
          <p className="mt-1 text-xs font-bold text-white/40">Mañana vuelven tus acciones relevantes.</p>
        </div>
      )}
    </div>
  );
}

export const MemberHomeDashboard = memo(MemberHomeDashboardComponent);
