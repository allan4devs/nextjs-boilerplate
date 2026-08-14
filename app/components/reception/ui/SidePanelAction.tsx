"use client";

import {
  IdCard,
} from "lucide-react";

export function SidePanelAction({
  active,
  icon: Icon,
  label,
  detail,
  badge = 0,
  onClick,
}: {
  active: boolean;
  icon: typeof IdCard;
  label: string;
  detail: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-16 w-full items-center gap-3 border-[3px] p-3 text-left transition ${
        active
          ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
          : "border-white/15 bg-black/45 text-white hover:border-violet-300/60"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center ${active ? "bg-black/15" : "bg-violet-300/10 text-violet-200"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black uppercase leading-tight">{label}</span>
        <span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-wide ${active ? "text-black/55" : badge ? "text-orange-300" : "text-white/35"}`}>
          {detail}
        </span>
      </span>
      {badge > 0 && (
        <span className={`grid h-7 min-w-7 place-items-center px-1 text-xs font-black ${active ? "bg-black text-[#d8ff3e]" : "bg-red-500 text-white"}`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}
