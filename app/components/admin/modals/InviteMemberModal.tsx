"use client";

import {
  Loader2,
  UserPlus,
  X,
} from "lucide-react";
import {
  GameButton,
  GameCallout,
  GameLabel,
} from "../../GameOS";
import type {
  AdminMember,
} from "../types";

export function InviteMemberModal({
  member,
  email,
  saving,
  onEmailChange,
  onClose,
  onConfirm,
}: {
  member: AdminMember;
  email: string;
  saving: boolean;
  onEmailChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const inputClass =
    "min-h-11 w-full border-[3px] border-white/20 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]";

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/85 px-3 py-6 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <section className="relative w-full max-w-lg border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-4 text-white shadow-[7px_7px_0_rgba(216,255,62,.2)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <GameLabel tone="lime">Solo super admin</GameLabel>
            <h2 className="mt-2 text-2xl font-black uppercase">Invitar a la app</h2>
            <p className="mt-1 text-sm font-bold text-white/50">{member.memberName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center border-[2px] border-white/15 text-white/55 hover:border-white/40 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <GameCallout tone="lime">
            Se guarda el correo en la ficha (sin verificar) y se manda un enlace de 24 h. Al
            confirmarlo, el correo queda verificado y unido a este socio - no crea ficha nueva.
          </GameCallout>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Correo</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="persona@correo.com"
              className={inputClass}
            />
          </label>
          {member.emailVerified ? (
            <p className="text-xs font-bold text-orange-300">
              Este socio ya tiene correo verificado. No hace falta invitarlo.
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-12 flex-1 border-[3px] border-white/15 px-4 text-xs font-black uppercase text-white/60 disabled:opacity-40"
          >
            Cancelar
          </button>
          <GameButton
            onClick={onConfirm}
            disabled={saving || !email.trim() || Boolean(member.emailVerified)}
            className="flex-1"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Enviar invitación
          </GameButton>
        </div>
      </section>
    </div>
  );
}
