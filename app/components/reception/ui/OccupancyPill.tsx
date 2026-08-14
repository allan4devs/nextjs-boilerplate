"use client";

import type {
  GymStatus,
} from "@/lib/xtreme/checkin/contracts";

export function OccupancyPill({ status }: { status: GymStatus | null }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 border-[3px] border-cyan-300/50 bg-black/50 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-100 shadow-[3px_3px_0_rgba(0,0,0,.4)]">
      <span className="h-2.5 w-2.5 bg-[#d8ff3e] shadow-[0_0_8px_rgba(216,255,62,.8)]" />
      {status?.currentPeople ?? 0}/{status?.capacity ?? 85} · {status?.occupancyPct ?? 0}%
    </span>
  );
}
