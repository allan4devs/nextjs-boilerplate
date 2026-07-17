"use client";

/**
 * Banner suave del Member OS para activar push en este dispositivo.
 * Se muestra cuando el socio ya desbloqueó la sesión y aún no tiene avisos.
 * No es de comunidad: es para toda la app (entrenos, reservas, racha, etc.).
 */

import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import {
  enablePushOnThisDevice,
  getPushCapability,
  getPushDeviceState,
  showLocalTestNotification,
} from "@/app/lib/pushClient";

const DISMISS_KEY = "xtreme-push-optin-dismissed-v1";

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
      if (localStorage.getItem(DISMISS_KEY) === "1") {
        setVisible(false);
        return;
      }
      const [cap, device] = await Promise.all([getPushCapability(), getPushDeviceState()]);
      if (device.active && device.permission === "granted") {
        setVisible(false);
        return;
      }
      // Si el entorno no puede push (Safari iOS sin instalar), igual mostramos
      // el banner con el mensaje de capability al activar — o lo ocultamos si
      // es hard block sin solución en este browser.
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

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
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
    <aside className="xg-safe-bottom fixed bottom-[5.5rem] left-3 right-3 z-[65] mx-auto max-w-md border-[3px] border-[#d8ff3e]/45 bg-[#111] p-4 text-white shadow-[6px_6px_0_rgba(0,0,0,.55)] sm:left-4 sm:right-4 md:bottom-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center bg-[#d8ff3e] text-black">
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">
            Member OS · avisos
          </p>
          <p className="mt-1 text-sm font-black uppercase leading-tight">
            Activá notificaciones en este celular
          </p>
          <p className="mt-1.5 text-xs font-semibold leading-relaxed text-white/50">
            Racha, reservas, badges, plan del coach y renovación — aunque no tengas la app
            abierta. Separado del correo.
          </p>
          {error && (
            <p className="mt-2 text-[11px] font-bold leading-snug text-orange-200">{error}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void activate()}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#d8ff3e] px-4 py-2 text-xs font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Activar
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="min-h-11 border border-white/15 px-3 py-2 text-xs font-black uppercase text-white/50 transition hover:border-white/30 hover:text-white"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="grid h-8 w-8 shrink-0 place-items-center border border-white/15 text-white/40 transition hover:border-white/30 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
