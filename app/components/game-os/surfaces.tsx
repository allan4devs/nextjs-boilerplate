import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { game } from "./tokens";

export type GameLabelTone = "lime" | "cyan" | "orange" | "white" | "red" | "yellow";

export type GameLabelProps = {
  children: ReactNode;
  tone?: GameLabelTone;
  className?: string;
};

export function GameLabel({ children, tone = "lime", className = "" }: GameLabelProps) {
  const tones = {
    lime: "text-[#d8ff3e]",
    cyan: "text-cyan-300",
    orange: "text-orange-300",
    white: "text-white/55",
    red: "text-red-300",
    yellow: "text-yellow-300",
  } as const;
  return (
    <p className={`text-[9px] font-black uppercase tracking-[0.18em] sm:text-[10px] ${tones[tone]} ${className}`}>
      {children}
    </p>
  );
}

export type GamePanelProps = {
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
};

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
}: GamePanelProps) {
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
      className={`xg-game-panel relative w-full overflow-hidden border-2 ${border} ${game.panel} ${game.shadow} text-left ${
        onClick
          ? "xg-lift transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          : ""
      } ${className}`}
    >
      {(title || action) && (
        <div className={`flex items-center gap-2 border-b-2 ${border} ${headerBg} ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
          {Icon && (
            <span className="grid h-7 w-7 shrink-0 place-items-center border-2 border-black/40 bg-[#d8ff3e] text-black">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {title && <p className="truncate text-[11px] font-black uppercase tracking-[0.1em] text-white sm:text-xs">{title}</p>}
            {subtitle && <p className="truncate text-[10px] font-bold text-white/45">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={`${compact ? "p-2.5" : "p-3"} ${bodyClassName}`}>{children}</div>
    </Tag>
  );
}

export type GameStatProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "lime" | "cyan" | "orange" | "white" | "yellow";
  onClick?: () => void;
  className?: string;
};

export function GameStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "lime",
  onClick,
  className = "",
}: GameStatProps) {
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
      className={`xg-game-stat flex min-h-[72px] flex-col justify-between border-2 ${borders[tone]} bg-black/50 p-2.5 text-left ${game.shadow} ${
        onClick
          ? "xg-lift transition hover:bg-white/[0.04] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <GameLabel tone={tone === "white" ? "white" : tone} className="leading-tight">{label}</GameLabel>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${labels[tone]}`} />}
      </div>
      <div className="mt-1.5 text-xl font-black uppercase leading-none tracking-tight text-white [text-shadow:0_0_18px_rgba(255,255,255,0.22)] sm:text-2xl">{value}</div>
      {hint && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/40">{hint}</p>}
    </Tag>
  );
}
