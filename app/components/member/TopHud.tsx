"use client";

/** HUD superior fijo: acciones rapidas del OS (todas abren su modal). */

import { Flame, Menu, Star, Target, Zap } from "lucide-react";
import { GameButton, GameHudPill } from "../GameOS";
import type { MemberOs } from "./useMemberOs";

export default function TopHud({ os }: { os: MemberOs }) {
  const { setNavOpen, unlocked, trainedToday, effectiveStreak, level, weekDoneCount, weeklyGoal, setOsModal } = os;

  return (
    <header className="xg-safe-top sticky top-0 z-30 border-b-[3px] border-white/15 bg-[#050505]/95 backdrop-blur-md lg:pl-[84px]">
      <div className="flex h-12 items-center gap-2 px-2 sm:h-14 sm:gap-3 sm:px-3">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="grid h-11 w-11 shrink-0 place-items-center border-[3px] border-white/20 bg-black/40 text-white lg:hidden"
          aria-label="Abrir navegación"
        >
          <Menu className="h-5 w-5" />
        </button>
        {unlocked && (
          <div className="ml-auto flex min-w-0 items-center gap-1.5 overflow-x-auto sm:gap-2">
            {!trainedToday && (
              <GameButton
                variant="orange"
                className="min-h-9 shrink-0 !px-3 text-xs"
                onClick={() => setOsModal({ kind: "quick-train" })}
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Entreno</span>
              </GameButton>
            )}
            <GameHudPill
              icon={Flame}
              label="Racha"
              value={effectiveStreak}
              tone="orange"
              onClick={() => setOsModal({ kind: "streak" })}
            />
            <GameHudPill
              icon={Star}
              label="Nv"
              value={level}
              tone="cyan"
              onClick={() => setOsModal({ kind: "streak" })}
            />
            <GameHudPill
              icon={Target}
              label="Sem"
              value={`${weekDoneCount}/${weeklyGoal}`}
              tone="lime"
              onClick={() => setOsModal({ kind: "week" })}
            />
          </div>
        )}
      </div>
    </header>
  );
}
