"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DoorOpen, Loader2, Lock, LogOut } from "lucide-react";
import IngresoKiosk from "@/app/components/ingreso/IngresoKiosk";
import { GameButton, GameLabel } from "@/app/components/GameOS";

export default function IngresoPage() {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/xtreme/staff-session?surface=ingreso", {
          cache: "no-store",
        });
        const json = (await response.json()) as { authenticated?: boolean };
        setUnlocked(Boolean(json.authenticated));
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/staff-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: "ingreso", code: code.trim() }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Codigo incorrecto.");
      setCode("");
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la sesion.");
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    await fetch("/api/xtreme/staff-session?surface=ingreso", { method: "DELETE" });
    setUnlocked(false);
  }

  if (checking && !unlocked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050505] text-[#d8ff3e]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="grid min-h-screen place-items-end bg-[#050505] text-white sm:place-items-center sm:p-4">
        <form
          onSubmit={(event) => void unlock(event)}
          className="w-full max-w-md border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-6 shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-8"
        >
          <div className="grid h-14 w-14 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
            <DoorOpen className="h-7 w-7" />
          </div>
          <GameLabel tone="lime" className="mt-4">Ingreso OS</GameLabel>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Puerta de ingreso</h1>
          <p className="mt-2 text-sm font-bold text-white/50">
            Sesion exclusiva del dispositivo de la puerta. Permanece activa durante 24 horas.
          </p>
          <label className="mt-6 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
            Codigo de staff
          </label>
          <div className="relative mt-2">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoFocus
              placeholder="Codigo de recepcion"
              className="min-h-12 w-full border-[3px] border-white/20 bg-black/40 py-3.5 pl-10 pr-4 font-bold outline-none focus:border-[#d8ff3e]"
            />
          </div>
          {error && <p className="mt-3 border-[3px] border-red-400/50 bg-red-500/10 p-3 text-sm font-bold text-red-300">{error}</p>}
          <GameButton type="submit" full className="mt-5" disabled={checking || !code.trim()}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activar modo ingreso"}
          </GameButton>
          <p className="mt-4 flex justify-center gap-4 text-xs font-bold text-white/35">
            <Link href="/recepcion" className="hover:text-white/70">Reception OS</Link>
            <Link href="/admin" className="hover:text-white/70">Admin OS</Link>
          </p>
        </form>
      </main>
    );
  }

  return (
    <div className="relative min-h-screen">
      <IngresoKiosk />
      <button
        type="button"
        onClick={() => void logout()}
        className="fixed bottom-3 right-3 z-50 inline-flex min-h-10 items-center gap-2 rounded-full bg-black/70 px-3 text-[10px] font-black uppercase text-white/45 backdrop-blur hover:text-white"
      >
        <LogOut className="h-3.5 w-3.5" /> Cerrar puerta
      </button>
    </div>
  );
}
