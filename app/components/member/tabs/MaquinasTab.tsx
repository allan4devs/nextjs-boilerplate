"use client";

/**
 * Tab Máquinas — hub táctil por zona + tiles con foto del piso.
 * Tocá una máquina para abrir la guía (modal con fotos y video).
 */

import { useMemo, useState } from "react";
import {
  Dumbbell,
  HeartPulse,
  LayoutGrid,
  Play,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react";
import { GameChip, GameLabel } from "../../GameOS";
import { GUIDE_WORKOUTS, MACHINE_GUIDE } from "../constants";
import PanelHub, { type HubPanel } from "../PanelHub";
import type { MemberOs } from "../useMemberOs";

const ZONE_ICONS: Record<string, LucideIcon> = {
  Pierna: Dumbbell,
  Pecho: Target,
  Espalda: LayoutGrid,
  Hombro: ShieldCheck,
  "Full body": ShieldCheck,
  Cardio: HeartPulse,
};

export default function MaquinasTab({ os }: { os: MemberOs }) {
  const { setOsModal } = os;
  const [activeId, setActiveId] = useState<string | null>("maquinas");
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);

  const zones = useMemo(() => {
    const set = new Set(MACHINE_GUIDE.map((m) => m.zone));
    return Array.from(set);
  }, []);

  const filtered = zoneFilter
    ? MACHINE_GUIDE.filter((m) => m.zone === zoneFilter)
    : MACHINE_GUIDE;

  const withVideo = MACHINE_GUIDE.filter((m) => m.videoUrl).length;

  const machinesContent = (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setZoneFilter(null)}
          className={`shrink-0 border-[3px] px-3 py-2 text-xs font-black uppercase transition ${
            zoneFilter === null
              ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
              : "border-white/15 text-white/55 hover:border-white/30"
          }`}
        >
          Todas ({MACHINE_GUIDE.length})
        </button>
        {zones.map((zone) => (
          <button
            key={zone}
            type="button"
            onClick={() => setZoneFilter((z) => (z === zone ? null : zone))}
            className={`shrink-0 border-[3px] px-3 py-2 text-xs font-black uppercase transition ${
              zoneFilter === zone
                ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                : "border-white/15 text-white/55 hover:border-white/30"
            }`}
          >
            {zone}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {filtered.map((machine) => {
          const ZoneIcon = ZONE_ICONS[machine.zone] ?? Dumbbell;
          return (
            <button
              key={machine.id}
              type="button"
              onClick={() => setOsModal({ kind: "machine", machineId: machine.id })}
              className="group relative flex min-h-[168px] flex-col overflow-hidden border-[3px] border-white/20 bg-[#0c0c0c] text-left shadow-[4px_4px_0_rgba(0,0,0,.55)] transition active:translate-x-px active:translate-y-px active:shadow-none hover:border-[#d8ff3e]/50 sm:min-h-[180px]"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${machine.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/30" />
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${machine.accent}`} />
              <div className="relative flex flex-1 flex-col justify-between p-3 sm:p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`grid h-10 w-10 place-items-center bg-gradient-to-br ${machine.accent} text-black shadow-[2px_2px_0_rgba(0,0,0,.35)] sm:h-11 sm:w-11`}
                  >
                    <ZoneIcon className="h-5 w-5" />
                  </span>
                  {machine.videoUrl && (
                    <span className="inline-flex items-center gap-1 border-2 border-black/50 bg-black/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#d8ff3e]">
                      <Play className="h-3 w-3 fill-current" />
                      Video
                    </span>
                  )}
                </div>
                <div>
                  <GameLabel tone="white">
                    {machine.zone} · {machine.level}
                  </GameLabel>
                  <h2 className="mt-1 text-sm font-black uppercase leading-tight drop-shadow sm:text-base">
                    {machine.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {machine.muscles.slice(0, 2).map((muscle) => (
                      <GameChip key={muscle} tone="lime">
                        {muscle}
                      </GameChip>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#d8ff3e] group-hover:underline">
                    Abrir guía →
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm font-semibold text-white/45">
          No hay máquinas en esta zona todavía.
        </p>
      )}
    </div>
  );

  const rutinasContent = (
    <div className="grid gap-2 sm:grid-cols-2">
      {GUIDE_WORKOUTS.map((workout) => (
        <button
          key={workout.goal}
          type="button"
          onClick={() => {
            const firstStep = workout.steps[0];
            const match = MACHINE_GUIDE.find(
              (m) =>
                firstStep &&
                m.name.toLowerCase().includes(firstStep.toLowerCase().slice(0, 6)),
            );
            if (match) setOsModal({ kind: "machine", machineId: match.id });
          }}
          className="border-[3px] border-white/15 bg-black/30 p-3.5 text-left transition hover:border-orange-300/50 active:translate-x-px active:translate-y-px"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center border-2 border-black/30 bg-orange-300 text-black">
              <Target className="h-5 w-5" />
            </span>
            <GameLabel tone="orange">{workout.goal}</GameLabel>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {workout.steps.map((step) => (
              <GameChip key={step}>{step}</GameChip>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-orange-200/70">
            Tocá para empezar →
          </p>
        </button>
      ))}
    </div>
  );

  const tipsContent = (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {[
        {
          title: "Ajuste",
          body: "Asiento, tope y agarre antes del primer set. Si duele la articulación, bajá el peso.",
          tone: "border-[#d8ff3e]/40 bg-[#d8ff3e]/[0.08]",
          label: "text-[#d8ff3e]",
        },
        {
          title: "Control",
          body: "Bajá en 2–3 segundos. El ego del peso no paga el progreso.",
          tone: "border-cyan-300/40 bg-cyan-300/[0.08]",
          label: "text-cyan-300",
        },
        {
          title: "Video",
          body: "Cada guía tiene fotos del piso y un video de técnica. Miralo antes si es tu primera vez.",
          tone: "border-orange-300/40 bg-orange-300/[0.08]",
          label: "text-orange-300",
        },
      ].map((tip) => (
        <div key={tip.title} className={`border-[3px] p-4 ${tip.tone}`}>
          <p className={`text-sm font-black uppercase ${tip.label}`}>{tip.title}</p>
          <p className="mt-2 text-sm font-semibold text-white/60">{tip.body}</p>
        </div>
      ))}
    </div>
  );

  const panels: HubPanel[] = [
    {
      id: "maquinas",
      label: "Máquinas",
      hint: `${MACHINE_GUIDE.length} guías · ${withVideo} con video`,
      icon: Dumbbell,
      tone: "lime",
      badge: String(filtered.length),
      content: machinesContent,
    },
    {
      id: "rutinas",
      label: "Rápidas",
      hint: `${GUIDE_WORKOUTS.length} por objetivo`,
      icon: Target,
      tone: "orange",
      content: rutinasContent,
    },
    {
      id: "tips",
      label: "Tips",
      hint: "Ajuste · control · video",
      icon: ShieldCheck,
      tone: "cyan",
      content: tipsContent,
    },
  ];

  return (
    <div className="xg-tab-in">
      <PanelHub
        panels={panels}
        activeId={activeId}
        onActiveChange={setActiveId}
        title="Guía de máquinas"
        subtitle="Fotos del piso + videos de técnica — tocá y abrí la guía."
        header={
          <div className="border-[3px] border-[#d8ff3e]/35 bg-[#d8ff3e]/[0.07] p-3 sm:p-3.5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-[#d8ff3e] text-black">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-black uppercase">Entrená fuerte con técnica</p>
                <p className="mt-1 text-xs font-bold text-white/45">
                  Beneficio de socio: fotos reales del gym, ajuste, tips, errores y video de
                  referencia por equipo. Combiná con peso libre, cardio, VIP y zona funcional.
                </p>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
