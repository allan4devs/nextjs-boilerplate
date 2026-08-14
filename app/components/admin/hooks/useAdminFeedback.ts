"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Los tres canales con los que el Admin OS le habla al operador: qué está
 * ocupado, qué salió mal y qué salió bien. Es su propia responsabilidad porque
 * absolutamente toda acción del panel los toca, y así ninguna tiene que recibir
 * tres setters sueltos por parámetro.
 */
export type AdminFeedback = {
  /** Id de la operación en curso, ej. `ops:<fingerprint>`. Vacío = nada corriendo. */
  busy: string;
  error: string;
  message: string;
  setBusy: (value: string) => void;
  setError: (value: string) => void;
  setMessage: (value: string) => void;
  /** Limpia error y mensaje antes de arrancar una acción nueva. */
  reset: () => void;
};

export function useAdminFeedback(): AdminFeedback {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reset = useCallback(() => {
    setError("");
    setMessage("");
  }, []);

  return useMemo(
    () => ({ busy, error, message, setBusy, setError, setMessage, reset }),
    [busy, error, message, reset],
  );
}
