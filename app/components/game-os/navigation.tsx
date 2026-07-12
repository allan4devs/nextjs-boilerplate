import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type GameHudPillProps = {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: "lime" | "cyan" | "orange" | "yellow";
  onClick?: () => void;
};

export function GameHudPill({ icon: Icon, label, value, tone = "lime", onClick }: GameHudPillProps) {
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
      className={`inline-flex min-h-10 items-center gap-1.5 border-2 bg-black/55 px-2 py-1 ${colors[tone]} ${onClick ? "transition active:scale-[0.98]" : ""}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/45">{label}</span>
      <span className="text-sm font-black uppercase leading-none">{value}</span>
    </Tag>
  );
}

export type GameDockItemProps = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  tourId?: string;
};

export function GameDockItem({ label, icon: Icon, active, onClick, tourId }: GameDockItemProps) {
  return (
    <button
      type="button"
      data-tour={tourId}
      onClick={onClick}
      className={`flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-[3px] px-1 transition ${
        active
          ? "border-t-[#d8ff3e] bg-gradient-to-b from-[#d8ff3e]/20 to-transparent text-[#d8ff3e]"
          : "border-t-transparent text-white/45 active:bg-white/[0.06] active:text-white"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? "xg-dock-active-icon" : ""}`} strokeWidth={active ? 2.5 : 2} />
      <span className="max-w-full truncate text-[9px] font-black uppercase tracking-[0.08em]">{label}</span>
    </button>
  );
}
