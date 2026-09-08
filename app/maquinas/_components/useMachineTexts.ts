"use client";

import { useCallback, useEffect, useState } from "react";
import { MACHINE_LABELS_EVENT, MACHINE_LABELS_KEY, readMachineTexts, writeMachineTexts, type MachineTexts } from "./machine-label-store";

export function useMachineTexts() {
  const [labels, setLabels] = useState<MachineTexts>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try { setLabels(readMachineTexts()); setError(""); }
      catch { setError("No se pudieron sincronizar los nombres y códigos en este navegador. Reintentá antes de cerrar."); }
      setReady(true);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === MACHINE_LABELS_KEY || event.key === null) refresh();
    };
    refresh();
    window.addEventListener(MACHINE_LABELS_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(MACHINE_LABELS_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const updateTexts = useCallback((changes: MachineTexts) => {
    try { writeMachineTexts(changes); setError(""); return true; }
    catch { setError("No se guardó el cambio de nombre o código. El navegador no permitió sincronizarlo; reintentá."); return false; }
  }, []);
  return { labels, ready, error, updateTexts };
}
