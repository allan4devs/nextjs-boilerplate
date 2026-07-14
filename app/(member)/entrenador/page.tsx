"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Check,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { GameButton, GameLabel } from "@/app/components/GameOS";
import { MACHINE_GUIDE } from "@/app/components/member/catalog/machines";
import type { PlanExercisePrescription, PlanItem, WorkoutExerciseDetail } from "@/app/components/member/types";

type TrainerPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
  doneItems?: number;
  totalItems?: number;
  progressPct?: number;
};

type TrainerMember = {
  memberName: string;
  normalizedName: string;
  goal: string;
  coach: string;
  photoUrl: string;
  membershipStatus: "active" | "warning" | "expired";
  trainingPlan: TrainerPlan | null;
  activePlanWorkout: { planItemId: string; startedAt: string } | null;
  recentWorkouts: Array<{
    id?: string;
    completedDate?: string;
    trainingName?: string;
    minutes?: number;
    exercises?: WorkoutExerciseDetail[];
  }>;
  latestMetrics: Array<{ date: string; weightKg: number; waistCm: number; note?: string }>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyPlan(): TrainerPlan {
  return {
    title: "Plan personalizado",
    objective: "",
    coachNote: "",
    startDate: today(),
    endDate: "",
    weeklySessions: 3,
    items: [],
  };
}

function newItem(): PlanItem {
  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    day: "Sesion nueva",
    focus: "",
    exercises: "",
    targetMinutes: 45,
    done: false,
    doneDate: null,
    doneWorkoutId: null,
    prescribedExercises: [],
  };
}

function prescription(machineId: string): PlanExercisePrescription {
  const machine = MACHINE_GUIDE.find((entry) => entry.id === machineId) ?? MACHINE_GUIDE[0];
  return {
    id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    machineId: machine?.id ?? "",
    machineName: machine?.name ?? "Ejercicio libre",
    exerciseName: machine?.name ?? "Ejercicio",
    sets: 3,
    reps: 10,
    weightKg: 0,
    targetSeconds: 0,
    notes: "",
  };
}

export default function TrainerPage() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [coachName, setCoachName] = useState("Entrenador Xtreme");
  const [members, setMembers] = useState<TrainerMember[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<TrainerPlan>(emptyPlan());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/xtreme/trainer", { cache: "no-store" });
      if (response.status === 401) {
        setAuthenticated(false);
        setMembers([]);
        return;
      }
      const json = (await response.json()) as { members?: TrainerMember[]; error?: string };
      if (!response.ok) throw new Error(json.error || "No se pudo cargar Trainer OS.");
      const next = json.members ?? [];
      setMembers(next);
      setSelectedKey((current) => current || next[0]?.normalizedName || "");
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/xtreme/staff-session?surface=trainer", { cache: "no-store" });
        const session = (await response.json()) as { authenticated?: boolean };
        if (session.authenticated) await load();
      } finally {
        setChecking(false);
      }
    })();
  }, [load]);

  const selected = members.find((member) => member.normalizedName === selectedKey) ?? null;
  useEffect(() => {
    if (!selected) return;
    setCoachName(selected.coach || "Entrenador Xtreme");
    setDraft(selected.trainingPlan ? structuredClone(selected.trainingPlan) : emptyPlan());
  }, [selectedKey, selected]);

  const filtered = useMemo(() => {
    const needle = query.trim().toUpperCase();
    if (!needle) return members;
    return members.filter((member) => `${member.memberName} ${member.goal}`.toUpperCase().includes(needle));
  }, [members, query]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/staff-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: "trainer", code: code.trim() }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Codigo incorrecto.");
      setCode("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    await fetch("/api/xtreme/staff-session?surface=trainer", { method: "DELETE" });
    setAuthenticated(false);
    setMembers([]);
  }

  function updateItem(index: number, patch: Partial<PlanItem>) {
    setDraft((current) => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  }

  function updatePrescription(itemIndex: number, exerciseIndex: number, patch: Partial<PlanExercisePrescription>) {
    const item = draft.items[itemIndex];
    const exercises = (item.prescribedExercises ?? []).map((entry, index) => index === exerciseIndex ? { ...entry, ...patch } : entry);
    updateItem(itemIndex, { prescribedExercises: exercises });
  }

  async function savePlan() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/trainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName: selected.memberName, coachName, plan: draft }),
      });
      const json = (await response.json()) as { member?: TrainerMember; error?: string };
      if (!response.ok) throw new Error(json.error || "No se pudo guardar el plan.");
      if (json.member) setMembers((current) => current.map((member) => member.normalizedName === json.member!.normalizedName ? json.member! : member));
      setMessage(`Plan guardado para ${selected.memberName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (checking && !authenticated) {
    return <main className="grid min-h-screen place-items-center bg-[#050505] text-[#d8ff3e]"><Loader2 className="h-8 w-8 animate-spin" /></main>;
  }

  if (!authenticated) {
    return (
      <main className="grid min-h-screen place-items-end bg-[#050505] text-white sm:place-items-center sm:p-4">
        <form onSubmit={(event) => void login(event)} className="w-full max-w-md border-[3px] border-cyan-300 bg-[#0c0c0c] p-6 shadow-[6px_6px_0_rgba(103,232,249,.2)] sm:p-8">
          <div className="grid h-14 w-14 place-items-center bg-cyan-300 text-black"><Dumbbell className="h-7 w-7" /></div>
          <GameLabel tone="cyan" className="mt-4">Trainer OS</GameLabel>
          <h1 className="mt-2 text-3xl font-black uppercase">Planes de socios</h1>
          <p className="mt-2 text-sm font-bold text-white/50">Area independiente para crear planes y revisar la ejecucion tecnica de cada socio.</p>
          <div className="relative mt-6"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input type="password" autoComplete="current-password" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Codigo de entrenador" className="min-h-12 w-full border-[3px] border-white/20 bg-black/40 pl-10 pr-4 font-bold outline-none focus:border-cyan-300" /></div>
          {error && <p className="mt-3 border border-red-400/40 bg-red-500/10 p-3 text-sm font-bold text-red-300">{error}</p>}
          <GameButton type="submit" full className="mt-5" disabled={checking || !code.trim()}>{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar como entrenador"}</GameButton>
          <p className="mt-4 flex justify-center gap-4 text-xs font-bold text-white/35"><Link href="/app">Member OS</Link><Link href="/admin">Admin OS</Link></p>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-cyan-300/40 bg-[#050505]/95 px-3 py-3 backdrop-blur sm:px-6">
        <div><GameLabel tone="cyan">Trainer OS</GameLabel><h1 className="text-xl font-black uppercase sm:text-2xl">Planes y seguimiento</h1></div>
        <div className="flex gap-2"><button onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 text-xs font-black uppercase"><RefreshCw className="h-4 w-4" /> Actualizar</button><button onClick={() => void logout()} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 text-xs font-black uppercase text-white/55"><LogOut className="h-4 w-4" /> Salir</button></div>
      </header>
      <div className="mx-auto grid max-w-[1500px] gap-4 p-3 lg:grid-cols-[300px_1fr] lg:p-6">
        <aside className="border-[3px] border-white/15 bg-[#0c0c0c]">
          <div className="border-b-[3px] border-white/15 p-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar socio" className="min-h-11 w-full bg-black/45 pl-10 pr-3 font-bold outline-none" /></div><p className="mt-2 text-[10px] font-black uppercase text-white/35">{filtered.length} socios</p></div>
          <div className="max-h-[calc(100vh-180px)] overflow-y-auto">{filtered.map((member) => <button key={member.normalizedName} onClick={() => setSelectedKey(member.normalizedName)} className={`flex w-full items-center gap-3 border-b border-white/10 p-3 text-left ${selectedKey === member.normalizedName ? "bg-cyan-300 text-black" : "hover:bg-white/5"}`}><span className="grid h-10 w-10 shrink-0 place-items-center bg-black/20"><UserRound className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm uppercase">{member.memberName}</strong><small className="block truncate font-bold opacity-55">{member.trainingPlan?.title || "Sin plan"}</small></span><ChevronRight className="h-4 w-4" /></button>)}</div>
        </aside>

        {selected ? (
          <section className="space-y-4">
            <div className="grid gap-3 border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:grid-cols-[1fr_auto]">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Socio seleccionado</p><h2 className="mt-1 text-2xl font-black uppercase">{selected.memberName}</h2><p className="text-sm font-bold text-white/45">Meta: {selected.goal || "Sin definir"}</p></div>
              <div className="flex gap-2"><Status label="Plan" value={selected.trainingPlan ? `${selected.trainingPlan.progressPct ?? 0}%` : "Nuevo"} /><Status label="Entrenos" value={selected.recentWorkouts.length} /></div>
            </div>

            {error && <p className="border-[3px] border-red-400/40 bg-red-500/10 p-3 font-bold text-red-300">{error}</p>}
            {message && <p className="border-[3px] border-[#d8ff3e]/40 bg-[#d8ff3e]/10 p-3 font-bold text-[#eaff93]">{message}</p>}

            <div className="border-[3px] border-cyan-300/45 bg-[#0c0c0c]">
              <div className="grid gap-3 border-b-[3px] border-white/15 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Titulo" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
                <Field label="Objetivo" value={draft.objective} onChange={(objective) => setDraft({ ...draft, objective })} />
                <Field label="Entrenador" value={coachName} onChange={setCoachName} />
                <Field label="Inicio" type="date" value={draft.startDate} onChange={(startDate) => setDraft({ ...draft, startDate })} />
                <Field label="Final" type="date" value={draft.endDate} onChange={(endDate) => setDraft({ ...draft, endDate })} />
                <NumberField label="Sesiones por semana" value={draft.weeklySessions} onChange={(weeklySessions) => setDraft({ ...draft, weeklySessions })} />
                <label className="sm:col-span-2 lg:col-span-3"><span className="mb-1 block text-[10px] font-black uppercase text-white/40">Nota del entrenador</span><textarea value={draft.coachNote} onChange={(event) => setDraft({ ...draft, coachNote: event.target.value })} rows={2} className="w-full border-[3px] border-white/15 bg-black/40 p-3 font-semibold outline-none focus:border-cyan-300" /></label>
              </div>

              <div className="space-y-4 p-3 sm:p-4">{draft.items.map((item, itemIndex) => <PlanSessionEditor key={item.id} item={item} index={itemIndex} onChange={(patch) => updateItem(itemIndex, patch)} onDelete={() => setDraft((current) => ({ ...current, items: current.items.filter((_, index) => index !== itemIndex) }))} onExerciseChange={(exerciseIndex, patch) => updatePrescription(itemIndex, exerciseIndex, patch)} />)}<button onClick={() => setDraft((current) => ({ ...current, items: [...current.items, newItem()] }))} className="inline-flex min-h-12 w-full items-center justify-center gap-2 border-[3px] border-dashed border-cyan-300/50 font-black uppercase text-cyan-200"><Plus className="h-4 w-4" /> Agregar sesion</button></div>
              <div className="flex justify-end border-t-[3px] border-white/15 p-3"><GameButton onClick={() => void savePlan()} disabled={saving || !draft.items.length}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar plan completo</GameButton></div>
            </div>

            <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><h3 className="flex items-center gap-2 font-black uppercase"><Activity className="h-5 w-5 text-cyan-300" /> Ejecucion reciente</h3><div className="mt-3 grid gap-2">{selected.recentWorkouts.map((workout) => <div key={workout.id} className="border border-white/10 bg-black/25 p-3"><div className="flex justify-between gap-3"><strong className="uppercase">{workout.trainingName}</strong><span className="text-sm font-bold text-white/45">{workout.completedDate} · {workout.minutes} min</span></div>{!!workout.exercises?.length && <div className="mt-2 flex flex-wrap gap-1.5">{workout.exercises.map((exercise) => <span key={exercise.id} className="border border-white/10 px-2 py-1 text-[10px] font-bold text-white/55">{exercise.exerciseName}: {exercise.sets}x{exercise.reps} · {exercise.weightKg || 0}kg · {Math.round(exercise.seconds / 60)}m</span>)}</div>}</div>)}{!selected.recentWorkouts.length && <p className="text-sm font-semibold text-white/35">Todavia no hay ejecuciones registradas.</p>}</div></div>
          </section>
        ) : <div className="grid min-h-[400px] place-items-center border-[3px] border-white/15 text-white/35"><Users className="h-10 w-10" /></div>}
      </div>
    </main>
  );
}

function PlanSessionEditor({ item, index, onChange, onDelete, onExerciseChange }: { item: PlanItem; index: number; onChange: (patch: Partial<PlanItem>) => void; onDelete: () => void; onExerciseChange: (index: number, patch: Partial<PlanExercisePrescription>) => void }) {
  const exercises = item.prescribedExercises ?? [];
  const [machineId, setMachineId] = useState(MACHINE_GUIDE[0]?.id ?? "");
  return <article className="border-[3px] border-white/15 bg-black/25"><div className="flex items-center justify-between border-b border-white/10 p-3"><div><GameLabel tone="cyan">Sesion {index + 1}</GameLabel><p className="font-black uppercase">{item.day || "Sin nombre"}</p></div><button onClick={onDelete} className="p-2 text-white/35 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div><div className="grid gap-3 p-3 sm:grid-cols-3"><Field label="Dia / nombre" value={item.day} onChange={(day) => onChange({ day })} /><Field label="Enfoque" value={item.focus} onChange={(focus) => onChange({ focus })} /><NumberField label="Minutos meta" value={item.targetMinutes} onChange={(targetMinutes) => onChange({ targetMinutes })} /><label className="sm:col-span-3"><span className="mb-1 block text-[10px] font-black uppercase text-white/40">Indicaciones generales</span><textarea value={item.exercises} onChange={(event) => onChange({ exercises: event.target.value })} rows={2} className="w-full border-[3px] border-white/15 bg-black/40 p-3 font-semibold outline-none focus:border-cyan-300" /></label></div><div className="space-y-2 border-t border-white/10 p-3">{exercises.map((exercise, exerciseIndex) => <div key={exercise.id} className="grid gap-2 border border-white/10 p-2 sm:grid-cols-6"><Field label="Ejercicio" value={exercise.exerciseName} onChange={(exerciseName) => onExerciseChange(exerciseIndex, { exerciseName })} /><NumberField label="Series" value={exercise.sets} onChange={(sets) => onExerciseChange(exerciseIndex, { sets })} /><NumberField label="Reps" value={exercise.reps} onChange={(reps) => onExerciseChange(exerciseIndex, { reps })} /><NumberField label="Peso kg" value={exercise.weightKg} onChange={(weightKg) => onExerciseChange(exerciseIndex, { weightKg })} /><NumberField label="Segundos" value={exercise.targetSeconds} onChange={(targetSeconds) => onExerciseChange(exerciseIndex, { targetSeconds })} /><button onClick={() => onChange({ prescribedExercises: exercises.filter((_, i) => i !== exerciseIndex) })} className="self-end p-3 text-white/35 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div>)}<div className="flex flex-col gap-2 sm:flex-row"><select value={machineId} onChange={(event) => setMachineId(event.target.value)} className="min-h-11 flex-1 bg-white px-3 font-bold text-black">{MACHINE_GUIDE.map((machine) => <option key={machine.id} value={machine.id}>{machine.name} · {machine.zone}</option>)}</select><button onClick={() => onChange({ prescribedExercises: [...exercises, prescription(machineId)] })} className="inline-flex min-h-11 items-center justify-center gap-2 bg-cyan-300 px-4 font-black uppercase text-black"><Plus className="h-4 w-4" /> Prescribir maquina</button></div></div></article>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label><span className="mb-1 block text-[10px] font-black uppercase text-white/40">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full border-[3px] border-white/15 bg-black/40 px-3 font-bold outline-none focus:border-cyan-300" /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label><span className="mb-1 block text-[10px] font-black uppercase text-white/40">{label}</span><input type="number" min="0" value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-h-11 w-full border-[3px] border-white/15 bg-black/40 px-3 font-bold outline-none focus:border-cyan-300" /></label>; }
function Status({ label, value }: { label: string; value: string | number }) { return <div className="min-w-20 border-[3px] border-white/15 bg-black/30 p-2 text-center"><strong className="block text-xl text-cyan-200">{value}</strong><span className="text-[9px] font-black uppercase text-white/35">{label}</span></div>; }
