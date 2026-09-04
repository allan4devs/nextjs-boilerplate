"use client";

/**
 * Ingreso por rostro — SOLO terminal física de la puerta. Sin cámara de la PC:
 * el reconocimiento lo hace el equipo, y este panel lee su feed, registra los
 * ingresos y muestra un mensaje por cada rostro (detectado, ya adentro, sin
 * ligar, o error) más el resumen de la corrida.
 */
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DoorOpen,
  Loader2,
  RefreshCw,
  ScanFace,
  UserX,
  XCircle,
} from "lucide-react";
import { GameButton, GameCallout, GameChip, GameLabel } from "../GameOS";
import type {
  TerminalOutcome,
  TerminalOutcomeKind,
  TerminalSyncResult,
} from "@/lib/xtreme/face/terminal-sync";

const ENDPOINT = "/api/xtreme/face/terminal";
/** Cadencia del feed en vivo cuando el auto-sync está prendido. */
const AUTO_INTERVAL_MS = 4000;

type Status = { enabled: boolean; configured: boolean; host: string };

const KIND_STYLE: Record<TerminalOutcomeKind, { border: string; icon: typeof ScanFace; chip: "lime" | "default" | "orange" | "red"; label: string }> = {
  detected: { border: "border-[#d8ff3e]/55 bg-[#d8ff3e]/[0.06]", icon: CheckCircle2, chip: "lime", label: "Ingreso" },
  already_inside: { border: "border-white/15 bg-white/[0.03]", icon: DoorOpen, chip: "default", label: "Ya adentro" },
  unlinked: { border: "border-orange-300/55 bg-orange-300/[0.06]", icon: UserX, chip: "orange", label: "Sin ligar" },
  error: { border: "border-red-400/55 bg-red-400/[0.06]", icon: XCircle, chip: "red", label: "Error" },
};

export default function FaceTerminalPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<TerminalSyncResult | null>(null);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [auto, setAuto] = useState(false);
  const [lastAt, setLastAt] = useState<string>("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(ENDPOINT, { cache: "no-store" });
        if (res.ok) setStatus((await res.json()) as Status);
      } catch {
        /* soft */
      }
    })();
  }, []);

  const sync = useCallback(async (dryRun = false) => {
    setSyncing(true);
    setError("");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const json = (await res.json().catch(() => ({}))) as TerminalSyncResult & { error?: string };
      if (!res.ok) {
        setError(json.error || "No se pudo sincronizar con la terminal.");
        return;
      }
      setResult(json);
      setLastAt(new Date().toLocaleTimeString("es-CR"));
    } catch {
      setError("Error de conexión al sincronizar la terminal.");
    } finally {
      setSyncing(false);
    }
  }, []);

  // Feed en vivo: sincroniza de verdad (registra ingresos) en intervalo.
  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await sync(false);
    };
    void tick();
    const id = window.setInterval(() => void tick(), AUTO_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [auto, sync]);

  const outcomes = result?.outcomes ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <GameLabel tone="lime">Ingreso por rostro · terminal de la puerta</GameLabel>
          <h2 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-black uppercase leading-[1.05] tracking-tight">
            Rostros de la puerta
          </h2>
          <p className="mt-2 max-w-prose text-sm font-bold leading-6 text-white/45 text-pretty">
            El reconocimiento lo hace la terminal física. Acá se registran esos ingresos
            contra el padrón y se avisa cuál rostro quedó sin ligar a un socio.
          </p>
        </div>
        <span className="grid h-14 w-14 shrink-0 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black shadow-[4px_4px_0_rgba(0,0,0,.45)]">
          <ScanFace className="h-7 w-7" />
        </span>
      </div>

      {/* Estado de la integración */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-[3px] border-white/15 bg-black/40 p-3">
        <GameChip tone={status?.configured ? "lime" : "orange"}>
          {status?.configured ? "Conectada" : "Sin configurar"}
        </GameChip>
        {status?.host && (
          <span className="text-[11px] font-black uppercase tracking-wide text-white/45">
            {status.host}
          </span>
        )}
        {lastAt && (
          <span className="ml-auto text-[11px] font-bold text-white/35">Última lectura {lastAt}</span>
        )}
      </div>

      {!status?.configured && (
        <div className="mt-3">
          <GameCallout tone="orange" icon={AlertTriangle}>
            La terminal no está configurada. Cargá <code>XTREME_FACE_TERMINAL_ENABLED=1</code> y la
            contraseña de admin del equipo en el entorno, y reiniciá el server.
          </GameCallout>
        </div>
      )}

      {/* Controles */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <GameButton onClick={() => void sync(false)} disabled={syncing || !status?.configured}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sincronizar ahora
        </GameButton>
        <button
          type="button"
          onClick={() => void sync(true)}
          disabled={syncing || !status?.configured}
          className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 text-xs font-black uppercase text-white/70 hover:border-[#d8ff3e] hover:text-[#d8ff3e] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Previsualizar
        </button>
        <label className="ml-auto inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/60">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
            disabled={!status?.configured}
            className="h-4 w-4 accent-[#d8ff3e]"
          />
          Feed en vivo ({AUTO_INTERVAL_MS / 1000}s)
        </label>
      </div>

      {error && (
        <div className="mt-3">
          <GameCallout tone="red" icon={XCircle}>{error}</GameCallout>
        </div>
      )}

      {/* Resumen "todo" */}
      {result && (
        <div className={`mt-4 border-[3px] p-3 ${result.ok ? "border-[#d8ff3e]/40 bg-[#d8ff3e]/[0.05]" : "border-red-400/55 bg-red-400/[0.06]"}`}>
          <p className="text-sm font-black uppercase tracking-tight text-white/85">{result.summary.message}</p>
          {result.ok && result.summary.processed > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <GameChip tone="lime">{result.summary.detected} ingresos</GameChip>
              {result.summary.alreadyInside > 0 && <GameChip tone="default">{result.summary.alreadyInside} ya adentro</GameChip>}
              {result.summary.unlinked > 0 && <GameChip tone="orange">{result.summary.unlinked} sin ligar</GameChip>}
              {result.summary.errors > 0 && <GameChip tone="red">{result.summary.errors} con error</GameChip>}
            </div>
          )}
        </div>
      )}

      {/* Lista de rostros */}
      {outcomes.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {outcomes.map((o) => (
            <OutcomeRow key={`${o.enrollid}-${o.time}`} outcome={o} />
          ))}
        </ul>
      )}

      {result && result.ok && !outcomes.length && (
        <p className="mt-4 border-[3px] border-dashed border-white/10 py-6 text-center text-sm font-bold text-white/35">
          Sin rostros nuevos en la terminal.
        </p>
      )}
    </div>
  );
}

function OutcomeRow({ outcome }: { outcome: TerminalOutcome }) {
  const style = KIND_STYLE[outcome.kind];
  const Icon = style.icon;
  return (
    <li className={`flex items-start gap-3 border-[3px] p-3 ${style.border}`}>
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-[3px] border-black/25 bg-black/40">
        <Icon className="h-4 w-4 text-white/80" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <GameChip tone={style.chip}>{style.label}</GameChip>
          {outcome.matchedBy && (
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
              x {outcome.matchedBy === "cedula" ? "cédula" : outcome.matchedBy === "map" ? "mapa" : "nombre"}
            </span>
          )}
          {outcome.scans > 1 && (
            <span className="text-[10px] font-bold text-white/30">{outcome.scans} pasadas</span>
          )}
        </div>
        <p className="mt-1 text-sm font-bold leading-5 text-white/85 text-pretty">{outcome.message}</p>
        <p className="mt-0.5 text-[11px] font-bold text-white/30">
          enrollid {outcome.enrollid}
          {outcome.terminalName ? ` · ${outcome.terminalName}` : ""}
          {outcome.time ? ` · ${outcome.time}` : ""}
        </p>
      </div>
    </li>
  );
}
