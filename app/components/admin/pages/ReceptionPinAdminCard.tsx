"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, RotateCcw } from "lucide-react";
import { GameLabel } from "../../GameOS";
import { useAdmin } from "../context/AdminProvider";

type Operator = { id: string; name: string; title: string; hasPin: boolean };

/**
 * Restablecer el PIN de mostrador de un operador (Valeska, Victoria, Kengie,
 * Allan). Solo super admin. Deja el PIN en blanco: la persona crea uno nuevo la
 * próxima vez que entre a recepción y sus sesiones abiertas se cierran.
 */
export function ReceptionPinAdminCard() {
  const {
    data: { data },
    feedback: { setError, setMessage },
  } = useAdmin();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/xtreme/reception/access", { cache: "no-store" });
      const json = (await res.json()) as { operators?: Operator[] };
      setOperators(json.operators ?? []);
    } catch {
      /* soft */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data || data.role !== "super") return null;

  async function reset(op: Operator) {
    if (!window.confirm(`Restablecer el PIN de mostrador de ${op.name}? Tendrá que crear uno nuevo.`)) {
      return;
    }
    setBusyId(op.id);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/xtreme/reception/access?staffId=${encodeURIComponent(op.id)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        revokedSessions?: number;
        operators?: Operator[];
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo restablecer el PIN.");
      if (json.operators) setOperators(json.operators);
      else await load();
      const sessions = json.revokedSessions
        ? ` Se cerraron ${json.revokedSessions} sesión(es) abiertas.`
        : "";
      setMessage(`PIN de mostrador restablecido para ${op.name}.${sessions}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restablecer el PIN.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mt-4 border-[3px] border-cyan-300/40 bg-cyan-300/[0.05] p-4 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-6 w-6 shrink-0 text-cyan-300" />
        <div className="min-w-0">
          <GameLabel tone="cyan">PIN de mostrador</GameLabel>
          <h2 className="mt-1 text-lg font-black uppercase text-cyan-50">Recepción por operador</h2>
          <p className="mt-1 max-w-2xl text-xs font-bold leading-relaxed text-white/50">
            Cada operador entra a recepción con su PIN propio (nunca con el código de admin).
            Restablecelo si alguien lo olvidó o dejó el puesto: la próxima vez creará uno nuevo.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {!loaded && (
          <div className="col-span-full flex min-h-14 items-center justify-center border-[3px] border-white/10 bg-black/40 text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {loaded &&
          operators.map((op) => (
            <div
              key={op.id}
              className="flex items-center justify-between gap-3 border-[3px] border-white/10 bg-black/40 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase">{op.name}</p>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                    op.hasPin ? "text-cyan-200/70" : "text-white/30"
                  }`}
                >
                  {op.hasPin ? "PIN activo" : "Sin PIN"}
                </p>
              </div>
              <button
                type="button"
                disabled={!op.hasPin || busyId === op.id}
                onClick={() => void reset(op)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 border-[3px] border-cyan-300/45 bg-cyan-300/10 px-3 py-2 text-[11px] font-black uppercase text-cyan-100 transition hover:bg-cyan-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
              >
                {busyId === op.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Restablecer
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
