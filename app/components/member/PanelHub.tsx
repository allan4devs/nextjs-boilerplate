"use client";

/**
 * Hub de paneles táctiles del Member OS.
 * Pantalla principal = solo el grid de cuadros grandes (sin expandir debajo).
 * Al tocar un cuadro se abre un modal / sheet cerrable; el fondo se mantiene.
 */

import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { trackAction } from "@/app/lib/analytics/session-client";
import { GameModal } from "../GameOS";

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
    idle: "border-[#d8ff3e]/40 bg-[#d8ff3e]/[0.08] hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/15",
    icon: "bg-[#d8ff3e] text-black",
    label: "text-[#eaff93]",
  },
  cyan: {
    idle: "border-cyan-300/40 bg-cyan-300/[0.08] hover:border-cyan-300 hover:bg-cyan-300/15",
    icon: "bg-cyan-300 text-black",
    label: "text-cyan-200",
  },
  orange: {
    idle: "border-orange-300/40 bg-orange-300/[0.08] hover:border-orange-300 hover:bg-orange-300/15",
    icon: "bg-orange-300 text-black",
    label: "text-orange-200",
  },
  yellow: {
    idle: "border-yellow-300/40 bg-yellow-300/[0.08] hover:border-yellow-300 hover:bg-yellow-300/15",
    icon: "bg-yellow-300 text-black",
    label: "text-yellow-100",
  },
  white: {
    idle: "border-white/25 bg-white/[0.05] hover:border-white/50 hover:bg-white/[0.09]",
    icon: "bg-white/15 text-white",
    label: "text-white/70",
  },
  red: {
    idle: "border-red-400/40 bg-red-500/[0.09] hover:border-red-400 hover:bg-red-500/15",
    icon: "bg-red-400 text-black",
    label: "text-red-200",
  },
} as const;

const MODAL_TONE: Record<HubTileTone, "default" | "lime" | "cyan" | "orange"> = {
  lime: "lime",
  cyan: "cyan",
  orange: "orange",
  yellow: "orange",
  white: "default",
  red: "orange",
};

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
    <div className={`flex min-h-0 flex-col gap-3 sm:gap-4 ${className}`}>
      {header}

      {(title || subtitle) && (
        <div className="shrink-0 px-0.5">
          {title && (
            <h2 className="text-lg font-black uppercase leading-tight sm:text-xl">{title}</h2>
          )}
          {subtitle && (
            <p className="mt-1 text-xs font-bold text-white/40 sm:text-sm">{subtitle}</p>
          )}
        </div>
      )}

      {/* Solo el grid: la pantalla principal no se alarga con el detalle. */}
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 sm:gap-3 lg:grid-cols-2">
        {panels.map((panel) => {
          const Icon = panel.icon;
          const tone = TONE[panel.tone ?? "lime"];
          const isOn = panel.id === active?.id;
          return (
            <button
              key={panel.id}
              type="button"
              onClick={() => setSelected(panel.id)}
              data-analytics={`Panel: ${panel.label}`}
              data-tour={panel.tourId}
              aria-pressed={isOn}
              className={`group relative flex min-h-[112px] flex-col items-start justify-between border-[3px] p-3.5 text-left shadow-[4px_4px_0_rgba(0,0,0,.5)] transition active:translate-x-px active:translate-y-px active:shadow-none sm:min-h-[140px] sm:p-5 ${tone.idle} ${
                isOn ? "ring-2 ring-[#d8ff3e]/50" : ""
              }`}
            >
              {panel.badge && (
                <span className="absolute right-2 top-2 border border-white/20 bg-black/55 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/75">
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
                    className={`h-4 w-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100 ${tone.label}`}
                  />
                </span>
                {panel.hint && (
                  <span className="mt-1.5 block line-clamp-2 text-[11px] font-bold leading-snug text-white/40">
                    {panel.hint}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {footer}

      <GameModal
        open={Boolean(active)}
        onClose={() => setSelected(null)}
        title={active?.label ?? ""}
        subtitle={active?.hint}
        icon={active?.icon}
        tone={MODAL_TONE[active?.tone ?? "lime"]}
        size="lg"
      >
        {active?.content}
      </GameModal>
    </div>
  );
}
