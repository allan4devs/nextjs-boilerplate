"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";
import { game } from "./tokens";

export type GameModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: "default" | "lime" | "cyan" | "orange";
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
};

export function GameModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  tone = "default",
  children,
  footer,
  size = "md",
}: GameModalProps) {
  const titleId   = useId();
  const panelRef  = useRef<HTMLDivElement>(null);

  /* Animación de entrada/salida */
  const [visible, setVisible]     = useState(false); // controla la clase CSS
  const [rendered, setRendered]   = useState(false); // si el DOM existe
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Abrir */
  useEffect(() => {
    if (open) {
      setRendered(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      closeTimerRef.current = setTimeout(() => setRendered(false), 260);
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [open]);

  /* Scroll lock + Escape */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!rendered) return null;

  const border = {
    default: "border-white/30",
    lime:    "border-[#d8ff3e]",
    cyan:    "border-cyan-300",
    orange:  "border-orange-300",
  }[tone];

  const headerBg = {
    default: "bg-[#d8ff3e]",
    lime:    "bg-[#d8ff3e]",
    cyan:    "bg-cyan-300",
    orange:  "bg-orange-300",
  }[tone];

  const glowColor = {
    default: "rgba(216,255,62,0.10)",
    lime:    "rgba(216,255,62,0.10)",
    cyan:    "rgba(103,232,249,0.10)",
    orange:  "rgba(251,146,60,0.10)",
  }[tone];

  const width = {
    sm:   "max-w-[380px]",
    md:   "max-w-[480px]",
    lg:   "max-w-[640px]",
    full: "max-w-[920px]",
  }[size];

  return (
    <div
      className={`xg-game-modal fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4 transition-all duration-[240ms] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* ── Backdrop: click para cerrar ── */}
      <button
        type="button"
        aria-label="Cerrar modal"
        onClick={onClose}
        className={`absolute inset-0 transition-all duration-[240ms] ${
          visible
            ? "bg-black/75 backdrop-blur-[3px]"
            : "bg-black/0 backdrop-blur-none"
        }`}
      />

      {/* ── Hint de cierre en el backdrop (desktop) ── */}
      <div
        className={`pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      >
        <span className="absolute bottom-6 right-6 rounded border border-white/15 bg-black/50 px-2 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white/30 backdrop-blur-sm">
          ESC o click fuera para cerrar
        </span>
      </div>

      {/* ── Panel principal ── */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`xg-game-modal-panel relative flex max-h-[92dvh] w-full flex-col border-[3px] ${border} ${game.panelRaised} outline-none sm:max-h-[88vh] ${width} transition-all duration-[240ms] ${
          visible
            ? "translate-y-0 opacity-100 shadow-[6px_6px_0_rgba(0,0,0,0.65),0_0_60px_var(--modal-glow)]"
            : "translate-y-4 opacity-0 shadow-none sm:translate-y-0 sm:scale-95"
        }`}
        style={{ "--modal-glow": glowColor } as React.CSSProperties}
      >
        {/* ── Header ── */}
        <div
          className={`flex shrink-0 items-center gap-3 border-b-[3px] border-black/25 ${headerBg} px-3 py-3 text-black sm:px-4`}
        >
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black/30 bg-black/15">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="truncate text-base font-black uppercase leading-tight sm:text-lg"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-black/65">
                {subtitle}
              </p>
            )}
          </div>

          {/* Botón X — área táctil generosa */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="group grid h-11 w-11 shrink-0 place-items-center border-2 border-black/30 bg-black/10 transition hover:bg-black/25 active:scale-90"
          >
            <X className="h-5 w-5 transition group-hover:rotate-90" />
          </button>
        </div>

        {/* ── Contenido scrolleable ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
          {children}
        </div>

        {/* ── Footer ── */}
        {footer && (
          <div className="shrink-0 border-t-[3px] border-white/15 bg-black/40 p-3 sm:p-4">
            {footer}
          </div>
        )}

        {/* ── Franja drag-indicator en mobile ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-0 flex justify-center pb-1 pt-2 sm:hidden"
        >
          <div className="h-1 w-10 rounded-full bg-black/25" />
        </div>
      </div>
    </div>
  );
}
