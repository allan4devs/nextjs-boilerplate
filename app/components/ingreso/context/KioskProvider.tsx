"use client";

/**
 * Raíz de composición del kiosco de ingreso.
 *
 * Publica lo que la pantalla comparte de punta a punta: el veredicto del
 * ingreso y el estado del guiado facial. El kiosco no tiene sesión de staff
 * —está fijo en la entrada y lo usa quien llega—, así que a diferencia del
 * Admin OS y de recepción, acá no hay capa de autenticación que componer.
 *
 * Fuera del contexto queda lo efímero: el modo abierto, el buscador y la ficha
 * en pantalla, que cambian con cada tecla y con cada persona que pasa.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCheckinFlash, type CheckinFlash } from "@/app/features/checkin/flash";
import {
  useKioskFaceScan,
  type KioskFaceScan,
} from "@/app/features/checkin/hooks/useKioskFaceScan";

export type KioskContextValue = {
  face: KioskFaceScan;
  flash: CheckinFlash | null;
  setFlash: (flash: CheckinFlash | null) => void;
  clearFlash: () => void;
};

const KioskContext = createContext<KioskContextValue | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const face = useKioskFaceScan();
  const { flash, setFlash, clearFlash } = useCheckinFlash();

  const value = useMemo<KioskContextValue>(
    () => ({ face, flash, setFlash, clearFlash }),
    [face, flash, setFlash, clearFlash],
  );

  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

function useKioskContext(): KioskContextValue {
  const value = useContext(KioskContext);
  if (!value) throw new Error("useKiosk* debe usarse dentro de <KioskProvider>.");
  return value;
}

export const useKiosk = useKioskContext;

/** Solo el guiado facial: lo que necesita la tarjeta de cámara. */
export function useKioskFace(): KioskFaceScan {
  return useKioskContext().face;
}
