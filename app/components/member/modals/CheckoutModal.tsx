"use client";

import { CreditCard } from "lucide-react";
import ExtremeGymCheckout from "@/app/ExtremeGymCheckout";
import { GameModal } from "../../GameOS";
import type { Member } from "../types";

export type CheckoutModalProps = {
  /** Plan a cobrar. `null` cierra el modal: sin plan no hay nada que pagar. */
  planId: string | null;
  onClose: () => void;
  member: Member;
  onSuccess: () => void | Promise<void>;
};

/**
 * Pago del plan sin salir del Member OS.
 *
 * El checkout se monta solo cuando hay un plan elegido, y con `key={planId}`
 * para que cambiar de plan arranque un checkout limpio en vez de reutilizar el
 * estado del anterior.
 */
export function CheckoutModal({ planId, onClose, member, onSuccess }: CheckoutModalProps) {
  return (
    <GameModal
      open={planId !== null}
      onClose={onClose}
      title="Activar acceso"
      subtitle="Pago en línea · sin salir del Member OS"
      icon={CreditCard}
      tone="lime"
      size="full"
    >
      {planId !== null && (
        <ExtremeGymCheckout
          key={planId}
          initialOption={planId}
          compact
          memberCheckout
          memberCustomer={{
            name: member.memberName,
            phone: member.phone,
            email: member.email,
          }}
          onSuccess={onSuccess}
        />
      )}
    </GameModal>
  );
}
