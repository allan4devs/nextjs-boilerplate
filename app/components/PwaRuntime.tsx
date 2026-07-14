"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Solo Member OS y Reception OS muestran el banner de instalar. */
function isInstallSurface(pathname: string) {
  if (pathname === "/app" || pathname.startsWith("/app/")) return true;
  if (pathname === "/recepcion" || pathname.startsWith("/recepcion/")) return true;
  if (pathname === "/ingreso" || pathname.startsWith("/ingreso/")) return true;
  return false;
}

function dismissKeyFor(pathname: string) {
  if (pathname === "/ingreso" || pathname.startsWith("/ingreso/")) {
    return "xtreme-pwa-install-dismissed-ingreso";
  }
  if (pathname === "/recepcion" || pathname.startsWith("/recepcion/")) {
    return "xtreme-pwa-install-dismissed-reception";
  }
  return "xtreme-pwa-install-dismissed-app";
}

function visitsKeyFor(pathname: string) {
  if (pathname === "/ingreso" || pathname.startsWith("/ingreso/")) {
    return "xtreme-pwa-visits-ingreso";
  }
  if (pathname === "/recepcion" || pathname.startsWith("/recepcion/")) {
    return "xtreme-pwa-visits-reception";
  }
  return "xtreme-pwa-visits-app";
}

function sessionKeyFor(pathname: string) {
  if (pathname === "/ingreso" || pathname.startsWith("/ingreso/")) {
    return "xtreme-pwa-visit-counted-ingreso";
  }
  if (pathname === "/recepcion" || pathname.startsWith("/recepcion/")) {
    return "xtreme-pwa-visit-counted-reception";
  }
  return "xtreme-pwa-visit-counted-app";
}

export default function PwaRuntime() {
  const pathname = usePathname() || "";
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const isIos = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const onOsSurface = isInstallSurface(pathname);
  const isReception = pathname === "/recepcion" || pathname.startsWith("/recepcion/");
  const isIngreso = pathname === "/ingreso" || pathname.startsWith("/ingreso/");

  // Service worker global (offline/push); el banner solo en OS.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch (error) {
        console.warn("Xtreme Gym PWA registration failed", error);
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  // Capturar el evento en cualquier ruta (el browser lo dispara una vez).
  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      const prompt = event as InstallPromptEvent;
      promptRef.current = prompt;
      setInstallPrompt(prompt);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onInstallPrompt);
  }, []);

  // Decidir si mostrar el banner solo en /app y /recepcion.
  useEffect(() => {
    if (!onOsSurface) {
      setShowInstall(false);
      return;
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone || localStorage.getItem(dismissKeyFor(pathname)) === "1") {
      setShowInstall(false);
      return;
    }

    const visitsKey = visitsKeyFor(pathname);
    const sessionKey = sessionKeyFor(pathname);
    const visitedThisSession = sessionStorage.getItem(sessionKey) === "1";
    const visits = Number(localStorage.getItem(visitsKey) || "0") + (visitedThisSession ? 0 : 1);
    localStorage.setItem(visitsKey, String(visits));
    sessionStorage.setItem(sessionKey, "1");

    if (visits < 2) {
      setShowInstall(false);
      return;
    }

    // Android: solo si ya hay prompt; iOS: instrucciones manuales.
    if (isIos || promptRef.current || installPrompt) {
      setShowInstall(true);
    } else {
      setShowInstall(false);
    }
  }, [onOsSurface, pathname, isIos, installPrompt]);

  if (!onOsSurface || !showInstall) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKeyFor(pathname), "1");
    setShowInstall(false);
  };

  const install = async () => {
    const prompt = installPrompt || promptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setShowInstall(false);
    setInstallPrompt(null);
    promptRef.current = null;
  };

  return (
    <aside className="xg-safe-bottom fixed bottom-20 left-3 right-3 z-[70] mx-auto max-h-[calc(100dvh-6rem)] max-w-md overflow-y-auto border border-[#f6c400]/50 bg-[#111] p-5 text-white shadow-2xl sm:left-4 sm:right-4 md:bottom-5">
      <p className="text-xs font-black uppercase tracking-[.18em] text-[#f6c400]">
        {isIngreso ? "Ingreso OS" : isReception ? "Reception OS" : "Member OS"}
      </p>
      <p className="mt-2 font-black uppercase">
        {isIngreso ? "Instalá Ingreso OS" : isReception ? "Instalá Reception OS" : "Instalá la app de socios"}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
        {isIos
          ? "Tocá Compartir y luego ‘Agregar a pantalla de inicio’."
          : isIngreso
            ? "Dejá el ingreso de la puerta activo como una app independiente."
            : isReception
            ? "Ingreso de socios y mostrador como app, sin buscar el sitio."
            : "Reservas, racha y progreso como una app, sin buscar el sitio."}
      </p>
      <div className="mt-4 flex gap-2">
        {!isIos && (installPrompt || promptRef.current) && (
          <button
            type="button"
            onClick={() => void install()}
            className="min-h-12 bg-[#f6c400] px-4 py-2 text-sm font-black uppercase text-black"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-12 border border-white/15 px-4 py-2 text-sm font-black uppercase text-white/60"
        >
          Ahora no
        </button>
      </div>
    </aside>
  );
}
