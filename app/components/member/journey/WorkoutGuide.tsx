"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Plus } from "lucide-react";
import { MACHINE_GUIDE } from "../catalog/machines";
import type { MemberOs } from "../useMemberOs";
import type { WorkoutExerciseDetail } from "../types";

export default function WorkoutGuide({ os }: { os: MemberOs }) {
  const active = os.currentMember.activePlanWorkout ?? os.journey?.workout;
  if (!active) return null;
  return <WorkoutSteps key={`${active.id}:${os.currentMember.activePlanWorkout?.revision ?? os.journey?.version ?? 0}`} os={os} initial={active.exercises} />;
}

function WorkoutSteps({ os, initial }: { os: MemberOs; initial: WorkoutExerciseDetail[] }) {
  const plan = os.currentMember.activePlanWorkout;
  const active = plan ?? os.journey?.workout;
  const [draft, setDraft] = useState(initial.map((exercise) => ({ ...exercise, completed: exercise.completed ?? false })));
  const [selectedId, setSelectedId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [customName, setCustomName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = draft.find((entry) => entry.id === selectedId) ?? draft.find((entry) => !entry.completed);
  const machine = MACHINE_GUIDE.find((entry) => entry.id === next?.machineId);
  const completed = draft.filter((entry) => entry.completed).length;
  const allDone = draft.length > 0 && completed === draft.length;
  const change = (patch: Partial<WorkoutExerciseDetail>) => setDraft((current) => current.map((entry) => entry.id === next?.id ? { ...entry, ...patch, completed: false } : entry));

  async function save(entries = draft) {
    return plan ? os.savePlanWorkout(entries) : os.updateJourney("save", { exercises: entries });
  }
  async function markDone() {
    if (!next || busy) return;
    if (!((next.sets > 0 && next.reps > 0) || next.seconds > 0)) { setMessage("Registrá las series y repeticiones que hiciste, o el tiempo del ejercicio."); return; }
    setBusy(true);
    setMessage("");
    const updated = draft.map((entry) => entry.id === next.id ? { ...entry, completed: true } : entry);
    if (await save(updated)) {
      setDraft(updated);
      setSelectedId("");
      setMessage("Ejercicio guardado. Sigamos con el siguiente.");
    } else setMessage("No se guardó este ejercicio. Tu registro sigue aquí para reintentar.");
    setBusy(false);
  }
  async function add() {
    const selected = MACHINE_GUIDE.find((entry) => entry.id === machineId);
    const name = customName.trim() || selected?.name;
    if (!name || busy) return;
    setBusy(true);
    const exercise = { id: crypto.randomUUID(), machineId: selected?.id ?? "", machineName: selected?.name ?? "", exerciseName: name, sets: 0, reps: 0, weightKg: 0, seconds: 0, notes: "", completed: false };
    const updated = [...draft, exercise];
    if (await save(updated)) { setDraft(updated); setSelectedId(exercise.id); setCustomName(""); setMachineId(""); setMessage(""); }
    else setMessage("No se pudo agregar el ejercicio. Reintentá.");
    setBusy(false);
  }
  if (!active) return null;
  return <div className="space-y-5">
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-[#d8ff3e]">Estás trabajando · {active.trainingName}</p>
      <h2 className="mt-2 text-2xl font-black">{allDone ? "Terminaste tus ejercicios" : next ? next.exerciseName : "¿Con qué arrancamos?"}</h2>
      <p className="mt-2 text-sm text-white/50">{completed} de {draft.length} ejercicios guardados{machine ? ` · ${machine.zone}` : ""}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#d8ff3e] transition-all" style={{ width: `${draft.length ? completed / draft.length * 100 : 0}%` }} /></div>
    </header>
    <fieldset disabled={busy || Boolean(os.journeyBusy)} className="space-y-4 disabled:opacity-60">
      {next && <section className="space-y-4 rounded-xl border border-white/15 bg-white/[.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm text-white/60">{machine?.muscles.join(" · ") || "Ejercicio libre"}</p>
          {machine && <Link href={`/maquinas/${machine.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-[#d8ff3e]">Cómo usarla · fotos y video ↗</Link>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([['sets', 'Series', 20], ['reps', 'Repeticiones', 500], ['weightKg', 'Peso (kg)', 1000], ['seconds', 'Tiempo (seg)', 28800]] as const).map(([key, label, max]) => <label key={key} className="text-xs text-white/60">{label}<input type="number" min="0" max={max} step={key === "weightKg" ? "0.1" : "1"} value={next[key] || ""} onChange={(event) => change({ [key]: Number(event.target.value) })} className="mt-1 min-h-12 w-full min-w-0 rounded-lg border border-white/20 bg-black/40 px-3 text-base text-white" /></label>)}
        </div>
        <label className="block text-xs text-white/60">Notas / ajustes<input value={next.notes} maxLength={300} onChange={(event) => change({ notes: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-sm text-white" /></label>
        <button type="button" onClick={() => void markDone()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d8ff3e] px-3 font-black text-black"><Check className="h-4 w-4" />{busy ? "Guardando…" : "Lo hice · guardar y seguir"}</button>
        <button type="button" onClick={() => { const pending = draft.filter((item) => !item.completed && item.id !== next.id); if (pending[0]) setSelectedId(pending[0].id); else setMessage("Podés agregar otro ejercicio o quitar este si cambiaste de plan."); }} className="min-h-11 w-full text-sm text-white/55">Hacer otro primero</button>
        <button type="button" onClick={async () => { setBusy(true); const updated = draft.filter((item) => item.id !== next.id); if (await save(updated)) { setDraft(updated); setSelectedId(""); } else setMessage("No se pudo quitar. Reintentá."); setBusy(false); }} className="min-h-11 text-xs text-white/40">Quitar este ejercicio de la sesión</button>
      </section>}
      {!!draft.length && <details className="rounded-xl border border-white/15 p-3"><summary className="min-h-11 cursor-pointer text-sm font-bold">Mi recorrido de ejercicios</summary><ol className="space-y-2">{draft.map((entry, index) => <li key={entry.id}><button type="button" onClick={() => setSelectedId(entry.id)} className="flex min-h-11 w-full items-center gap-2 rounded-lg bg-white/5 p-3 text-left text-sm"><span className="text-[#d8ff3e]">{entry.completed ? <Check className="h-4 w-4" /> : `${index + 1}.`}</span><span className="min-w-0 flex-1 break-words">{entry.exerciseName}</span><ChevronRight className="h-4 w-4" /></button></li>)}</ol></details>}
      <details open={!draft.length} className="rounded-xl border border-white/15 p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-bold">Agregar ejercicio o máquina</summary>
        <div className="space-y-3">
          <label className="block text-xs text-white/60">Máquina<select value={machineId} onChange={(event) => setMachineId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg bg-[#171717] px-3 text-sm text-white"><option value="">Elegí una máquina o escribí un ejercicio</option>{MACHINE_GUIDE.map((entry) => <option value={entry.id} key={entry.id}>{entry.name} · {entry.zone}</option>)}</select></label>
          <label className="block text-xs text-white/60">Nombre del ejercicio (opcional si elegiste máquina)<input value={customName} maxLength={100} onChange={(event) => setCustomName(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-sm text-white" /></label>
          <button type="button" disabled={!machineId && !customName.trim() || draft.length >= 40} onClick={() => void add()} className="flex min-h-11 items-center gap-2 text-sm font-bold text-[#d8ff3e] disabled:opacity-40"><Plus className="h-4 w-4" />Agregar y guardar</button>
        </div>
      </details>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={async () => { setBusy(true); setMessage(await save() ? "Avance guardado. Podés retomar esta sesión al volver." : "No se guardó. Reintentá antes de salir."); setBusy(false); }} className="min-h-11 text-sm font-bold text-white/70">Guardar avance</button>
        <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-11 text-sm text-white/40">Cancelar entrenamiento</button>
        <button type="button" onClick={async () => { setBusy(true); try { await os.reloadFullMember(os.memberName, os.currentMember.cedula); os.reloadJourney(); setMessage("Sesión actualizada desde el servidor."); } catch { setMessage("No se pudo actualizar. Tus cambios siguen aquí."); } finally { setBusy(false); } }} className="min-h-11 text-xs text-white/40">Actualizar sesión guardada</button>
      </div>
      {confirmCancel && <div className="rounded-xl border border-orange-300/30 p-4"><p className="text-sm">¿Cancelar esta sesión sin registrarla como entrenamiento terminado?</p><div className="mt-2 flex gap-4"><button type="button" onClick={async () => { setBusy(true); if (plan) await os.cancelPlanWorkout(); else await os.updateJourney("cancel"); setBusy(false); }} className="min-h-11 text-sm text-orange-200">Sí, cancelar</button><button type="button" onClick={() => setConfirmCancel(false)} className="min-h-11 text-sm">Seguir entrenando</button></div></div>}
      {allDone && <button type="button" onClick={async () => {
        setBusy(true);
        const saved = plan ? await os.finishPlanWorkout(draft) : await os.updateJourney("finish", { exercises: draft });
        if (saved) os.reloadJourney();
        else setMessage("No se finalizó el entrenamiento. Tus ejercicios siguen aquí; reintentá.");
        setBusy(false);
      }} className="min-h-14 w-full rounded-xl bg-[#d8ff3e] px-4 font-black text-black">Finalizar entrenamiento y ver mi avance</button>}
    </fieldset>
    {message && <p role="status" className="text-sm text-orange-100">{message}</p>}
  </div>;
}
