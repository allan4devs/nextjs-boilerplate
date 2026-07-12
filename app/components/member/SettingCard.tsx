"use client";

/**
 * Ajuste plegable del Perfil: cerrado muestra el valor guardado,
 * abierto muestra el editor. Al guardar, el tab lo cierra solo
 * para que el socio siempre vea el estado, no el formulario.
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type SettingCardProps = {
  icon: LucideIcon;
  title: string;
  /** Lo que quedo guardado; se ve siempre, aunque el panel este cerrado. */
  value: string;
  open: boolean;
  onToggle: () => void;
  tone?: "lime" | "yellow";
  children: ReactNode;
};

export default function SettingCard({
  icon: Icon,
  title,
  value,
  open,
  onToggle,
  tone = "lime",
  children,
}: SettingCardProps) {
  const accent = tone === "yellow" ? "text-yellow-300" : "text-[#d8ff3e]";

  return (
    <section
      className={`border-[3px] bg-[#0c0c0c] shadow-[4px_4px_0_rgba(0,0,0,.45)] transition-colors ${
        open ? "border-[#d8ff3e]/50" : "border-white/15"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.03] sm:p-5"
      >
        <Icon className={`h-5 w-5 shrink-0 ${accent}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black uppercase tracking-[0.06em] text-white sm:text-base">
            {title}
          </span>
          <span className="mt-1 block truncate text-xs font-bold text-white/50">{value}</span>
        </span>
        <span
          className={`shrink-0 border-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
            open
              ? "border-white/25 text-white/60"
              : "border-[#d8ff3e]/40 bg-[#d8ff3e]/10 text-[#eaff93]"
          }`}
        >
          {open ? "Cerrar" : "Editar"}
        </span>
      </button>
      {open && <div className="border-t-[3px] border-white/10 p-4 sm:p-5">{children}</div>}
    </section>
  );
}
