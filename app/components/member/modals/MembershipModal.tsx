"use client";

import { CreditCard } from "lucide-react";
import { GameModal, GameStat } from "../../GameOS";
import { isOneDayPlanLabel } from "../helpers/membership";
import type { Member } from "../types";

export type MembershipModalProps = {
  open: boolean;
  onClose: () => void;
  member: Member;
  daysRemaining: number;
  totalDays: number;
  /** 0..100, cuánto queda del plan. */
  progress: number;
};

/**
 * Estado de la membresía del socio.
 *
 * El pase de un día se rotula distinto en todos lados —"1 día disponible" en vez
 * de una cuenta regresiva— porque no tiene sentido mostrarle un progreso de plan
 * a alguien que compró una sola entrada.
 */
export function MembershipModal({
  open,
  onClose,
  member,
  daysRemaining,
  totalDays,
  progress,
}: MembershipModalProps) {
  const isDayPass = isOneDayPlanLabel(member.membership.plan);

  return (
    <GameModal
      open={open}
      onClose={onClose}
      title={member.membership.plan}
      subtitle="Membresía"
      icon={CreditCard}
      tone="lime"
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <GameStat label="Estado" value={member.membership.status} tone="lime" />
        <GameStat
          label="Días"
          value={daysRemaining}
          hint={
            isDayPass
              ? "disponible"
              : daysRemaining > totalDays
                ? "acumulados"
                : `de ${totalDays}`
          }
          tone="orange"
        />
        <GameStat
          label={isDayPass ? "Acceso" : "Activo hasta"}
          value={isDayPass ? "1 día disponible" : member.membership.nextBillingDate}
          tone="cyan"
        />
        <div className="mt-4 border-[3px] border-white/15 bg-black/30 p-4 sm:col-span-3">
          <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
            <span className="text-white/55">Tiempo restante del plan</span>
            <span className="text-[#d8ff3e]">
              {isDayPass
                ? "1 día disponible"
                : daysRemaining > totalDays
                  ? `${daysRemaining} días acumulados`
                  : `${daysRemaining}/${totalDays} días`}
            </span>
          </div>
          <div className="mt-3 h-4 border-[3px] border-white/15 bg-black/50">
            <div
              className="h-full bg-gradient-to-r from-[#d8ff3e] to-cyan-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </GameModal>
  );
}
