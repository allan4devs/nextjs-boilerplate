"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaRuntime() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const isIos = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

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

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone || localStorage.getItem("xtreme-pwa-install-dismissed") === "1") return;

    const visitedThisSession = sessionStorage.getItem("xtreme-pwa-visit-counted") === "1";
    const visits = Number(localStorage.getItem("xtreme-pwa-visits") || "0") + (visitedThisSession ? 0 : 1);
    localStorage.setItem("xtreme-pwa-visits", String(visits));
    sessionStorage.setItem("xtreme-pwa-visit-counted", "1");
    if (visits < 2) return;

    const iosPromptTimer = isIos ? window.setTimeout(() => setShowInstall(true), 0) : undefined;

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    return () => {
      if (iosPromptTimer) window.clearTimeout(iosPromptTimer);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
    };
  }, [isIos]);

  if (!showInstall) return null;

  const dismiss = () => {
    localStorage.setItem("xtreme-pwa-install-dismissed", "1");
    setShowInstall(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setShowInstall(false);
    setInstallPrompt(null);
  };

  return (
    <aside className="fixed bottom-20 left-4 right-4 z-[70] mx-auto max-w-md border border-[#f6c400]/50 bg-[#111] p-5 text-white shadow-2xl md:bottom-5">
      <p className="text-xs font-black uppercase tracking-[.18em] text-[#f6c400]">Xtreme en tu pantalla</p>
      <p className="mt-2 font-black uppercase">Instalá la app del gym</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
        {isIos
          ? "Tocá Compartir y luego ‘Agregar a pantalla de inicio’."
          : "Abrí tus reservas, racha y progreso como una app, sin buscar el sitio."}
      </p>
      <div className="mt-4 flex gap-2">
        {!isIos && installPrompt && (
          <button type="button" onClick={() => void install()} className="bg-[#f6c400] px-4 py-2 text-sm font-black uppercase text-black">
            Instalar
          </button>
        )}
        <button type="button" onClick={dismiss} className="border border-white/15 px-4 py-2 text-sm font-black uppercase text-white/60">
          Ahora no
        </button>
      </div>
    </aside>
  );
}
