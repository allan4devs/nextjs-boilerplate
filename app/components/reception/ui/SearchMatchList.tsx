"use client";

import {
  Pencil,
  ReceiptText,
} from "lucide-react";
import { Avatar } from "../MemberCards";
import {
  MEMBERSHIP_STATUS_LABELS,
} from "@/app/features/checkin/constants";
import type {
  MemberHit,
} from "@/lib/xtreme/checkin/contracts";

export function SearchMatchList({
  matches,
  onSelect,
  onEdit,
  onInvoice,
}: {
  matches: MemberHit[];
  onSelect: (member: MemberHit) => void;
  onEdit: (member: MemberHit) => void;
  onInvoice: (member: MemberHit) => void;
}) {
  if (!matches.length) return null;
  return (
    <div className="mt-3 border-[3px] border-cyan-300/35 bg-cyan-300/[0.04] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
        {matches.length} personas encontradas · seleccioná una
      </p>
      <div className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
        {matches.map((candidate) => (
          <article
            key={candidate.normalizedName}
            className="flex min-w-0 flex-wrap items-center gap-4 border-[3px] border-white/15 bg-black/50 p-4"
          >
            <div className="scale-110"><Avatar name={candidate.memberName} photoUrl={candidate.photoUrl} /></div>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black uppercase leading-tight text-white sm:text-lg">
                {candidate.memberName}
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {candidate.plan && <span className="bg-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/55">{candidate.plan}</span>}
                <span className={`px-2 py-1 text-[10px] font-black uppercase ${candidate.membershipStatus === "expired" ? "bg-orange-400/15 text-orange-200" : "bg-[#d8ff3e]/15 text-[#d8ff3e]"}`}>
                  {MEMBERSHIP_STATUS_LABELS[candidate.membershipStatus] ?? candidate.membershipStatus}
                </span>
                {candidate.cedula && <span className="bg-white/5 px-2 py-1 text-[10px] font-bold text-white/35">Céd. {candidate.cedula}</span>}
              </span>
            </span>
            <span className="flex shrink-0 gap-2">
              <button type="button" onClick={() => onInvoice(candidate)} className="inline-flex min-h-10 items-center gap-1.5 border-[3px] border-orange-300/50 px-3 text-[10px] font-black uppercase text-orange-200 hover:bg-orange-300 hover:text-black">
                <ReceiptText className="h-3.5 w-3.5" /> Facturar
              </button>
              <button type="button" onClick={() => onEdit(candidate)} className="inline-flex min-h-10 items-center gap-1.5 border-[3px] border-cyan-300/45 px-3 text-[10px] font-black uppercase text-cyan-200 hover:bg-cyan-300 hover:text-black">
                <Pencil className="h-3.5 w-3.5" /> Editar datos
              </button>
              <button type="button" onClick={() => onSelect(candidate)} className="min-h-10 border-[3px] border-[#d8ff3e]/45 px-3 text-[10px] font-black uppercase text-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black">
                Seleccionar
              </button>
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
