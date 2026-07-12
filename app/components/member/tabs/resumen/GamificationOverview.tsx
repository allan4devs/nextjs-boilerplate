"use client";

import { memo } from "react";
import { Check, ChevronRight, Flame, Snowflake } from "lucide-react";
import { GameLabel } from "../../../GameOS";
import { StreakRing, XpBar, badgeIcon, tierStyle } from "../../../gamification";
import { todayIso } from "../../utils";
import type {
  ResumenActions,
  ResumenViewModel,
} from "../../view-models/useResumenViewModel";

type GamificationOverviewProps = {
  streak: ResumenViewModel["streak"];
  gamification: ResumenViewModel["gamification"];
  nextBadge: ResumenViewModel["nextBadge"];
  onOpenStreak: ResumenActions["openStreak"];
  onOpenLevel: ResumenActions["openLevel"];
  onOpenWeek: ResumenActions["openWeek"];
  onOpenBadges: ResumenActions["openBadges"];
};

function GamificationOverviewComponent({
  streak,
  gamification,
  nextBadge,
  onOpenStreak,
  onOpenLevel,
  onOpenWeek,
  onOpenBadges,
}: GamificationOverviewProps) {
  if (!streak || !gamification) return null;

  const today = todayIso();

  return (
    <>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[.95fr_1.05fr]">
        <button
          type="button"
          onClick={onOpenStreak}
          className="relative hidden w-full overflow-hidden border-[3px] border-orange-400/50 bg-gradient-to-br from-orange-400/[0.1] to-transparent p-4 text-left shadow-[4px_4px_0_rgba(251,146,60,0.25)] sm:p-5 lg:block"
        >
          <GameLabel tone="orange" className="mb-2 text-center">
            Racha · toca para ampliar
          </GameLabel>
          <StreakRing
            streak={streak.value}
            freezes={streak.freezes}
            weekCount={streak.weekCount}
            weeklyGoal={streak.weeklyGoal}
          />
          <p className="mt-3 text-center text-sm font-bold italic text-[#eaff93]">
            “{streak.phrase}”
          </p>
          {gamification.freezesText && (
            <p className="mt-3 text-center text-xs font-bold text-cyan-200/70">
              <Snowflake className="mr-1 inline h-3.5 w-3.5" />
              {gamification.freezesText}
            </p>
          )}
        </button>

        <div className="grid gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onOpenLevel}
            className="border-[3px] border-cyan-300/40 bg-[#0c0c0c] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5"
          >
            <XpBar xp={gamification.xp} level={gamification.level} />
            <p className="mt-3 text-xs font-bold text-white/45">
              {gamification.milestoneText}
            </p>
          </button>

          <button
            type="button"
            onClick={onOpenWeek}
            className="border-[3px] border-[#d8ff3e]/40 bg-[#0c0c0c] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <GameLabel tone="lime">{gamification.weekLabel}</GameLabel>
              {gamification.weeksStreak > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-black text-orange-200">
                  <Flame className="h-3.5 w-3.5" />
                  {gamification.weeksStreak}w
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {gamification.days.map((day) => {
                // Un día pasado sin entreno se ve "perdido"; el futuro queda en espera.
                const missed = !day.done && day.date < today;
                return (
                  <div
                    key={day.date}
                    className={`grid aspect-square place-items-center border-[3px] text-[10px] font-black sm:text-xs ${
                      day.done
                        ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                        : day.isToday
                          ? "animate-pulse border-[#d8ff3e] bg-[#d8ff3e]/15 text-[#eaff93]"
                          : missed
                            ? "border-dashed border-white/10 bg-transparent text-white/25"
                            : "border-white/15 bg-black/25 text-white/35"
                    }`}
                  >
                    {day.done ? <Check className="h-3.5 w-3.5" /> : day.label}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">
              Toca para ver la semana →
            </p>
          </button>
        </div>
      </div>

      {nextBadge && (
        <button
          type="button"
          onClick={onOpenBadges}
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
            <p className="truncate text-sm font-black uppercase text-white">{nextBadge.name}</p>
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
  );
}

export const GamificationOverview = memo(GamificationOverviewComponent);
