"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Resultado de un intento de ingreso, tal como lo ve quien está parado frente
 * a la pantalla. Lo comparten el mostrador y el kiosco porque es literalmente
 * el mismo veredicto: verde entró, ámbar entró pero hay algo que atender
 * (membresía por vencer), rojo no entró.
 *
 * Vive acá y no en cada superficie para que las dos no puedan discrepar sobre
 * qué significa cada color.
 */
export type CheckinFlash = {
  type: "ok" | "warn" | "err";
  title: string;
  subtitle: string;
};

export function useCheckinFlash() {
  const [flash, setFlash] = useState<CheckinFlash | null>(null);

  const clearFlash = useCallback(() => setFlash(null), []);

  return useMemo(() => ({ flash, setFlash, clearFlash }), [flash, clearFlash]);
}
