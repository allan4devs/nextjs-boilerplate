"use client";

import { useCallback, useState } from "react";

const SESSION_ENDPOINT = "/api/xtreme/staff-session";
const ACCESS_ENDPOINT = "/api/xtreme/reception/access";
const SURFACE = "reception";

export type SignInResult =
  | { ok: true; role: string; staffName: string }
  | { ok: false; error: string; code?: string };

/** Un operador del selector de recepción. */
export type ReceptionOperator = {
  id: string;
  name: string;
  title: string;
  hasPin: boolean;
};

/**
 * Sesión de staff del mostrador.
 *
 * Dos caminos de entrada:
 *  - PIN por operador (Valeska, Victoria, Kengie, Allan): cada quien elige su
 *    nombre y entra con su PIN propio; la primera vez lo crea en el acto. El PIN
 *    de mostrador nunca da Admin OS.
 *  - Código de recepción compartido (fallback legacy).
 *
 * Solo autentica. Qué datos hay que traer después de entrar lo decide la
 * pantalla, así que esta capa no depende del panel ni de la cámara.
 */
export function useReceptionSession() {
  /** Mientras no hay sesión guarda lo tecleado; ya adentro, el rol confirmado. */
  const [adminCode, setAdminCode] = useState("");
  const [staffName, setStaffName] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const [operators, setOperators] = useState<ReceptionOperator[]>([]);
  const [operatorsLoaded, setOperatorsLoaded] = useState(false);

  const loadOperators = useCallback(async (): Promise<ReceptionOperator[]> => {
    try {
      const response = await fetch(ACCESS_ENDPOINT, { cache: "no-store" });
      const json = (await response.json()) as { operators?: ReceptionOperator[] };
      const list = json.operators ?? [];
      setOperators(list);
      return list;
    } catch {
      return [];
    } finally {
      setOperatorsLoaded(true);
    }
  }, []);

  /** Camino legacy: código de recepción compartido. */
  const signIn = useCallback(async (): Promise<SignInResult> => {
    const code = adminCode.trim();
    if (!code) return { ok: false, error: "Ingresá el código." };
    setIsUnlocking(true);
    setUnlockError("");
    try {
      const response = await fetch(SESSION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: SURFACE, code }),
      });
      const json = (await response.json()) as {
        error?: string;
        role?: string;
        staffName?: string | null;
      };
      if (!response.ok) return { ok: false, error: json.error || "Codigo incorrecto." };
      return { ok: true, role: json.role || SURFACE, staffName: json.staffName ?? "" };
    } catch {
      return { ok: false, error: "Error de conexion." };
    } finally {
      setIsUnlocking(false);
    }
  }, [adminCode]);

  /** Camino nuevo: PIN por operador. `mode` "verify" entra, "set" crea el PIN. */
  const submitPin = useCallback(
    async (mode: "verify" | "set", staffId: string, pin: string): Promise<SignInResult> => {
      if (!/^\d{4}$/.test(pin)) return { ok: false, error: "El PIN debe tener 4 dígitos." };
      setIsUnlocking(true);
      setUnlockError("");
      try {
        const response = await fetch(ACCESS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: mode, staffId, pin }),
        });
        const json = (await response.json()) as {
          error?: string;
          code?: string;
          role?: string;
          staffName?: string | null;
        };
        if (!response.ok) {
          return { ok: false, error: json.error || "No se pudo entrar.", code: json.code };
        }
        return { ok: true, role: json.role || SURFACE, staffName: json.staffName ?? "" };
      } catch {
        return { ok: false, error: "Error de conexión." };
      } finally {
        setIsUnlocking(false);
      }
    },
    [],
  );

  /** Deja la sesión abierta en la pantalla tras un `signIn` correcto. */
  const acceptSession = useCallback((role: string, name: string) => {
    setAdminCode(role);
    setStaffName(name);
    setUnlocked(true);
  }, []);

  const signOut = useCallback(async () => {
    await fetch(`${SESSION_ENDPOINT}?surface=${SURFACE}`, { method: "DELETE" });
    setUnlocked(false);
    setAdminCode("");
    setStaffName("");
    setOperatorsLoaded(false);
  }, []);

  return {
    adminCode,
    setAdminCode,
    staffName,
    setStaffName,
    unlocked,
    setUnlocked,
    unlockError,
    setUnlockError,
    isUnlocking,
    /** Para la restauración de sesión, que carga el panel sin pasar por signIn. */
    setIsUnlocking,
    operators,
    operatorsLoaded,
    loadOperators,
    signIn,
    submitPin,
    acceptSession,
    signOut,
  };
}

export type ReceptionSession = ReturnType<typeof useReceptionSession>;
