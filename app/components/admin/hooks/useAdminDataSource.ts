"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { AdminData, AdminRole, GamiData } from "../types";
import type { AdminFeedback } from "./useAdminFeedback";

export type AdminDataSource = {
  data: AdminData | null;
  gami: GamiData | null;
  isLoading: boolean;
  /** Expuesto para las actualizaciones optimistas de las acciones del panel. */
  setData: Dispatch<SetStateAction<AdminData | null>>;
  setGami: Dispatch<SetStateAction<GamiData | null>>;
  load: () => Promise<void>;
  loadGami: () => Promise<void>;
};

type Options = {
  feedback: AdminFeedback;
  /** El servidor no reconoció la sesión: la capa de auth debe limpiarse. */
  onUnauthorized: () => void;
  /** Rol confirmado por el servidor, única fuente de verdad del permiso. */
  onRole: (role: AdminRole) => void;
};

/**
 * Lectura de datos del Admin OS. Solo sabe traer y cachear: no decide permisos
 * ni pinta nada, y avisa hacia afuera por callback cuando el servidor cambia el
 * estado de la sesión.
 */
export function useAdminDataSource({
  feedback,
  onUnauthorized,
  onRole,
}: Options): AdminDataSource {
  const [data, setData] = useState<AdminData | null>(null);
  const [gami, setGami] = useState<GamiData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { setError } = feedback;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/admin?scope=core", { cache: "no-store" });
      if (response.status === 401) {
        setError("Codigo incorrecto.");
        onUnauthorized();
        setData(null);
        return;
      }
      const json = (await response.json()) as AdminData & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo cargar.");
      setData(json);
      onRole(json.role);

      // El panel ya puede usarse con el núcleo operativo. Revenue, growth,
      // bitácora y salud llegan después sin mantener bloqueada la pantalla.
      void fetch("/api/xtreme/admin", { cache: "no-store" })
        .then(async (fullResponse) => {
          const fullJson = (await fullResponse.json()) as AdminData & { error?: string };
          if (fullResponse.ok) setData(fullJson);
        })
        .catch(() => {
          // El core permanece funcional aunque falle una métrica secundaria.
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion.");
    } finally {
      setIsLoading(false);
    }
  }, [onRole, onUnauthorized, setError]);

  const loadGami = useCallback(async () => {
    try {
      const response = await fetch("/api/xtreme/admin/gamification", { cache: "no-store" });
      const json = (await response.json()) as GamiData & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo cargar gamificacion.");
      setGami(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando gamificacion.");
    }
  }, [setError]);

  return useMemo(
    () => ({ data, gami, isLoading, setData, setGami, load, loadGami }),
    [data, gami, isLoading, load, loadGami],
  );
}
