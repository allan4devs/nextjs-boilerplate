"use client";

/**
 * Raíz de composición del panel de recepción.
 *
 * Publica por contexto lo que toda la pantalla comparte: la sesión de staff
 * (quién está en el mostrador) y los avisos al operador. Fuera del contexto
 * queda el estado efímero —el tab abierto, el buscador, el formulario de alta—
 * porque cambia con cada tecla y haría re-renderizar paneles que ni se ven.
 *
 * Mismo reparto que el Admin OS, a propósito: quien entienda una superficie
 * entiende la otra.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  useReceptionFeedback,
  type ReceptionFeedback,
} from "../hooks/useReceptionFeedback";
import {
  useReceptionSession,
  type ReceptionSession,
} from "../hooks/useReceptionSession";

export type ReceptionContextValue = {
  session: ReceptionSession;
  feedback: ReceptionFeedback;
};

const ReceptionContext = createContext<ReceptionContextValue | null>(null);

export function ReceptionProvider({ children }: { children: ReactNode }) {
  const session = useReceptionSession();
  const feedback = useReceptionFeedback();

  const value = useMemo<ReceptionContextValue>(
    () => ({ session, feedback }),
    [session, feedback],
  );

  return <ReceptionContext.Provider value={value}>{children}</ReceptionContext.Provider>;
}

function useReceptionContext(): ReceptionContextValue {
  const value = useContext(ReceptionContext);
  if (!value) throw new Error("useReception* debe usarse dentro de <ReceptionProvider>.");
  return value;
}

export const useReception = useReceptionContext;

/** Selectores por responsabilidad, para no suscribirse a lo que no se usa. */
export function useReceptionSessionContext(): ReceptionSession {
  return useReceptionContext().session;
}

export function useReceptionFeedbackContext(): ReceptionFeedback {
  return useReceptionContext().feedback;
}
