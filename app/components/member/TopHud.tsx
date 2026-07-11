"use client";

/** HUD superior fijo: tab activo + pills de racha, nivel y meta semanal. */

import { Flame, Menu, Star, Target } from "lucide-react";
import { GameHudPill } from "../GameOS";
import { TABS } from "./constants";
import type { MemberOs } from "./useMemberOs";

export default function TopHud({ os }: { os: MemberOs }) {
  const { tab, setNavOpen, unlocked, effectiveStreak, level, weekDoneCount, weeklyGoal, setOsModal } = os;

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
        <span className="hidden h-2.5 w-2.5 shrink-0 bg-[#d8ff3e] shadow-[0_0_16px_rgba(216,255,62,.75)] sm:block" />
        <div className="min-w-0 shrink">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#d8ff3e]">
            Xtreme · Member OS
          </p>
          <p className="truncate text-xs font-black uppercase text-white/80 sm:text-sm">
            {TABS.find((item) => item.id === tab)?.label}
          </p>
        </div>

        {unlocked && (
          <div className="ml-auto flex max-w-[58%] items-center gap-1.5 overflow-x-auto sm:max-w-none sm:gap-2">
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
