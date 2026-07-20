"use client";

/**
 * Modales del Game OS: guia de maquina, racha, nivel, semana,
 * membresia, ocupacion, logros y check-in rapido de entreno.
 */

import { useCallback, useEffect, useState } from "react";
import ExtremeGymCheckout from "@/app/ExtremeGymCheckout";
import Link from "next/link";
import {
  Award,
  CalendarClock,
  Check,
  ClipboardList,
  CreditCard,
  Dumbbell,
  ExternalLink,
  Flame,
  Loader2,
  Lock,
  Play,
  Plus,
  Snowflake,
  Star,
  Target,
  Timer,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  GameButton,
  GameCallout,
  GameChip,
  GameLabel,
  GameModal,
  GamePanel,
  GameStat,
} from "../GameOS";
import { BadgeGallery, StreakRing, XpBar } from "../gamification";
import {
  STREAK_MILESTONES,
  WEEKLY_GOAL_MAX,
  WEEKLY_GOAL_MIN,
} from "@/lib/xtreme/gamification";
import { findMachineGuide, FREE_WORKOUT } from "./constants";
import { youtubeThumb, youtubeVideoId } from "./catalog/machines";
import { isOneDayPlanLabel, membershipPlanDays, membershipRemainingPct } from "./helpers/membership";
import { dayLabel, todayIso } from "./utils";
import type { MemberOs } from "./useMemberOs";

const FREE_ACTIVITY_OPTIONS = [
  { id: "pesas", label: "Pesas", emoji: "🏋️" },
  { id: "maquinas", label: "Máquinas", emoji: "⚙️" },
  { id: "cardio", label: "Cardio", emoji: "🏃" },
  { id: "funcional", label: "Funcional", emoji: "🔥" },
  { id: "pierna", label: "Pierna", emoji: "🦵" },
  { id: "pecho", label: "Pecho / espalda", emoji: "💪" },
  { id: "core", label: "Core", emoji: "🎯" },
  { id: "movilidad", label: "Movilidad", emoji: "🧘" },
] as const;

const TIME_PRESETS = [
  { min: 20, label: "Rápido", hint: "20 min" },
  { min: 30, label: "Clásico", hint: "30 min" },
  { min: 45, label: "Bueno", hint: "45 min" },
  { min: 60, label: "Fuerte", hint: "1 h" },
  { min: 90, label: "Bestia", hint: "1.5 h" },
] as const;

type QuickWorkoutMode = "tap" | "time" | "plan";

function quickCoachLine(args: {
  trainedToday: boolean;
  streak: number;
  minutes: number;
  mode: QuickWorkoutMode;
  activities: string[];
}) {
  if (args.trainedToday) return "Hoy ya sumaste. Mañana se repite la magia.";
  if (args.mode === "tap") {
    if (args.streak >= 5) return `Racha de ${args.streak}. Un toque y la cuidás.`;
    if (args.streak > 0) return "Sin vueltas: tocá y queda marcado.";
    return "Primera de la racha puede ser un solo toque.";
  }
  if (args.mode === "plan") return "Seguí lo que te armó el coach. Sin inventar.";
  if (args.minutes <= 20) return "Cortito pero cuenta. Mejor 20 min que cero.";
  if (args.minutes >= 60) return "Sesión larga: ese cuerpo se va a enterar.";
  if (args.activities.length >= 2) return `${args.activities.length} cosas en la lista. Se ve serio.`;
  if (args.activities.length === 1) return `${args.activities[0]} · ${args.minutes} min. Listo para guardar.`;
  return "Elegí minutos (y opcional qué hiciste). Un toque y listo.";
}

/** "2026-07-11" → 11 (sin pasar por Date: evita corrimientos de zona horaria). */
function dayOfMonth(date: string) {
  return Number(date.slice(8, 10));
}

function MachineGuideBody({
  machine,
}: {
  machine: NonNullable<ReturnType<typeof findMachineGuide>>;
}) {
  const gallery = machine.images?.length
    ? machine.images
    : machine.image
      ? [machine.image]
      : [];
  const [activePhoto, setActivePhoto] = useState(gallery[0] ?? machine.image);
  const thumb = youtubeThumb(machine.videoUrl);
  const ytId = youtubeVideoId(machine.videoUrl);

  return (
    <div className="space-y-4">
      <div className={`h-3 border-2 border-black/20 bg-gradient-to-r ${machine.accent}`} />

      {activePhoto && (
        <div className="overflow-hidden border-[3px] border-white/15 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activePhoto}
            alt={machine.name}
            className="h-40 w-full object-cover sm:h-48"
          />
          {gallery.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto border-t-2 border-white/10 bg-black/60 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {gallery.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActivePhoto(src)}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden border-2 transition ${
                    activePhoto === src
                      ? "border-[#d8ff3e]"
                      : "border-white/20 opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {machine.muscles.map((m) => (
          <GameChip key={m} tone="lime">
            {m}
          </GameChip>
        ))}
      </div>

      {machine.videoUrl && (
        <a
          href={machine.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex min-h-[88px] overflow-hidden border-[3px] border-[#d8ff3e]/45 bg-black transition hover:border-[#d8ff3e]"
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-50 transition group-hover:opacity-65 group-hover:scale-105"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-r ${machine.accent} opacity-30`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
          <div className="relative flex w-full items-center gap-3 p-3 sm:p-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center border-2 border-black/40 bg-[#d8ff3e] text-black shadow-[3px_3px_0_rgba(0,0,0,.4)]">
              <Play className="h-6 w-6 fill-current" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">
                Video de técnica
              </p>
              <p className="truncate text-sm font-black uppercase text-white">
                {machine.videoLabel ?? `Cómo usar ${machine.name}`}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-white/45">
                {ytId ? "YouTube · se abre en pestaña nueva" : "Se abre en pestaña nueva"}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-white/40 group-hover:text-[#d8ff3e]" />
          </div>
        </a>
      )}

      <GamePanel title="Ajuste inicial" tone="cyan" compact>
        <p className="text-sm font-bold leading-6 text-white/70">{machine.setup}</p>
      </GamePanel>
      <div className="grid gap-3 sm:grid-cols-2">
        <GamePanel title="Tips" tone="lime" compact>
          <ul className="space-y-2 text-sm font-bold text-white/65">
            {machine.tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d8ff3e]" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </GamePanel>
        <GamePanel title="Evite" tone="orange" compact>
          <ul className="space-y-2 text-sm font-bold text-white/65">
            {machine.mistakes.map((mistake) => (
              <li key={mistake} className="flex gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </GamePanel>
      </div>
      <GameCallout tone="orange" icon={Timer}>
        <span className="font-black uppercase">Starter · </span>
        {machine.starter}
      </GameCallout>
    </div>
  );
}

export default function OsModals({ os }: { os: MemberOs }) {
  const {
    osModal,
    setOsModal,
    closeOsModal,
    gami,
    unlocked,
    weekDates,
    workoutDates,
    weekDoneCount,
    weeklyGoal,
    updateWeeklyGoal,
    currentMember,
    gymStatus,
    unlockedCount,
    achievements,
    serverBadges,
    trainedToday,
    savingTrainingId,
    completeTraining,
    startPlanWorkout,
    setTab,
    memberName,
    reloadFullMember,
    fetchPayments,
  } = os;
  const [savingGoal, setSavingGoal] = useState<number | null>(null);
  const [quickMode, setQuickMode] = useState<QuickWorkoutMode>("time");
  const [freeMinutes, setFreeMinutes] = useState(45);
  const [freeActivities, setFreeActivities] = useState<string[]>([]);
  const [customActivity, setCustomActivity] = useState("");
  const [selectedPlanItemId, setSelectedPlanItemId] = useState("");
  const selectedMachine =
    osModal?.kind === "machine" ? findMachineGuide(osModal.machineId) : null;
  const today = todayIso();
  const weekRemaining = Math.max(0, weeklyGoal - weekDoneCount);
  const nextStreakMilestone =
    gami ? STREAK_MILESTONES.find((m) => m > gami.streak) ?? null : null;
  const xpToNextLevel =
    gami && gami.level.nextXp !== null ? Math.max(0, gami.level.nextXp - gami.xp) : null;
  const membershipTotalDays = membershipPlanDays(currentMember.membership.plan);
  const membershipDaysRemaining = Math.max(0, currentMember.membership.daysRemaining);
  const membershipProgress = membershipRemainingPct(membershipDaysRemaining, membershipTotalDays);
  const pendingPlanItems = currentMember.trainingPlan?.items.filter((item) => !item.done) ?? [];
  const selectedPlanItem = pendingPlanItems.find((item) => item.id === selectedPlanItemId) ?? pendingPlanItems[0];
  const quickWorkoutOpen = osModal?.kind === "quick-train" || osModal?.kind === "training";
  const hasPlanOption = Boolean(currentMember.activePlanWorkout || pendingPlanItems.length);
  const quickCoach = quickCoachLine({
    trainedToday,
    streak: gami?.streak ?? 0,
    minutes: freeMinutes,
    mode: quickMode,
    activities: freeActivities,
  });

  useEffect(() => {
    if (!quickWorkoutOpen) return;
    // Por defecto: marcar tiempo (lo más usado). Plan solo si hay sesión en curso.
    setQuickMode(currentMember.activePlanWorkout ? "plan" : "time");
    setFreeMinutes(45);
    setFreeActivities([]);
    setCustomActivity("");
    setSelectedPlanItemId(pendingPlanItems[0]?.id ?? "");
  }, [currentMember.activePlanWorkout, currentMember.trainingPlan, quickWorkoutOpen]);

  function addCustomActivity() {
    const value = customActivity.trim().slice(0, 80);
    if (!value || freeActivities.some((item) => item.toLocaleLowerCase("es-CR") === value.toLocaleLowerCase("es-CR"))) return;
    setFreeActivities((current) => [...current, value].slice(0, 10));
    setCustomActivity("");
  }

  function toggleActivity(label: string) {
    setFreeActivities((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label].slice(0, 10),
    );
  }

  async function submitQuickWorkout() {
    if (trainedToday || savingTrainingId) return;
    if (quickMode === "plan") {
      if (currentMember.activePlanWorkout) {
        setTab("entrenar");
        closeOsModal();
        return;
      }
      if (!selectedPlanItem) return;
      const started = await startPlanWorkout(selectedPlanItem);
      if (started) {
        setTab("entrenar");
        closeOsModal();
      }
      return;
    }

    const tapOnly = quickMode === "tap";
    const training = tapOnly
      ? { ...FREE_WORKOUT, id: "quick-mark", name: "Entreno de hoy", minutes: 0, intensity: "Sin detalle" }
      : {
          ...FREE_WORKOUT,
          name: freeActivities.length
            ? freeActivities.slice(0, 2).join(" · ")
            : "Entreno libre",
          minutes: freeMinutes,
          intensity: freeMinutes >= 60 ? "Fuerte" : freeMinutes <= 25 ? "Suave" : "Normal",
        };
    const saved = await completeTraining(training, {
      minutes: tapOnly ? 0 : freeMinutes,
      activities: tapOnly ? [] : freeActivities,
      allowWithPendingPlan: true,
    });
    if (saved) closeOsModal();
  }
  const handleCheckoutSuccess = useCallback(async () => {
    closeOsModal();
    await Promise.all([
      reloadFullMember(memberName, currentMember.cedula),
      fetchPayments(),
    ]);
  }, [closeOsModal, currentMember.cedula, fetchPayments, memberName, reloadFullMember]);

  const accessModal = osModal?.kind === "access-required" ? osModal : null;
  const accessTitle =
    accessModal?.reason === "expired"
      ? "Tu plan no cubre hoy"
      : accessModal?.reason === "limit_reached"
        ? "Se acabaron tus cupos"
        : "Activá tu acceso para reservar";
  const accessSubtitle = accessModal?.trainingName
    ? `Clase: ${accessModal.trainingName}`
    : "Reservas de clase";

  return (
    <>
      <GameModal
        open={osModal?.kind === "machine"}
        onClose={closeOsModal}
        title={selectedMachine?.name ?? "Máquina"}
        subtitle={
          selectedMachine
            ? `${selectedMachine.zone} · ${selectedMachine.level}`
            : undefined
        }
        icon={Dumbbell}
        tone="lime"
        size="lg"
        footer={
          <GameButton full onClick={closeOsModal}>
            Entendido
          </GameButton>
        }
      >
        {selectedMachine && (
          <MachineGuideBody key={selectedMachine.id} machine={selectedMachine} />
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "streak"}
        onClose={closeOsModal}
        title="Tu racha"
        subtitle="Constancia día a día"
        icon={Flame}
        tone="orange"
        size="md"
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <GameButton variant="ghost" full onClick={() => setOsModal({ kind: "week" })}>
              <Target className="h-4 w-4" />
              Ver semana
            </GameButton>
            <GameButton variant="ghost" full onClick={() => setOsModal({ kind: "level" })}>
              <Star className="h-4 w-4" />
              Ver nivel
            </GameButton>
          </div>
        }
      >
        {gami ? (
          <div className="space-y-4">
            <div className="border-[3px] border-orange-300/40 bg-orange-300/[0.08] p-4">
              <StreakRing
                streak={gami.streak}
                freezes={gami.freezesAvailable}
                weekCount={gami.weekCount}
                weeklyGoal={gami.weeklyGoal}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <GameStat label="Racha" value={gami.streak} hint="días" tone="orange" icon={Flame} />
              <GameStat
                label="Semanas"
                value={gami.weeksStreak}
                hint="con la meta cumplida"
                tone="lime"
                icon={Target}
              />
              <GameStat
                label="Protectores"
                value={gami.freezesAvailable}
                hint="salvan un día"
                tone="cyan"
                icon={Snowflake}
              />
              <GameStat
                label="Esta semana"
                value={`${gami.weekCount}/${gami.weeklyGoal}`}
                hint="días"
                tone="lime"
                icon={Check}
              />
            </div>
            <GameCallout tone="orange" icon={Flame}>
              {nextStreakMilestone
                ? `Te faltan ${nextStreakMilestone - gami.streak} ${
                    nextStreakMilestone - gami.streak === 1 ? "día" : "días"
                  } para el hito de ${nextStreakMilestone}. Entrená hoy y no se corta.`
                : "Sos leyenda: pasaste todos los hitos de racha. Seguí sumando."}
            </GameCallout>
          </div>
        ) : (
          <p className="text-sm font-bold text-white/50">Ingresá para ver tu racha.</p>
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "level"}
        onClose={closeOsModal}
        title="Tu nivel"
        subtitle={gami ? gami.level.name : "Experiencia"}
        icon={Star}
        tone="cyan"
        size="md"
        footer={
          <GameButton variant="ghost" full onClick={() => setOsModal({ kind: "streak" })}>
            <Flame className="h-4 w-4" />
            Ver racha
          </GameButton>
        }
      >
        {gami ? (
          <div className="space-y-4">
            <div className="border-[3px] border-cyan-300/40 bg-black/40 p-4">
              <XpBar xp={gami.xp} level={gami.level} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <GameStat
                label="Nivel"
                value={gami.level.index}
                hint={gami.level.name}
                tone="cyan"
                icon={Star}
              />
              <GameStat label="XP" value={gami.xp.toLocaleString()} tone="lime" icon={Zap} />
              <GameStat
                label="Para subir"
                value={xpToNextLevel === null ? "Máximo" : xpToNextLevel.toLocaleString()}
                hint={xpToNextLevel === null ? "nivel tope" : "XP"}
                tone="orange"
                icon={Target}
              />
              <GameStat
                label="Logros"
                value={`${unlockedCount}/${achievements.length}`}
                tone="lime"
                icon={Award}
                onClick={() => setOsModal({ kind: "badges" })}
              />
            </div>
            <GameCallout tone="cyan" icon={Zap}>
              Cada entreno marcado suma XP; la racha y los logros te empujan al siguiente nivel.
            </GameCallout>
          </div>
        ) : (
          <p className="text-sm font-bold text-white/50">Ingresá para ver tu nivel.</p>
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "week"}
        onClose={closeOsModal}
        title="Tu semana"
        subtitle={`${weekDoneCount} de ${weeklyGoal} días`}
        icon={Target}
        tone="lime"
        size="md"
      >
        <div className="space-y-5">
          <div>
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-black leading-none text-white">
                {weekDoneCount}
                <span className="text-white/35">/{weeklyGoal}</span>
              </p>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d8ff3e]">
                {weekRemaining === 0
                  ? "¡Meta cumplida!"
                  : `Faltan ${weekRemaining} ${weekRemaining === 1 ? "día" : "días"}`}
              </p>
            </div>
            <div className="mt-3 h-3 border-[3px] border-white/15 bg-black/45">
              <div
                className="h-full bg-gradient-to-r from-[#d8ff3e] to-cyan-300 transition-all duration-700"
                style={{
                  width: `${Math.min(100, Math.round((weekDoneCount / Math.max(1, weeklyGoal)) * 100))}%`,
                }}
              />
            </div>
          </div>

          <div>
            <GameLabel>Días de la semana</GameLabel>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {weekDates.map((date) => {
                const done = workoutDates.has(date);
                const isToday = date === today;
                const missed = !done && date < today;
                // Solo hoy es accionable: marcar el entreno desde el propio calendario.
                const canMark = isToday && !done && unlocked && !savingTrainingId;
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!canMark}
                    onClick={() => setOsModal({ kind: "quick-train" })}
                    aria-label={
                      done
                        ? `${dayLabel(date)} ${dayOfMonth(date)}: entreno hecho`
                        : isToday
                          ? "Marcar el entreno de hoy"
                          : `${dayLabel(date)} ${dayOfMonth(date)}`
                    }
                    className={`grid aspect-square place-items-center gap-0.5 border-[3px] transition ${
                      done
                        ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                        : isToday
                          ? "border-[#d8ff3e] bg-[#d8ff3e]/15 text-[#eaff93] hover:bg-[#d8ff3e]/25 disabled:hover:bg-[#d8ff3e]/15"
                          : missed
                            ? "border-dashed border-white/10 bg-transparent text-white/25"
                            : "border-white/15 bg-black/25 text-white/35"
                    } disabled:cursor-default`}
                  >
                    <span className="text-[10px] font-black uppercase leading-none opacity-70">
                      {dayLabel(date)}
                    </span>
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : isToday && savingTrainingId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isToday && canMark ? (
                      <Plus className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-black leading-none">{dayOfMonth(date)}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] font-bold leading-5 text-white/40">
              {trainedToday
                ? "Hoy ya quedó marcado. ¡Pura vida!"
                : unlocked
                  ? "Tocá el día de hoy para marcar tu entreno."
                  : "Ingresá para marcar tus entrenos."}
            </p>
          </div>

          <div>
            <GameLabel>Meta semanal</GameLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from(
                { length: WEEKLY_GOAL_MAX - WEEKLY_GOAL_MIN + 1 },
                (_, i) => WEEKLY_GOAL_MIN + i,
              ).map((n) => {
                const active = weeklyGoal === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={async () => {
                      setSavingGoal(n);
                      try {
                        await updateWeeklyGoal(n);
                      } finally {
                        setSavingGoal(null);
                      }
                    }}
                    disabled={!unlocked || savingGoal !== null}
                    aria-pressed={active}
                    className={`grid h-11 w-11 place-items-center border-[3px] text-sm font-black transition ${
                      active
                        ? "border-[#d8ff3e] bg-[#d8ff3e] text-black shadow-[3px_3px_0_rgba(0,0,0,.45)]"
                        : "border-white/20 bg-black/30 text-white/55 hover:border-[#d8ff3e]/60 hover:text-white"
                    } disabled:opacity-40`}
                  >
                    {savingGoal === n ? <Loader2 className="h-4 w-4 animate-spin" /> : n}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] font-bold leading-5 text-white/40">
              Cumplí la meta y la semana suma a tu racha semanal.
            </p>
          </div>
        </div>
      </GameModal>

      <GameModal
        open={osModal?.kind === "access-required"}
        onClose={closeOsModal}
        title={accessTitle}
        subtitle={accessSubtitle}
        icon={CalendarClock}
        tone="orange"
        size="lg"
      >
        {accessModal && (
          <div className="space-y-4">
            <GameCallout tone="orange" icon={Lock}>
              <span className="font-bold">{accessModal.message}</span>
            </GameCallout>

            <p className="text-sm font-semibold leading-6 text-white/60">
              Ya estás en la app: solo falta un plan o un pase para reservar cupo. Elegí una opción y
              después volvé a tocar <strong className="text-white">Reservar</strong>.
            </p>

            <div className="grid gap-2">
              <GameButton
                full
                onClick={() =>
                  setOsModal({
                    kind: "checkout",
                    planId:
                      accessModal.checkoutOptionId === "week" ||
                      accessModal.checkoutOptionId === "fortnight" ||
                      accessModal.checkoutOptionId === "month"
                        ? accessModal.checkoutOptionId
                        : "day-pass",
                  })
                }
              >
                <CreditCard className="h-4 w-4" />
                {accessModal.reason === "expired"
                  ? "Renovar o comprar plan"
                  : "Pase del día o plan · pagar acá"}
              </GameButton>
              <GameButton
                full
                variant="ghost"
                onClick={() => setOsModal({ kind: "checkout", planId: "month" })}
              >
                Plan mensual (mejor precio)
              </GameButton>
              {!currentMember.emailVerified && (
                <Link
                  href="/primer-dia#registro"
                  className="inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-white/15 px-4 text-xs font-black uppercase tracking-wide text-[#d8ff3e] transition hover:border-[#d8ff3e]"
                >
                  Primer día gratis · activar con correo
                </Link>
              )}
              <Link
                href="/precios#inscripcion"
                className="inline-flex min-h-11 items-center justify-center gap-2 text-xs font-black uppercase tracking-wide text-white/45 transition hover:text-white"
              >
                Ver todos los planes <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            <p className="text-[11px] font-semibold leading-5 text-white/35">
              ¿Dudas? Pasá por recepción o escribinos por WhatsApp. Si ya pagaste y no te deja
              reservar, pedí que te revisen el acceso.
            </p>
          </div>
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "checkout"}
        onClose={closeOsModal}
        title="Activar acceso"
        subtitle="Pago en línea · sin salir del Member OS"
        icon={CreditCard}
        tone="lime"
        size="full"
      >
        {osModal?.kind === "checkout" && (
          <ExtremeGymCheckout
            key={osModal.planId}
            initialOption={osModal.planId}
            compact
            memberCheckout
            memberCustomer={{
              name: currentMember.memberName,
              phone: currentMember.phone,
              email: currentMember.email,
            }}
            onSuccess={handleCheckoutSuccess}
          />
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "membership"}
        onClose={closeOsModal}
        title={currentMember.membership.plan}
        subtitle="Membresía"
        icon={CreditCard}
        tone="lime"
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <GameStat label="Estado" value={currentMember.membership.status} tone="lime" />
          <GameStat
            label="Días"
            value={membershipDaysRemaining}
            hint={isOneDayPlanLabel(currentMember.membership.plan) ? "disponible" : membershipDaysRemaining > membershipTotalDays ? "acumulados" : `de ${membershipTotalDays}`}
            tone="orange"
          />
          <GameStat
            label={isOneDayPlanLabel(currentMember.membership.plan) ? "Acceso" : "Activo hasta"}
            value={isOneDayPlanLabel(currentMember.membership.plan) ? "1 día disponible" : currentMember.membership.nextBillingDate}
            tone="cyan"
          />
          <div className="mt-4 border-[3px] border-white/15 bg-black/30 p-4 sm:col-span-3">
            <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
              <span className="text-white/55">Tiempo restante del plan</span>
              <span className="text-[#d8ff3e]">
                {isOneDayPlanLabel(currentMember.membership.plan)
                  ? "1 día disponible"
                  : membershipDaysRemaining > membershipTotalDays
                    ? `${membershipDaysRemaining} días acumulados`
                    : `${membershipDaysRemaining}/${membershipTotalDays} días`}
              </span>
            </div>
            <div className="mt-3 h-4 border-[3px] border-white/15 bg-black/50">
              <div
                className="h-full bg-gradient-to-r from-[#d8ff3e] to-cyan-300"
                style={{ width: `${membershipProgress}%` }}
              />
            </div>
          </div>
        </div>
      </GameModal>

      <GameModal
        open={osModal?.kind === "occupancy"}
        onClose={closeOsModal}
        title={gymStatus?.level ?? "Cargando"}
        subtitle="Ocupación del gym"
        icon={Users}
        tone="cyan"
        size="sm"
      >
        <div className="space-y-4">
          <div className="h-4 border-[3px] border-white/15 bg-black/45">
            <div
              className="h-full bg-cyan-300 transition-all"
              style={{ width: `${gymStatus?.occupancyPct ?? 0}%` }}
            />
          </div>
          <p className="text-sm font-bold text-white/60">
            {gymStatus
              ? `${gymStatus.currentPeople}/${gymStatus.capacity} personas · reservas hoy: ${gymStatus.reservationsToday}`
              : "Leyendo el gym en vivo."}
          </p>
        </div>
      </GameModal>

      <GameModal
        open={osModal?.kind === "badges"}
        onClose={closeOsModal}
        title="Logros"
        subtitle={`${unlockedCount}/${achievements.length}`}
        icon={Award}
        tone="lime"
        size="lg"
      >
        {serverBadges.length ? (
          <BadgeGallery badges={serverBadges} />
        ) : (
          <div className="grid gap-2">
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 border-[3px] p-3 ${
                    a.done ? "border-[#d8ff3e]/50 bg-[#d8ff3e]/10" : "border-white/15 bg-black/30"
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 place-items-center ${
                      a.done ? "bg-[#d8ff3e] text-black" : "bg-white/10 text-white/40"
                    }`}
                  >
                    {a.done ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase">{a.name}</p>
                    <p className="text-xs font-bold text-white/45">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GameModal>

      <GameModal
        open={quickWorkoutOpen}
        onClose={closeOsModal}
        title={trainedToday ? "Hoy ya está" : "¿Cuánto entrenaste?"}
        subtitle={trainedToday ? "La racha de hoy ya sumó" : "Tocá minutos y guardá"}
        icon={Timer}
        tone="orange"
        size="lg"
        footer={
          <div className="grid gap-2">
            <GameButton
              full
              variant="lime"
              disabled={
                !unlocked ||
                trainedToday ||
                Boolean(savingTrainingId) ||
                (quickMode === "plan" && !currentMember.activePlanWorkout && !selectedPlanItem)
              }
              onClick={() => void submitQuickWorkout()}
            >
              {savingTrainingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : trainedToday ? (
                <Check className="h-4 w-4" />
              ) : quickMode === "plan" ? (
                <ClipboardList className="h-4 w-4" />
              ) : quickMode === "tap" ? (
                <Zap className="h-4 w-4" />
              ) : (
                <Timer className="h-4 w-4" />
              )}
              {trainedToday
                ? "Listo por hoy"
                : quickMode === "plan"
                  ? currentMember.activePlanWorkout
                    ? "Seguir mi plan"
                    : "Arrancar esta sesión"
                  : quickMode === "tap"
                    ? "Sí, entrené · marcar"
                    : `Guardar ${freeMinutes} min`}
            </GameButton>
            <button
              type="button"
              onClick={closeOsModal}
              className="min-h-11 text-xs font-black uppercase tracking-wide text-white/45 transition hover:text-white"
            >
              Ahora no
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {trainedToday ? (
            <div className="flex items-center gap-3 border-[3px] border-[#d8ff3e]/45 bg-[#d8ff3e]/10 p-4">
              <span className="grid h-12 w-12 place-items-center bg-[#d8ff3e] text-black">
                <Check className="h-6 w-6" />
              </span>
              <div>
                <p className="font-black uppercase">Pura vida, hoy ya contó</p>
                <p className="mt-1 text-xs font-semibold text-white/50">
                  {gami?.streak
                    ? `Racha en ${gami.streak}. Mañana se sigue.`
                    : "Mañana se vuelve a sumar."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold leading-snug text-white/70">{quickCoach}</p>

              {/* Tabs simples: tiempo (default) | un toque | plan */}
              <div className={`grid gap-2 ${hasPlanOption ? "grid-cols-3" : "grid-cols-2"}`}>
                {(
                  [
                    { id: "time" as const, label: "Con tiempo", icon: Timer },
                    { id: "tap" as const, label: "Un toque", icon: Zap },
                    ...(hasPlanOption
                      ? [{ id: "plan" as const, label: "Mi plan", icon: ClipboardList }]
                      : []),
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const on = quickMode === tab.id;
                  const blocked = tab.id !== "plan" && Boolean(currentMember.activePlanWorkout);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={blocked}
                      onClick={() => setQuickMode(tab.id)}
                      className={`flex min-h-12 items-center justify-center gap-2 border-[3px] px-2 text-xs font-black uppercase transition ${
                        on
                          ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                          : "border-white/15 bg-black/35 text-white/70 hover:border-white/30"
                      } disabled:opacity-30`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {quickMode === "time" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">
                      ¿Cuántos minutos?
                    </p>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {TIME_PRESETS.map((preset) => {
                        const on = freeMinutes === preset.min;
                        return (
                          <button
                            key={preset.min}
                            type="button"
                            onClick={() => setFreeMinutes(preset.min)}
                            className={`flex min-h-[4.5rem] flex-col items-center justify-center border-[3px] transition active:translate-y-px ${
                              on
                                ? "border-orange-300 bg-orange-300 text-black shadow-[3px_3px_0_rgba(251,146,60,.35)]"
                                : "border-white/12 bg-black/40 text-white hover:border-orange-300/50"
                            }`}
                          >
                            <span className="text-lg font-black tabular-nums">{preset.min}</span>
                            <span className={`mt-0.5 text-[9px] font-black uppercase ${on ? "text-black/55" : "text-white/35"}`}>
                              {preset.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={120}
                        step={5}
                        value={Math.min(120, Math.max(10, freeMinutes))}
                        onChange={(event) => setFreeMinutes(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-orange-300"
                        aria-label="Ajustar minutos"
                      />
                      <span className="w-16 shrink-0 text-right text-2xl font-black tabular-nums text-orange-200">
                        {freeMinutes}
                        <span className="text-xs text-white/40">m</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                      ¿Qué hiciste? <span className="text-white/25">(opcional)</span>
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {FREE_ACTIVITY_OPTIONS.map((activity) => {
                        const selected = freeActivities.includes(activity.label);
                        return (
                          <button
                            key={activity.id}
                            type="button"
                            onClick={() => toggleActivity(activity.label)}
                            className={`flex min-h-12 items-center gap-2 border-[2px] px-2.5 text-left text-[11px] font-black uppercase transition ${
                              selected
                                ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                                : "border-white/12 bg-black/30 text-white/65 hover:border-white/30"
                            }`}
                          >
                            <span className="text-base leading-none">{activity.emoji}</span>
                            <span className="min-w-0 truncate">{activity.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={customActivity}
                        onChange={(event) => setCustomActivity(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCustomActivity();
                          }
                        }}
                        placeholder="Otra cosa (ej. remo, HIIT…)"
                        maxLength={80}
                        className="min-h-11 min-w-0 flex-1 border-[2px] border-white/12 bg-black/40 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
                      />
                      <button
                        type="button"
                        onClick={addCustomActivity}
                        disabled={!customActivity.trim()}
                        className="grid h-11 w-11 shrink-0 place-items-center border-[2px] border-white/15 text-white disabled:opacity-30"
                        aria-label="Agregar"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {quickMode === "tap" && (
                <button
                  type="button"
                  disabled={!unlocked || Boolean(savingTrainingId)}
                  onClick={() => void submitQuickWorkout()}
                  className="flex w-full min-h-[7.5rem] flex-col items-center justify-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e]/15 px-4 text-center transition hover:bg-[#d8ff3e]/25 active:translate-y-px disabled:opacity-40"
                >
                  <Zap className="h-8 w-8 text-[#d8ff3e]" />
                  <span className="text-lg font-black uppercase text-white">Sí, entrené hoy</span>
                  <span className="text-xs font-bold text-white/45">
                    Sin minutos ni lista. Solo racha y XP.
                  </span>
                </button>
              )}

              {quickMode === "plan" && (
                <div className="space-y-2">
                  {currentMember.activePlanWorkout ? (
                    <div className="flex items-center gap-3 border-[3px] border-cyan-300 bg-cyan-300 p-4 text-black">
                      <ClipboardList className="h-7 w-7 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-black/55">En curso</p>
                        <p className="font-black uppercase">{currentMember.activePlanWorkout.trainingName}</p>
                      </div>
                    </div>
                  ) : pendingPlanItems.length ? (
                    pendingPlanItems.map((item) => {
                      const on = selectedPlanItem?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedPlanItemId(item.id)}
                          className={`flex w-full items-start gap-3 border-[3px] p-3.5 text-left transition ${
                            on ? "border-cyan-300 bg-cyan-300/15" : "border-white/12 bg-black/30 hover:border-white/25"
                          }`}
                        >
                          <span
                            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border-2 ${
                              on ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/25"
                            }`}
                          >
                            {on && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-black uppercase">
                              {item.focus || item.day || "Sesión"}
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-white/45">
                              {item.exercises || `${item.targetMinutes || 45} min`}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="border border-dashed border-white/15 p-4 text-sm font-semibold text-white/45">
                      El coach todavía no te dejó sesiones pendientes. Marcá tiempo libre.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </GameModal>
    </>
  );
}
