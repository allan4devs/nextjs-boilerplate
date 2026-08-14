"use client";

import {
  Activity,
  Dumbbell,
  Flame,
  Heart,
  Timer,
  Trophy,
  Users,
} from "lucide-react";

export function GymCollage({ occupancyPct, level }: { occupancyPct: number; level: string }) {
  return (
    <div className="relative mx-auto hidden aspect-[4/3] w-full max-w-md sm:block">
      <div className="absolute right-4 top-0 h-64 w-44 -rotate-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b0b0b] via-[#1c1c1c] to-[#2b2b2b] shadow-2xl">
        <div className="flex h-full flex-col justify-between p-4">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#d8ff3e] px-2.5 py-1 text-xs font-black text-black">
            <Timer className="h-3.5 w-3.5" /> 16:45
          </span>
          <Dumbbell className="h-16 w-16 self-center text-[#d8ff3e]/80" />
          <p className="text-xs font-black uppercase tracking-widest text-white/70">
            Sesion en vivo
          </p>
        </div>
      </div>

      <div className="absolute bottom-2 left-0 h-40 w-40 rotate-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#8fbf00] to-[#d8ff3e] p-4 shadow-xl">
        <Users className="h-7 w-7 text-black/70" />
        <p className="mt-6 text-3xl font-black text-black">{occupancyPct}%</p>
        <p className="text-xs font-black uppercase tracking-wide text-black/60">{level}</p>
      </div>

      <div className="absolute bottom-8 right-16 h-28 w-36 -rotate-6 overflow-hidden rounded-2xl border border-black/10 bg-white p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#8fbf00]" />
          <span className="text-xs font-black uppercase">Racha</span>
        </div>
        <div className="mt-3 flex items-end gap-1">
          <Flame className="h-6 w-6 text-orange-500" />
          <span className="text-2xl font-black">7</span>
        </div>
      </div>

      <div className="absolute left-16 top-6 h-24 w-28 rotate-6 overflow-hidden rounded-2xl bg-[#0b0b0b] p-3 shadow-lg">
        <Heart className="h-5 w-5 text-[#d8ff3e]" />
        <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-white/50">Zona</p>
        <p className="text-sm font-black text-white">Fuerza</p>
      </div>

      <div className="absolute bottom-0 right-0 flex h-16 w-16 items-center justify-center rounded-full bg-black text-[#d8ff3e] shadow-lg">
        <Activity className="h-7 w-7" />
      </div>
    </div>
  );
}
