"use client";

import { useCallback, useMemo, useState } from "react";
import type { AdminRole } from "../types";
import { adminFetch, adminRequestError } from "../request";
import type { AdminFeedback } from "./useAdminFeedback";

export type AdminAuth = {
  /**
   * Rol confirmado por el servidor una vez adentro; cadena vacía mientras no
   * haya sesión. Sirve como "¿está autenticado?" y como "¿qué puede ver?".
   */
  role: AdminRole | "";
  isSuper: boolean;
  /** Cada admin entra con su PIN individual y la sesión conserva su identidad. */
  staffName: string;
  /** Lo que la persona está tecleando en la pantalla de ingreso. */
  codeInput: string;
  isSigningIn: boolean;
  setCodeInput: (value: string) => void;
  setRole: (role: AdminRole | "") => void;
  setStaffName: (value: string) => void;
  /** Abre la sesión de staff. Devuelve si quedó adentro, sin cargar datos. */
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const SESSION_ENDPOINT = "/api/xtreme/staff-session";

/**
 * Sesión de staff del Admin OS y nada más: entrar, salir, y quién quedó
 * adentro. No sabe qué datos hay que traer después de entrar — eso lo decide
 * el provider, y así esta capa no depende de la de datos.
 */
export function useAdminAuth(feedback: AdminFeedback): AdminAuth {
  const [role, setRole] = useState<AdminRole | "">(() =>
    process.env.NODE_ENV === "production" ? "" : "super",
  );
  const [staffName, setStaffName] = useState(() =>
    process.env.NODE_ENV === "production" ? "" : "Allan",
  );
  const [codeInput, setCodeInput] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const { setError } = feedback;

  const signIn = useCallback(async () => {
    const accessCode = codeInput.trim();
    if (!accessCode) return false;
    setIsSigningIn(true);
    setError("");
    try {
      const response = await adminFetch(SESSION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: "admin", code: accessCode }),
      });
      const json = (await response.json()) as { error?: string; staffName?: string | null };
      if (!response.ok) throw new Error(json.error || "Codigo incorrecto.");
      setStaffName(json.staffName ?? "");
      setCodeInput("");
      return true;
    } catch (err) {
      setError(adminRequestError(err, "No se pudo iniciar sesion."));
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, [codeInput, setError]);

  const signOut = useCallback(async () => {
    try {
      const response = await adminFetch(`${SESSION_ENDPOINT}?surface=admin`, { method: "DELETE" });
      if (!response.ok) throw new Error("El servidor no pudo cerrar la sesión.");
      setRole("");
      setStaffName("");
    } catch (err) {
      setError(adminRequestError(err, "No se pudo cerrar la sesión en el servidor."));
    }
  }, [setError]);

  return useMemo(
    () => ({
      role,
      isSuper: role === "super",
      staffName,
      codeInput,
      isSigningIn,
      setCodeInput,
      setRole,
      setStaffName,
      signIn,
      signOut,
    }),
    [codeInput, isSigningIn, role, signIn, signOut, staffName],
  );
}
