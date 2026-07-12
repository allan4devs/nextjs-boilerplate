"use client";

import { memo } from "react";
import { GameButton, GameLabel } from "../../../GameOS";
import type {
  ResumenActions,
  ResumenViewModel,
} from "../../view-models/useResumenViewModel";

type NextBestActionCardProps = {
  action: ResumenViewModel["nextAction"];
  onRun: ResumenActions["runNextAction"];
};

function NextBestActionCardComponent({ action, onRun }: NextBestActionCardProps) {
  if (!action) return null;

  return (
    <div
      id={action.href.startsWith("#") ? action.href.slice(1) : undefined}
      className="border-[3px] border-cyan-300/55 bg-gradient-to-br from-cyan-400/[0.1] to-transparent p-4 shadow-[4px_4px_0_rgba(34,211,238,0.2)] sm:p-5"
    >
      <GameLabel tone="cyan">Tu siguiente paso</GameLabel>
      <h3 className="mt-2 text-lg font-black uppercase text-white sm:text-xl">
        {action.title}
      </h3>
      <p className="mt-2 text-sm font-bold text-white/60">{action.body}</p>
      <GameButton variant="cyan" className="mt-4" onClick={onRun}>
        {action.cta}
      </GameButton>
    </div>
  );
}

export const NextBestActionCard = memo(NextBestActionCardComponent);
