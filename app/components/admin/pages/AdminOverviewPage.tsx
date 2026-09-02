"use client";

import { useRouter } from "next/navigation";
import { adminHref } from "../constants";
import { useAdmin } from "../context/AdminProvider";
import { ResumenTab } from "../tabs/ResumenTab";
import { ReceptionPinAdminCard } from "./ReceptionPinAdminCard";
import type { AdminData } from "../types";

export function AdminOverviewPage() {
  const router = useRouter();
  const {
    auth: { role, setRole, setCodeInput },
    data: { data, setData, isLoading, load },
    feedback: { busy, setBusy, setError, setMessage },
  } = useAdmin();

  if (!data) return null;

  async function resolveOperationalAlert(fingerprint: string) {
    setBusy(`ops:${fingerprint}`);
    setError("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolveOpsAlert", fingerprint }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error || "No se pudo resolver la alerta.");
      setData((current) =>
        current
          ? { ...current, opsAlerts: current.opsAlerts?.filter((alert) => alert.fingerprint !== fingerprint) }
          : current,
      );
      setMessage("Alerta marcada como resuelta.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resolver la alerta.");
    } finally {
      setBusy("");
    }
  }

  async function notifyExpiring() {
    if (!role) return;
    setBusy("notify-all");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notifyExpiring" }),
      });
      const json = (await response.json()) as { sent?: number; eligible?: number; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudieron enviar los recordatorios.");
      setMessage(`Recordatorios enviados: ${json.sent}/${json.eligible} socios con correo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar recordatorios.");
    } finally {
      setBusy("");
    }
  }

  async function revokeAllStaffSessions(includeSelf = false) {
    if (data?.role !== "super") return;
    const confirmMsg = includeSelf
      ? "Solo cierra sesiones de STAFF (admin/recepción/ingreso/trainer), incluida la tuya. Las sesiones de SOCIOS en la app NO se tocan. ¿Seguís?"
      : "Solo cierra sesiones de STAFF (admin/recepción/ingreso/trainer), excepto la tuya. Las sesiones de SOCIOS en la app NO se tocan. ¿Seguís?";
    if (!window.confirm(confirmMsg)) return;
    setBusy("revoke-staff");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_all_staff_sessions", includeSelf }),
      });
      const json = (await response.json()) as {
        revoked?: number;
        mustRelogin?: boolean;
        staffSecurity?: AdminData["staffSecurity"];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "No se pudieron cerrar las sesiones.");
      if (json.mustRelogin) {
        setMessage(`Se cerraron ${json.revoked ?? 0} sesión(es). Volvé a entrar.`);
        await fetch("/api/xtreme/staff-session?surface=admin", { method: "DELETE" });
        setRole("");
        setCodeInput("");
        setData(null);
        return;
      }
      setMessage(
        `Listo: se cerraron ${json.revoked ?? 0} sesión(es) de staff. Socios en la app no se tocaron. Tu sesión de admin se mantuvo.`,
      );
      if (json.staffSecurity) {
        setData((current) => (current ? { ...current, staffSecurity: json.staffSecurity } : current));
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al revocar sesiones.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <ResumenTab
        data={data}
        isSuper={data.role === "super"}
        busy={busy}
        onNotifyExpiring={() => void notifyExpiring()}
        onResolveAlert={(fingerprint) => void resolveOperationalAlert(fingerprint)}
        onRevokeStaffSessions={(includeSelf) => void revokeAllStaffSessions(includeSelf)}
        onOpenTab={(tab) => router.push(adminHref(tab))}
        onReload={() => void load()}
        isLoading={isLoading}
      />
      <ReceptionPinAdminCard />
    </>
  );
}
