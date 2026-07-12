"use client";

/**
 * Tab Maquinas — guia de equipos: tarjetas que abren el modal
 * con ajuste, tips y errores, mas rutinas rapidas por objetivo.
 */

import { ShieldCheck, Target } from "lucide-react";
import { GameCallout, GameChip, GameLabel, GamePanel } from "../../GameOS";
import { GUIDE_WORKOUTS, MACHINE_GUIDE } from "../constants";
import type { MemberOs } from "../useMemberOs";

export default function MaquinasTab({ os }: { os: MemberOs }) {
  const { setOsModal } = os;

  return (
    <div className="xg-tab-in space-y-3 sm:space-y-4">
      <GameCallout tone="lime" icon={ShieldCheck}>
        <span className="font-black uppercase">Guía de máquinas · </span>
        Tocá una tarjeta para abrir el modal con ajuste, tips y errores. Entrená fuerte sin
        perder técnica.
      </GameCallout>

      <div className="grid grid-cols-3 gap-2">
        {["Ajuste", "Control", "Progreso"].map((item) => (
          <div
            key={item}
            className="border-[3px] border-white/20 bg-[#0c0c0c] p-2 text-center shadow-[3px_3px_0_rgba(0,0,0,.5)] sm:p-3"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#d8ff3e] sm:text-xs">
              {item}
            </p>
            <p className="mt-1 hidden text-[10px] font-bold text-white/45 sm:block">
              Antes de subir peso
            </p>
          </div>
        ))}
      </div>

      <GamePanel title="Rutinas rápidas" icon={Target} tone="orange" compact>
        <div className="space-y-2">
          {GUIDE_WORKOUTS.map((workout) => (
            <div
              key={workout.goal}
              className="border-[3px] border-white/15 bg-black/30 p-3"
            >
              <GameLabel tone="orange">{workout.goal}</GameLabel>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {workout.steps.map((step) => (
                  <GameChip key={step}>{step}</GameChip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GamePanel>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        {MACHINE_GUIDE.map((machine) => (
          <button
            key={machine.id}
            type="button"
            onClick={() => setOsModal({ kind: "machine", machineId: machine.id })}
            className="group overflow-hidden border-[3px] border-white/20 bg-[#0c0c0c] text-left shadow-[4px_4px_0_rgba(0,0,0,.55)] transition active:translate-x-px active:translate-y-px active:shadow-none"
          >
            <div className={`h-2 bg-gradient-to-r ${machine.accent}`} />
            <div className="p-3 sm:p-4">
              <GameLabel tone="white">{machine.zone} · {machine.level}</GameLabel>
              <h2 className="mt-1 text-sm font-black uppercase leading-tight sm:text-lg">
                {machine.name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-1">
                {machine.muscles.slice(0, 2).map((muscle) => (
                  <GameChip key={muscle} tone="lime">
                    {muscle}
                  </GameChip>
                ))}
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#d8ff3e] group-hover:underline">
                Abrir guía →
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
