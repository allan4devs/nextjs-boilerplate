"use client";

/**
 * Tab Resumen — base de operaciones del socio:
 * accion principal del dia, stats, racha/XP, siguiente paso,
 * membresia y ocupacion en vivo.
 */

import {
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronRight,
  CreditCard,
  Flame,
  Loader2,
  Snowflake,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { GameButton, GameLabel, GamePanel, GameStat } from "../../GameOS";
import { StreakRing, XpBar, badgeIcon, tierStyle } from "../../gamification";
import { TRAININGS } from "../constants";
import { dayLabel, todayIso } from "../utils";
import type { MemberOs } from "../useMemberOs";

export default function ResumenTab({ os }: { os: MemberOs }) {
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

  return (
    <div className="space-y-4">
      <div id="entrenar-hoy" className="flex flex-col gap-3 border-[3px] border-[#d8ff3e] bg-gradient-to-r from-[#d8ff3e]/15 via-[#d8ff3e]/[0.06] to-transparent p-3.5 shadow-[4px_4px_0_rgba(216,255,62,0.25)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#d8ff3e] text-black"><Flame className="h-5 w-5" /></span>
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#d8ff3e]">Acción principal · Entrenamiento de hoy</p><p className="mt-0.5 text-sm font-semibold text-white/45">Un toque para mantener tu progreso al día.</p></div>
        </div>
        <button
          type="button"
          onClick={() => !trainedToday && void completeTraining(quickTraining)}
          disabled={!unlocked || trainedToday || Boolean(savingTrainingId)}
          className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 px-5 text-sm font-black uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] ${trainedToday ? "border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 text-[#eaff93]" : "bg-[#d8ff3e] text-black hover:bg-white active:scale-[.98]"} disabled:cursor-not-allowed`}
        >
          {savingTrainingId ? <Loader2 className="h-5 w-5 animate-spin" /> : trainedToday ? <Check className="h-5 w-5" /> : <Flame className="h-5 w-5" />}
          {trainedToday ? "Entreno marcado" : "Marcar entreno"}
        </button>
      </div>

      {/* Phase 3: one-tap renewal + day-pass credit + next-best action */}
      {unlocked && currentMember.membership.daysRemaining <= 5 && (
        <div className="flex flex-col gap-2 border-l-4 border-l-orange-300 bg-orange-300/[0.08] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-orange-50">
            <span className="font-black uppercase tracking-[0.14em] text-orange-200">
              {currentMember.membership.daysRemaining <= 0 ? "Plan vencido · " : "Renovación próxima · "}
            </span>
            {currentMember.membership.daysRemaining <= 0
              ? "Renová en 1 toque y no pierdas la racha."
              : `Tu plan vence en ${currentMember.membership.daysRemaining} día${currentMember.membership.daysRemaining === 1 ? "" : "s"}.`}
          </p>
          <a
            href={`/precios#inscripcion`}
            className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#d8ff3e] px-4 py-2 text-sm font-black uppercase text-black transition hover:bg-white"
            onClick={() => {
              void fetch("/api/xtreme/events/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "cta_clicked",
                  source: "member_app",
                  memberName,
                  properties: { cta: "one_tap_renewal", daysRemaining: currentMember.membership.daysRemaining },
                }),
              }).catch(() => {});
            }}
          >
            <CreditCard className="h-4 w-4" />
            Renovar ahora
          </a>
        </div>
      )}

      {/* Inventario de constantes — números super marcados */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <GameStat
          label="Racha"
          value={`${effectiveStreak}`}
          hint="días · toca"
          icon={Flame}
          tone="orange"
          onClick={() => setOsModal({ kind: "streak" })}
        />
        <GameStat
          label="Mes"
          value={`${currentMember.workouts.filter((workout) => workout.completedDate.startsWith(todayIso().slice(0, 7))).length}`}
          hint="entrenos"
          icon={CalendarCheck}
          tone="lime"
        />
        <GameStat
          label="Semana"
          value={`${weekDoneCount}/${weeklyGoal}`}
          hint="meta · toca"
          icon={Target}
          tone="lime"
          onClick={() => setOsModal({ kind: "week" })}
        />
        <GameStat
          label="Liga"
          value={`#${Math.max(1, leaderboard.findIndex((entry) => entry.normalizedName === currentMember.normalizedName) + 1 || 1)}`}
          hint="ranking"
          icon={Trophy}
          tone="yellow"
          onClick={() => {
            window.location.href = "/app/comunidad";
          }}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <GamePanel
          title="Próxima clase"
          icon={CalendarClock}
          tone="cyan"
          compact
          onClick={() => setTab("entrenar")}
        >
          <p className="truncate text-lg font-black uppercase sm:text-xl">
            {TRAININGS.find((training) => reservations[training.id]?.isMine)?.name ?? "Sin reserva"}
          </p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-300">
            Ver clases →
          </p>
        </GamePanel>
        <GamePanel title="Accesos rápidos" icon={Zap} tone="lime" compact>
          <div className="grid grid-cols-2 gap-2">
            <GameButton
              full
              className="!min-h-11 !text-[10px]"
              onClick={() => setOsModal({ kind: "quick-train" })}
            >
              Entreno
            </GameButton>
            <GameButton
              full
              variant="ghost"
              className="!min-h-11 !text-[10px]"
              onClick={() => setTab("progreso")}
            >
              Progreso
            </GameButton>
          </div>
        </GamePanel>
      </div>

      {unlocked && nextBestAction && (
        <div
          id={nextBestAction.href.startsWith("#") ? nextBestAction.href.slice(1) : undefined}
          className="border-[3px] border-cyan-300/55 bg-gradient-to-br from-cyan-400/[0.1] to-transparent p-4 shadow-[4px_4px_0_rgba(34,211,238,0.2)] sm:p-5"
        >
          <GameLabel tone="cyan">Tu siguiente paso</GameLabel>
          <h3 className="mt-2 text-lg font-black uppercase text-white sm:text-xl">
            {nextBestAction.title}
          </h3>
          <p className="mt-2 text-sm font-bold text-white/60">{nextBestAction.body}</p>
          <GameButton
            variant="cyan"
            className="mt-4"
            onClick={() => {
              void fetch("/api/xtreme/events/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "recommendation_acted",
                  source: "member_app",
                  memberName,
                  properties: { kind: nextBestAction.kind },
                }),
              }).catch(() => {});
              if (nextBestAction.href.startsWith("#")) {
                if (
                  nextBestAction.kind === "train_today" ||
                  nextBestAction.kind === "protect_streak" ||
                  nextBestAction.kind === "second_visit"
                ) {
                  if (!trainedToday) void completeTraining(quickTraining);
                } else if (nextBestAction.kind === "renew_plan") {
                  window.location.href = "/precios#inscripcion";
                } else if (nextBestAction.href === "/app/comunidad") {
                  window.location.href = nextBestAction.href;
                } else {
                  setTab(nextBestAction.href === "#plan" ? "progreso" : "entrenar");
                }
              } else {
                window.location.href = nextBestAction.href;
              }
            }}
          >
            {nextBestAction.cta}
          </GameButton>
        </div>
      )}

      {gami ? (
        <>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[.95fr_1.05fr]">
            <button
              type="button"
              onClick={() => setOsModal({ kind: "streak" })}
              className="relative w-full overflow-hidden border-[3px] border-orange-400/50 bg-gradient-to-br from-orange-400/[0.1] to-transparent p-4 text-left shadow-[4px_4px_0_rgba(251,146,60,0.25)] sm:p-5"
            >
              <GameLabel tone="orange" className="mb-2 text-center">
                Racha · toca para ampliar
              </GameLabel>
              <StreakRing
                streak={gami.streak}
                freezes={gami.freezesAvailable}
                weekCount={gami.weekCount}
                weeklyGoal={gami.weeklyGoal}
              />
              <p className="mt-3 text-center text-sm font-bold italic text-[#eaff93]">
                “{dayPhrase}”
              </p>
              {gami.freezesAvailable > 0 && (
                <p className="mt-3 text-center text-xs font-bold text-cyan-200/70">
                  <Snowflake className="mr-1 inline h-3.5 w-3.5" />
                  {gami.freezesAvailable === 1
                    ? "1 protector de racha disponible."
                    : `${gami.freezesAvailable} protectores de racha.`}
                </p>
              )}
            </button>

            <div className="grid gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setOsModal({ kind: "streak" })}
                className="border-[3px] border-cyan-300/40 bg-[#0c0c0c] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5"
              >
                <XpBar xp={gami.xp} level={gami.level} />
                <p className="mt-3 text-xs font-bold text-white/45">
                  {milestoneLeft === 0
                    ? "Llegaste al nivel máximo. Seguí entrenando para mantener tu racha."
                    : `${milestoneLeft.toLocaleString()} XP para el nivel ${level + 1}.`}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOsModal({ kind: "week" })}
                className="border-[3px] border-[#d8ff3e]/40 bg-[#0c0c0c] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <GameLabel tone="lime">
                    Esta semana — {weekDoneCount}/{weeklyGoal}
                  </GameLabel>
                  {gami.weeksStreak > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-orange-200">
                      <Flame className="h-3.5 w-3.5" />
                      {gami.weeksStreak}w
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1">
                  {weekDates.map((date) => {
                    const done = workoutDates.has(date);
                    const isToday = date === todayIso();
                    return (
                      <div
                        key={date}
                        className={`grid aspect-square place-items-center border-[3px] text-[10px] font-black sm:text-xs ${
                          done
                            ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                            : isToday
                              ? "border-[#d8ff3e]/60 bg-black/40 text-[#eaff93]"
                              : "border-white/15 bg-black/25 text-white/35"
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : dayLabel(date)}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">
                  Toca para ajustar meta →
                </p>
              </button>
            </div>
          </div>

          {nextBadge && (
            <button
              type="button"
              onClick={() => setOsModal({ kind: "badges" })}
              className="group flex w-full items-center gap-3 border-[3px] border-yellow-300/40 bg-yellow-300/[0.06] p-3 text-left shadow-[4px_4px_0_rgba(253,224,71,0.15)] transition sm:gap-4 sm:p-4"
            >
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center border-2 border-black/20 ${tierStyle(nextBadge.tier).icon}`}
              >
                {(() => {
                  const Icon = badgeIcon(nextBadge.icon);
                  return <Icon className="h-6 w-6" />;
                })()}
              </span>
              <div className="min-w-0 flex-1">
                <GameLabel tone="yellow">Próximo logro · toca</GameLabel>
                <p className="truncate text-sm font-black uppercase text-white">
                  {nextBadge.name}
                </p>
                {nextBadge.progress && (
                  <div className="mt-2 h-2 border-[2px] border-white/15 bg-black/40">
                    <div
                      className="h-full bg-yellow-300/80 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (nextBadge.progress.current /
                              Math.max(1, nextBadge.progress.target)) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              {nextBadge.progress && (
                <span className="shrink-0 border-[3px] border-yellow-300/40 bg-black/40 px-2 py-1 text-sm font-black text-yellow-100">
                  {nextBadge.progress.current}/{nextBadge.progress.target}
                </span>
              )}
              <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-yellow-300" />
            </button>
          )}
        </>
      ) : null}

      {/* Membresia + ocupacion en vivo — paneles tocables → modal */}
      <div className={`grid gap-3 sm:gap-4 ${currentMember.membership.daysRemaining > 5 ? "lg:grid-cols-[1fr_.85fr]" : ""}`}>
        {currentMember.membership.daysRemaining > 5 && (
          <button
            type="button"
            onClick={() => setOsModal({ kind: "membership" })}
            className={`w-full border-[3px] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] transition active:translate-x-px active:translate-y-px ${membershipTone}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-75">
                  Membresia · toca
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase">
                  {currentMember.membership.plan}
                </h2>
                <p className="mt-2 text-sm font-bold opacity-75">
                  Proximo cobro: {currentMember.membership.nextBillingDate}
                </p>
              </div>
              <CreditCard className="h-8 w-8" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="border-[3px] border-white/15 bg-black/25 p-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-60">Estado</p>
                <p className="mt-1 truncate text-sm font-black uppercase">
                  {currentMember.membership.status}
                </p>
              </div>
              <div className="border-[3px] border-white/15 bg-black/25 p-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-60">Dias</p>
                <p className="mt-1 text-sm font-black">
                  {Math.max(0, currentMember.membership.daysRemaining)}
                </p>
              </div>
              <div className="border-[3px] border-white/15 bg-black/25 p-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-60">Plan</p>
                <p className="mt-1 truncate text-sm font-black">Local</p>
              </div>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={() => setOsModal({ kind: "occupancy" })}
          className="w-full border-[3px] border-cyan-300/50 bg-[#0c0c0c] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] transition active:translate-x-px active:translate-y-px"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Ocupacion ahora · toca
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
                {gymStatus?.level ?? "Cargando"}
              </h2>
            </div>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300/60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-300" />
            </span>
          </div>
          <div className="mt-4 h-3 border-[3px] border-white/15 bg-black/45">
            <div
              className="h-full bg-cyan-300 transition-all"
              style={{ width: `${gymStatus?.occupancyPct ?? 0}%` }}
            />
          </div>
          <p className="mt-3 text-sm font-bold text-white/55">
            {gymStatus
              ? `${gymStatus.currentPeople}/${gymStatus.capacity} personas · reservas hoy: ${gymStatus.reservationsToday}`
              : "Leyendo el gym en vivo."}
          </p>
        </button>
      </div>
    </div>
  );
}
