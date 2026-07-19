"use client";

/**
 * Hub de paneles táctiles del Member OS.
 * Grid de 2 columnas con cuadros grandes; al tocar uno se abre el detalle.
 * Pensado para móvil: menos scroll estático, más acceso por iconos.
 */

import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { trackAction } from "@/app/lib/analytics/session-client";

export type HubTileTone = "lime" | "cyan" | "orange" | "yellow" | "white" | "red";

export type HubPanel = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  tone?: HubTileTone;
  /** Chip pequeño en la esquina (ej. "On", "3", "Hoy"). */
  badge?: string;
  /** Ancla del onboarding tour (`data-tour`). */
  tourId?: string;
  content: ReactNode;
};

export type PanelHubProps = {
  panels: HubPanel[];
  /** Panel abierto por defecto; null = solo el grid. */
  defaultPanelId?: string | null;
  title?: string;
  subtitle?: string;
  /** Hero / resumen siempre visible arriba del grid. */
  header?: ReactNode;
  /** Pie fijo (ej. cerrar sesión). */
  footer?: ReactNode;
  className?: string;
  /**
   * controlled: si se pasa, el padre maneja la selección.
   * Útil cuando un tab necesita sincronizar sub-paneles.
   */
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
};

const TONE = {
  lime: {
    idle: "border-[#d8ff3e]/35 bg-[#d8ff3e]/[0.07] hover:border-[#d8ff3e]/70 hover:bg-[#d8ff3e]/12",
    icon: "bg-[#d8ff3e] text-black",
    label: "text-[#eaff93]",
    active: "border-[#d8ff3e] bg-[#d8ff3e] text-black",
  },
  cyan: {
    idle: "border-cyan-300/35 bg-cyan-300/[0.07] hover:border-cyan-300/70 hover:bg-cyan-300/12",
    icon: "bg-cyan-300 text-black",
    label: "text-cyan-200",
    active: "border-cyan-300 bg-cyan-300 text-black",
  },
  orange: {
    idle: "border-orange-300/35 bg-orange-300/[0.07] hover:border-orange-300/70 hover:bg-orange-300/12",
    icon: "bg-orange-300 text-black",
    label: "text-orange-200",
    active: "border-orange-300 bg-orange-300 text-black",
  },
  yellow: {
    idle: "border-yellow-300/35 bg-yellow-300/[0.07] hover:border-yellow-300/70 hover:bg-yellow-300/12",
    icon: "bg-yellow-300 text-black",
    label: "text-yellow-100",
    active: "border-yellow-300 bg-yellow-300 text-black",
  },
  white: {
    idle: "border-white/20 bg-white/[0.04] hover:border-white/40 hover:bg-white/[0.07]",
    icon: "bg-white/15 text-white",
    label: "text-white/70",
    active: "border-white bg-white text-black",
  },
  red: {
    idle: "border-red-400/35 bg-red-500/[0.08] hover:border-red-400/60 hover:bg-red-500/15",
    icon: "bg-red-400 text-black",
    label: "text-red-200",
    active: "border-red-400 bg-red-400 text-black",
  },
} as const;

export default function PanelHub({
  panels,
  defaultPanelId = null,
  title,
  subtitle,
  header,
  footer,
  className = "",
  activeId,
  onActiveChange,
}: PanelHubProps) {
  const [internalId, setInternalId] = useState<string | null>(defaultPanelId);
  const selectedId = activeId !== undefined ? activeId : internalId;

  useEffect(() => {
    if (activeId !== undefined) return;
    setInternalId(defaultPanelId);
  }, [activeId, defaultPanelId]);

  const setSelected = (id: string | null) => {
    if (activeId === undefined) setInternalId(id);
    onActiveChange?.(id);
    const panel = id ? panels.find((entry) => entry.id === id) : null;
    trackAction(id ? "member_hub_opened" : "member_hub_closed", {
      label: panel?.label ?? title ?? "Hub",
      meta: id ? { panel: id } : undefined,
    });
  };

  const active = panels.find((p) => p.id === selectedId) ?? null;

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {header}

      {(title || subtitle) && (
        <div className="px-0.5">
          {title && (
            <h2 className="text-lg font-black uppercase leading-tight sm:text-xl">{title}</h2>
          )}
          {subtitle && (
            <p className="mt-1 text-xs font-bold text-white/40 sm:text-sm">{subtitle}</p>
          )}
        </div>
      )}

      {/* Navegación: grid 2-col cuando no hay panel; tira horizontal compacta cuando sí. */}
      {active ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="grid h-[72px] w-[72px] shrink-0 place-items-center border-[3px] border-white/20 bg-black/40 text-white transition hover:border-[#d8ff3e] hover:text-[#d8ff3e]"
            aria-label="Volver al menú"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          {panels.map((panel) => {
            const Icon = panel.icon;
            const tone = TONE[panel.tone ?? "lime"];
            const isOn = panel.id === active.id;
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => setSelected(panel.id)}
                data-analytics={`Panel: ${panel.label}`}
                data-tour={panel.tourId}
                aria-pressed={isOn}
                className={`min-w-[108px] shrink-0 border-[3px] p-2.5 text-left transition ${
                  isOn ? tone.active : `${tone.idle} text-white`
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1.5 block truncate text-[10px] font-black uppercase leading-tight">
                  {panel.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {panels.map((panel) => {
            const Icon = panel.icon;
            const tone = TONE[panel.tone ?? "lime"];
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => setSelected(panel.id)}
                data-analytics={`Panel: ${panel.label}`}
                data-tour={panel.tourId}
                className={`group relative flex min-h-[108px] flex-col items-start justify-between border-[3px] p-3 text-left shadow-[4px_4px_0_rgba(0,0,0,.5)] transition active:translate-x-px active:translate-y-px active:shadow-none sm:min-h-[132px] sm:p-4 ${tone.idle}`}
              >
                {panel.badge && (
                  <span className="absolute right-2 top-2 border border-white/20 bg-black/50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/70">
                    {panel.badge}
                  </span>
                )}
                <span
                  className={`grid h-12 w-12 place-items-center border-2 border-black/30 shadow-[2px_2px_0_rgba(0,0,0,.4)] sm:h-14 sm:w-14 ${tone.icon}`}
                >
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                <span className="mt-3 w-full">
                  <span className="flex items-center justify-between gap-1">
                    <span className="text-sm font-black uppercase leading-tight sm:text-base">
                      {panel.label}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 opacity-50 transition group-hover:opacity-100 ${tone.label}`}
                    />
                  </span>
                  {panel.hint && (
                    <span className="mt-1 block truncate text-[11px] font-bold text-white/40">
                      {panel.hint}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <section className="xg-tab-in border-[3px] border-white/15 bg-[#0c0c0c] shadow-[4px_4px_0_rgba(0,0,0,.45)]">
          <header className="flex items-center gap-3 border-b-[3px] border-white/10 bg-white/[0.03] px-3 py-3 sm:px-4">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="grid h-10 w-10 shrink-0 place-items-center border-2 border-white/20 text-white transition hover:border-[#d8ff3e] hover:text-[#d8ff3e]"
              aria-label="Cerrar panel"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black uppercase sm:text-base">{active.label}</p>
              {active.hint && (
                <p className="truncate text-[11px] font-bold text-white/40">{active.hint}</p>
              )}
            </div>
            {(() => {
              const Icon = active.icon;
              const tone = TONE[active.tone ?? "lime"];
              return (
                <span className={`grid h-10 w-10 shrink-0 place-items-center ${tone.icon}`}>
                  <Icon className="h-5 w-5" />
                </span>
              );
            })()}
          </header>
          <div className="p-3 sm:p-4">{active.content}</div>
        </section>
      )}

      {footer}
    </div>
  );
}
