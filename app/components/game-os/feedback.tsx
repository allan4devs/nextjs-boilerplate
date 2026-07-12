import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type GameCalloutProps = {
  children: ReactNode;
  tone?: "lime" | "cyan" | "orange" | "red";
  icon?: LucideIcon;
};

export function GameCallout({ children, tone = "lime", icon: Icon }: GameCalloutProps) {
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
