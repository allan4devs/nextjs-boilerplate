"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

export default function PartnerSsoPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("t") ?? "";
    if (!token) {
      setError("El enlace de acceso no contiene un token.");
      return;
    }
    void fetch("/api/integraciones/v1/token", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "No se pudo iniciar tu sesión en Xtreme.");
      }
      window.location.replace("/app");
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No se pudo iniciar tu sesión."));
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#050505] px-5 text-white">
      <section className="max-w-md border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-6 text-center shadow-[6px_6px_0_#d8ff3e]">
        {error ? <><ShieldAlert className="mx-auto h-10 w-10 text-red-300" /><h1 className="mt-4 text-xl font-black uppercase">No se pudo abrir Xtreme</h1><p className="mt-2 text-sm font-bold text-white/60">{error}</p></> : <><Loader2 className="mx-auto h-9 w-9 animate-spin text-[#d8ff3e]" /><h1 className="mt-4 text-xl font-black uppercase">Iniciando tu sesión...</h1><p className="mt-2 text-sm font-bold text-white/50">Este enlace es de un solo uso.</p></>}
      </section>
    </main>
  );
}
