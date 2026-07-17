"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ClipboardList,
  Dumbbell,
  Loader2,
  Play,
  Plus,
  Save,
  Square,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { MACHINE_GUIDE } from "./catalog/machines";
import type { WorkoutExerciseDetail } from "./types";
import type { MemberOs } from "./useMemberOs";

function durationLabel(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PlanTrainingPanel({ os }: { os: MemberOs }) {
  const {
    unlocked,
    currentMember,
    savingTrainingId,
    startPlanWorkout,
    savePlanWorkout,
    finishPlanWorkout,
    cancelPlanWorkout,
  } = os;
  const plan = currentMember.trainingPlan;
  const active = currentMember.activePlanWorkout;
  const [draft, setDraft] = useState<WorkoutExerciseDetail[]>([]);
  const [selectedMachine, setSelectedMachine] = useState(MACHINE_GUIDE[0]?.id ?? "");
  const [now, setNow] = useState(Date.now());
  const [exerciseTimer, setExerciseTimer] = useState<{ index: number; startedAt: number } | null>(null);

  useEffect(() => {
    setDraft(active?.exercises ?? []);
    setExerciseTimer(null);
  }, [active?.id, active?.exercises]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!plan) {
    return (
      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-white/45" />
          <h2 className="text-lg font-black uppercase">Plan personalizado</h2>
        </div>
        <p className="mt-3 text-sm font-semibold text-white/45">
          Tu entrenador aun no te asigno un plan. Pedilo en recepcion y aparecera aca.
        </p>
      </div>
    );
  }

  function updateExercise(index: number, patch: Partial<WorkoutExerciseDetail>) {
    setDraft((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function addMachine() {
    const machine = MACHINE_GUIDE.find((entry) => entry.id === selectedMachine);
    if (!machine) return;
    setDraft((current) => [
      ...current,
      {
        id: `machine-${Date.now()}`,
        machineId: machine.id,
        machineName: machine.name,
        exerciseName: machine.name,
        sets: 3,
        reps: 10,
        weightKg: 0,
        seconds: 0,
        notes: "",
      },
    ]);
  }

  function stopExerciseTimer(entries = draft) {
    if (!exerciseTimer) return entries;
    const elapsed = Math.max(1, Math.round((Date.now() - exerciseTimer.startedAt) / 1000));
    const next = entries.map((entry, index) =>
      index === exerciseTimer.index ? { ...entry, seconds: entry.seconds + elapsed } : entry,
    );
    setDraft(next);
    setExerciseTimer(null);
    return next;
  }

  if (active) {
    const elapsedSeconds = Math.max(0, Math.floor((now - new Date(active.startedAt).getTime()) / 1000));
    const busy = savingTrainingId === "plan-finish";
    return (
      <section className="border-[3px] border-orange-300 bg-orange-300/[0.06] shadow-[5px_5px_0_rgba(253,186,116,.2)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-orange-300/40 bg-black/35 p-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">Entreno activo</p>
            <h2 className="mt-1 text-xl font-black uppercase">{active.trainingName}</h2>
            <p className="text-sm font-bold text-white/45">{active.planTitle}</p>
          </div>
          <div className="flex items-center gap-3 border-[3px] border-orange-300 bg-orange-300 px-4 py-2 text-black">
            <Timer className="h-5 w-5" />
            <span className="font-mono text-2xl font-black tabular-nums">{durationLabel(elapsedSeconds)}</span>
          </div>
        </header>

        <div className="space-y-3 p-3 sm:p-5">
          {draft.map((entry, index) => {
            const timing = exerciseTimer?.index === index;
            const liveSeconds = timing
              ? entry.seconds + Math.max(0, Math.floor((now - exerciseTimer.startedAt) / 1000))
              : entry.seconds;
            return (
              <article key={entry.id} className="border-[3px] border-white/15 bg-[#0b0b0b] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <input
                      value={entry.exerciseName}
                      onChange={(event) => updateExercise(index, { exerciseName: event.target.value })}
                      aria-label="Ejercicio"
                      className="w-full bg-transparent font-black uppercase outline-none focus:text-[#d8ff3e]"
                    />
                    <p className="truncate text-xs font-bold text-white/40">{entry.machineName || "Ejercicio libre"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (timing) stopExerciseTimer();
                      setDraft((current) => current.filter((_, i) => i !== index));
                    }}
                    className="p-2 text-white/35 hover:text-red-300"
                    aria-label="Quitar ejercicio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <NumberField label="Series" value={entry.sets} onChange={(sets) => updateExercise(index, { sets })} />
                  <NumberField label="Reps" value={entry.reps} onChange={(reps) => updateExercise(index, { reps })} />
                  <NumberField label="Peso kg" value={entry.weightKg} step="0.5" onChange={(weightKg) => updateExercise(index, { weightKg })} />
                  <div className="border border-white/15 bg-black/40 p-2">
                    <span className="block text-[9px] font-black uppercase text-white/35">Tiempo</span>
                    <span className="mt-1 block font-mono text-lg font-black text-orange-200">{durationLabel(liveSeconds)}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => timing ? stopExerciseTimer() : setExerciseTimer({ index, startedAt: Date.now() })}
                    disabled={Boolean(exerciseTimer && !timing)}
                    className={`inline-flex min-h-10 items-center gap-2 px-3 text-xs font-black uppercase ${timing ? "bg-orange-300 text-black" : "border border-orange-300/50 text-orange-200"} disabled:opacity-35`}
                  >
                    {timing ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {timing ? "Detener" : "Medir ejercicio"}
                  </button>
                  <input
                    value={entry.notes}
                    onChange={(event) => updateExercise(index, { notes: event.target.value })}
                    placeholder="Notas: ajuste, dolor, tecnica..."
                    className="min-h-10 min-w-[220px] flex-1 border border-white/15 bg-black/40 px-3 text-sm font-semibold outline-none focus:border-[#d8ff3e]"
                  />
                </div>
              </article>
            );
          })}

          <div className="flex flex-col gap-2 border-[3px] border-dashed border-white/15 p-3 sm:flex-row">
            <select
              value={selectedMachine}
              onChange={(event) => setSelectedMachine(event.target.value)}
              className="min-h-11 flex-1 bg-white px-3 font-bold text-black"
            >
              {MACHINE_GUIDE.map((machine) => <option key={machine.id} value={machine.id}>{machine.name} · {machine.zone}</option>)}
            </select>
            <button type="button" onClick={addMachine} className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-4 font-black uppercase text-black hover:bg-[#d8ff3e]">
              <Plus className="h-4 w-4" /> Agregar maquina
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => void savePlanWorkout(stopExerciseTimer())} className="inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-white/20 font-black uppercase text-white/70 hover:border-white/50">
              <Save className="h-4 w-4" /> Guardar avance
            </button>
            <button type="button" onClick={() => void cancelPlanWorkout()} className="inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-red-400/40 font-black uppercase text-red-300">
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button type="button" disabled={busy} onClick={() => void finishPlanWorkout(stopExerciseTimer())} className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#d8ff3e] px-4 font-black uppercase text-black disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Finalizar entreno
            </button>
          </div>
          <p className="text-xs font-semibold text-white/40">
            Para finalizar tiene que haber un ingreso registrado hoy. El tiempo, máquinas y repeticiones quedarán en tu historial.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-[3px] border-[#d8ff3e]/55 bg-[#d8ff3e]/[0.07] p-3 shadow-[4px_4px_0_rgba(216,255,62,0.2)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center bg-[#d8ff3e] text-black"><ClipboardList className="h-5 w-5" /></span>
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Plan de tu entrenador</p><h2 className="text-xl font-black uppercase">{plan.title}</h2></div>
        </div>
        <span className="text-sm font-black text-[#eaff93]">{plan.doneItems}/{plan.totalItems} · {plan.progressPct}%</span>
      </div>
      {plan.objective && <p className="mt-3 text-sm font-semibold text-white/60">Objetivo: {plan.objective}</p>}
      <div className="mt-4 h-2.5 border border-white/10 bg-black/45"><div className="h-full bg-[#d8ff3e]" style={{ width: `${plan.progressPct}%` }} /></div>
      {plan.coachNote && <p className="mt-4 border-l-2 border-[#d8ff3e]/40 pl-3 text-sm font-semibold italic text-white/55">{plan.coachNote}</p>}
      <div className="mt-5 grid gap-3">
        {plan.items.map((item, index) => (
          <article key={item.id} className={`border p-3 ${item.done ? "border-[#d8ff3e]/40 bg-[#d8ff3e]/[0.08]" : "border-white/10 bg-black/20"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className={`font-black uppercase ${item.done ? "text-white/55" : "text-white"}`}>{item.day || `Sesion ${index + 1}`}</h3>{item.focus && <span className="bg-white/10 px-2 py-0.5 text-[11px] font-black uppercase text-white/60">{item.focus}</span>}{item.targetMinutes > 0 && <span className="text-[11px] font-bold text-white/40">{item.targetMinutes} min</span>}</div>
                {item.exercises && <p className="mt-1 text-sm font-semibold text-white/55">{item.exercises}</p>}
                {!!item.prescribedExercises?.length && <div className="mt-2 flex flex-wrap gap-1.5">{item.prescribedExercises.map((exercise) => <span key={exercise.id} className="border border-white/10 px-2 py-1 text-[10px] font-bold text-white/50">{exercise.exerciseName} · {exercise.sets}x{exercise.reps}</span>)}</div>}
                {item.done && item.doneDate && <p className="mt-2 text-[11px] font-black uppercase text-[#eaff93]">Completado · {item.doneDate}</p>}
              </div>
              <button type="button" disabled={!unlocked || item.done || Boolean(savingTrainingId)} onClick={() => void startPlanWorkout(item)} className={`inline-flex min-h-11 items-center gap-2 px-4 text-xs font-black uppercase ${item.done ? "bg-[#d8ff3e] text-black" : "bg-orange-300 text-black hover:bg-white"} disabled:opacity-45`}>
                {savingTrainingId === `plan-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : item.done ? <Check className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
                {item.done ? "Hecho" : "Empezar"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NumberField({ label, value, step = "1", onChange }: { label: string; value: number; step?: string; onChange: (value: number) => void }) {
  return (
    <label className="border border-white/15 bg-black/40 p-2">
      <span className="block text-[9px] font-black uppercase text-white/35">{label}</span>
      <input type="number" min="0" step={step} value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="mt-1 w-full bg-transparent text-lg font-black outline-none" />
    </label>
  );
}
