"use client";

import { useEffect, useState } from "react";

/** Refresco por defecto: los rótulos "hace X" del panel se leen en segundos. */
const DEFAULT_INTERVAL_MS = 30_000;

/**
 * El reloj como estado, no como `Date.now()` en pleno render.
 *
 * Leer la hora durante el render hace que el componente no sea idempotente: dos
 * renders con los mismos datos dan resultados distintos. Acá el tiempo entra
 * como cualquier otra suscripción a un sistema externo, y de paso los "hace 2
 * min" se actualizan solos en vez de quedar congelados hasta el próximo fetch.
 */
export function useNow(intervalMs: number = DEFAULT_INTERVAL_MS): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
