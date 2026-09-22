"use client";

import { ArrowRight, Check, Layers3, Loader2, Shuffle, Sparkles, Users } from "lucide-react";
import type { TrainerOs } from "../hooks/useTrainerOs";
import type { TrainerProgram } from "../types";

const PROGRAM_TONE: Record<TrainerProgram["accent"], { border: string; glow: string; badge: string; button: string }> = {
  lime: { border: "border-[#d8ff3e]/45", glow: "from-[#d8ff3e]/15", badge: "bg-[#d8ff3e] text-black", button: "bg-[#d8ff3e] text-black" },
  cyan: { border: "border-cyan-300/45", glow: "from-cyan-300/15", badge: "bg-cyan-300 text-black", button: "bg-cyan-300 text-black" },
  orange: { border: "border-orange-300/45", glow: "from-orange-300/15", badge: "bg-orange-300 text-black", button: "bg-orange-300 text-black" },
  violet: { border: "border-violet-300/45", glow: "from-violet-300/15", badge: "bg-violet-300 text-black", button: "bg-violet-300 text-black" },
};

export function TrainerProgramsPanel({ os }: { os: TrainerOs }) {
  const currentProgramId = os.selected?.trainingProgramAssignment?.programId;
  return (
    <section className="mb-4 overflow-hidden border-[3px] border-white/15 bg-[#090909]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,.12),transparent_42%)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center bg-white text-black"><Layers3 className="h-5 w-5" /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Programas vivos en Mongo</p>
            <h2 className="mt-1 text-xl font-black uppercase sm:text-2xl">Entrenar por grupos, sin planes vacíos</h2>
            <p className="mt-1 max-w-3xl text-sm font-bold text-white/45">Cada grupo comparte la intención del entrenador; cada socio recibe una combinación estable de máquinas físicas disponibles.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void os.assignDefaults()}
          disabled={os.assigningPrograms || os.stats.withoutPlan === 0}
          className="inline-flex min-h-12 items-center gap-2 border-[3px] border-white bg-white px-4 text-xs font-black uppercase text-black transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e] disabled:opacity-35"
        >
          {os.assigningPrograms ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
          {os.stats.withoutPlan ? `Repartir ${os.stats.withoutPlan} sin plan` : "Todos tienen plan"}
        </button>
      </header>

      <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-4">
        {os.programs.map((program) => {
          const tone = PROGRAM_TONE[program.accent];
          const active = currentProgramId === program.id;
          const machineCount = program.sessions.reduce((sum, session) => sum + session.machines.length, 0);
          return (
            <article key={program.id} className={`relative overflow-hidden border-[3px] bg-[#0c0c0c] p-4 ${active ? tone.border : "border-white/10"}`}>
              <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow} via-transparent to-transparent`} />
              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-[.15em] ${tone.badge}`}>{program.level}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-white/45"><Users className="h-3.5 w-3.5" /> {program.memberCount}</span>
                </div>
                <h3 className="mt-4 text-xl font-black uppercase">{program.name}</h3>
                <p className="mt-2 min-h-10 text-xs font-bold leading-5 text-white/45">{program.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-1 border-y border-white/10 py-3 text-center">
                  <Metric value={program.weeklySessions} label="días/sem" />
                  <Metric value={program.durationWeeks} label="semanas" />
                  <Metric value={machineCount} label="estaciones" />
                </div>
                <p className="mt-3 text-[10px] font-bold leading-4 text-white/35">{program.audience}</p>
                <button
                  type="button"
                  onClick={() => void os.assignProgram(program.id)}
                  disabled={!os.selected || active || os.assigningPrograms}
                  className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 px-3 text-[10px] font-black uppercase transition disabled:border disabled:border-white/10 disabled:bg-transparent disabled:text-white/25 ${tone.button}`}
                >
                  {active ? <><Check className="h-4 w-4" /> Grupo actual</> : <><Sparkles className="h-4 w-4" /> Asignar a {os.selected?.memberName.split(" ")[0] || "socio"}<ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div><strong className="block text-lg font-black">{value}</strong><span className="text-[8px] font-black uppercase tracking-wider text-white/30">{label}</span></div>;
}

