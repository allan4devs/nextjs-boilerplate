"use client";

import {
  Loader2,
  X,
  Zap,
} from "lucide-react";
import {
  GameButton,
  GameCallout,
  GameLabel,
} from "../../GameOS";
import {
  QUICK_PLAN_OPTIONS,
} from "../constants";
import type {
  AdminMember,
  QuickPlanOptionId,
} from "../types";

export function QuickPlanModal({
  member,
  option,
  saving,
  onOptionChange,
  onClose,
  onConfirm,
}: {
  member: AdminMember;
  option: QuickPlanOptionId;
  saving: boolean;
  onOptionChange: (option: QuickPlanOptionId) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const selected = QUICK_PLAN_OPTIONS.find((item) => item.id === option) ?? QUICK_PLAN_OPTIONS[2];
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/85 px-3 py-6 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <section className="relative w-full max-w-lg border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-4 text-white shadow-[7px_7px_0_rgba(216,255,62,.2)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <GameLabel tone="lime">Solo super admin</GameLabel>
            <h2 className="mt-2 text-2xl font-black uppercase">Dar acceso rapido</h2>
            <p className="mt-1 text-sm font-bold text-white/50">{member.memberName}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center border-[2px] border-white/15 text-white/55 hover:border-white/40 hover:text-white" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {QUICK_PLAN_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOptionChange(item.id)}
              className={`min-h-24 border-[3px] p-3 text-left transition ${option === item.id ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 bg-black/30 text-white hover:border-[#d8ff3e]/45"}`}
            >
              <span className="block text-lg font-black uppercase">{item.label}</span>
              <span className={`mt-1 block text-xs font-bold ${option === item.id ? "text-black/55" : "text-white/40"}`}>{item.detail}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <GameCallout tone="lime">
            Si la membresía sigue activa, los {selected.days} días se suman al vencimiento actual. Si está vencida, empiezan hoy.
          </GameCallout>
          <GameCallout tone="orange">
            {member.emailVerified
              ? member.email
                ? "Tiene correo verificado: le avisamos por correo. Si aún no tiene PIN, el mail le indica cómo crearlo en la app."
                : "Sin correo en la ficha: el plan se activa igual, pero no se envía correo."
              : member.email
                ? "Aún no completó registro: le mandamos enlace para confirmar correo, datos y crear PIN. Su plan no se borra al registrarse."
                : "Sin correo en la ficha: el plan se activa, pero tenés que invitarlo después con un correo para que cree el PIN."}
          </GameCallout>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-12 flex-1 border-[3px] border-white/15 px-4 text-xs font-black uppercase text-white/60 disabled:opacity-40">
            Cancelar
          </button>
          <GameButton onClick={onConfirm} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Activar {selected.label}
          </GameButton>
        </div>
      </section>
    </div>
  );
}
