import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type GameHudPillProps = {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: "lime" | "cyan" | "orange" | "yellow";
  onClick?: () => void;
  /** En mobile oculta el label y reduce padding. */
  compact?: boolean;
  className?: string;
};

export function GameHudPill({
  icon: Icon,
  label,
  value,
  tone = "lime",
  onClick,
  compact = false,
  className = "",
}: GameHudPillProps) {
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
      title={label}
      className={`inline-flex min-h-9 items-center gap-1 border-2 bg-black/55 py-1 sm:min-h-10 sm:gap-1.5 ${
        compact ? "px-1.5 sm:px-2" : "px-2"
      } ${colors[tone]} ${onClick ? "transition active:scale-[0.98]" : ""} ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span
        className={`text-[9px] font-black uppercase tracking-[0.14em] text-white/45 ${
          compact ? "hidden sm:inline" : ""
        }`}
      >
        {label}
      </span>
      <span className="text-sm font-black uppercase leading-none tabular-nums">{value}</span>
    </Tag>
  );
}

export type GameDockItemProps = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  tourId?: string;
  attention?: boolean;
};

export function GameDockItem({ label, icon: Icon, active, onClick, tourId, attention = false }: GameDockItemProps) {
  return (
    <button
      type="button"
      data-tour={tourId}
      onClick={onClick}
      className={`relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-[3px] px-0.5 transition sm:min-h-[58px] sm:px-1 ${
        active
          ? "border-t-[#d8ff3e] bg-gradient-to-b from-[#d8ff3e]/20 to-transparent text-[#d8ff3e]"
          : "border-t-transparent text-white/45 active:bg-white/[0.06] active:text-white"
      }`}
    >
      {attention && (
        <span
          aria-label="Acción pendiente"
          className="absolute right-[calc(50%-18px)] top-1.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-[#0a0a0a] bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,.9)]"
        />
      )}
      <Icon className={`h-5 w-5 shrink-0 ${active ? "xg-dock-active-icon" : ""}`} strokeWidth={active ? 2.5 : 2} />
      <span className="max-w-full truncate text-[8px] font-black uppercase tracking-[0.06em] sm:text-[9px] sm:tracking-[0.08em]">
        {label}
      </span>
    </button>
  );
}
