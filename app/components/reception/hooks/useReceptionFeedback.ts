"use client";

import { useCallback, useMemo, useState } from "react";
import type { CheckinFlash } from "@/app/features/checkin/flash";

/** Alias histórico: el veredicto de ingreso es el mismo en las dos superficies. */
export type ReceptionFlash = CheckinFlash;


/**
 * Los dos canales con los que recepción se entera de algo: el error inline de
 * un formulario y el aviso grande del ingreso.
 */
export function useReceptionFeedback() {
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<ReceptionFlash | null>(null);

  /** Limpia ambos antes de arrancar una acción nueva. */
  const resetFeedback = useCallback(() => {
    setError("");
    setFlash(null);
  }, []);

  return useMemo(
    () => ({ error, setError, flash, setFlash, resetFeedback }),
    [error, flash, resetFeedback],
  );
}

export type ReceptionFeedback = ReturnType<typeof useReceptionFeedback>;
