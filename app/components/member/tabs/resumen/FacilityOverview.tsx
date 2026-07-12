"use client";

import { memo } from "react";
import { CreditCard } from "lucide-react";
import type {
  ResumenActions,
  ResumenViewModel,
} from "../../view-models/useResumenViewModel";

type FacilityOverviewProps = {
  membership: ResumenViewModel["membership"];
  occupancy: ResumenViewModel["occupancy"];
  onOpenMembership: ResumenActions["openMembership"];
  onOpenOccupancy: ResumenActions["openOccupancy"];
};

function FacilityOverviewComponent({
  membership,
  occupancy,
  onOpenMembership,
  onOpenOccupancy,
}: FacilityOverviewProps) {
  return (
    <div className={`grid gap-3 sm:gap-4 ${membership ? "lg:grid-cols-[1fr_.85fr]" : ""}`}>
      {membership && (
        <button
          type="button"
          onClick={onOpenMembership}
          className={`xg-lift w-full border-[3px] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] transition active:translate-x-px active:translate-y-px ${membership.tone}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-75">
                Membresía · toca
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase">{membership.plan}</h2>
              <p className="mt-2 text-sm font-bold opacity-75">
                Próximo cobro: {membership.nextBillingDate}
              </p>
            </div>
            <CreditCard className="h-8 w-8" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="border-[3px] border-white/15 bg-black/25 p-2">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-60">
                Estado
              </p>
              <p className="mt-1 truncate text-sm font-black uppercase">{membership.status}</p>
            </div>
            <div className="border-[3px] border-white/15 bg-black/25 p-2">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-60">
                Días
              </p>
              <p className="mt-1 text-sm font-black">{membership.daysRemaining}</p>
            </div>
            <div className="border-[3px] border-white/15 bg-black/25 p-2">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-60">
                Plan
              </p>
              <p className="mt-1 truncate text-sm font-black">Local</p>
            </div>
          </div>
        </button>
      )}

      <button
        type="button"
        onClick={onOpenOccupancy}
        className="xg-lift w-full border-[3px] border-cyan-300/50 bg-[#0c0c0c] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] transition active:translate-x-px active:translate-y-px"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Ocupación ahora · toca
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
              {occupancy.level}
            </h2>
          </div>
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300/60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-300" />
          </span>
        </div>
        <div className="mt-4 h-3 border-[3px] border-white/15 bg-black/45">
          <div
            className="xg-stripes h-full bg-cyan-300 transition-all"
            style={{ width: `${occupancy.percentage}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-bold text-white/55">{occupancy.detail}</p>
      </button>
    </div>
  );
}

export const FacilityOverview = memo(FacilityOverviewComponent);
