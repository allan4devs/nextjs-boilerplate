"use client";

import { useCallback, useState } from "react";

/** Plan por defecto del alta en mostrador. */
export const DEFAULT_WALKIN_PLAN = "Xtreme Mensual";

/**
 * Formulario de alta / edición de socio en el mostrador.
 *
 * Los nueve campos viven juntos porque se limpian juntos: antes el "reset"
 * estaba escrito a mano en dos lugares con listas de campos distintas —uno
 * olvidaba el plan y el check-in—, así que editar a alguien y cancelar dejaba
 * restos del socio anterior en pantalla. Acá hay un solo `reset`.
 */
export function useWalkinForm() {
  const [regName, setRegName] = useState("");
  const [regCedula, setRegCedula] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPlan, setRegPlan] = useState(DEFAULT_WALKIN_PLAN);
  const [regLastPaidAt, setRegLastPaidAt] = useState("");
  const [regNextBillingDate, setRegNextBillingDate] = useState("");
  const [regPhoto, setRegPhoto] = useState("");
  const [regCheckIn, setRegCheckIn] = useState(true);
  const [editingMemberKey, setEditingMemberKey] = useState("");

  /** Deja el formulario como recién abierto, listo para la próxima persona. */
  const resetWalkin = useCallback(() => {
    setRegName("");
    setRegCedula("");
    setRegPhone("");
    setRegEmail("");
    setRegPlan(DEFAULT_WALKIN_PLAN);
    setRegLastPaidAt("");
    setRegNextBillingDate("");
    setRegPhoto("");
    setRegCheckIn(true);
    setEditingMemberKey("");
  }, []);

  return {
    regName,
    setRegName,
    regCedula,
    setRegCedula,
    regPhone,
    setRegPhone,
    regEmail,
    setRegEmail,
    regPlan,
    setRegPlan,
    regLastPaidAt,
    setRegLastPaidAt,
    regNextBillingDate,
    setRegNextBillingDate,
    regPhoto,
    setRegPhoto,
    regCheckIn,
    setRegCheckIn,
    editingMemberKey,
    setEditingMemberKey,
    resetWalkin,
  };
}

export type WalkinForm = ReturnType<typeof useWalkinForm>;
