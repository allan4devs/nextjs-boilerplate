"use client";

import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  GameButton,
} from "../../GameOS";
import {
  makeItem,
} from "../helpers";
import type {
  AdminMember,
  PlanDraft,
  PlanItem,
} from "../types";

export function PlanModal({
  member,
  draft,
  saving,
  onClose,
  onChange,
  onSave,
  onToggleItem,
}: {
  member: AdminMember;
  draft: PlanDraft;
  saving: boolean;
  onClose: () => void;
  onChange: (draft: PlanDraft) => void;
  onSave: () => void;
  onToggleItem: (item: PlanItem) => void;
}) {
  const doneItems = draft.items.filter((i) => i.done).length;
  const progressPct = draft.items.length ? Math.round((doneItems / draft.items.length) * 100) : 0;
  const inputClass =
    "min-h-11 w-full border-[3px] border-white/20 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]";

  function setItem(id: string, patch: Partial<PlanItem>) {
    onChange({ ...draft, items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  }

  return (
    <div className="xg-game-modal fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/80 sm:place-items-center sm:px-4 sm:py-8">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <div className="xg-game-modal-panel relative w-full max-w-3xl border-[3px] border-[#d8ff3e] bg-[#0c0c0c] text-white shadow-[6px_6px_0_rgba(216,255,62,0.2)]">
        <div className="flex items-center justify-between gap-3 border-b-[3px] border-black/25 bg-[#d8ff3e] px-4 py-3 text-black sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black/30 bg-black/15">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black uppercase leading-tight sm:text-lg">Plan personalizado</h2>
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-black/65">{member.memberName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center border-2 border-black/30 bg-black/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-3 py-4 sm:space-y-5 sm:px-6 sm:py-5">
          <div className="border-[3px] border-white/15 bg-black/40 p-3 sm:p-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-white/55 sm:text-xs">
              <span>Avance</span>
              <span className="border-2 border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-2 py-0.5 text-[#eaff93]">
                {doneItems}/{draft.items.length} · {progressPct}%
              </span>
            </div>
            <div className="mt-3 h-3 w-full border-[3px] border-white/15 bg-black/45">
              <div className="h-full bg-[#d8ff3e]" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Titulo</span>
              <input value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Objetivo</span>
              <input value={draft.objective} onChange={(e) => onChange({ ...draft, objective: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Inicio</span>
              <input type="date" value={draft.startDate} onChange={(e) => onChange({ ...draft, startDate: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Fin</span>
              <input type="date" value={draft.endDate} onChange={(e) => onChange({ ...draft, endDate: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Sesiones / sem</span>
              <input type="number" min={0} max={14} value={draft.weeklySessions} onChange={(e) => onChange({ ...draft, weeklySessions: Number(e.target.value) })} className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Nota coach</span>
              <textarea value={draft.coachNote} onChange={(e) => onChange({ ...draft, coachNote: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
            </label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-white/70">Sesiones</h3>
              <button type="button" onClick={() => onChange({ ...draft, items: [...draft.items, makeItem()] })} className="inline-flex items-center gap-1.5 border border-white/15 px-3 py-1.5 text-xs font-black uppercase">
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
            {draft.items.map((item, index) => (
              <div key={item.id} className={`border p-3 ${item.done ? "border-lime-300/40 bg-lime-300/[0.06]" : "border-white/10 bg-black/25"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onToggleItem(item)} className={`grid h-7 w-7 place-items-center border ${item.done ? "border-lime-300 bg-lime-300 text-black" : "border-white/20 text-white/40"}`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-black uppercase text-white/45">Sesion {index + 1}</span>
                  </div>
                  <button type="button" onClick={() => onChange({ ...draft, items: draft.items.filter((i) => i.id !== item.id) })} className="grid h-7 w-7 place-items-center border border-white/10 text-white/40">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_120px]">
                  <input value={item.day} onChange={(e) => setItem(item.id, { day: e.target.value })} placeholder="Dia" className={inputClass} />
                  <input value={item.focus} onChange={(e) => setItem(item.id, { focus: e.target.value })} placeholder="Enfoque" className={inputClass} />
                  <input type="number" value={item.targetMinutes} onChange={(e) => setItem(item.id, { targetMinutes: Number(e.target.value) })} className={inputClass} />
                </div>
                <textarea value={item.exercises} onChange={(e) => setItem(item.id, { exercises: e.target.value })} rows={2} placeholder="Ejercicios..." className={`${inputClass} mt-2 resize-none`} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t-[3px] border-white/15 bg-black/40 px-3 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <GameButton variant="ghost" full className="sm:w-auto" onClick={onClose}>
            Cancelar
          </GameButton>
          <GameButton full className="sm:w-auto" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            Guardar plan
          </GameButton>
        </div>
      </div>
    </div>
  );
}
