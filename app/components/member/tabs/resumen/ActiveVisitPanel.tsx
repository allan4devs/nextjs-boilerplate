"use client";

import { BellRing, DoorOpen, Loader2, LogOut } from "lucide-react";
import { GameButton, GameLabel } from "../../../GameOS";
import type {
  ResumenActions,
  ResumenViewModel,
} from "../../view-models/useResumenViewModel";

type Props = {
  visit: NonNullable<ResumenViewModel["activeVisit"]>;
  onCheckout: ResumenActions["registerCheckout"];
};

function durationLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  return `${hours} h${minutes ? ` ${minutes} min` : ""}`;
}

export default function ActiveVisitPanel({ visit, onCheckout }: Props) {
  return (
    <section className="relative overflow-hidden border-[3px] border-[#d8ff3e] bg-gradient-to-br from-[#d8ff3e]/20 via-[#10140a] to-[#070707] p-4 shadow-[6px_6px_0_rgba(216,255,62,.2)] sm:p-5">
      <div aria-hidden className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#d8ff3e]/15 blur-3xl" />
      <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <GameLabel tone="lime">Visita activa</GameLabel>
            <span className="inline-flex items-center gap-2 border-2 border-[#d8ff3e]/40 bg-black/35 px-2 py-1 text-[9px] font-black uppercase tracking-[.16em] text-[#eaff93]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#d8ff3e]" />
              Estás dentro
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center border-[3px] border-[#d8ff3e]/40 bg-black/35">
              <DoorOpen className="h-6 w-6 text-[#d8ff3e]" />
            </span>
            <div>
              <p className="text-2xl font-black uppercase sm:text-3xl">
                {durationLabel(visit.elapsedMinutes)} entrenando
              </p>
              <p className="mt-1 text-xs font-bold text-white/50">
                Ingreso registrado a las {visit.checkedInAtLabel}
              </p>
            </div>
          </div>
          <p className={`mt-4 flex items-start gap-2 text-xs font-bold ${visit.reminderDue ? "text-orange-200" : "text-white/45"}`}>
            <BellRing className="mt-0.5 h-4 w-4 shrink-0" />
            {visit.reminderDue
              ? "Si ya terminaste, registrá tu salida para mantener correcta la ocupación del gym."
              : `Te recordamos registrar la salida después de ${visit.reminderAfterMinutes} minutos.`}
          </p>
        </div>

        <GameButton
          variant={visit.reminderDue ? "orange" : "lime"}
          onClick={onCheckout}
          disabled={visit.busy}
          className="min-w-[220px]"
        >
          {visit.busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          {visit.busy ? "Registrando..." : "Registrar mi salida"}
        </GameButton>
      </div>
    </section>
  );
}
