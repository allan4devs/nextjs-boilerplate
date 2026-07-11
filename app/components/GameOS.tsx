"use client";

/**
 * Xtreme Member OS — UI de juego (estilo inventario / HUD).
 * Bordes gruesos, etiquetas marcadas, modales y dock móvil
 * para que la persona no se pierda.
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

/* ─── tokens visuales ─────────────────────────────────────────── */

export const game = {
  lime: "#d8ff3e",
  limeSoft: "#eaff93",
  panel: "bg-[#0c0c0c]",
  panelRaised: "bg-[#121212]",
  ink: "text-black",
  border: "border-[3px] border-white/25",
  borderHot: "border-[3px] border-[#d8ff3e]",
  borderCyan: "border-[3px] border-cyan-300/70",
  borderOrange: "border-[3px] border-orange-300/70",
  shadow: "shadow-[4px_4px_0_rgba(0,0,0,0.65)]",
  shadowHot: "shadow-[4px_4px_0_rgba(216,255,62,0.35)]",
} as const;

/* ─── etiqueta de sección (Minecraft-style label) ─────────────── */

export function GameLabel({
  children,
  tone = "lime",
  className = "",
}: {
  children: ReactNode;
  tone?: "lime" | "cyan" | "orange" | "white" | "red" | "yellow";
  className?: string;
}) {
  const tones = {
    lime: "text-[#d8ff3e]",
    cyan: "text-cyan-300",
    orange: "text-orange-300",
    white: "text-white/55",
    red: "text-red-300",
    yellow: "text-yellow-300",
  } as const;
  return (
    <p
      className={`text-[10px] font-black uppercase tracking-[0.22em] sm:text-[11px] ${tones[tone]} ${className}`}
    >
      {children}
    </p>
  );
}

/* ─── panel con barra de título (inventario) ──────────────────── */

export function GamePanel({
  title,
  subtitle,
  icon: Icon,
  tone = "default",
  action,
  children,
  className = "",
  bodyClassName = "",
  onClick,
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: "default" | "lime" | "cyan" | "orange" | "hot";
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  const border =
    tone === "lime"
      ? "border-[#d8ff3e]/55"
      : tone === "cyan"
        ? "border-cyan-300/55"
        : tone === "orange"
          ? "border-orange-300/55"
          : tone === "hot"
            ? "border-[#d8ff3e]"
            : "border-white/20";

  const headerBg =
    tone === "lime" || tone === "hot"
      ? "bg-[#d8ff3e]/12"
      : tone === "cyan"
        ? "bg-cyan-300/10"
        : tone === "orange"
          ? "bg-orange-300/10"
          : "bg-white/[0.04]";

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`xg-game-panel relative w-full overflow-hidden border-[3px] ${border} ${game.panel} ${game.shadow} text-left ${
        onClick ? "transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" : ""
      } ${className}`}
    >
      {(title || action) && (
        <div
          className={`flex items-center gap-2 border-b-[3px] ${border} ${headerBg} ${
            compact ? "px-3 py-2" : "px-3 py-2.5 sm:px-4"
          }`}
        >
          {Icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center border-2 border-black/40 bg-[#d8ff3e] text-black">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {title && (
              <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-white sm:text-sm">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="truncate text-[11px] font-bold text-white/45">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={`${compact ? "p-3" : "p-3 sm:p-4"} ${bodyClassName}`}>{children}</div>
    </Tag>
  );
}

/* ─── stat block: número grande con borde grueso ──────────────── */

export function GameStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "lime",
  onClick,
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "lime" | "cyan" | "orange" | "white" | "yellow";
  onClick?: () => void;
  className?: string;
}) {
  const borders = {
    lime: "border-[#d8ff3e]/60",
    cyan: "border-cyan-300/60",
    orange: "border-orange-300/60",
    white: "border-white/25",
    yellow: "border-yellow-300/60",
  } as const;
  const labels = {
    lime: "text-[#d8ff3e]",
    cyan: "text-cyan-300",
    orange: "text-orange-300",
    white: "text-white/50",
    yellow: "text-yellow-300",
  } as const;
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`xg-game-stat flex min-h-[88px] flex-col justify-between border-[3px] ${borders[tone]} bg-black/50 p-3 text-left ${game.shadow} ${
        onClick
          ? "transition hover:bg-white/[0.04] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <GameLabel tone={tone === "white" ? "white" : tone} className="leading-tight">
          {label}
        </GameLabel>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${labels[tone]}`} />}
      </div>
      <div className="mt-2 text-2xl font-black uppercase leading-none tracking-tight text-white sm:text-3xl">
        {value}
      </div>
      {hint && (
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">{hint}</p>
      )}
    </Tag>
  );
}

/* ─── botón primario del OS ───────────────────────────────────── */

export function GameButton({
  children,
  onClick,
  disabled,
  variant = "lime",
  className = "",
  type = "button",
  full = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "lime" | "cyan" | "orange" | "ghost" | "danger" | "white";
  className?: string;
  type?: "button" | "submit";
  full?: boolean;
}) {
  const variants = {
    lime: "border-black/30 bg-[#d8ff3e] text-black hover:bg-white",
    cyan: "border-black/30 bg-cyan-300 text-black hover:bg-white",
    orange: "border-black/30 bg-orange-300 text-black hover:bg-white",
    white: "border-black/30 bg-white text-black hover:bg-[#d8ff3e]",
    ghost: "border-white/25 bg-black/40 text-white hover:border-[#d8ff3e] hover:text-[#eaff93]",
    danger: "border-red-400/50 bg-red-500/15 text-red-100 hover:bg-red-500/25",
  } as const;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-12 items-center justify-center gap-2 border-[3px] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] transition active:translate-x-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm ${
        variants[variant]
      } ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/* ─── chip / tag de inventario ────────────────────────────────── */

export function GameChip({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: "default" | "lime" | "cyan" | "orange" | "red" | "yellow";
  className?: string;
}) {
  const tones = {
    default: "border-white/20 bg-white/[0.06] text-white/70",
    lime: "border-[#d8ff3e]/45 bg-[#d8ff3e]/12 text-[#eaff93]",
    cyan: "border-cyan-300/45 bg-cyan-300/12 text-cyan-100",
    orange: "border-orange-300/45 bg-orange-300/12 text-orange-100",
    red: "border-red-400/45 bg-red-500/12 text-red-100",
    yellow: "border-yellow-300/45 bg-yellow-300/12 text-yellow-100",
  } as const;
  return (
    <span
      className={`inline-flex items-center border-2 px-2 py-1 text-[10px] font-black uppercase tracking-wide sm:text-[11px] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ─── modal / bottom-sheet ────────────────────────────────────── */

type ModalTone = "default" | "lime" | "cyan" | "orange";

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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: ModalTone;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // focus trap-ish: focus panel
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const border =
    tone === "lime"
      ? "border-[#d8ff3e]"
      : tone === "cyan"
        ? "border-cyan-300"
        : tone === "orange"
          ? "border-orange-300"
          : "border-white/30";

  const headerBg =
    tone === "lime"
      ? "bg-[#d8ff3e]"
      : tone === "cyan"
        ? "bg-cyan-300"
        : tone === "orange"
          ? "bg-orange-300"
          : "bg-[#d8ff3e]";

  const widths = {
    sm: "max-w-[380px]",
    md: "max-w-[480px]",
    lg: "max-w-[640px]",
    full: "max-w-[920px]",
  } as const;

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
        className={`xg-game-modal-panel relative flex max-h-[92dvh] w-full flex-col border-[3px] ${border} ${game.panelRaised} ${game.shadow} outline-none sm:max-h-[88vh] ${widths[size]}`}
      >
        {/* Minecraft-like title bar */}
        <div
          className={`flex shrink-0 items-center gap-3 border-b-[3px] border-black/25 ${headerBg} px-3 py-3 text-black sm:px-4`}
        >
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black/30 bg-black/15">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-base font-black uppercase leading-tight sm:text-lg">
              {title}
            </h2>
            {subtitle && (
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-black/65">
                {subtitle}
              </p>
            )}
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t-[3px] border-white/15 bg-black/40 p-3 sm:p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── HUD pill (constantes siempre visibles) ──────────────────── */

export function GameHudPill({
  icon: Icon,
  label,
  value,
  tone = "lime",
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: "lime" | "cyan" | "orange" | "yellow";
  onClick?: () => void;
}) {
  const colors = {
    lime: "border-[#d8ff3e]/50 text-[#eaff93]",
    cyan: "border-cyan-300/50 text-cyan-200",
    orange: "border-orange-300/50 text-orange-200",
    yellow: "border-yellow-300/50 text-yellow-200",
  } as const;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-1.5 border-2 bg-black/55 px-2 py-1 ${colors[tone]} ${
        onClick ? "transition active:scale-[0.98]" : ""
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </span>
      <span className="text-sm font-black uppercase leading-none">{value}</span>
    </Tag>
  );
}

/* ─── dock item (bottom nav mobile) ───────────────────────────── */

export function GameDockItem({
  label,
  icon: Icon,
  active,
  onClick,
  tourId,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  tourId?: string;
}) {
  return (
    <button
      type="button"
      data-tour={tourId}
      onClick={onClick}
      className={`flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-[3px] px-1 transition ${
        active
          ? "border-t-[#d8ff3e] bg-[#d8ff3e]/15 text-[#d8ff3e]"
          : "border-t-transparent text-white/45 active:bg-white/[0.06] active:text-white"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
      <span className="max-w-full truncate text-[9px] font-black uppercase tracking-[0.08em]">
        {label}
      </span>
    </button>
  );
}

/* ─── empty / lock callout ────────────────────────────────────── */

export function GameCallout({
  children,
  tone = "lime",
  icon: Icon,
}: {
  children: ReactNode;
  tone?: "lime" | "cyan" | "orange" | "red";
  icon?: LucideIcon;
}) {
  const tones = {
    lime: "border-[#d8ff3e]/45 bg-[#d8ff3e]/10 text-[#eaff93]",
    cyan: "border-cyan-300/45 bg-cyan-300/10 text-cyan-100",
    orange: "border-orange-300/45 bg-orange-300/10 text-orange-50",
    red: "border-red-400/45 bg-red-500/10 text-red-100",
  } as const;
  return (
    <div className={`flex items-start gap-3 border-[3px] p-3 ${tones[tone]}`}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 text-sm font-bold leading-snug">{children}</div>
    </div>
  );
}

