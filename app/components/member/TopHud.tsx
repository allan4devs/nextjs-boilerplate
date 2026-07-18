"use client";

/** HUD superior fijo: stats, perfil (arriba) y acciones rápidas. */

import { Flame, Menu, Star, Target, UserRound, Zap } from "lucide-react";
import { GameButton, GameHudPill } from "../GameOS";
import Avatar from "./Avatar";
import type { MemberOs } from "./useMemberOs";

export default function TopHud({ os }: { os: MemberOs }) {
  const {
    setNavOpen,
    unlocked,
    trainedToday,
    effectiveStreak,
    level,
    weekDoneCount,
    weeklyGoal,
    setOsModal,
    setTab,
    tab,
    memberName,
    currentMember,
  } = os;

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
        <p className="hidden shrink-0 items-baseline gap-1.5 text-sm font-black uppercase tracking-[0.18em] sm:flex">
          <span className="text-white">Xtreme</span>
          <span className="xg-text-glow text-[#d8ff3e]">Member OS</span>
        </p>
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
              onClick={() => setOsModal({ kind: "level" })}
            />
            <GameHudPill
              icon={Target}
              label="Sem"
              value={`${weekDoneCount}/${weeklyGoal}`}
              tone="lime"
              onClick={() => setOsModal({ kind: "week" })}
            />
            {/* Perfil arriba: evita pelear con el dock y con "Sistemas" */}
            <button
              type="button"
              data-tour="tab-perfil"
              onClick={() => {
                setTab("perfil");
                setOsModal(null);
              }}
              aria-label="Abrir perfil"
              aria-pressed={tab === "perfil"}
              title="Perfil"
              className={`ml-0.5 grid h-10 w-10 shrink-0 place-items-center border-[3px] transition sm:h-11 sm:w-11 ${
                tab === "perfil"
                  ? "border-[#d8ff3e] bg-[#d8ff3e] text-black shadow-[0_0_16px_rgba(216,255,62,0.35)]"
                  : "border-white/25 bg-black/50 text-white hover:border-[#d8ff3e]/60"
              }`}
            >
              {memberName ? (
                <Avatar
                  name={memberName}
                  photoUrl={currentMember.photoUrl}
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  textClass="text-[10px]"
                />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </button>
            {/* Espacio para el atajo global "Sistemas" (fixed top-right en layout) */}
            <span className="w-11 shrink-0 sm:w-36" aria-hidden />
          </div>
        )}
        {!unlocked && (
          <div className="ml-auto flex items-center gap-2">
            <span className="w-11 shrink-0 sm:w-36" aria-hidden />
          </div>
        )}
      </div>
      {/* Progreso de la semana siempre a la vista: barra viva bajo el HUD */}
      {unlocked && (
        <div className="h-[3px] w-full bg-black/60">
          <div
            className="xg-stripes h-full bg-gradient-to-r from-[#d8ff3e] to-cyan-300 transition-[width] duration-700 ease-out"
            style={{
              width: `${Math.min(100, Math.round((weekDoneCount / Math.max(1, weeklyGoal)) * 100))}%`,
            }}
          />
        </div>
      )}
    </header>
  );
}
