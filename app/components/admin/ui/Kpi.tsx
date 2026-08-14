"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";

export type KpiProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Gradiente Tailwind del cuadro del ícono, ej. "from-lime-300 to-emerald-400". */
  accent: string;
};

/**
 * Cifra grande del panel. Va memoizado porque el Admin OS pinta ~40 de estos y
 * la página entera se re-renderiza con cada tecla de los buscadores: todas sus
 * props son primitivas o referencias estables, así que la comparación superficial
 * corta el re-render de verdad.
 */
export const Kpi = memo(function Kpi({ icon: Icon, label, value, accent }: KpiProps) {
  return (
    <div className="border-[3px] border-white/20 bg-[#0c0c0c] p-3 shadow-[4px_4px_0_rgba(0,0,0,.55)] sm:p-4">
      <div
        className={`mb-2 grid h-10 w-10 place-items-center border-2 border-black/30 bg-gradient-to-br ${accent} text-black`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="truncate text-2xl font-black leading-none text-white sm:text-3xl">
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
    </div>
  );
});
