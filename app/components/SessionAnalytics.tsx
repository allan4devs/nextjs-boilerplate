"use client";

/**
 * Bitácora de uso global: páginas visitadas, clicks en controles, heartbeat de sesión.
 * Montar en layouts de sitio público y Member OS.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  clickLabelFromElement,
  identifyUsageMember,
  setUsageSource,
  startUsageSession,
  trackClick,
  trackPageView,
  type AnalyticsSource,
} from "@/app/lib/analytics/session-client";

function resolveSource(path: string, preferred?: AnalyticsSource): AnalyticsSource {
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/recepcion")) return "reception";
  if (path.startsWith("/ingreso") || path.startsWith("/acceso")) return "kiosk";
  if (
    path.startsWith("/app") ||
    path.startsWith("/entrenador") ||
    path.startsWith("/comunidad")
  ) {
    return "member_app";
  }
  return preferred ?? "site";
}

export default function SessionAnalytics({
  source: preferredSource,
  memberName,
}: {
  source?: AnalyticsSource;
  memberName?: string;
}) {
  const pathname = usePathname() || "/";
  const source = resolveSource(pathname, preferredSource);
  const booted = useRef(false);

  useEffect(() => {
    setUsageSource(source);
    if (!booted.current) {
      booted.current = true;
      startUsageSession({ source, path: pathname, memberName });
    } else {
      trackPageView(pathname);
    }
  }, [pathname, source, memberName]);

  useEffect(() => {
    identifyUsageMember(memberName);
  }, [memberName]);

  // Clicks en controles interactivos (etiquetas cortas)
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest(
        "a,button,[role='button'],[data-analytics],input[type='submit'],input[type='button']",
      );
      if (!interactive) return;
      if (
        interactive instanceof HTMLInputElement &&
        !interactive.getAttribute("data-analytics")
      ) {
        return;
      }
      const label = clickLabelFromElement(interactive);
      const action =
        interactive.getAttribute("data-analytics-action") ||
        (interactive instanceof HTMLAnchorElement ? "nav" : "tap");
      trackClick(label, action);
    };
    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
