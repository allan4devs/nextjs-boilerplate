"use client";

/**
 * Raíz de composición del Admin OS.
 *
 * Reúne las tres responsabilidades que toda la pantalla comparte —sesión de
 * staff, datos del servidor y feedback al operador— y las publica por contexto.
 * Lo que NO vive acá es el estado efímero de la interfaz (filtros, paginación,
 * qué modal está abierto, borradores a medio llenar): eso es de la pantalla que
 * lo usa y meterlo en el contexto haría re-renderizar a todos por cada tecla.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useAdminAuth, type AdminAuth } from "../hooks/useAdminAuth";
import { useAdminDataSource, type AdminDataSource } from "../hooks/useAdminDataSource";
import { useAdminFeedback, type AdminFeedback } from "../hooks/useAdminFeedback";

export type AdminContextValue = {
  auth: AdminAuth;
  data: AdminDataSource;
  feedback: AdminFeedback;
  /** Entra y, si quedó adentro, trae los datos del panel. */
  login: () => Promise<void>;
  /** Cierra la sesión y deja la pantalla sin datos del turno anterior. */
  logout: () => Promise<void>;
  /** Cargando por cualquier motivo: entrando o trayendo datos. */
  isBusy: boolean;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const feedback = useAdminFeedback();
  const auth = useAdminAuth(feedback);
  const { setRole } = auth;

  // El servidor manda: si rechaza la sesión, la capa de auth se limpia sola.
  const handleUnauthorized = useCallback(() => setRole(""), [setRole]);
  const data = useAdminDataSource({
    feedback,
    onUnauthorized: handleUnauthorized,
    onRole: setRole,
  });

  const { load } = data;
  const { signIn, signOut } = auth;
  const { setData, setGami } = data;

  const login = useCallback(async () => {
    if (await signIn()) await load();
  }, [load, signIn]);

  const logout = useCallback(async () => {
    await signOut();
    setData(null);
    setGami(null);
  }, [setData, setGami, signOut]);

  // Sesión ya abierta en este navegador: se retoma sin pedir el código.
  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/xtreme/staff-session?surface=admin", {
        cache: "no-store",
      });
      const session = (await response.json()) as {
        authenticated?: boolean;
        staffName?: string | null;
      };
      if (session.authenticated) {
        auth.setStaffName(session.staffName ?? "");
        await load();
      }
    })();
    // Solo al montar: retomar la sesión una vez, no en cada cambio de auth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const value = useMemo<AdminContextValue>(
    () => ({
      auth,
      data,
      feedback,
      login,
      logout,
      isBusy: data.isLoading || auth.isSigningIn,
    }),
    [auth, data, feedback, login, logout],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

function useAdminContext(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin* debe usarse dentro de <AdminProvider>.");
  return value;
}

/** Todo el contexto. Para pantallas que necesitan sesión, datos y feedback. */
export const useAdmin = useAdminContext;

/**
 * Selectores por responsabilidad: un componente que solo muestra errores no
 * tiene por qué recibir también la sesión y el padrón entero.
 */
export function useAdminAuthContext(): AdminAuth {
  return useAdminContext().auth;
}

export function useAdminData(): AdminDataSource {
  return useAdminContext().data;
}

export function useAdminFeedbackContext(): AdminFeedback {
  return useAdminContext().feedback;
}
