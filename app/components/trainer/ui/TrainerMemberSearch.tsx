"use client";

import Image from "next/image";
import { ChevronRight, Search, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import type { TrainerMember } from "../types";
import { memberSignal } from "../utils";

const signalClass = { lime: "bg-[#d8ff3e] text-black", cyan: "bg-cyan-300 text-black", orange: "bg-orange-300 text-black", red: "bg-red-400 text-black", muted: "bg-white/10 text-white/45" };

export function TrainerMemberSearch({ members, query, onQueryChange, selectedKey, onSelect, renderAction, placeholder = "Buscar por nombre, meta o entrenador", emptyText = "No hay socios con esta búsqueda.", compact = false }: {
  members: TrainerMember[];
  query: string;
  onQueryChange: (value: string) => void;
  selectedKey?: string;
  onSelect?: (member: TrainerMember) => void;
  renderAction?: (member: TrainerMember) => ReactNode;
  placeholder?: string;
  emptyText?: string;
  compact?: boolean;
}) {
  return <div className="min-w-0">
    <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} className="min-h-11 w-full bg-black/50 pl-10 pr-3 font-bold outline-none ring-cyan-300 focus:ring-2" /></div>
    <div className={`mt-2 overflow-y-auto ${compact ? "max-h-64" : "max-h-[420px] lg:max-h-none lg:flex-1"}`}>
      {members.map((member) => {
        const signal = memberSignal(member);
        const active = selectedKey === member.normalizedName;
        const row = <div className={`flex items-center gap-3 border-b border-white/10 p-3 transition ${active ? "bg-cyan-300 text-black" : "hover:bg-white/[.045]"}`}>
          {onSelect ? <button type="button" onClick={() => onSelect(member)} className="group flex min-w-0 flex-1 items-center gap-3 text-left">
            <MemberAvatar member={member} active={active} />
            <MemberCopy member={member} signal={signal} active={active} />
            <ChevronRight className="h-4 w-4 shrink-0 opacity-40 transition group-hover:translate-x-0.5" />
          </button> : <div className="flex min-w-0 flex-1 items-center gap-3"><MemberAvatar member={member} active={active} /><MemberCopy member={member} signal={signal} active={active} /></div>}
          {renderAction?.(member)}
        </div>;
        return <div key={member.memberId}>{row}</div>;
      })}
      {!members.length && <p className="p-6 text-center text-sm font-bold text-white/35">{emptyText}</p>}
    </div>
  </div>;
}

function MemberAvatar({ member, active }: { member: TrainerMember; active: boolean }) {
  return <span className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden border-2 ${active ? "border-black/20 bg-black/10" : "border-white/10 bg-black/35"}`}>{member.photoUrl ? <Image unoptimized src={member.photoUrl} alt="" width={44} height={44} sizes="44px" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}</span>;
}

function MemberCopy({ member, signal, active }: { member: TrainerMember; signal: ReturnType<typeof memberSignal>; active: boolean }) {
  return <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-black uppercase">{member.memberName}</strong><span className={`mt-1 inline-block px-1.5 py-0.5 text-[8px] font-black uppercase ${active ? "bg-black/15" : signalClass[signal.tone]}`}>{signal.label}</span><small className="mt-1 block truncate font-bold opacity-50">{member.trainingPlan?.title || member.goal || "Sin objetivo"}</small></span>;
}
