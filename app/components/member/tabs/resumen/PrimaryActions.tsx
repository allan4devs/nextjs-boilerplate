"use client";

import { memo } from "react";
import Link from "next/link";
import { Check, ChevronRight, CreditCard, Flame, Loader2 } from "lucide-react";
import { GameLabel } from "../../../GameOS";
import type {
  ResumenActions,
  ResumenViewModel,
} from "../../view-models/useResumenViewModel";

type PrimaryActionsProps = {
  streak: ResumenViewModel["streak"];
  todayTraining: ResumenViewModel["todayTraining"];
  renewal: ResumenViewModel["renewal"];
  onOpenStreak: ResumenActions["openStreak"];
  onMarkTraining: ResumenActions["markTodayTraining"];
  onRenew: ResumenActions["renewMembership"];
};

function PrimaryActionsComponent({
  streak,
  todayTraining,
  renewal,
  onOpenStreak,
  onMarkTraining,
  onRenew,
}: PrimaryActionsProps) {
  return (
    <>
      {streak && (
        <button
          type="button"
          onClick={onOpenStreak}
          className="relative flex w-full items-center gap-4 overflow-hidden border-[3px] border-orange-400/60 bg-gradient-to-r from-orange-400/[0.18] to-transparent p-4 text-left shadow-[4px_4px_0_rgba(251,146,60,0.25)] lg:hidden"
        >
          <span className="grid h-16 w-16 shrink-0 place-items-center border-[3px] border-orange-300 bg-orange-400/15 text-orange-200">
            <Flame className="xg-flame h-8 w-8" />
          </span>
          <span className="min-w-0 flex-1">
            <GameLabel tone="orange">Tu racha</GameLabel>
            <span className="mt-1 block text-4xl font-black leading-none text-white">
              {streak.value}{" "}
              <span className="text-sm uppercase tracking-[.12em] text-orange-200">días</span>
            </span>
            <span className="mt-2 block truncate text-xs font-bold text-[#eaff93]">
              {streak.phrase}
            </span>
          </span>
          <ChevronRight className="h-6 w-6 shrink-0 text-orange-200" />
        </button>
      )}

      <div
        id="entrenar-hoy"
        className={`xg-corners flex flex-col gap-4 border-[3px] border-[#d8ff3e] bg-gradient-to-r from-[#d8ff3e]/15 via-[#d8ff3e]/[0.06] to-transparent p-4 shadow-[4px_4px_0_rgba(216,255,62,0.25)] sm:flex-row sm:items-center sm:justify-between ${
          todayTraining.completed ? "" : "xg-glow-breathe"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#d8ff3e] text-black">
            <Flame className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#d8ff3e]">
              Entrenamiento de hoy
            </p>
            <p className="mt-0.5 hidden text-sm font-semibold text-white/45 sm:block">
              Un toque para mantener tu progreso al día.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onMarkTraining}
          disabled={todayTraining.disabled}
          className={`inline-flex min-h-14 w-full shrink-0 items-center justify-center gap-2 px-5 text-sm font-black uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] sm:min-h-12 sm:w-auto ${todayTraining.completed ? "border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 text-[#eaff93]" : "bg-[#d8ff3e] text-black hover:bg-white active:scale-[.98]"} disabled:cursor-not-allowed`}
        >
          {todayTraining.saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : todayTraining.completed ? (
            <Check className="h-5 w-5" />
          ) : (
            <Flame className="h-5 w-5" />
          )}
          {todayTraining.completed ? "Entreno marcado" : "Marcar entreno"}
        </button>
      </div>

      {renewal && (
        <div className="flex flex-col gap-3 border-l-4 border-l-orange-300 bg-orange-300/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-orange-50">
            <span className="font-black uppercase tracking-[0.14em] text-orange-200">
              {renewal.expired ? "Plan vencido · " : "Renovación próxima · "}
            </span>
            {renewal.message}
          </p>
          <a
            href="/precios#inscripcion"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 bg-[#d8ff3e] px-4 py-2 text-sm font-black uppercase text-black transition hover:bg-white"
            onClick={onRenew}
          >
            <CreditCard className="h-4 w-4" />
            Renovar plan
          </a>
        </div>
      )}
      {!renewal && (
        <Link
          href="/precios#inscripcion"
          className="flex min-h-12 items-center justify-center gap-2 border-[3px] border-[#d8ff3e]/55 bg-[#d8ff3e]/10 px-4 text-sm font-black uppercase text-[#eaff93] transition hover:bg-[#d8ff3e] hover:text-black"
        >
          <CreditCard className="h-4 w-4" />
          Ver planes
        </Link>
      )}
    </>
  );
}

export const PrimaryActions = memo(PrimaryActionsComponent);
