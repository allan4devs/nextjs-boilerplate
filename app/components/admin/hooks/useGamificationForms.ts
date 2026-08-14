"use client";

import { useState } from "react";

export const EMPTY_MANUAL_BADGE = {
  name: "",
  description: "",
  tier: "gold",
  icon: "Medal",
};

export type ManualBadgeDraft = typeof EMPTY_MANUAL_BADGE;

export const EMPTY_ADJUST_FORM = { xpBonus: "0", freezesBonus: "0", weeklyGoal: "4" };

export type AdjustForm = typeof EMPTY_ADJUST_FORM;

/**
 * Los formularios del tab de gamificación: a quién se le otorga una medalla,
 * qué medalla manual se está creando y qué ajuste de XP/racha se va a aplicar.
 *
 * Van juntos porque se usan en la misma pantalla y sobre el mismo socio, pero
 * separados del contexto: es estado de captura, no datos del gimnasio.
 */
export function useGamificationForms() {
  const [gamiMemberQ, setGamiMemberQ] = useState("");
  const [selectedGamiMember, setSelectedGamiMember] = useState("");
  const [grantBadgeId, setGrantBadgeId] = useState("");
  const [manualBadge, setManualBadge] = useState<ManualBadgeDraft>(EMPTY_MANUAL_BADGE);
  const [adjustForm, setAdjustForm] = useState<AdjustForm>(EMPTY_ADJUST_FORM);

  return {
    gamiMemberQ,
    setGamiMemberQ,
    selectedGamiMember,
    setSelectedGamiMember,
    grantBadgeId,
    setGrantBadgeId,
    manualBadge,
    setManualBadge,
    adjustForm,
    setAdjustForm,
  };
}

export type GamificationForms = ReturnType<typeof useGamificationForms>;
