"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Clock3, Heart, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import MachineVideo from "@/app/maquinas/_components/MachineVideo";
import { physicalMachinePath } from "@/app/lib/physical-machine-links";
import { MACHINE_GUIDE } from "../catalog/machines";
import type { ExercisePreference, WorkoutExerciseDetail } from "../types";
import type { MemberOs } from "../useMemberOs";
import MachineScanner, { type ScannedMachine } from "./MachineScanner";

type MediaResponse = { videoUrl?: string; videoLabel?: string };

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function preferenceFor(preferences: ExercisePreference[], exercise: WorkoutExerciseDetail) {
  const key = exercise.assetId ? `asset:${exercise.assetId}` : `machine:${exercise.machineId}`;
  return preferences.find((entry) => entry.key === key)
    ?? preferences.find((entry) => entry.machineId === exercise.machineId && !entry.assetId)
    ?? preferences.find((entry) => entry.machineId === exercise.machineId);
}

function applySavedDefaults(initial: WorkoutExerciseDetail[], preferences: ExercisePreference[]) {
  return initial.map((exercise) => {
    const preference = preferenceFor(preferences, exercise);
    return {
      ...exercise,
      weightKg: exercise.weightKg || preference?.favoriteWeightKg || preference?.lastWeightKg || 0,
      targetSeconds: exercise.targetSeconds || preference?.favoriteSeconds || preference?.lastSeconds || 0,
      completed: exercise.completed ?? false,
    };
  });
}

function WorkoutMachineVideo({ machineId, fallbackUrl, fallbackLabel, name }: {
  machineId: string;
  fallbackUrl?: string;
  fallbackLabel?: string;
  name: string;
}) {
  const [media, setMedia] = useState<MediaResponse>({ videoUrl: fallbackUrl, videoLabel: fallbackLabel });

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/xtreme/machine-media?id=${encodeURIComponent(machineId)}`, {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then((response) => response.ok ? response.json() as Promise<MediaResponse> : null)
      .then((result) => {
        if (result) setMedia(result);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMedia({ videoUrl: fallbackUrl, videoLabel: fallbackLabel });
        }
      });
    return () => controller.abort();
  }, [fallbackLabel, fallbackUrl, machineId]);

  if (!media.videoUrl) return null;
  return (
    <div className="border-y border-white/10 bg-black/25 p-3 sm:p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-[#d8ff3e]">Mirá la técnica antes de empezar</p>
      <MachineVideo url={media.videoUrl} name={name} label={media.videoLabel} />
    </div>
  );
}

export default function WorkoutGuide({ os }: { os: MemberOs }) {
  const active = os.currentMember.activePlanWorkout ?? os.journey?.workout;
  if (!active) return null;
  return <WorkoutSteps key={`${active.id}:${os.currentMember.activePlanWorkout?.revision ?? os.journey?.version ?? 0}`} os={os} initial={active.exercises} />;
}

function WorkoutSteps({ os, initial }: { os: MemberOs; initial: WorkoutExerciseDetail[] }) {
  const plan = os.currentMember.activePlanWorkout;
  const active = plan ?? os.journey?.workout;
  const preferences = os.currentMember.exercisePreferences ?? [];
  const [draft, setDraft] = useState<WorkoutExerciseDetail[]>(() => applySavedDefaults(initial, preferences));
  const [selectedId, setSelectedId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [customName, setCustomName] = useState("");
  const [busy, setBusy] = useState(false);
  const [preferenceBusy, setPreferenceBusy] = useState<"weight" | "time" | null>(null);
  const [message, setMessage] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [running, setRunning] = useState<{ exerciseId: string; startedAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [repCounterId, setRepCounterId] = useState("");
  const [repCounts, setRepCounts] = useState<Record<string, number>>({});
  const next = draft.find((entry) => entry.id === selectedId) ?? draft.find((entry) => !entry.completed);
  const machine = MACHINE_GUIDE.find((entry) => entry.id === next?.machineId);
  const preference = next ? preferenceFor(preferences, next) : undefined;
  const completed = draft.filter((entry) => entry.completed).length;
  const allDone = draft.length > 0 && completed === draft.length;
  const liveSeconds = next && running?.exerciseId === next.id
    ? next.seconds + Math.max(0, Math.floor((now - running.startedAt) / 1000))
    : next?.seconds ?? 0;
  const countingReps = Boolean(next && repCounterId === next.id);
  const countedReps = next ? repCounts[next.id] ?? 0 : 0;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const change = (patch: Partial<WorkoutExerciseDetail>) => {
    setDraft((current) => current.map((entry) => entry.id === next?.id ? { ...entry, ...patch, completed: false } : entry));
  };

  async function save(entries = draft) {
    return plan ? os.savePlanWorkout(entries) : os.updateJourney("save", { exercises: entries });
  }

  function stopTimer() {
    if (!next || running?.exerciseId !== next.id) return;
    change({ seconds: liveSeconds });
    setRunning(null);
  }

  async function remember(kind: "weight" | "time") {
    if (!next || preferenceBusy) return;
    setPreferenceBusy(kind);
    const saved = await os.saveExercisePreference(
      { assetId: next.assetId, machineId: next.machineId },
      kind === "weight"
        ? { favoriteWeightKg: next.weightKg }
        : { favoriteSeconds: next.targetSeconds ?? 0 },
    );
    setMessage(saved
      ? kind === "weight"
        ? `Listo: ${next.weightKg} kg queda como tu favorito.`
        : `Listo: ${formatDuration(next.targetSeconds ?? 0)} queda como tu tiempo favorito.`
      : "No se pudo guardar el favorito. Reintentá.");
    setPreferenceBusy(null);
  }

  async function markDone() {
    if (!next || busy) return;
    const finalSeconds = running?.exerciseId === next.id ? liveSeconds : next.seconds;
    const reps = countingReps && countedReps > 0 ? countedReps : next.reps;
    const seconds = finalSeconds || (reps <= 0 ? next.targetSeconds ?? 0 : 0);
    if (!((next.sets > 0 && reps > 0) || seconds > 0)) {
      setMessage("Usá las repeticiones sugeridas, iniciá el tiempo o contá tus reps.");
      return;
    }
    setBusy(true);
    setMessage("");
    setRunning(null);
    const updated = draft.map((entry) => entry.id === next.id
      ? { ...entry, reps, seconds, completed: true }
      : entry);
    if (await save(updated)) {
      setDraft(updated);
      setSelectedId("");
      setRepCounterId("");
      setMessage("Ejercicio guardado. Sigamos con el siguiente.");
    } else setMessage("No se guardó este ejercicio. Tu registro sigue aquí para reintentar.");
    setBusy(false);
  }

  async function add() {
    const selected = MACHINE_GUIDE.find((entry) => entry.id === machineId);
    const name = customName.trim() || selected?.name;
    if (!name || busy) return;
    setBusy(true);
    const exercise: WorkoutExerciseDetail = {
      id: crypto.randomUUID(),
      machineId: selected?.id ?? "",
      machineName: selected?.name ?? "",
      exerciseName: name,
      sets: 3,
      reps: 10,
      weightKg: 0,
      seconds: 0,
      targetSeconds: 0,
      notes: "",
      completed: false,
    };
    const withDefaults = applySavedDefaults([exercise], preferences)[0];
    const updated = [...draft, withDefaults];
    if (await save(updated)) {
      setDraft(updated);
      setSelectedId(exercise.id);
      setCustomName("");
      setMachineId("");
      setMessage("");
    } else setMessage("No se pudo agregar el ejercicio. Reintentá.");
    setBusy(false);
  }

  async function selectScannedMachine(asset: ScannedMachine) {
    if (busy) return;
    const existing = draft.find((entry) => entry.assetId === asset.id)
      ?? draft.find((entry) => !entry.assetId && entry.machineId === asset.machineGuideId);
    if (!existing && draft.length >= 40) throw new Error("Ya tenés 40 ejercicios en esta sesión.");
    const exercise: WorkoutExerciseDetail = existing
      ? { ...existing, assetId: asset.id, machineName: asset.name, machineCode: asset.code }
      : applySavedDefaults([{
        id: crypto.randomUUID(), assetId: asset.id, machineId: asset.machineGuideId,
        machineName: asset.name, machineCode: asset.code, exerciseName: asset.name,
        sets: 3, reps: 10, weightKg: 0, seconds: 0, targetSeconds: 0, notes: "", completed: false,
      }], preferences)[0];
    const updated = existing
      ? draft.map((entry) => entry.id === existing.id ? exercise : entry)
      : [...draft, exercise];
    setBusy(true);
    try {
      if (!await save(updated)) throw new Error("No se guardó la máquina. Volvé a intentar.");
      setDraft(updated);
      setSelectedId(exercise.id);
      setMessage("Máquina seleccionada y guardada.");
    } finally { setBusy(false); }
  }

  if (!active) return null;

  const weightStep = next && next.weightKg > 0 && next.weightKg < 10 ? 1 : 2.5;
  const weightChoices = Array.from(new Set([
    preference?.favoriteWeightKg,
    preference?.lastWeightKg,
    ...(next?.weightKg
      ? [Math.max(weightStep, next.weightKg - weightStep * 2), next.weightKg, next.weightKg + weightStep * 2]
      : [5, 10, 15, 20, 25]),
  ].filter((value): value is number => Boolean(value && value > 0)))).slice(0, 6);
  const timeChoices = Array.from(new Set([
    preference?.favoriteSeconds,
    preference?.lastSeconds,
    next?.targetSeconds,
    ...(Math.max(preference?.favoriteSeconds ?? 0, next?.targetSeconds ?? 0) >= 180
      ? [300, 600, 900]
      : [30, 45, 60, 90]),
  ].filter((value): value is number => Boolean(value && value > 0)))).slice(0, 5);
  const machineHref = next?.assetId
    ? physicalMachinePath(next.assetId)
    : machine ? `/maquinas/${encodeURIComponent(machine.id)}` : "/maquinas";

  return <div className="space-y-5">
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-[#d8ff3e]">Estás trabajando · {active.trainingName}</p>
      <h2 className="mt-2 text-2xl font-black">{allDone ? "Terminaste tus ejercicios" : next ? next.exerciseName : "¿Con qué arrancamos?"}</h2>
      <p className="mt-2 text-sm text-white/50">{completed} de {draft.length} ejercicios guardados{machine ? ` · ${machine.zone}` : ""}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#d8ff3e] transition-all" style={{ width: `${draft.length ? completed / draft.length * 100 : 0}%` }} /></div>
    </header>

    <fieldset disabled={busy || Boolean(os.journeyBusy)} className="space-y-4 disabled:opacity-60">
      {!running ? <MachineScanner onSelect={selectScannedMachine} /> : null}
      {next ? <section className="overflow-hidden rounded-xl border border-white/15 bg-white/[.03]">
        <div className="flex flex-wrap items-start justify-between gap-2 p-4">
          <div>
            <p className="text-sm text-white/60">{machine?.muscles.join(" · ") || "Ejercicio libre"}</p>
            {(next.machineCode || next.machineLocation) ? <p className="mt-1 text-xs font-bold text-white/35">{next.machineCode ? `${next.machineCode} · ` : ""}{next.machineLocation || next.machineArea}</p> : null}
          </div>
          {machine ? <Link href={machineHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-[#d8ff3e]">Ficha completa ↗</Link> : null}
        </div>

        {machine ? <WorkoutMachineVideo machineId={machine.id} fallbackUrl={machine.videoUrl} fallbackLabel={machine.videoLabel} name={machine.name} /> : null}

        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[10px] font-black uppercase tracking-wider text-white/40">Peso de hoy</p><p className="mt-1 text-3xl font-black">{next.weightKg || "—"}<span className="ml-1 text-sm text-white/40">kg</span></p></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => change({ weightKg: Math.max(0, next.weightKg - weightStep) })} aria-label="Bajar peso" className="grid h-11 w-11 place-items-center rounded-lg border border-white/15"><Minus className="h-4 w-4" /></button>
                  <button type="button" onClick={() => change({ weightKg: next.weightKg + weightStep })} aria-label="Subir peso" className="grid h-11 w-11 place-items-center rounded-lg bg-white text-black"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {preference?.favoriteWeightKg ? <QuickChoice label={`Favorito ${preference.favoriteWeightKg}`} onClick={() => change({ weightKg: preference.favoriteWeightKg })} active={next.weightKg === preference.favoriteWeightKg} /> : null}
                {preference?.lastWeightKg && preference.lastWeightKg !== preference.favoriteWeightKg ? <QuickChoice label={`Último ${preference.lastWeightKg}`} onClick={() => change({ weightKg: preference.lastWeightKg })} active={next.weightKg === preference.lastWeightKg} /> : null}
                {weightChoices.filter((value) => value !== preference?.favoriteWeightKg && value !== preference?.lastWeightKg).map((value) => <QuickChoice key={value} label={`${value} kg`} onClick={() => change({ weightKg: value })} active={next.weightKg === value} />)}
              </div>
              {next.weightKg > 0 ? <button type="button" onClick={() => void remember("weight")} className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-black text-[#d8ff3e]"><Heart className="h-4 w-4" />{preferenceBusy === "weight" ? "Guardando…" : `Recordar ${next.weightKg} kg`}</button> : null}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-white/40">Tiempo objetivo</p><p className="mt-1 text-3xl font-black">{next.targetSeconds ? formatDuration(next.targetSeconds) : "Libre"}</p></div><Clock3 className="h-7 w-7 text-orange-300" /></div>
              <div className="mt-3 flex flex-wrap gap-2">
                <QuickChoice label="Libre" onClick={() => change({ targetSeconds: 0 })} active={!next.targetSeconds} />
                {timeChoices.map((value) => <QuickChoice key={value} label={formatDuration(value)} onClick={() => change({ targetSeconds: value })} active={next.targetSeconds === value} />)}
              </div>
              {(next.targetSeconds ?? 0) > 0 ? <button type="button" onClick={() => void remember("time")} className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-black text-orange-200"><Heart className="h-4 w-4" />{preferenceBusy === "time" ? "Guardando…" : `Recordar ${formatDuration(next.targetSeconds ?? 0)}`}</button> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Series" value={next.sets} min={1} max={20} onChange={(sets) => change({ sets })} />
            <Stepper label="Reps sugeridas" value={next.reps} min={0} max={500} onChange={(reps) => change({ reps })} />
          </div>

          {countingReps ? <div className="rounded-xl border-2 border-cyan-300/50 bg-cyan-300/[.07] p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Contador opcional</p>
            <div className="mt-3 flex items-center justify-center gap-5">
              <button type="button" onClick={() => setRepCounts((current) => ({ ...current, [next.id]: Math.max(0, (current[next.id] ?? 0) - 1) }))} aria-label="Restar repetición" className="grid h-12 w-12 place-items-center rounded-full border border-cyan-200/40"><Minus className="h-5 w-5" /></button>
              <strong className="min-w-20 text-5xl font-black tabular-nums">{countedReps}</strong>
              <button type="button" onClick={() => setRepCounts((current) => ({ ...current, [next.id]: Math.min(500, (current[next.id] ?? 0) + 1) }))} aria-label="Sumar repetición" className="grid h-16 w-16 place-items-center rounded-full bg-cyan-300 text-black"><Plus className="h-7 w-7" /></button>
            </div>
            <button type="button" onClick={() => { setRepCounterId(""); setRepCounts((current) => ({ ...current, [next.id]: 0 })); }} className="mt-3 min-h-10 text-xs font-bold text-white/50"><RotateCcw className="mr-1 inline h-3.5 w-3.5" />Usar reps sugeridas</button>
          </div> : <button type="button" onClick={() => setRepCounterId(next.id)} className="min-h-11 w-full rounded-xl border border-cyan-300/35 text-sm font-black text-cyan-200">Quiero contar mis reps</button>}

          {running?.exerciseId === next.id ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-orange-300/45 bg-orange-300/[.08] p-4">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-orange-200">Ejercicio en curso</p><p className="mt-1 font-mono text-4xl font-black tabular-nums">{formatDuration(liveSeconds)}</p></div>
            <button type="button" onClick={stopTimer} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-orange-200/50 px-4 font-black"><Pause className="h-4 w-4" />Pausar</button>
          </div> : <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => { const startedAt = Date.now(); setNow(startedAt); setRunning({ exerciseId: next.id, startedAt }); }} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-orange-300 px-4 font-black text-black"><Play className="h-5 w-5" />Empezar ahora</button>
            <button type="button" onClick={() => void markDone()} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#d8ff3e] px-4 font-black text-black"><Check className="h-5 w-5" />Ya lo hice</button>
          </div>}

          {running?.exerciseId === next.id ? <button type="button" onClick={() => void markDone()} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#d8ff3e] px-3 font-black text-black"><Check className="h-5 w-5" />{busy ? "Guardando…" : "Terminé · guardar y seguir"}</button> : null}

          <details className="rounded-lg border border-white/10 px-3"><summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-white/50">Agregar una nota o ajustar números exactos</summary><div className="grid gap-3 pb-3 sm:grid-cols-3"><label className="text-xs text-white/50">Peso exacto<input type="number" min="0" max="1000" step="0.1" value={next.weightKg || ""} onChange={(event) => change({ weightKg: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-base text-white" /></label><label className="text-xs text-white/50 sm:col-span-2">Notas / ajustes<input value={next.notes} maxLength={300} onChange={(event) => change({ notes: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-sm text-white" /></label></div></details>

          <button type="button" disabled={Boolean(running)} onClick={() => { const pending = draft.filter((item) => !item.completed && item.id !== next.id); if (pending[0]) setSelectedId(pending[0].id); else setMessage("Podés agregar otro ejercicio o quitar este si cambiaste de plan."); }} className="min-h-11 w-full text-sm text-white/55 disabled:opacity-30">Hacer otro primero</button>
          <button type="button" disabled={Boolean(running)} onClick={async () => { setBusy(true); const updated = draft.filter((item) => item.id !== next.id); if (await save(updated)) { setDraft(updated); setSelectedId(""); } else setMessage("No se pudo quitar. Reintentá."); setBusy(false); }} className="min-h-11 text-xs text-white/40 disabled:opacity-30">Quitar este ejercicio de la sesión</button>
        </div>
      </section> : null}

      {draft.length ? <details className="rounded-xl border border-white/15 p-3"><summary className="min-h-11 cursor-pointer text-sm font-bold">Mi recorrido de ejercicios</summary><ol className="space-y-2">{draft.map((entry, index) => <li key={entry.id}><button type="button" disabled={Boolean(running && running.exerciseId !== entry.id)} onClick={() => setSelectedId(entry.id)} className="flex min-h-11 w-full items-center gap-2 rounded-lg bg-white/5 p-3 text-left text-sm disabled:opacity-30"><span className="text-[#d8ff3e]">{entry.completed ? <Check className="h-4 w-4" /> : `${index + 1}.`}</span><span className="min-w-0 flex-1 break-words">{entry.exerciseName}</span><ChevronRight className="h-4 w-4" /></button></li>)}</ol></details> : null}

      <details open={!draft.length} className="rounded-xl border border-white/15 p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-bold">Agregar ejercicio o máquina</summary>
        <div className="space-y-3">
          <label className="block text-xs text-white/60">Máquina<select value={machineId} onChange={(event) => setMachineId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg bg-[#171717] px-3 text-sm text-white"><option value="">Elegí una máquina o escribí un ejercicio</option>{MACHINE_GUIDE.map((entry) => <option value={entry.id} key={entry.id}>{entry.name} · {entry.zone}</option>)}</select></label>
          <label className="block text-xs text-white/60">Nombre del ejercicio (opcional si elegiste máquina)<input value={customName} maxLength={100} onChange={(event) => setCustomName(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-sm text-white" /></label>
          <button type="button" disabled={(!machineId && !customName.trim()) || draft.length >= 40} onClick={() => void add()} className="flex min-h-11 items-center gap-2 text-sm font-bold text-[#d8ff3e] disabled:opacity-40"><Plus className="h-4 w-4" />Agregar y guardar</button>
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={async () => { setBusy(true); setMessage(await save() ? "Avance guardado. Podés retomar esta sesión al volver." : "No se guardó. Reintentá antes de salir."); setBusy(false); }} className="min-h-11 text-sm font-bold text-white/70">Guardar avance</button>
        <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-11 text-sm text-white/40">Cancelar entrenamiento</button>
        <button type="button" onClick={async () => { setBusy(true); try { await os.reloadFullMember(os.memberName, os.currentMember.cedula); os.reloadJourney(); setMessage("Sesión actualizada desde el servidor."); } catch { setMessage("No se pudo actualizar. Tus cambios siguen aquí."); } finally { setBusy(false); } }} className="min-h-11 text-xs text-white/40">Actualizar sesión guardada</button>
      </div>
      {confirmCancel ? <div className="rounded-xl border border-orange-300/30 p-4"><p className="text-sm">¿Cancelar esta sesión sin registrarla como entrenamiento terminado?</p><div className="mt-2 flex gap-4"><button type="button" onClick={async () => { setBusy(true); if (plan) await os.cancelPlanWorkout(); else await os.updateJourney("cancel"); setBusy(false); }} className="min-h-11 text-sm text-orange-200">Sí, cancelar</button><button type="button" onClick={() => setConfirmCancel(false)} className="min-h-11 text-sm">Seguir entrenando</button></div></div> : null}
      {allDone ? <button type="button" onClick={async () => {
        setBusy(true);
        const saved = plan ? await os.finishPlanWorkout(draft) : await os.updateJourney("finish", { exercises: draft });
        if (saved) os.reloadJourney();
        else setMessage("No se finalizó el entrenamiento. Tus ejercicios siguen aquí; reintentá.");
        setBusy(false);
      }} className="min-h-14 w-full rounded-xl bg-[#d8ff3e] px-4 font-black text-black">Finalizar entrenamiento y ver mi avance</button> : null}
    </fieldset>
    {message ? <p role="status" className="text-sm text-orange-100">{message}</p> : null}
  </div>;
}

function QuickChoice({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-9 rounded-full border px-3 text-[11px] font-black ${active ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/65"}`}>{label}</button>;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div className="rounded-xl border border-white/10 bg-black/25 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-white/40">{label}</p><div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Bajar ${label.toLowerCase()}`} className="grid h-10 w-10 place-items-center rounded-lg border border-white/15"><Minus className="h-4 w-4" /></button><strong className="text-2xl font-black tabular-nums">{value}</strong><button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Subir ${label.toLowerCase()}`} className="grid h-10 w-10 place-items-center rounded-lg border border-white/15"><Plus className="h-4 w-4" /></button></div></div>;
}
