"use client";

import { useEffect } from "react";
import { useAdmin } from "../context/AdminProvider";
import { useGamificationForms } from "../hooks/useGamificationForms";
import { GamificacionTab } from "../tabs/GamificacionTab";

export function AdminGamificationPage() {
  const {
    auth: { role },
    data: { gami, loadGami },
    feedback: { busy, setBusy, setError, setMessage },
  } = useAdmin();
  const forms = useGamificationForms();

  useEffect(() => {
    if (role) void loadGami();
  }, [role, loadGami]);

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
