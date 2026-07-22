"use client";

/**
 * Banner del Member OS para activar Web Push en este dispositivo.
 * Es insistente y persuasivo: si el socio da 'Ahora no', expira en 48 horas
 * para recordar los beneficios clave (racha, clases, salidas, badges).
 */

import { useCallback, useEffect, useState } from "react";
import { Bell, Flame, Loader2, Sparkles, X } from "lucide-react";
import {
  enablePushOnThisDevice,
  getPushCapability,
  getPushDeviceState,
  showLocalTestNotification,
} from "@/app/lib/pushClient";

const DISMISS_TIMESTAMP_KEY = "xtreme-push-optin-dismissed-at-v2";
const REPROMPT_DELAY_MS = 48 * 60 * 60 * 1000; // 48 horas

type Props = {
  unlocked: boolean;
  memberName: string;
};

export default function PushOptInBanner({ unlocked, memberName }: Props) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const evaluate = useCallback(async () => {
    if (!unlocked || !memberName) {
      setVisible(false);
      return;
    }
    try {
      const lastDismiss = localStorage.getItem(DISMISS_TIMESTAMP_KEY);
      if (lastDismiss && Date.now() - Number(lastDismiss) < REPROMPT_DELAY_MS) {
        setVisible(false);
        return;
      }
      const [cap, device] = await Promise.all([getPushCapability(), getPushDeviceState()]);
      if (device.active && device.permission === "granted") {
        setVisible(false);
        return;
      }
      if (cap.reason === "unsupported" || cap.reason === "insecure") {
        setVisible(false);
        return;
      }
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }, [unlocked, memberName]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  useEffect(() => {
    const evaluateAfterSettings = () => {
      if (document.visibilityState === "visible") void evaluate();
    };
    window.addEventListener("pageshow", evaluateAfterSettings);
    document.addEventListener("visibilitychange", evaluateAfterSettings);
    return () => {
      window.removeEventListener("pageshow", evaluateAfterSettings);
      document.removeEventListener("visibilitychange", evaluateAfterSettings);
    };
  }, [evaluate]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_TIMESTAMP_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  async function activate() {
    setBusy(true);
    setError("");
    try {
      await enablePushOnThisDevice();
      try {
        await showLocalTestNotification();
      } catch {
        // ok
      }
      setVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron activar los avisos.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <aside className="xg-safe-bottom fixed bottom-[5.5rem] left-3 right-3 z-[65] mx-auto max-w-md border-[3px] border-[#d8ff3e] bg-[#0a0f02] p-4 text-white shadow-[0_0_40px_rgba(216,255,62,0.25)] sm:left-4 sm:right-4 md:bottom-6">
      <div className="flex items-start gap-3">
        <span className="relative grid h-12 w-12 shrink-0 place-items-center bg-[#d8ff3e] text-black">
          <Bell className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-orange-500" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#d8ff3e]">
              <Sparkles className="h-3 w-3" /> Recomendado para ti
            </span>
          </div>
          <p className="mt-1 text-base font-black uppercase leading-snug tracking-tight text-white">
            ¡No te pierdas nada en Xtreme Gym!
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-white/70">
            Activá las notificaciones push en tu celular para recibir:
          </p>
          <ul className="mt-2 space-y-1 text-[11px] font-semibold text-white/60">
            <li className="flex items-center gap-1.5 text-white/80">
              <span className="text-[#d8ff3e]">⏰</span> Recordatorios ~1h antes de tus clases
            </li>
            <li className="flex items-center gap-1.5 text-white/80">
              <span className="text-orange-400">🔥</span> Alerta antes de perder tu racha de días
            </li>
            <li className="flex items-center gap-1.5 text-white/80">
              <span className="text-cyan-300">🚪</span> Recordatorio para registrar tu salida del gym
            </li>
          </ul>

          {error && (
            <p className="mt-2.5 border border-orange-400/40 bg-orange-400/10 p-2 text-[11px] font-bold text-orange-200">
              {error}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void activate()}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#d8ff3e] px-5 py-2 text-xs font-black uppercase tracking-wide text-black shadow-[3px_3px_0_rgba(0,0,0,1)] transition hover:bg-white active:translate-y-px disabled:opacity-45"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Activar notificaciones
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="min-h-11 border border-white/20 px-3 py-2 text-xs font-black uppercase text-white/50 transition hover:border-white/40 hover:text-white"
            >
              Recordarme luego
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="grid h-8 w-8 shrink-0 place-items-center border border-white/20 text-white/40 transition hover:border-white/40 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
