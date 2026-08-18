const ADMIN_REQUEST_TIMEOUT_MS = 20_000;

/**
 * Evita que la interfaz del Admin OS quede bloqueada para siempre si una
 * solicitud pierde la conexión sin llegar a resolverse ni rechazarse.
 */
export function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(ADMIN_REQUEST_TIMEOUT_MS),
  });
}

export function adminRequestError(error: unknown, fallback: string) {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return "La solicitud tardó demasiado. Intentá de nuevo.";
  }
  return error instanceof Error ? error.message : fallback;
}
