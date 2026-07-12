"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
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
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const border = {
    default: "border-white/30",
    lime: "border-[#d8ff3e]",
    cyan: "border-cyan-300",
    orange: "border-orange-300",
  }[tone];
  const headerBg = {
    default: "bg-[#d8ff3e]",
    lime: "bg-[#d8ff3e]",
    cyan: "bg-cyan-300",
    orange: "bg-orange-300",
  }[tone];
  const width = {
    sm: "max-w-[380px]",
    md: "max-w-[480px]",
    lg: "max-w-[640px]",
    full: "max-w-[920px]",
  }[size];

  return (
    <div
      className="xg-game-modal fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`xg-game-modal-panel relative flex max-h-[92dvh] w-full flex-col border-[3px] ${border} ${game.panelRaised} shadow-[6px_6px_0_rgba(0,0,0,0.65),0_0_60px_rgba(216,255,62,0.14)] outline-none sm:max-h-[88vh] ${width}`}
      >
        <div className={`flex shrink-0 items-center gap-3 border-b-[3px] border-black/25 ${headerBg} px-3 py-3 text-black sm:px-4`}>
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black/30 bg-black/15">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-base font-black uppercase leading-tight sm:text-lg">{title}</h2>
            {subtitle && <p className="truncate text-[11px] font-bold uppercase tracking-wide text-black/65">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="grid h-11 w-11 shrink-0 place-items-center border-2 border-black/30 bg-black/10 transition hover:bg-black/20 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">{children}</div>
        {footer && <div className="shrink-0 border-t-[3px] border-white/15 bg-black/40 p-3 sm:p-4">{footer}</div>}
      </div>
    </div>
  );
}
