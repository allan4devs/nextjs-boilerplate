"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useAdmin } from "../context/AdminProvider";
import { useGamificationForms } from "../hooks/useGamificationForms";
import { GamificacionTab } from "../tabs/GamificacionTab";

export function AdminGamificationPage() {
  const {
    auth: { role },
    data: { gami, loadGami, isLoadingGami, gamiError },
    feedback: { busy, setBusy, setError, setMessage },
  } = useAdmin();
  const forms = useGamificationForms();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (role) {
      setRequested(true);
      void loadGami();
    }
  }, [role, loadGami]);

  if (!gami && requested && !isLoadingGami) {
    return (
      <div className="border-[3px] border-orange-300/40 bg-orange-300/[0.06] p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-orange-300" />
        <h2 className="mt-3 text-xl font-black uppercase text-orange-100">
          Gamificación no respondió
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm font-bold text-white/50">
          {gamiError || "No se pudo cargar la información de gamificación."}
        </p>
        <button
          type="button"
          onClick={() => void loadGami()}
          className="mt-5 inline-flex min-h-11 items-center gap-2 border-[3px] border-orange-300 bg-orange-300 px-4 text-xs font-black uppercase text-black"
        >
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      </div>
    );
  }

  async function gamiAction(body: Record<string, unknown>, okMessage: string) {
    if (!role) return;
    setBusy("gami");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin/gamification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo procesar.");
      setMessage(okMessage);
      await loadGami();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de gamificación.");
    } finally {
      setBusy("");
    }
  }

  return (
    <GamificacionTab
      gami={gami}
      busy={busy}
      forms={forms}
      onGamiAction={gamiAction}
      onReloadGami={() => void loadGami()}
    />
  );
}
