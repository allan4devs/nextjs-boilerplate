"use client";

import type {
  ResumenActions,
  ResumenViewModel,
} from "../view-models/useResumenViewModel";
import { DashboardOverview } from "./resumen/DashboardOverview";
import { FacilityOverview } from "./resumen/FacilityOverview";
import { GamificationOverview } from "./resumen/GamificationOverview";
import { NextBestActionCard } from "./resumen/NextBestActionCard";
import { PrimaryActions } from "./resumen/PrimaryActions";

export type ResumenTabProps = {
  model: ResumenViewModel;
  actions: ResumenActions;
};

/** Composición visual del resumen; toda la lógica llega precalculada. */
export default function ResumenTab({ model, actions }: ResumenTabProps) {
  return (
    <div className="xg-tab-in space-y-4">
      <PrimaryActions
        streak={model.streak}
        todayTraining={model.todayTraining}
        onOpenStreak={actions.openStreak}
        onMarkTraining={actions.markTodayTraining}
      />
      <DashboardOverview
        stats={model.stats}
        nextClassName={model.nextClassName}
        onOpenStreak={actions.openStreak}
        onOpenWeek={actions.openWeek}
        onOpenLeague={actions.openLeague}
        onOpenTrainingTab={actions.openTrainingTab}
        onOpenQuickTraining={actions.openQuickTraining}
        onOpenProgress={actions.openProgress}
      />
      <NextBestActionCard action={model.nextAction} onRun={actions.runNextAction} />
      <GamificationOverview
        streak={model.streak}
        gamification={model.gamification}
        nextBadge={model.nextBadge}
        onOpenStreak={actions.openStreak}
        onOpenLevel={actions.openLevel}
        onOpenWeek={actions.openWeek}
        onOpenBadges={actions.openBadges}
      />
      <FacilityOverview
        membership={model.membership}
        occupancy={model.occupancy}
        onOpenMembership={actions.openMembership}
        onOpenOccupancy={actions.openOccupancy}
      />
    </div>
  );
}
