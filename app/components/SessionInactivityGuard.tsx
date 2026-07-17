"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SESSION_IDLE_TIMEOUT_MS } from "@/lib/xtreme/session-policy";

const CHECK_INTERVAL_MS = 15_000;
const ACTIVITY_WRITE_THROTTLE_MS = 5_000;
const HEARTBEAT_THROTTLE_MS = 60_000;

type SessionTarget =
  | { kind: "member"; storageKey: string; logoutUrl: string }
  | { kind: "staff"; storageKey: string; logoutUrl: string };

function targetForPath(pathname: string): SessionTarget | null {
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    return {
      kind: "member",
      storageKey: "xtreme-member-last-activity",
      logoutUrl: "/api/xtreme/session",
    };
  }

  const staffSurface = pathname.startsWith("/recepcion")
    ? "reception"
    : pathname.startsWith("/ingreso")
      ? "ingreso"
      : pathname.startsWith("/entrenador")
        ? "trainer"
        : pathname.startsWith("/admin")
          ? "admin"
          : null;

  return staffSurface
    ? {
        kind: "staff",
        storageKey: `xtreme-${staffSurface}-last-activity`,
        logoutUrl: `/api/xtreme/staff-session?surface=${staffSurface}`,
      }
    : null;
}

/**
 * Cierra la cookie de sesión tras diez minutos sin actividad humana.
 * localStorage sincroniza la actividad entre pestañas para no cerrar una sesión
 * que el usuario todavía está usando en otra ventana.
 */
export default function SessionInactivityGuard() {
  const pathname = usePathname();
  const loggingOutRef = useRef(false);

  useEffect(() => {
    const target = targetForPath(pathname);
    if (!target) return;

    let lastActivity = Date.now();
    let lastPersistedAt = 0;
    let lastHeartbeatAt = Date.now();

    try {
      const stored = Number(window.localStorage.getItem(target.storageKey));
      if (Number.isFinite(stored) && stored > 0) lastActivity = stored;
      else window.localStorage.setItem(target.storageKey, String(lastActivity));
    } catch {
      // El contador en memoria sigue protegiendo la sesión en modo privado.
    }

    const recordActivity = () => {
      const now = Date.now();
      lastActivity = now;
      if (now - lastPersistedAt < ACTIVITY_WRITE_THROTTLE_MS) return;
      lastPersistedAt = now;
      try {
        window.localStorage.setItem(target.storageKey, String(now));
      } catch {
        // El contador local sigue funcionando aunque no haya almacenamiento.
      }
      if (now - lastHeartbeatAt >= HEARTBEAT_THROTTLE_MS) {
        lastHeartbeatAt = now;
        void fetch(target.logoutUrl, { cache: "no-store", credentials: "same-origin" });
      }
    };

    const logoutIfInactive = async () => {
      if (loggingOutRef.current) return;
      try {
        const stored = Number(window.localStorage.getItem(target.storageKey));
        if (Number.isFinite(stored) && stored > lastActivity) lastActivity = stored;
      } catch {
        // Usar el último valor en memoria.
      }
      if (Date.now() - lastActivity < SESSION_IDLE_TIMEOUT_MS) return;

      loggingOutRef.current = true;
      try {
        await fetch(target.logoutUrl, { method: "DELETE", credentials: "same-origin" });
      } finally {
        try {
          window.localStorage.removeItem(target.storageKey);
        } catch {
          // La recarga completa igualmente limpia el estado visible de la app.
        }
        window.location.reload();
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== target.storageKey) return;
      const next = Number(event.newValue);
      if (Number.isFinite(next) && next > lastActivity) lastActivity = next;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void logoutIfInactive();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "wheel",
      "scroll",
    ];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true }),
    );
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", logoutIfInactive);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(() => void logoutIfInactive(), CHECK_INTERVAL_MS);
    void logoutIfInactive();

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", logoutIfInactive);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
      loggingOutRef.current = false;
    };
  }, [pathname]);

  return null;
}
