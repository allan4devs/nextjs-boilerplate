"use client";

/**
 * Activar / desactivar Web Push en el dispositivo actual.
 * Pensado para PWA móvil: detecta iOS sin instalar, permisos bloqueados, etc.
 */

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2, Smartphone, Sparkles } from "lucide-react";
import {
  disablePushOnThisDevice,
  enablePushOnThisDevice,
  getPushCapability,
  getPushDeviceState,
  sendTestPush,
  showLocalTestNotification,
  type PushCapability,
} from "@/app/lib/pushClient";

type Props = {
  /** Solo se puede registrar push con sesión desbloqueada (cookie). */
  unlocked: boolean;
  compact?: boolean;
};

export default function PushNotificationsCard({ unlocked, compact = false }: Props) {
  const [capability, setCapability] = useState<PushCapability | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [cap, device] = await Promise.all([getPushCapability(), getPushDeviceState()]);
      setCapability(cap);
      setActive(device.active && device.permission === "granted");
    } catch {
      setCapability(null);
      setActive(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onEnable() {
    if (!unlocked) {
      setError("Desbloqueá tu sesión con el PIN para activar avisos en este celular.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await enablePushOnThisDevice();
      setActive(true);
      setStatus(result.message);
      // Prueba local inmediata: confirma permiso + SW sin depender del cron.
      try {
        await showLocalTestNotification();
      } catch {
        // El alta en el server ya quedó; la local es solo feedback.
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron activar las notificaciones.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const message = await disablePushOnThisDevice();
      setActive(false);
      setStatus(message);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron desactivar.");
    } finally {
      setBusy(false);
    }
  }

  async function onTestServer() {
    if (!unlocked) {
      setError("Necesitás sesión activa para el aviso de prueba del servidor.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const message = await sendTestPush();
      setStatus(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falló el aviso de prueba.");
    } finally {
      setBusy(false);
    }
  }

  const capMessage = capability?.message ?? "Revisando soporte de notificaciones...";
  const showIosHint = capability?.reason === "ios-not-standalone";
  const showDenied = capability?.reason === "permission-denied";
  const hardBlock =
    capability?.reason === "unsupported" ||
    capability?.reason === "insecure" ||
    capability?.reason === "not-configured";
  const softBlockHint = Boolean(capability && !capability.canSubscribe && !active && !hardBlock);

  return (
    <div
      className={`border-[3px] ${
        active
          ? "border-[#d8ff3e]/50 bg-[#d8ff3e]/[0.08]"
          : "border-white/15 bg-black/30"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center border-2 border-black/30 ${
            active ? "bg-[#d8ff3e] text-black" : "bg-white/10 text-white"
          }`}
        >
          {active ? <BellRing className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase sm:text-base">
            {active ? "Member OS en este celular" : "Activar avisos del Member OS"}
          </p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-white/50">
            Entrenos, reservas, salida del gym, recordatorio ~1 h antes de tu clase, badges, plan, racha y
            renovación - aunque la app esté cerrada. Separado del correo.
            {capability?.isStandalone ? " · App instalada ✓" : ""}
          </p>
        </div>
      </div>

      {!active && (
        <p
          className={`mt-3 text-xs font-bold leading-relaxed ${
            softBlockHint || hardBlock ? "text-orange-200/90" : "text-white/45"
          }`}
        >
          {capMessage}
        </p>
      )}

      {showIosHint && (
        <div className="mt-3 flex gap-2 border border-cyan-300/30 bg-cyan-300/10 p-3">
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
          <div className="text-xs font-semibold leading-relaxed text-cyan-100/90">
            <p className="font-black uppercase text-cyan-200">iPhone / iPad</p>
            <p className="mt-1">
              1) Safari → Compartir → <strong>Agregar a pantalla de inicio</strong>
              <br />
              2) Abrí Xtreme desde el ícono
              <br />
              3) Volvé acá y tocá Activar
            </p>
          </div>
        </div>
      )}

      {showDenied && (
        <p className="mt-3 text-xs font-bold leading-relaxed text-red-200/90">
          Permiso bloqueado. En Android: candado de la barra de dirección → Notificaciones →
          Permitir. En iOS: Ajustes → Xtreme Gym → Notificaciones.
        </p>
      )}

      {status && (
        <p className="mt-3 border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 px-3 py-2 text-xs font-bold text-[#eaff93]">
          {status}
        </p>
      )}
      {error && (
        <p className="mt-3 border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
          {error}
        </p>
      )}

      <div className={`mt-4 grid gap-2 ${active ? "sm:grid-cols-2" : ""}`}>
        {active ? (
          <>
            <button
              type="button"
              disabled={busy || !unlocked}
              onClick={() => void onTestServer()}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#d8ff3e] px-4 py-3 text-xs font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Probar aviso
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDisable()}
              className="inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-white/20 px-4 py-3 text-xs font-black uppercase text-white/70 transition hover:border-red-400/50 hover:text-red-200 disabled:opacity-45"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
              Desactivar aquí
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy || !unlocked || hardBlock}
            onClick={() => void onEnable()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#d8ff3e] px-4 py-3 text-sm font-black uppercase text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
            {!unlocked
              ? "Desbloqueá tu sesión primero"
              : showIosHint
                ? "Ya instalé la app - activar"
                : showDenied
                  ? "Reintentar permiso"
                  : hardBlock
                    ? "No disponible aquí"
                    : "Activar notificaciones"}
          </button>
        )}
      </div>

      {!unlocked && (
        <p className="mt-2 text-[11px] font-semibold text-white/35">
          Los avisos push van ligados a tu cuenta. Entrá con PIN y activá de nuevo.
        </p>
      )}
    </div>
  );
}
