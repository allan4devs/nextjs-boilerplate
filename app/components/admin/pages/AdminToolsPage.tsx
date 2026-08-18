"use client";

import { useState } from "react";
import { Database, Loader2, ShieldAlert, Wrench } from "lucide-react";
import { RESET_CONFIRMATION_PHRASE } from "@/lib/xtreme/seed-policy";
import { GameLabel } from "../../GameOS";
import { useAdmin } from "../context/AdminProvider";

type SeedResponse = {
  insertedMembers?: number;
  insertedPayments?: number;
  pin?: string;
  error?: string;
};

export function AdminToolsPage() {
  const [confirmation, setConfirmation] = useState("");
  const {
    data: { data, load },
    feedback: { busy, setBusy, setError, setMessage },
  } = useAdmin();

  if (!data || data.role !== "super") return null;

  if (process.env.NODE_ENV === "production") {
    return (
      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-5 sm:p-6">
        <GameLabel>Herramientas bloqueadas</GameLabel>
        <h2 className="mt-2 text-xl font-black uppercase">No disponibles en producción</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold text-white/50">
          Seed y reset solo se habilitan en ambientes de desarrollo para proteger los datos reales.
        </p>
      </section>
    );
  }

  async function runSeed(wipeAll: boolean) {
    if (wipeAll) {
      if (confirmation !== RESET_CONFIRMATION_PHRASE) return;
      const accepted = window.confirm(
        "Esto elimina socios, PIN, pagos, ingresos y reservas antes de cargar datos demo. ¿Continuar?",
      );
      if (!accepted) return;
    }

    setBusy(wipeAll ? "reset" : "seed");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wipeAll,
          confirmation: wipeAll ? confirmation : undefined,
        }),
      });
      const json = (await response.json()) as SeedResponse;
      if (!response.ok) throw new Error(json.error ?? "No se pudieron generar los datos demo.");

      setConfirmation("");
      setMessage(
        `Listo: ${json.insertedMembers ?? 0} socios y ${json.insertedPayments ?? 0} pagos demo. PIN demo: ${json.pin ?? "—"}.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron generar los datos demo.");
    } finally {
      setBusy("");
    }
  }

  const resetReady = confirmation === RESET_CONFIRMATION_PHRASE;

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="border-[3px] border-amber-300/35 bg-amber-300/[0.06] p-5 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-6">
        <div className="flex items-start gap-3">
          <Wrench className="mt-0.5 h-6 w-6 shrink-0 text-amber-200" />
          <div>
            <GameLabel tone="yellow">Solo desarrollo · Super admin</GameLabel>
            <h2 className="mt-2 text-2xl font-black uppercase">Herramientas de datos</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-white/55">
              Operaciones aisladas del trabajo diario. Revisá el alcance antes de ejecutarlas.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border-[3px] border-lime-300/35 bg-lime-300/[0.04] p-5 sm:p-6">
          <Database className="h-7 w-7 text-lime-300" />
          <h3 className="mt-3 text-xl font-black uppercase">Regenerar datos demo</h3>
          <p className="mt-2 text-sm font-bold leading-relaxed text-white/50">
            Elimina únicamente registros marcados como demo y vuelve a crear el conjunto de prueba.
            Los datos reales no deberían tocarse.
          </p>
          <button
            type="button"
            onClick={() => void runSeed(false)}
            disabled={Boolean(busy)}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 border-[3px] border-lime-300 bg-lime-300 px-4 py-3 text-xs font-black uppercase text-black transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "seed" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Regenerar demo
          </button>
        </section>

        <section className="border-[3px] border-red-400/45 bg-red-500/[0.07] p-5 sm:p-6">
          <ShieldAlert className="h-7 w-7 text-red-300" />
          <h3 className="mt-3 text-xl font-black uppercase text-red-100">Reset total</h3>
          <p className="mt-2 text-sm font-bold leading-relaxed text-red-100/65">
            Borra todos los socios, PIN, pagos, ingresos, reservas y tareas de recepción. Después
            carga datos demo. Esta acción no se puede deshacer desde el panel.
          </p>
          <label
            htmlFor="reset-confirmation"
            className="mt-5 block text-[11px] font-black uppercase tracking-[.12em] text-red-200"
          >
            Escribí {RESET_CONFIRMATION_PHRASE} para habilitar
          </label>
          <input
            id="reset-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-2 min-h-12 w-full border-[3px] border-red-300/40 bg-black/40 px-3 py-2 font-mono text-sm font-black uppercase text-white outline-none transition placeholder:text-white/20 focus:border-red-300"
            placeholder={RESET_CONFIRMATION_PHRASE}
          />
          <button
            type="button"
            onClick={() => void runSeed(true)}
            disabled={Boolean(busy) || !resetReady}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 border-[3px] border-red-400 bg-red-500/15 px-4 py-3 text-xs font-black uppercase text-red-100 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busy === "reset" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            Ejecutar reset total
          </button>
        </section>
      </div>
    </div>
  );
}
