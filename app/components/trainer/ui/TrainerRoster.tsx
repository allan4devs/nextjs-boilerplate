"use client";

import { ChevronRight, Search, UserRound } from "lucide-react";
import { TRAINER_FILTERS } from "../constants";
import type { TrainerOs } from "../hooks/useTrainerOs";
import { memberSignal } from "../utils";

const signalClass = { lime: "bg-[#d8ff3e] text-black", cyan: "bg-cyan-300 text-black", orange: "bg-orange-300 text-black", red: "bg-red-400 text-black", muted: "bg-white/10 text-white/45" };

export function TrainerRoster({ os }: { os: TrainerOs }) {
  return (
    <aside className="min-h-0 border-[3px] border-white/15 bg-[#0c0c0c] lg:sticky lg:top-[91px] lg:flex lg:max-h-[calc(100dvh-116px)] lg:flex-col">
      <div className="shrink-0 border-b-[3px] border-white/15 p-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={os.query} onChange={(event) => os.setQuery(event.target.value)} placeholder="Nombre, meta o entrenador" className="min-h-11 w-full bg-black/50 pl-10 pr-3 font-bold outline-none ring-cyan-300 focus:ring-2" /></div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TRAINER_FILTERS.map((entry) => <button key={entry.id} onClick={() => os.setFilter(entry.id)} className={`shrink-0 border-2 px-2.5 py-1.5 text-[9px] font-black uppercase ${os.filter === entry.id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/10 text-white/45"}`}>{entry.label}</button>)}
        </div>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[.14em] text-white/30">{os.filteredMembers.length} socios visibles</p>
      </div>
      <div className="max-h-[420px] overflow-y-auto lg:max-h-none lg:flex-1">
        {os.filteredMembers.map((member) => {
          const signal = memberSignal(member);
          const active = os.selected?.normalizedName === member.normalizedName;
          return <button key={member.normalizedName} onClick={() => os.chooseMember(member.normalizedName)} className={`group flex w-full items-center gap-3 border-b border-white/10 p-3 text-left transition ${active ? "bg-cyan-300 text-black" : "hover:bg-white/[.045]"}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden border-2 ${active ? "border-black/20 bg-black/10" : "border-white/10 bg-black/35"}`}>{member.photoUrl ? <img src={member.photoUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}</span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-black uppercase">{member.memberName}</strong><span className={`mt-1 inline-block px-1.5 py-0.5 text-[8px] font-black uppercase ${active ? "bg-black/15" : signalClass[signal.tone]}`}>{signal.label}</span><small className="mt-1 block truncate font-bold opacity-50">{member.trainingPlan?.title || member.goal || "Sin objetivo"}</small></span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-40 transition group-hover:translate-x-0.5" />
          </button>;
        })}
        {!os.filteredMembers.length && <p className="p-6 text-center text-sm font-bold text-white/35">No hay socios con este filtro.</p>}
      </div>
    </aside>
  );
}

