"use client";

import { useMemo, useState } from "react";
import type { AdminMember } from "../types";

/** Sugerencias que caben en el desplegable sin taparlo todo. */
const MATCH_LIMIT = 8;

export const EMPTY_PAYMENT_FORM = {
  amountCrc: "",
  optionLabel: "Plan mensual",
  category: "Plan",
  method: "cash",
  note: "",
  extendMembership: true,
  extendDays: "30",
};

export type PaymentForm = typeof EMPTY_PAYMENT_FORM;

/**
 * Búsqueda de socio para un cobro de mostrador. Amplia a propósito: en caja la
 * persona puede dar el nombre, el correo, el teléfono, la cédula o el código,
 * y quien atiende no debería tener que adivinar por cuál buscar.
 */
function matchPaymentMembers(members: readonly AdminMember[], rawQuery: string) {
  const query = rawQuery.trim().toUpperCase();
  if (!query) return [];
  const digits = query.replace(/\D/g, "");

  return members
    .filter(
      (member) =>
        member.memberName.toUpperCase().includes(query) ||
        member.normalizedName.includes(query) ||
        member.email.toUpperCase().includes(query) ||
        member.phone.includes(digits || query) ||
        Boolean(digits && String(member.cedula || "").replace(/\D/g, "").includes(digits)) ||
        Boolean(digits && member.accessCode.replace(/\s/g, "").includes(digits)),
    )
    .slice(0, MATCH_LIMIT);
}

/**
 * Borrador de un cobro presencial: a quién se le cobra y con qué condiciones.
 * Estado de formulario, o sea de interfaz, así que vive en un hook y no en el
 * contexto del Admin OS.
 */
export function usePaymentDraft(members: readonly AdminMember[] | undefined) {
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM);
  const [paymentMemberQuery, setPaymentMemberQuery] = useState("");
  const [selectedPaymentMember, setSelectedPaymentMember] = useState<AdminMember | null>(null);

  // Con un socio ya elegido no se sugiere nada: la búsqueda cumplió su función.
  const paymentMemberMatches = useMemo(
    () =>
      !members || selectedPaymentMember
        ? []
        : matchPaymentMembers(members, paymentMemberQuery),
    [members, paymentMemberQuery, selectedPaymentMember],
  );

  return {
    paymentForm,
    setPaymentForm,
    paymentMemberQuery,
    setPaymentMemberQuery,
    selectedPaymentMember,
    setSelectedPaymentMember,
    paymentMemberMatches,
  };
}

export type PaymentDraft = ReturnType<typeof usePaymentDraft>;
