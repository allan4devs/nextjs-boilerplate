"use client";

import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { AdminData, AdminRole, GamiData } from "../types";
import { adminFetch, adminRequestError } from "../request";
import type { AdminFeedback } from "./useAdminFeedback";

export type AdminDataSource = {
  data: AdminData | null;
  gami: GamiData | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  detailsError: string;
  isLoadingGami: boolean;
  gamiError: string;
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
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [isLoadingGami, setIsLoadingGami] = useState(false);
  const [gamiError, setGamiError] = useState("");
  const detailsRequestId = useRef(0);
  const gamiRequestId = useRef(0);

  const { setError } = feedback;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await adminFetch("/api/xtreme/admin?scope=core", { cache: "no-store" });
      if (response.status === 401) {
        detailsRequestId.current += 1;
        setIsLoadingDetails(false);
        setError("Codigo incorrecto.");
        onUnauthorized();
        setData(null);
        return;
      }
      const json = (await response.json()) as AdminData & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo cargar.");
      setData(json);
      onRole(json.role);

      const requestId = ++detailsRequestId.current;
      setIsLoadingDetails(true);
      setDetailsError("");
      void (async () => {
        try {
          const fullResponse = await adminFetch("/api/xtreme/admin", { cache: "no-store" });
          if (fullResponse.status === 401) {
            onUnauthorized();
            setData(null);
            throw new Error("La sesión de admin venció. Ingresá de nuevo.");
          }
          const fullJson = (await fullResponse.json()) as AdminData & { error?: string };
          if (!fullResponse.ok) {
            throw new Error(fullJson.error ?? "No se pudieron cargar los detalles del panel.");
          }
          if (detailsRequestId.current === requestId) setData(fullJson);
        } catch (err) {
          if (detailsRequestId.current === requestId) {
            setDetailsError(adminRequestError(err, "No se pudieron cargar los detalles del panel."));
          }
        } finally {
          if (detailsRequestId.current === requestId) setIsLoadingDetails(false);
        }
      })();
    } catch (err) {
      detailsRequestId.current += 1;
      setIsLoadingDetails(false);
      setError(adminRequestError(err, "Error de conexion."));
    } finally {
      setIsLoading(false);
    }
  }, [onRole, onUnauthorized, setError]);

  const loadGami = useCallback(async () => {
    const requestId = ++gamiRequestId.current;
    setIsLoadingGami(true);
    setGamiError("");
    try {
      const response = await adminFetch("/api/xtreme/admin/gamification", { cache: "no-store" });
      if (response.status === 401) {
        onUnauthorized();
        setData(null);
        setGami(null);
        throw new Error("La sesión de admin venció. Ingresá de nuevo.");
      }
      const json = (await response.json()) as GamiData & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo cargar gamificacion.");
      if (gamiRequestId.current === requestId) setGami(json);
    } catch (err) {
      const message = adminRequestError(err, "Error cargando gamificacion.");
      if (gamiRequestId.current === requestId) {
        setGamiError(message);
        setError(message);
      }
    } finally {
      if (gamiRequestId.current === requestId) setIsLoadingGami(false);
    }
  }, [onUnauthorized, setError]);

  return useMemo(
    () => ({
      data,
      gami,
      isLoading,
      isLoadingDetails,
      detailsError,
      isLoadingGami,
      gamiError,
      setData,
      setGami,
      load,
      loadGami,
    }),
    [
      data,
      detailsError,
      gami,
      gamiError,
      isLoading,
      isLoadingDetails,
      isLoadingGami,
      load,
      loadGami,
    ],
  );
}
