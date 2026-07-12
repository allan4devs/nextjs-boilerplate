"use client";

import { memo } from "react";
import {
  CalendarCheck,
  CalendarClock,
  Flame,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { GameButton, GamePanel, GameStat } from "../../../GameOS";
import type {
  ResumenActions,
  ResumenViewModel,
} from "../../view-models/useResumenViewModel";

type DashboardOverviewProps = {
  stats: ResumenViewModel["stats"];
  nextClassName: string;
  onOpenStreak: ResumenActions["openStreak"];
  onOpenWeek: ResumenActions["openWeek"];
  onOpenLeague: ResumenActions["openLeague"];
  onOpenTrainingTab: ResumenActions["openTrainingTab"];
  onOpenQuickTraining: ResumenActions["openQuickTraining"];
  onOpenProgress: ResumenActions["openProgress"];
};

const STAT_VISUALS = {
  streak: { icon: Flame, tone: "orange" as const },
  month: { icon: CalendarCheck, tone: "lime" as const },
  week: { icon: Target, tone: "lime" as const },
  league: { icon: Trophy, tone: "yellow" as const },
};

function DashboardOverviewComponent({
  stats,
  nextClassName,
  onOpenStreak,
  onOpenWeek,
  onOpenLeague,
  onOpenTrainingTab,
  onOpenQuickTraining,
  onOpenProgress,
}: DashboardOverviewProps) {
  const handlers = {
    streak: onOpenStreak,
    month: undefined,
    week: onOpenWeek,
    league: onOpenLeague,
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const visual = STAT_VISUALS[stat.id];
          return (
            <GameStat
              key={stat.id}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              icon={visual.icon}
              tone={visual.tone}
              onClick={handlers[stat.id]}
            />
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <GamePanel
          title="Próxima clase"
          icon={CalendarClock}
          tone="cyan"
          compact
          onClick={onOpenTrainingTab}
        >
          <p className="truncate text-lg font-black uppercase sm:text-xl">{nextClassName}</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-300">
            Ver clases →
          </p>
        </GamePanel>
        <GamePanel title="Accesos rápidos" icon={Zap} tone="lime" compact>
          <div className="grid grid-cols-2 gap-3">
            <GameButton
              full
              className="!min-h-14 !text-xs sm:!min-h-11 sm:!text-[10px]"
              onClick={onOpenQuickTraining}
            >
              Entreno
            </GameButton>
            <GameButton
              full
              variant="ghost"
              className="!min-h-14 !text-xs sm:!min-h-11 sm:!text-[10px]"
              onClick={onOpenProgress}
            >
              Progreso
            </GameButton>
          </div>
        </GamePanel>
      </div>
    </>
  );
}

export const DashboardOverview = memo(DashboardOverviewComponent);
