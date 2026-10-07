"use client";

import { MessageCircle } from "lucide-react";
import ExtremeGymCheckout from "@/app/ExtremeGymCheckout";
import { GameModal } from "../../GameOS";
import type { Member } from "../types";

export type CheckoutModalProps = {
  /** Plan a consultar. `null` cierra el modal. */
  planId: string | null;
  onClose: () => void;
  member: Member;
  onSuccess: () => void | Promise<void>;
};

/**
 * Contacto para activar el plan sin salir del Member OS.
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
      title="Activar acceso por WhatsApp"
      subtitle="Coordiná tu plan con recepción"
      icon={MessageCircle}
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
