"use client";

/**
 * Modales del Game OS: guia de maquina, racha/nivel, semana,
 * membresia, ocupacion, logros y check-in rapido de entreno.
 */

import {
  Award,
  Check,
  CreditCard,
  Dumbbell,
  Flame,
  Loader2,
  Lock,
  Snowflake,
  Star,
  Target,
  Timer,
  Users,
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
import { WEEKLY_GOAL_MAX, WEEKLY_GOAL_MIN } from "@/lib/xtreme/gamification";
import { TRAININGS } from "./constants";
import { dayLabel, todayIso } from "./utils";
import type { MemberOs } from "./useMemberOs";

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
    selectedTraining,
    quickTraining,
    trainedToday,
    savingTrainingId,
    completeTraining,
    completedToday,
  } = os;

  return (
    <>
      <GameModal
        open={osModal?.kind === "machine"}
        onClose={closeOsModal}
        title={osModal?.kind === "machine" ? osModal.machine.name : "Máquina"}
        subtitle={
          osModal?.kind === "machine"
            ? `${osModal.machine.zone} · ${osModal.machine.level}`
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
        {osModal?.kind === "machine" && (
          <div className="space-y-4">
            <div className={`h-3 border-2 border-black/20 bg-gradient-to-r ${osModal.machine.accent}`} />
            <div className="flex flex-wrap gap-2">
              {osModal.machine.muscles.map((m) => (
                <GameChip key={m} tone="lime">
                  {m}
                </GameChip>
              ))}
            </div>
            <GamePanel title="Ajuste inicial" tone="cyan" compact>
              <p className="text-sm font-bold leading-6 text-white/70">{osModal.machine.setup}</p>
            </GamePanel>
            <div className="grid gap-3 sm:grid-cols-2">
              <GamePanel title="Tips" tone="lime" compact>
                <ul className="space-y-2 text-sm font-bold text-white/65">
                  {osModal.machine.tips.map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d8ff3e]" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </GamePanel>
              <GamePanel title="Evite" tone="orange" compact>
                <ul className="space-y-2 text-sm font-bold text-white/65">
                  {osModal.machine.mistakes.map((mistake) => (
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
              {osModal.machine.starter}
            </GameCallout>
          </div>
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "streak"}
        onClose={closeOsModal}
        title="Tu racha y nivel"
        subtitle="Constantes del juego"
        icon={Flame}
        tone="orange"
        size="md"
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
            <div className="border-[3px] border-cyan-300/40 bg-black/40 p-4">
              <XpBar xp={gami.xp} level={gami.level} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <GameStat label="Racha" value={gami.streak} hint="días" tone="orange" icon={Flame} />
              <GameStat label="Nivel" value={gami.level.index} hint={gami.level.name} tone="cyan" icon={Star} />
              <GameStat label="XP" value={gami.xp.toLocaleString()} tone="lime" icon={Zap} />
              <GameStat
                label="Protectores"
                value={gami.freezesAvailable}
                hint="rachas"
                tone="cyan"
                icon={Snowflake}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm font-bold text-white/50">Inicia sesión para ver tu racha.</p>
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "week"}
        onClose={closeOsModal}
        title="Progreso semanal"
        subtitle={`Meta ${weekDoneCount}/${weeklyGoal}`}
        icon={Target}
        tone="lime"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map((date) => {
              const done = workoutDates.has(date);
              const isToday = date === todayIso();
              return (
                <div
                  key={date}
                  className={`grid aspect-square place-items-center border-[3px] text-xs font-black ${
                    done
                      ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                      : isToday
                        ? "border-[#d8ff3e]/60 bg-black/40 text-[#eaff93]"
                        : "border-white/15 bg-black/25 text-white/35"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : dayLabel(date)}
                </div>
              );
            })}
          </div>
          <GameLabel>Ajustar meta / semana</GameLabel>
          <div className="flex flex-wrap gap-2">
            {Array.from(
              { length: WEEKLY_GOAL_MAX - WEEKLY_GOAL_MIN + 1 },
              (_, i) => WEEKLY_GOAL_MIN + i,
            ).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => void updateWeeklyGoal(n)}
                disabled={!unlocked}
                className={`h-11 w-11 border-[3px] text-sm font-black transition ${
                  weeklyGoal === n
                    ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                    : "border-white/20 bg-black/30 text-white/55"
                } disabled:opacity-40`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </GameModal>

      <GameModal
        open={osModal?.kind === "membership"}
        onClose={closeOsModal}
        title={currentMember.membership.plan}
        subtitle="Membresía"
        icon={CreditCard}
        tone="lime"
        size="md"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <GameStat label="Estado" value={currentMember.membership.status} tone="lime" />
          <GameStat
            label="Días"
            value={Math.max(0, currentMember.membership.daysRemaining)}
            hint="restantes"
            tone="orange"
          />
          <GameStat label="Cobro" value={currentMember.membership.nextBillingDate} tone="cyan" />
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
        open={osModal?.kind === "quick-train" || osModal?.kind === "training"}
        onClose={closeOsModal}
        title={selectedTraining?.name ?? "Marcar entreno"}
        subtitle="Check-in de hoy"
        icon={Dumbbell}
        tone="orange"
        size="md"
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <GameButton variant="ghost" full onClick={closeOsModal}>
              Cerrar
            </GameButton>
            <GameButton
              full
              variant="lime"
              disabled={!unlocked || trainedToday || Boolean(savingTrainingId)}
              onClick={() => {
                const t = selectedTraining ?? quickTraining;
                if (!trainedToday) void completeTraining(t);
                closeOsModal();
              }}
            >
              {savingTrainingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : trainedToday ? (
                <Check className="h-4 w-4" />
              ) : (
                <Flame className="h-4 w-4" />
              )}
              {trainedToday ? "Ya marcado" : "Marcar entreno"}
            </GameButton>
          </div>
        }
      >
        <div className="space-y-3">
          <GameCallout tone="lime" icon={Flame}>
            Un toque y sumás racha + XP. Elegí el entreno o usá el rápido del día.
          </GameCallout>
          <div className="grid gap-2">
            {TRAININGS.map((training) => {
              const Icon = training.icon;
              const done = completedToday.has(training.id);
              return (
                <button
                  key={training.id}
                  type="button"
                  onClick={() => setOsModal({ kind: "training", trainingId: training.id })}
                  className={`flex items-center gap-3 border-[3px] p-3 text-left transition ${
                    selectedTraining?.id === training.id ||
                    (osModal?.kind === "quick-train" && training.id === quickTraining.id)
                      ? "border-[#d8ff3e] bg-[#d8ff3e]/10"
                      : "border-white/15 bg-black/30"
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 place-items-center bg-gradient-to-br ${training.color} text-black`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase">{training.name}</p>
                    <p className="text-[11px] font-bold text-white/45">
                      {training.time} · {training.minutes} min · {training.intensity}
                    </p>
                  </div>
                  {done && <Check className="h-5 w-5 text-[#d8ff3e]" />}
                </button>
              );
            })}
          </div>
        </div>
      </GameModal>
    </>
  );
}
