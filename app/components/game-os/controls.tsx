import type { ReactNode } from "react";

export type GameButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "lime" | "cyan" | "orange" | "ghost" | "danger" | "white";
  className?: string;
  type?: "button" | "submit";
  full?: boolean;
};

export function GameButton({
  children,
  onClick,
  disabled,
  variant = "lime",
  className = "",
  type = "button",
  full = false,
}: GameButtonProps) {
  const variants = {
    lime: "border-black/30 bg-[#d8ff3e] text-black hover:bg-white hover:shadow-[3px_3px_0_rgba(0,0,0,0.5),0_0_22px_rgba(216,255,62,0.4)]",
    cyan: "border-black/30 bg-cyan-300 text-black hover:bg-white hover:shadow-[3px_3px_0_rgba(0,0,0,0.5),0_0_22px_rgba(34,211,238,0.4)]",
    orange: "border-black/30 bg-orange-300 text-black hover:bg-white hover:shadow-[3px_3px_0_rgba(0,0,0,0.5),0_0_22px_rgba(251,146,60,0.4)]",
    white: "border-black/30 bg-white text-black hover:bg-[#d8ff3e] hover:shadow-[3px_3px_0_rgba(0,0,0,0.5),0_0_22px_rgba(216,255,62,0.4)]",
    ghost: "border-white/25 bg-black/40 text-white hover:border-[#d8ff3e] hover:text-[#eaff93]",
    danger: "border-red-400/50 bg-red-500/15 text-red-100 hover:bg-red-500/25",
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`xg-shine inline-flex min-h-12 items-center justify-center gap-2 border-[3px] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] shadow-[3px_3px_0_rgba(0,0,0,0.5)] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none sm:text-sm ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export type GameChipProps = {
  children: ReactNode;
  tone?: "default" | "lime" | "cyan" | "orange" | "red" | "yellow";
  className?: string;
};

export function GameChip({ children, tone = "default", className = "" }: GameChipProps) {
  const tones = {
    default: "border-white/20 bg-white/[0.06] text-white/70",
    lime: "border-[#d8ff3e]/45 bg-[#d8ff3e]/12 text-[#eaff93]",
    cyan: "border-cyan-300/45 bg-cyan-300/12 text-cyan-100",
    orange: "border-orange-300/45 bg-orange-300/12 text-orange-100",
    red: "border-red-400/45 bg-red-500/12 text-red-100",
    yellow: "border-yellow-300/45 bg-yellow-300/12 text-yellow-100",
  } as const;
  return (
    <span className={`inline-flex items-center border-2 px-2 py-1 text-[10px] font-black uppercase tracking-wide sm:text-[11px] ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
