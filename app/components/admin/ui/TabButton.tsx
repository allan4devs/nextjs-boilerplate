"use client";

import type { ReactNode } from "react";

export type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

/**
 * Botón de la barra de tabs del Admin OS.
 *
 * Sin `memo`: el consumidor le pasa un `onClick` en línea (`() => setTab(id)`),
 * y son siete botones de texto plano. Memoizar acá sería costo sin beneficio.
 */
export function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 border-[3px] px-3 py-2 text-xs font-black uppercase tracking-wide transition sm:px-4 ${
        active
          ? "border-[#d8ff3e] bg-[#d8ff3e] text-black shadow-[3px_3px_0_rgba(216,255,62,0.35)]"
          : "border-white/20 bg-black/30 text-white/70 hover:border-[#d8ff3e]/50 hover:text-[#eaff93]"
      }`}
    >
      {children}
    </button>
  );
}
