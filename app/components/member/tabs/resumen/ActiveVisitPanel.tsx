"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2, LogOut, Timer } from "lucide-react";
import { GameButton } from "../../../GameOS";
import type {
  ResumenActions,
  ResumenViewModel,
} from "../../view-models/useResumenViewModel";

type Props = {
  visit: NonNullable<ResumenViewModel["activeVisit"]>;
  onCheckout: ResumenActions["registerCheckout"];
};

function durationLabel(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours ? `${hours} h ` : ""}${minutes} min ${seconds} s`;
}

export default function ActiveVisitPanel({ visit, onCheckout }: Props) {
  const checkedInAtMs = new Date(visit.checkedInAt).getTime();
  const elapsedSeconds = () =>
    Math.max(0, Math.floor((Date.now() - checkedInAtMs) / 1_000));
  const [liveSeconds, setLiveSeconds] = useState(elapsedSeconds);

  useEffect(() => {
    const refresh = () => setLiveSeconds(elapsedSeconds());
    refresh();
    const id = window.setInterval(refresh, 1_000);
    return () => clearInterval(id);
  }, [checkedInAtMs]);

  const h = Math.floor(liveSeconds / 3_600);
  const m = Math.floor((liveSeconds % 3_600) / 60);
  const s = liveSeconds % 60;
  const urgente = visit.reminderDue;

  return (
    <section className="relative overflow-hidden border-[3px] border-[#d8ff3e] bg-[#060a01] shadow-[0_0_40px_rgba(216,255,62,0.12)]">
      {/* Glow de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#d8ff3e]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-[#d8ff3e]/5 blur-2xl"
      />

      {/* Barra de acento superior */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#d8ff3e] via-[#d8ff3e]/60 to-transparent" />

      <div className="relative p-4 sm:p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#d8ff3e]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#d8ff3e]" />
            Sesión activa
          </span>
          <span className="ml-auto text-[10px] font-bold text-white/35">
            desde {visit.checkedInAtLabel}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          {/* Timer */}
          <div>
            <div className="flex items-end gap-2">
              <Timer className="mb-1.5 h-6 w-6 shrink-0 text-[#d8ff3e]/60" />
              {h > 0 && (
                <>
                  <span className="text-5xl font-black tabular-nums leading-none text-white sm:text-6xl">
                    {h}
                  </span>
                  <span className="mb-1.5 text-xl font-black text-white/35">h</span>
                </>
              )}
              <span className="text-5xl font-black tabular-nums leading-none text-[#d8ff3e] sm:text-6xl">
                {String(m).padStart(h > 0 ? 2 : 1, "0")}
              </span>
              <span className="mb-1.5 text-xl font-black text-[#d8ff3e]/60">
                {h > 0 ? "m" : "min"}
              </span>
              <span className="text-5xl font-black tabular-nums leading-none text-[#d8ff3e] sm:text-6xl">
                {String(s).padStart(2, "0")}
              </span>
              <span className="mb-1.5 text-xl font-black text-[#d8ff3e]/60">s</span>
            </div>
            <p className="mt-1.5 text-xs font-bold text-white/40">
              {durationLabel(liveSeconds)} entrenando en Xtreme Gym
            </p>

            {/* Recordatorio */}
            <p
              className={`mt-3 flex items-start gap-2 text-xs font-bold leading-5 ${
                urgente ? "text-orange-200" : "text-white/35"
              }`}
            >
              <BellRing className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${urgente ? "" : "opacity-60"}`} />
              {urgente
                ? "¿Ya terminaste? Registrá tu salida para liberar el cupo."
                : `Recordatorio de salida a los ${visit.reminderAfterMinutes} min.`}
            </p>
          </div>

          {/* Acción */}
          <div className="flex flex-col gap-2">
            <GameButton
              variant={urgente ? "orange" : "lime"}
              onClick={onCheckout}
              disabled={visit.busy}
              className="min-w-[200px]"
            >
              {visit.busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              {visit.busy ? "Registrando..." : "Registrar mi salida"}
            </GameButton>
            {!urgente && (
              <p className="text-center text-[9px] font-bold uppercase tracking-[.12em] text-white/20">
                Sin apuro · actualizá cuando salgas
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
