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
  MousePointerClick,
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
import { dayLabel, membershipPlanDays, membershipRemainingPct, todayIso } from "./utils";
import type { MemberOs } from "./useMemberOs";

const FREE_ACTIVITY_OPTIONS = [
  "Peso libre",
  "Máquinas",
  "Cardio",
  "Funcional",
  "Pierna",
  "Tren superior",
  "Core",
  "Movilidad",
] as const;

type QuickWorkoutMode = "quick" | "free" | "plan";

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
  const [quickMode, setQuickMode] = useState<QuickWorkoutMode>("quick");
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

  useEffect(() => {
    if (!quickWorkoutOpen) return;
    setQuickMode(currentMember.activePlanWorkout ? "plan" : "quick");
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

    const quick = quickMode === "quick";
    const training = quick
      ? { ...FREE_WORKOUT, id: "quick-mark", name: "Entreno marcado", minutes: 0, intensity: "Sin detalle" }
      : { ...FREE_WORKOUT, minutes: freeMinutes };
    const saved = await completeTraining(training, {
      minutes: quick ? 0 : freeMinutes,
      activities: quick ? [] : freeActivities,
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
            hint={membershipDaysRemaining > membershipTotalDays ? "acumulados" : `de ${membershipTotalDays}`}
            tone="orange"
          />
          <GameStat label="Activo hasta" value={currentMember.membership.nextBillingDate} tone="cyan" />
          <div className="mt-4 border-[3px] border-white/15 bg-black/30 p-4 sm:col-span-3">
            <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
              <span className="text-white/55">Tiempo restante del plan</span>
              <span className="text-[#d8ff3e]">
                {membershipDaysRemaining > membershipTotalDays
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
        title="Marcar entreno"
        subtitle="Rápido, libre o plan del entrenador"
        icon={Dumbbell}
        tone="orange"
        size="lg"
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <GameButton variant="ghost" full onClick={closeOsModal}>
              Cerrar
            </GameButton>
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
              ) : quickMode === "quick" ? (
                <MousePointerClick className="h-4 w-4" />
              ) : (
                <Flame className="h-4 w-4" />
              )}
              {trainedToday
                ? "Ya marcado"
                : quickMode === "plan"
                  ? currentMember.activePlanWorkout
                    ? "Continuar entreno"
                    : "Empezar sesión del plan"
                  : quickMode === "quick"
                    ? "Marcar con un clic"
                    : "Guardar entreno libre"}
            </GameButton>
          </div>
        }
      >
        <div className="space-y-4">
          <GameCallout tone="lime" icon={Flame}>
            Elegí cuánto detalle querés guardar. La racha y el XP se suman cuando la sesión queda finalizada.
          </GameCallout>

          <div className="grid gap-2 sm:grid-cols-3">
            {([
              { id: "quick", label: "Un clic", hint: "Sin minutos ni lista", icon: MousePointerClick },
              { id: "free", label: "Entreno libre", hint: "Minutos + lo que hiciste", icon: Flame },
              { id: "plan", label: "Plan entrenador", hint: currentMember.trainingPlan ? "Elegí una sesión" : "Sin plan asignado", icon: ClipboardList },
            ] as const).map((option) => {
              const Icon = option.icon;
              const disabled = option.id !== "plan" && Boolean(currentMember.activePlanWorkout);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setQuickMode(option.id)}
                  className={`min-h-24 border-[3px] p-3 text-left transition ${
                    quickMode === option.id
                      ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                      : "border-white/15 bg-black/30 text-white hover:border-white/35"
                  } disabled:cursor-not-allowed disabled:opacity-30`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-3 block text-xs font-black uppercase">{option.label}</span>
                  <span className={`mt-1 block text-[10px] font-bold ${quickMode === option.id ? "text-black/55" : "text-white/38"}`}>{option.hint}</span>
                </button>
              );
            })}
          </div>

          {quickMode === "quick" && (
            <div className="flex items-center gap-3 border-[3px] border-cyan-300/35 bg-cyan-300/[.06] p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center bg-cyan-300 text-black">
                <MousePointerClick className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black uppercase">Solo marcar que entrenaste</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/45">
                  Guarda la sesión con 0 minutos y sin inventar actividades. Después podés verla en Progreso.
                </p>
              </div>
            </div>
          )}

          {quickMode === "free" && (
            <div className="space-y-4 border-[3px] border-orange-300/35 bg-orange-300/[.05] p-4">
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <GameLabel tone="orange">Duración</GameLabel>
                    <p className="mt-1 text-3xl font-black tabular-nums">{freeMinutes} <span className="text-sm text-white/40">min</span></p>
                  </div>
                  <input
                    type="number"
                    min="5"
                    max="240"
                    step="5"
                    value={freeMinutes}
                    onChange={(event) => setFreeMinutes(Math.max(5, Math.min(240, Number(event.target.value) || 5)))}
                    aria-label="Minutos del entreno"
                    className="h-11 w-24 border-[3px] border-white/20 bg-black px-3 text-center font-black tabular-nums outline-none focus:border-orange-300"
                  />
                </div>
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="5"
                  value={Math.min(180, freeMinutes)}
                  onChange={(event) => setFreeMinutes(Number(event.target.value))}
                  className="mt-3 w-full accent-orange-300"
                  aria-label="Ajustar duración"
                />
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {[15, 30, 45, 60, 90].map((minutes) => (
                    <button key={minutes} type="button" onClick={() => setFreeMinutes(minutes)} className={`min-h-9 border-2 text-[10px] font-black ${freeMinutes === minutes ? "border-orange-300 bg-orange-300 text-black" : "border-white/12 text-white/45"}`}>{minutes}</button>
                  ))}
                </div>
              </div>

              <div>
                <GameLabel tone="lime">¿Qué hiciste?</GameLabel>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FREE_ACTIVITY_OPTIONS.map((activity) => {
                    const selected = freeActivities.includes(activity);
                    return (
                      <button
                        key={activity}
                        type="button"
                        onClick={() => setFreeActivities((current) => selected ? current.filter((item) => item !== activity) : [...current, activity].slice(0, 10))}
                        className={`min-h-10 border-2 px-3 text-[10px] font-black uppercase transition ${selected ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/55 hover:border-white/35"}`}
                      >
                        {selected && <Check className="mr-1 inline h-3.5 w-3.5" />}{activity}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={customActivity}
                    onChange={(event) => setCustomActivity(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") { event.preventDefault(); addCustomActivity(); }
                    }}
                    placeholder="Agregar otra actividad"
                    maxLength={80}
                    className="min-h-11 min-w-0 flex-1 border-[3px] border-white/15 bg-black px-3 text-sm font-semibold outline-none focus:border-[#d8ff3e]"
                  />
                  <button type="button" onClick={addCustomActivity} disabled={!customActivity.trim()} className="grid h-11 w-11 shrink-0 place-items-center bg-white text-black disabled:opacity-35" aria-label="Agregar actividad">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {!!freeActivities.length && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-[10px] font-black uppercase text-white/35">Lista a guardar · {freeActivities.length}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {freeActivities.map((activity) => (
                        <button key={activity} type="button" onClick={() => setFreeActivities((current) => current.filter((item) => item !== activity))} className="inline-flex min-h-9 items-center gap-1.5 border border-[#d8ff3e]/35 bg-[#d8ff3e]/10 px-2.5 text-[10px] font-black uppercase text-[#eaff93]">
                          {activity}<X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {quickMode === "plan" && (
            <div className="space-y-2 border-[3px] border-cyan-300/30 bg-cyan-300/[.04] p-3">
              {currentMember.activePlanWorkout ? (
                <div className="flex items-center gap-3 bg-cyan-300 p-3 text-black">
                  <ClipboardList className="h-6 w-6 shrink-0" />
                  <div><p className="font-black uppercase">Entreno en curso</p><p className="text-xs font-bold text-black/60">{currentMember.activePlanWorkout.trainingName}</p></div>
                </div>
              ) : pendingPlanItems.length ? (
                pendingPlanItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPlanItemId(item.id)}
                    className={`flex w-full items-start gap-3 border-[3px] p-3 text-left transition ${selectedPlanItem?.id === item.id ? "border-cyan-300 bg-cyan-300/15" : "border-white/12 bg-black/25"}`}
                  >
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selectedPlanItem?.id === item.id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/25"}`}>{selectedPlanItem?.id === item.id && <Check className="h-3 w-3" />}</span>
                    <span className="min-w-0"><span className="block font-black uppercase">{item.focus || item.day || "Sesión del plan"}</span><span className="mt-1 block text-xs font-semibold text-white/42">{item.exercises || `${item.targetMinutes || 45} min asignados`}</span></span>
                  </button>
                ))
              ) : (
                <p className="p-4 text-sm font-semibold text-white/45">No tenés sesiones pendientes en el plan del entrenador.</p>
              )}
            </div>
          )}

          {trainedToday && (
            <div className="flex items-center gap-3 border-[3px] border-[#d8ff3e]/40 bg-[#d8ff3e]/10 p-3 text-sm font-black uppercase text-[#eaff93]">
              <Check className="h-5 w-5" /> El entreno de hoy ya está marcado
            </div>
          )}
        </div>
      </GameModal>
    </>
  );
}
