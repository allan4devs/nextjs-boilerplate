"use client";

import {
  Activity,
  Flame,
  Loader2,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import {
  GameButton,
} from "../../GameOS";
import type {
  AdminMember,
  MemberDraft,
} from "../types";

export function MemberModal({
  member,
  draft,
  saving,
  onClose,
  onChange,
  onSave,
}: {
  member: AdminMember;
  draft: MemberDraft;
  saving: boolean;
  onClose: () => void;
  onChange: (draft: MemberDraft) => void;
  onSave: () => void;
}) {
  const inputClass =
    "min-h-11 w-full border-[3px] border-white/20 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]";

  return (
    <div className="xg-game-modal fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/80 sm:place-items-center sm:px-4 sm:py-8">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <div className="xg-game-modal-panel relative w-full max-w-xl border-[3px] border-[#d8ff3e] bg-[#0c0c0c] text-white shadow-[6px_6px_0_rgba(216,255,62,0.2)]">
        <div className="flex items-center justify-between border-b-[3px] border-black/25 bg-[#d8ff3e] px-4 py-3 text-black sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black/30 bg-black/15">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black uppercase sm:text-lg">Perfil personalizado</h2>
              <p className="truncate text-[11px] font-bold uppercase text-black/65">{member.accessCode}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center border-2 border-black/30 bg-black/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto px-3 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Nombre</span>
            <input value={draft.displayName} onChange={(e) => onChange({ ...draft, displayName: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Telefono</span>
            <input value={draft.phone} onChange={(e) => onChange({ ...draft, phone: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Email</span>
            <input value={draft.email} onChange={(e) => onChange({ ...draft, email: e.target.value })} className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">
              Cedula (lector / app)
            </span>
            <input
              value={draft.cedula}
              onChange={(e) => onChange({ ...draft, cedula: e.target.value.replace(/[^\d-]/g, "").slice(0, 20) })}
              inputMode="numeric"
              placeholder="1-2345-6789"
              className={`${inputClass} text-center font-black tracking-widest`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Objetivo</span>
            <input value={draft.goal} onChange={(e) => onChange({ ...draft, goal: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Coach</span>
            <input value={draft.coach} onChange={(e) => onChange({ ...draft, coach: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Favorito</span>
            <input value={draft.favoriteTraining} onChange={(e) => onChange({ ...draft, favoriteTraining: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Plan membresia</span>
            <input value={draft.plan} onChange={(e) => onChange({ ...draft, plan: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Inicio</span>
            <input type="date" value={draft.startedAt} onChange={(e) => onChange({ ...draft, startedAt: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Proximo cobro</span>
            <input type="date" value={draft.nextBillingDate} onChange={(e) => onChange({ ...draft, nextBillingDate: e.target.value })} className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Notas internas</span>
            <textarea value={draft.notes} onChange={(e) => onChange({ ...draft, notes: e.target.value })} rows={3} placeholder="Lesiones, preferencias, horario..." className={`${inputClass} resize-none`} />
          </label>
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <div className="border-[3px] border-white/15 bg-black/30 p-3 text-center">
              <Timer className="mx-auto h-4 w-4 text-white/40" />
              <p className="mt-1 text-lg font-black">{member.totalMinutes}</p>
              <p className="text-[10px] font-black uppercase text-white/40">Minutos</p>
            </div>
            <div className="border-[3px] border-orange-300/40 bg-black/30 p-3 text-center">
              <Flame className="mx-auto h-4 w-4 text-orange-300" />
              <p className="mt-1 text-lg font-black">{member.streak}</p>
              <p className="text-[10px] font-black uppercase text-white/40">Racha</p>
            </div>
            <div className="border-[3px] border-[#d8ff3e]/40 bg-black/30 p-3 text-center">
              <Activity className="mx-auto h-4 w-4 text-[#d8ff3e]" />
              <p className="mt-1 text-lg font-black">{member.latestWeight ? `${member.latestWeight}` : "-"}</p>
              <p className="text-[10px] font-black uppercase text-white/40">Peso kg</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t-[3px] border-white/15 bg-black/40 px-3 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <GameButton variant="ghost" full className="sm:w-auto" onClick={onClose}>
            Cancelar
          </GameButton>
          <GameButton full className="sm:w-auto" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
            Guardar perfil
          </GameButton>
        </div>
      </div>
    </div>
  );
}
