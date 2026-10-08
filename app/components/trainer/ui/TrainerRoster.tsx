"use client";

import { TRAINER_FILTERS } from "../constants";
import type { TrainerOs } from "../hooks/useTrainerOs";
import { TrainerMemberSearch } from "./TrainerMemberSearch";

export function TrainerRoster({ os }: { os: TrainerOs }) {
  return (
    <aside className="min-h-0 border-[3px] border-white/15 bg-[#0c0c0c] lg:sticky lg:top-[91px] lg:flex lg:max-h-[calc(100dvh-116px)] lg:flex-col">
      <div className="shrink-0 border-b-[3px] border-white/15 p-3">
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TRAINER_FILTERS.map((entry) => <button key={entry.id} onClick={() => os.setFilter(entry.id)} className={`shrink-0 border-2 px-2.5 py-1.5 text-[9px] font-black uppercase ${os.filter === entry.id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/10 text-white/45"}`}>{entry.label}</button>)}
        </div>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[.14em] text-white/30">{os.filteredMembers.length} socios visibles</p>
      </div>
      <TrainerMemberSearch members={os.filteredMembers} query={os.query} onQueryChange={os.setQuery} selectedKey={os.selected?.normalizedName} onSelect={(member) => os.chooseMember(member.normalizedName)} emptyText="No hay socios con este filtro." />
    </aside>
  );
}

