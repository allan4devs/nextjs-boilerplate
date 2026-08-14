"use client";

import { useCallback, useState } from "react";

const SESSION_ENDPOINT = "/api/xtreme/staff-session";
const SURFACE = "reception";

export type SignInResult =
  | { ok: true; role: string; staffName: string }
  | { ok: false; error: string };

/**
 * Sesión de staff del mostrador: Verónica o Valeska entran con su código y la
 * sesión conserva quién es.
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
    signIn,
    acceptSession,
    signOut,
  };
}

export type ReceptionSession = ReturnType<typeof useReceptionSession>;
