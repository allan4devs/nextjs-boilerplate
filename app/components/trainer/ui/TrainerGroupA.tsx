"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { GameButton, GameLabel } from "@/app/components/GameOS";
import {
  alignGroupExercise, normalizeGroupName, isGroupEquipmentAvailable,
  type GroupDashboard, type GroupDay, type GroupEquipment, type GroupExercise, type GroupExercisePatch, type GroupLog, type GroupProfile, type GroupRoutine,
} from "@/lib/xtreme/trainer-group-a-model";
import type { TrainerMember } from "../types";
import { TrainerMemberSearch } from "./TrainerMemberSearch";

const field = "min-h-11 w-full border-2 border-white/20 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-40";

async function groupRequest(body?: Record<string, unknown>): Promise<GroupDashboard | { ok: true; routineId?: string; dayId?: string }> {
  const response = await fetch("/api/xtreme/trainer/group-a", body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo cargar el grupo.");
  return data;
}

export function TrainerGroupA({ active, view, members, refreshKey, onDirtyChange, onBusyChange, onOpenMember }: {
  active: boolean; view: "tracking" | "routines" | "settings"; members: TrainerMember[]; refreshKey: number;
  onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void; onOpenMember: (key: string) => void;
}) {
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [groupId, setGroupId] = useState("group-a");
  const [profileId, setProfileId] = useState("tiffany");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loadedKey, setLoadedKey] = useState(-1);
  const setDraftDirty = useCallback((value: boolean) => { setDirty(value); onDirtyChange(value); }, [onDirtyChange]);
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);

  const load = useCallback(async () => {
    setBusy(true);
    try { setData(await groupRequest() as GroupDashboard); setLoadedKey(refreshKey); }
    catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : "No se pudo cargar el grupo." }); }
    finally { setBusy(false); }
  }, [refreshKey]);
  useEffect(() => { if (active && loadedKey !== refreshKey) void load(); }, [active, load, loadedKey, refreshKey]);
  useEffect(() => {
    if (!data?.groups.some((group) => group.id === groupId)) {
      setGroupId(data?.groups[0]?.id ?? "group-a");
      return;
    }
    const nextProfile = data.profiles.find((profile) => profile.groupId === groupId);
    if (!data.profiles.some((profile) => profile.groupId === groupId && profile.id === profileId)) setProfileId(nextProfile?.id ?? "");
  }, [data, groupId, profileId]);

  const mutate = async (body: Record<string, unknown>, text: string, onSuccess?: (result: { ok: true; routineId?: string; dayId?: string }) => void) => {
    setBusy(true); setMessage(null);
    try {
      const result = await groupRequest(body) as { ok: true; routineId?: string; dayId?: string };
      if (body.action === "log") setDraftDirty(false);
      const fresh = await groupRequest() as GroupDashboard;
      // Mapping/link changes must not replace an unsaved session draft.
      const refreshRoster = ["log", "exercise", "create_group", "create_routine", "add_day", "add_member", "assign_routine", "remove_member", "add_exercise"].includes(String(body.action));
      setData((current) => refreshRoster || !current ? fresh : { ...current, mappings: fresh.mappings, links: fresh.links, inventory: fresh.inventory });
      setMessage({ error: false, text });
      onSuccess?.(result);
      return true;
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : "No se pudo guardar." });
      return false;
    } finally { setBusy(false); }
  };
  const permitSwitch = () => !dirty || window.confirm("¿Descartar los cambios de esta sesión sin guardar?");
  const groupProfiles = data?.profiles.filter((p) => p.groupId === groupId) ?? [];
  const profile = groupProfiles.find((p) => p.id === profileId) ?? groupProfiles[0];
  const routine = data?.routines.find((r) => r.id === profile?.routineId);
  const link = data?.links.find((l) => l.profileId === profile?.id);
  const member = members.find((m) => m.memberId === profile?.memberId || m.memberId === link?.memberId);
  const aligned = useMemo(() => data ? data.routines.flatMap((r) => r.days.flatMap((d) => d.exercises.map((exercise) => ({
    exercise, routine: r, ...alignGroupExercise(exercise, data.inventory, data.mappings.find((m) => m.exerciseId === exercise.id)),
  })))) : [], [data]);
  const sharedMachines = useMemo(() => {
    const machineMap = new Map<string, { code: string; name: string; people: Set<string> }>();
    for (const row of aligned) {
      if (!row.asset || row.status !== "linked") continue;
      const entry = machineMap.get(row.asset.id) ?? { code: row.asset.code, name: row.asset.name, people: new Set<string>() };
      data?.profiles.filter((p) => p.routineId === row.routine.id).forEach((p) => entry.people.add(p.name));
      machineMap.set(row.asset.id, entry);
    }
    return [...machineMap.entries()].sort((a, b) => b[1].people.size - a[1].people.size);
  }, [aligned, data]);

  if (!data) return <section className="border-[3px] border-cyan-300/30 bg-[#0c0c0c] p-6"><p role="status">{message?.text || "Cargando rutinas del Grupo A..."}</p><GameButton className="mt-4" disabled={busy} onClick={() => void load()}>Volver a intentar</GameButton></section>;

  return <div hidden={!active} className="space-y-4">
    {view === "tracking" && <>
    {message && <p role={message.error ? "alert" : "status"} className={`border-2 p-3 text-sm ${message.error ? "border-orange-300/50 text-orange-200" : "border-[#d8ff3e]/50 text-[#d8ff3e]"}`}>{message.text}</p>}
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <nav aria-label="Personas del grupo seleccionado" className="space-y-2">{groupProfiles.map((person) => {
        const plan = data.routines.find((r) => r.id === person.routineId)!;
        const logs = data.logs.filter((log) => log.profileId === person.id);
        const personLink = data.links.find((l) => l.profileId === person.id);
        const linked = members.find((m) => m.memberId === person.memberId || m.memberId === personLink?.memberId);
        const pending = aligned.filter((row) => row.routine.id === plan.id && ["review", "unavailable"].includes(row.status)).length;
        return <button key={person.id} type="button" aria-pressed={person.id === profileId} disabled={busy} onClick={() => { if (person.id !== profileId && permitSwitch()) { setDraftDirty(false); setProfileId(person.id); setMessage(null); } }} className={`w-full border-[3px] p-3 text-left ${person.id === profileId ? "border-cyan-300 bg-cyan-300/10" : "border-white/15 bg-[#0c0c0c]"}`}>
          <strong className="block font-black">{person.name}</strong><span className="mt-1 block text-xs text-white/60">{plan.days.length} días · {pending} por vincular</span>
          <span className="mt-2 block text-xs text-cyan-200">{linked?.activePlanWorkout ? "Entrenando en Member OS" : logs[0] ? `Último seguimiento: ${logs[0].date}` : "Sin seguimiento registrado"}</span>
          <span className="mt-1 block text-[11px] text-white/45">{linked ? "Ficha vinculada" : "Ficha pendiente"}{plan.endDate < data.date ? " · Rutina vencida" : plan.endDate <= addDays(data.date, 7) ? " · Próxima revisión" : ""}</span>
        </button>;
      })}</nav>
      {profile && routine && <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-[3px] border-white/15 bg-[#0c0c0c] p-3">
          <h3 className="shrink-0 text-lg font-black">{profile.name}</h3>
          <p className="min-w-0 flex-1 truncate text-sm text-white/60"><strong className="text-white/80">{routine.objective}</strong> · {routine.startDate} al {routine.endDate} <span className="text-white/30">· {routine.sourceFile}</span></p>
          {routine.endDate <= addDays(data.date, 7) && <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-orange-200" title={routine.endDate < data.date ? "Esta rutina venció; coordiná su revisión." : "La rutina termina en los próximos 7 días; coordiná su revisión."}><AlertTriangle className="h-4 w-4" /> {routine.endDate < data.date ? "Vencida" : "Por vencer"}</span>}
          <MemberLinkWithSearch key={profileId} profile={profile} members={members} value={profile.memberId ?? link?.memberId ?? ""} busy={busy} onOpenMember={onOpenMember} onChange={(memberId) => void mutate({ action: "link", profileId, memberId, revision: link?.revision ?? 0 }, memberId ? "Ficha del socio vinculada." : "Vínculo eliminado.")} />
        </div>
        <SessionTracker key={profileId} profile={profile} routine={routine} data={data} busy={busy} dirty={dirty} setDirty={setDraftDirty} mutate={mutate} />
        {member && <details className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><summary className="cursor-pointer font-black">Actividad en Member OS</summary><p className="mt-3 text-xs text-white/45">Actividad del socio; no se cuenta automáticamente como cumplimiento de los PDF.</p><div className="mt-3 space-y-2">{member.recentWorkouts.length ? member.recentWorkouts.map((workout, i) => <p key={workout.id || i} className="border-l-2 border-cyan-300/40 pl-3 text-sm">{workout.completedDate || "Sin fecha"} · {workout.trainingName || "Entreno"} · {workout.minutes ?? 0} min</p>) : <p className="text-sm text-white/50">Sin entrenos registrados.</p>}</div></details>}
      </section>}
    </div>
    <details className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><summary className="cursor-pointer font-black uppercase">Máquinas compartidas por el grupo ({sharedMachines.length})</summary><p className="mt-3 text-xs text-white/45">Útil para organizar turnos. Las unidades pendientes aparecen en cada rutina hasta que se elijan.</p><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{sharedMachines.map(([assetId, machine]) => <Link key={assetId} href={`/maquinas/equipo/${encodeURIComponent(assetId)}`} target="_blank" rel="noopener noreferrer" className="border-2 border-white/15 p-3 hover:border-cyan-300"><strong className="text-sm">{machine.code} · {machine.name}</strong><p className="mt-1 text-xs text-white/50">{[...machine.people].join(", ")}</p></Link>)}</div></details>
    </>}
    {view === "routines" && <RoutineLibrary data={data} busy={busy} mutate={mutate} />}
    {view === "settings" && <>
      <GroupManagerWithSearch data={data} members={members} groupId={groupId} profiles={groupProfiles} busy={busy} mutate={mutate} onGroupChange={(nextGroupId) => { setGroupId(nextGroupId); setProfileId(""); }} />
      {message && <p role={message.error ? "alert" : "status"} className={`border-2 p-3 text-sm ${message.error ? "border-orange-300/50 text-orange-200" : "border-[#d8ff3e]/50 text-[#d8ff3e]"}`}>{message.text}</p>}
    </>}
  </div>;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}
export function MemberLink({ profile, members, value, busy, onChange }: {
  profile: GroupProfile; members: TrainerMember[]; value: string; busy: boolean; onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState(profile.name.split(" ")[0]);
  const candidates = members.filter((m) => m.memberId === value || normalizeGroupName(m.memberName).includes(normalizeGroupName(query)));
  return <div className="mt-4 grid gap-2 sm:grid-cols-2"><label className="text-xs text-white/60">Buscar ficha de socio<input className={`${field} mt-1`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o apellidos" /></label><label className="text-xs text-white/60">Vincular a la persona correcta<select className={`${field} mt-1`} value={value} disabled={busy} onChange={(event) => onChange(event.target.value)}><option value="">Sin vincular</option>{candidates.map((m) => <option key={m.memberId} value={m.memberId}>{m.memberName}</option>)}</select></label></div>;
}

function MemberLinkWithSearch({ profile, members, value, busy, onChange, onOpenMember }: {
  profile: GroupProfile; members: TrainerMember[]; value: string; busy: boolean; onChange: (id: string) => void; onOpenMember: (key: string) => void;
}) {
  const [query, setQuery] = useState(profile.name.split(" ")[0]);
  const [editing, setEditing] = useState(!value);
  const linkedMember = members.find((member) => member.memberId === value);
  const candidates = members.filter((member) => member.memberId === value || normalizeGroupName(member.memberName).includes(normalizeGroupName(query)));
  if (value && !editing) return <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
    <p className="max-w-64 truncate text-sm font-black text-cyan-200" title={linkedMember?.memberName || profile.name}>{linkedMember?.memberName || profile.name}</p>
    {linkedMember && <GameButton variant="ghost" disabled={busy} onClick={() => onOpenMember(linkedMember.normalizedName)}>Ver historial</GameButton>}
    <button type="button" disabled={busy} onClick={() => { setQuery(profile.name.split(" ")[0]); setEditing(true); }} className="min-h-10 px-2 text-[10px] font-black uppercase text-white/50 underline hover:text-cyan-200 disabled:opacity-40">Cambiar</button>
    <button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Quitar el vínculo con ${linkedMember?.memberName || profile.name}?`)) { onChange(""); setEditing(true); } }} className="min-h-10 px-2 text-[10px] font-black uppercase text-red-200/75 underline hover:text-red-200 disabled:opacity-40">Quitar</button>
  </div>;
  return <div className="basis-full border-t border-white/10 pt-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-[.12em] text-white/60">{value ? "Cambiar ficha vinculada" : "Vincular ficha de socio"}</p><p className="mt-1 text-xs text-white/40">Buscá y seleccioná a la persona correcta.</p></div>{value && <button type="button" disabled={busy} onClick={() => setEditing(false)} className="min-h-9 px-2 text-[10px] font-black uppercase text-white/50 underline">Cancelar</button>}</div>
    <TrainerMemberSearch members={candidates} query={query} onQueryChange={setQuery} selectedKey={linkedMember?.normalizedName} onSelect={(selected) => { onChange(selected.memberId); setEditing(false); }} compact emptyText="No se encontró una ficha con esa búsqueda." />
  </div>;
}

type Mutate = (body: Record<string, unknown>, success: string, onSuccess?: (result: { ok: true; routineId?: string; dayId?: string }) => void) => Promise<boolean>;

function RoutineLibrary({ data, busy, mutate }: { data: GroupDashboard; busy: boolean; mutate: Mutate }) {
  const [routineId, setRoutineId] = useState(data.routines[0]?.id ?? "");
  const routine = data.routines.find((entry) => entry.id === routineId) ?? data.routines[0];
  const [dayId, setDayId] = useState(routine?.days[0]?.id ?? "");
  const [addingModule, setAddingModule] = useState(false);
  const [moduleLabel, setModuleLabel] = useState("");
  const [moduleFocus, setModuleFocus] = useState("");
  if (!routine) return <p className="border-[3px] border-white/15 p-6 text-sm text-white/50">Todavía no hay rutinas.</p>;
  const day = routine.days.find((entry) => entry.id === dayId) ?? routine.days[0];
  const assigned = data.profiles.filter((profile) => profile.routineId === routine.id);
  return <div className="space-y-4">
    <section className="border-[3px] border-cyan-300/35 bg-[#0c0c0c] p-4">
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-64 flex-1"><GameLabel tone="cyan">Editor general</GameLabel><h2 className="mt-2 text-xl font-black uppercase">Rutinas</h2><p className="mt-1 text-sm text-white/45">Editá una vez la rutina que usan todas las personas asignadas.</p></div><label className="w-full text-xs font-black uppercase tracking-[.12em] text-white/60 sm:w-[420px]">Rutina<select className={`${field} mt-1 normal-case tracking-normal`} value={routine.id} disabled={busy} onChange={(event) => { const next = data.routines.find((entry) => entry.id === event.target.value); setRoutineId(event.target.value); setDayId(next?.days[0]?.id ?? ""); }}>{data.routines.map((entry) => <option key={entry.id} value={entry.id}>{entry.objective} · {entry.days.length} {entry.days.length === 1 ? "módulo" : "módulos"}</option>)}</select></label></div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/50"><strong className="text-white/75">Asignada a {assigned.length}:</strong>{assigned.length ? assigned.map((profile) => <span key={profile.id} className="border border-white/15 px-2 py-1">{profile.name}</span>) : <span>Sin personas asignadas</span>}</div>
    </section>
    <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4">
      <div className="flex flex-wrap items-center gap-2">{routine.days.map((entry) => <button key={entry.id} type="button" disabled={busy} onClick={() => setDayId(entry.id)} className={`min-h-11 border-2 px-4 text-[10px] font-black uppercase ${entry.id === day?.id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/50 hover:border-cyan-300/60"}`}>{entry.label}</button>)}<button type="button" disabled={busy} onClick={() => setAddingModule((open) => !open)} className="min-h-11 border-2 border-dashed border-cyan-300/40 px-4 text-[10px] font-black uppercase text-cyan-200">+ Nuevo módulo</button></div>
      {addingModule && <form className="mt-3 flex flex-wrap items-end gap-2 border-2 border-cyan-300/20 p-3" onSubmit={(event) => { event.preventDefault(); void mutate({ action: "add_day", routineId: routine.id, label: moduleLabel, focus: moduleFocus, revision: 0 }, "Módulo creado.", (result) => { if (result.dayId) setDayId(result.dayId); setModuleLabel(""); setModuleFocus(""); setAddingModule(false); }); }}><label className="min-w-52 flex-1 text-xs font-black uppercase text-white/55">Nombre<input className={`${field} mt-1 normal-case`} value={moduleLabel} onChange={(event) => setModuleLabel(event.target.value)} placeholder={`Día ${routine.days.length + 1}`} required /></label><label className="min-w-52 flex-1 text-xs font-black uppercase text-white/55">Enfoque<input className={`${field} mt-1 normal-case`} value={moduleFocus} onChange={(event) => setModuleFocus(event.target.value)} placeholder="Ej. Tren superior" /></label><GameButton type="submit" disabled={busy || moduleLabel.trim().length < 2}>Crear módulo</GameButton></form>}
      {day && <><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black uppercase">{day.label}</h3><p className="text-sm text-white/45">{day.focus}</p></div><span className="text-xs font-bold text-cyan-200">{day.exercises.length} ejercicios</span></div><div className="mt-3 overflow-x-auto border-2 border-white/15"><table className="w-full min-w-[980px] border-collapse text-left text-xs"><thead className="bg-white/[.06] text-[9px] font-black uppercase tracking-[.1em] text-white/50"><tr><th className="px-2 py-2">Grupo muscular</th><th className="px-2 py-2">Ejercicio</th><th className="px-2 py-2">Equipo / unidad</th><th className="px-2 py-2">Maq #</th><th className="px-2 py-2">Sets</th><th className="px-2 py-2">Reps</th><th className="px-2 py-2">Tiempo</th><th className="px-2 py-2">Peso ref.</th><th className="px-2 py-2">Editar</th></tr></thead><tbody>{day.exercises.map((exercise) => <RoutineExerciseEditorRow key={exercise.id} exercise={exercise} data={data} busy={busy} mutate={mutate} />)}</tbody></table></div><MachineCategoryAssignments exercises={day.exercises} data={data} busy={busy} mutate={mutate} /><AddRoutineLine routineId={routine.id} dayId={day.id} data={data} busy={busy} mutate={mutate} /></>}
    </section>
  </div>;
}

function RoutineExerciseEditorRow({ exercise, data, busy, mutate }: { exercise: GroupExercise; data: GroupDashboard; busy: boolean; mutate: Mutate }) {
  const mapping = data.mappings.find((entry) => entry.exerciseId === exercise.id);
  const edit = data.routineEdits.find((entry) => entry.exerciseId === exercise.id);
  const alignment = alignGroupExercise(exercise, data.inventory, mapping);
  const savePatch = (patch: GroupExercisePatch) => void mutate({ action: "exercise", exerciseId: exercise.id, patch, revision: edit?.revision ?? 0 }, "Rutina actualizada.");
  const [editing, setEditing] = useState(false);
  return <><tr className="border-t border-white/10"><td className="px-2 py-2 text-white/70">{exercise.muscle || "—"}</td><td className="px-2 py-2"><strong className="text-white/85">{exercise.name}</strong></td><td className="min-w-56 px-2 py-2 text-white/65">{alignment.asset ? `${alignment.asset.code} · ${alignment.asset.name}` : exercise.equipment || "—"}</td><td className="px-2 py-2 text-white/65">{exercise.sourceMachine || "—"}</td><td className="px-2 py-2 text-white/65">{exercise.sets ?? "—"}</td><td className="px-2 py-2 text-white/65">{exercise.reps ?? "—"}</td><td className="px-2 py-2 text-white/65">{exercise.time || "—"}</td><td className="px-2 py-2 text-white/65">{exercise.weightKg == null ? "—" : `${exercise.weightKg} kg`}</td><td className="px-2 py-2"><button type="button" disabled={busy} onClick={() => setEditing(true)} className="min-h-9 border border-cyan-300/50 px-3 text-[10px] font-black uppercase text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-40">Editar</button></td></tr>{editing && <RoutineLineEditModal exercise={exercise} data={data} busy={busy} onClose={() => setEditing(false)} onSave={savePatch} />}</>;
}

function RoutineLineEditModal({ exercise, data, busy, onClose, onSave }: { exercise: GroupExercise; data: GroupDashboard; busy: boolean; onClose: () => void; onSave: (patch: GroupExercisePatch) => void }) {
  const [muscle, setMuscle] = useState(exercise.muscle);
  const [name, setName] = useState(exercise.name);
  const [equipment, setEquipment] = useState(exercise.equipment);
  const [machineNumber, setMachineNumber] = useState(exercise.sourceMachine);
  const [sets, setSets] = useState(exercise.sets === null ? "" : String(exercise.sets));
  const [reps, setReps] = useState(exercise.reps === null ? "" : String(exercise.reps));
  const [time, setTime] = useState(exercise.time);
  const [weight, setWeight] = useState(exercise.weightKg == null ? "" : String(exercise.weightKg));
  const muscles = [...new Set(data.routines.flatMap((routine) => routine.days.flatMap((day) => day.exercises.map((entry) => entry.muscle).filter(Boolean))))];
  const inputClass = "min-h-12 w-full border-2 border-white/20 bg-[#111] px-3 text-sm text-white outline-none focus:border-cyan-300";
  const labelClass = "grid gap-1.5 text-[10px] font-black uppercase tracking-[.1em] text-white/55";
  const quickValues = (values: string[], current: string, setValue: (value: string) => void) => <div className="mt-2 flex flex-wrap gap-2">{values.map((value) => <button key={value} type="button" onClick={() => setValue(value)} className={`min-h-10 border px-3 text-xs font-bold ${current === value ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 text-white/65 hover:border-cyan-300/50"}`}>{value}</button>)}</div>;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby={`edit-routine-${exercise.id}`} className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto border-2 border-cyan-300/50 bg-[#101313] p-4 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-200">Editar ejercicio</p><h3 id={`edit-routine-${exercise.id}`} className="mt-1 text-xl font-black uppercase text-white">{exercise.name}</h3><p className="mt-1 text-xs text-white/45">Actualizá todos los datos de la rutina de una vez.</p></div><button type="button" aria-label="Cerrar" disabled={busy} onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center border border-white/20 text-xl text-white/70 hover:border-cyan-300">×</button></div>
    <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSave({ muscle: muscle.trim(), name: name.trim(), equipment: equipment.trim(), sourceMachine: machineNumber.trim(), sets: sets === "" ? null : Number(sets), reps: reps === "" ? null : Number(reps), time: time.trim(), weightKg: weight === "" ? null : Number(weight) }); onClose(); }}>
      <label className={labelClass}>Grupo muscular<input className={inputClass} list={`muscles-${exercise.id}`} value={muscle} disabled={busy} onChange={(event) => setMuscle(event.target.value)} placeholder="Ej. Glúteos" /><datalist id={`muscles-${exercise.id}`}>{muscles.map((value) => <option key={value} value={value} />)}</datalist></label>
      <label className={labelClass}>Nombre del ejercicio<input className={inputClass} required value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /></label>
      <label className={labelClass}>Equipo / máquina<input className={inputClass} value={equipment} disabled={busy} onChange={(event) => setEquipment(event.target.value)} placeholder="Ej. Polea" /></label>
      <label className={labelClass}>Número de máquina<input className={inputClass} value={machineNumber} disabled={busy} onChange={(event) => setMachineNumber(event.target.value)} placeholder="Ej. 24" /></label>
      <label className={labelClass}>Series<input className={inputClass} type="number" min="1" max="500" value={sets} disabled={busy} onChange={(event) => setSets(event.target.value)} placeholder="Elegí o escribí" />{quickValues(["2", "3", "4", "5"], sets, setSets)}</label>
      <label className={labelClass}>Repeticiones<input className={inputClass} type="number" min="1" max="500" value={reps} disabled={busy} onChange={(event) => setReps(event.target.value)} placeholder="Elegí o escribí" />{quickValues(["8", "10", "12", "15", "20"], reps, setReps)}</label>
      <label className={`${labelClass} sm:col-span-2`}>Tiempo<input className={inputClass} value={time} disabled={busy} onChange={(event) => setTime(event.target.value)} placeholder="Ej. 30 seg, 1 min o descanso 60 seg" />{quickValues(["30 seg", "45 seg", "60 seg", "1 min", "Sin tiempo"], time, setTime)}</label>
      <label className={`${labelClass} sm:col-span-2`}>Peso de referencia (kg)<input className={inputClass} type="number" min="0" max="1000" step="0.5" value={weight} disabled={busy} onChange={(event) => setWeight(event.target.value)} placeholder="Solo referencia para el entrenador" />{quickValues(["5", "10", "15", "20", "25", "30"], weight, setWeight)}<span className="normal-case font-normal tracking-normal text-white/35">El peso real de cada sesión se registra en Seguimiento; este valor queda como referencia del plan.</span></label>
      <div className="mt-2 flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:col-span-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 border-2 border-white/20 px-5 text-xs font-black uppercase text-white/65">Cancelar</button><button type="submit" disabled={busy || !name.trim()} className="min-h-11 bg-emerald-700 px-6 text-xs font-black uppercase text-white hover:bg-emerald-600 disabled:opacity-40">Guardar cambios</button></div>
    </form></section></div>;
}

function SessionTracker({ profile, routine, data, busy, dirty, setDirty, mutate }: {
  profile: GroupProfile; routine: GroupRoutine; data: GroupDashboard; busy: boolean; dirty: boolean;
  setDirty: (dirty: boolean) => void; mutate: Mutate;
}) {
  const [dayId, setDayId] = useState(routine.days[0].id);
  const [date, setDate] = useState(data.date);
  const day = routine.days.find((d) => d.id === dayId)!;
  const logs = data.logs.filter((log) => log.profileId === profile.id);
  const saved = logs.find((log) => log.dayId === dayId && log.date === date);
  const switchTo = (nextDay: string, nextDate: string) => {
    if (dirty && !window.confirm("¿Cambiar de sesión y descartar los cambios sin guardar?")) return;
    setDirty(false); setDayId(nextDay); setDate(nextDate);
  };
  return <div className="space-y-4">
    <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1"><p className="mb-2 text-xs font-black uppercase tracking-[.12em] text-white/60">Módulo</p><div className="flex flex-wrap gap-2" aria-label="Módulos de entrenamiento">{routine.days.map((entry) => <button key={entry.id} type="button" disabled={busy} onClick={() => switchTo(entry.id, date)} className={`min-h-11 border-2 px-4 text-[10px] font-black uppercase ${entry.id === dayId ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/50 hover:border-cyan-300/60"}`}>{entry.label}</button>)}</div></div>
        <div><p className="mb-2 text-xs font-black uppercase tracking-[.12em] text-white/60">Fecha</p><div className="flex flex-wrap items-center gap-2"><button type="button" aria-label="Día anterior" title="Día anterior" disabled={busy} onClick={() => switchTo(dayId, addDays(date, -1))} className="grid min-h-11 min-w-11 place-items-center border-2 border-white/15 text-white/60 hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><input aria-label="Fecha del seguimiento" className="min-h-11 border-2 border-cyan-300/60 bg-[#111] px-3 text-sm font-black text-white outline-none focus:border-cyan-300" type="date" value={date} max={data.date} disabled={busy} onChange={(e) => switchTo(dayId, e.target.value)} /><button type="button" aria-label="Día siguiente" title="Día siguiente" disabled={busy || date >= data.date} onClick={() => switchTo(dayId, addDays(date, 1))} className="grid min-h-11 min-w-11 place-items-center border-2 border-white/15 text-white/60 hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-25"><ChevronRight className="h-4 w-4" /></button><button type="button" disabled={busy || date === data.date} onClick={() => switchTo(dayId, data.date)} className="min-h-11 border-2 border-white/15 px-3 text-[10px] font-black uppercase text-white/60 hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-25">Hoy</button></div></div>
      </div>
      <SessionForm key={`${profile.id}:${dayId}:${date}:${saved?.revision ?? 0}`} profile={profile} day={day} date={date} data={data} saved={saved} busy={busy} setDirty={setDirty} mutate={mutate} />
    </div>
    <details open className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><summary className="cursor-pointer font-black">Seguimientos de {profile.name} ({logs.length})</summary><p className="mt-2 text-xs text-white/45">Hasta 60 registros recientes por persona. Elegí una sesión para consultar o corregirla.</p><div className="mt-3 space-y-2">{logs.length ? logs.map((log) => {
      const logRoutine = data.routines.find((entry) => entry.id === log.routineId) ?? routine;
      const logDay = logRoutine.days.find((d) => d.id === log.dayId);
      const canOpenLog = logRoutine.id === routine.id && Boolean(logDay);
      return <article key={log.id} className="border-2 border-white/10 p-3">{canOpenLog ? <button disabled={busy} onClick={() => switchTo(log.dayId, log.date)} className="text-left text-sm font-bold text-cyan-200">{log.date} · {logRoutine.objective} · {logDay?.label} · {log.completedIds.length}/{logDay?.exercises.length} realizados</button> : <p className="text-sm font-bold text-white/70">{log.date} · {logRoutine.objective} · {logDay?.label ?? log.dayId} · {log.completedIds.length}/{logDay?.exercises.length ?? log.completedIds.length} realizados</p>}<p className="mt-1 whitespace-pre-wrap text-sm text-white/60">{log.note || "Sin observaciones"}</p><p className="mt-1 text-xs text-white/40">Registró: {log.trainer}</p>{log.executions.some((e) => e.machineCode || e.weightKg !== null) && <p className="mt-2 text-xs text-white/45">{log.executions.filter((e) => e.machineCode || e.weightKg !== null).map((e) => `${logDay?.exercises.find((x) => x.id === e.exerciseId)?.name ?? e.machineName}: ${e.machineCode || e.machineName}${e.weightKg !== null ? ` · ${e.weightKg} kg` : ""}`).join("; ")}</p>}</article>;
    }) : <p className="text-sm text-white/50">Todavía no hay seguimiento. Registrá la primera sesión.</p>}</div></details>
  </div>;
}

function SessionForm({ profile, day, date, data, saved, busy, setDirty, mutate }: {
  profile: GroupProfile; day: GroupDay; date: string; data: GroupDashboard; saved?: GroupLog;
  busy: boolean; setDirty: (dirty: boolean) => void; mutate: Mutate;
}) {
  const [checked, setChecked] = useState<string[]>(saved?.completedIds ?? []);
  const [note, setNote] = useState(saved?.note ?? "");
  const [weights, setWeights] = useState<Record<string, number | null>>(Object.fromEntries(saved?.executions.map((e) => [e.exerciseId, e.weightKg]) ?? []));
  const [changed, setChanged] = useState(false);
  const markDirty = () => { setChanged(true); setDirty(true); };
  return <form className="mt-4" onSubmit={(e) => { e.preventDefault(); void mutate({ action: "log", profileId: profile.id, dayId: day.id, date, completedIds: checked, weights, note, revision: saved?.revision ?? 0 }, "Seguimiento guardado para esta persona y fecha."); }}>
    <div className="mb-3 flex flex-wrap justify-between gap-2"><h4 className="font-black uppercase">{day.focus}</h4><p className="text-sm text-cyan-200">{checked.length}/{day.exercises.length} realizados{changed ? " · Sin guardar" : saved ? " · Guardado" : ""}</p></div>
    <div className="mt-3 overflow-x-auto border-2 border-white/15"><table className="w-full min-w-[1040px] border-collapse text-left text-xs"><thead className="bg-white/[.06] text-[9px] font-black uppercase tracking-[.1em] text-white/50"><tr className="border-b-2 border-white/15"><th className="w-10 px-2 py-2">OK</th><th className="min-w-32 px-2 py-2">Grupo muscular</th><th className="min-w-44 px-2 py-2">Ejercicio</th><th className="min-w-56 px-2 py-2">Equipo / unidad</th><th className="w-20 px-2 py-2">Maq #</th><th className="w-16 px-2 py-2">Sets</th><th className="w-16 px-2 py-2">Reps</th><th className="w-28 px-2 py-2">Tiempo</th><th className="w-28 px-2 py-2">Carga kg</th></tr></thead><tbody>{day.exercises.map((exercise, index) => <ExerciseRow key={exercise.id} exercise={exercise} index={index} data={data} busy={busy} checked={checked.includes(exercise.id)} weight={weights[exercise.id] ?? null} onCheck={(value) => { markDirty(); setChecked((current) => value ? [...new Set([...current, exercise.id])] : current.filter((id) => id !== exercise.id)); }} onWeight={(value) => { markDirty(); setWeights((current) => ({ ...current, [exercise.id]: value })); }} />)}</tbody></table></div>
    <label className="mt-4 block text-xs text-white/60">Observación del entrenador<textarea rows={3} maxLength={2000} className={`${field} mt-1`} disabled={busy} value={note} onChange={(e) => { markDirty(); setNote(e.target.value); }} placeholder="Técnica, avances, dificultades y próximo paso" /></label>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/40">Registrar acá conserva el plan y el historial del socio en Member OS.</p><GameButton type="submit" disabled={busy || !date || !changed || (!checked.length && !note.trim())}><CheckCircle2 className="h-4 w-4" />{busy ? "Guardando..." : saved ? "Actualizar seguimiento" : "Guardar seguimiento"}</GameButton></div>
  </form>;
}

function ExerciseRow({ exercise, index, data, busy, checked, weight, onCheck, onWeight }: {
  exercise: GroupExercise; index: number; data: GroupDashboard; busy: boolean; checked: boolean; weight: number | null;
  onCheck: (checked: boolean) => void; onWeight: (weight: number | null) => void;
}) {
  const mapping = data.mappings.find((m) => m.exerciseId === exercise.id);
  const alignment = alignGroupExercise(exercise, data.inventory, mapping);
  const pending = alignment.status === "review" || alignment.status === "unavailable";
  return <tr className={`border-b border-white/10 align-middle ${pending ? "bg-orange-300/[.05]" : "bg-black/20"}`}>
    <td className="px-2 py-2"><input aria-label={`Realizado: ${exercise.name}, ejercicio ${index + 1}`} type="checkbox" className="h-5 w-5 accent-cyan-300" checked={checked} disabled={busy || (alignment.status === "review" && !checked)} onChange={(e) => onCheck(e.target.checked)} /></td>
    <td className="px-2 py-2 text-white/65">{exercise.muscle}</td>
    <td className="px-2 py-2"><span className="font-bold">{index + 1}. {exercise.name}</span><span className="block text-[10px] text-white/35">PDF pág. {exercise.sourcePage}{alignment.issues.length ? " · revisar" : ""}</span></td>
    <td className="min-w-56 px-2 py-2"><span className="text-white/65">{alignment.asset ? `${alignment.asset.code} · ${alignment.asset.name}` : exercise.equipment || "Sin equipo"}</span>{alignment.asset && <Link href={`/maquinas/equipo/${encodeURIComponent(alignment.asset.id)}`} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[10px] text-cyan-200 underline">Ver ficha ↗</Link>}</td>
    <td className="px-2 py-2 text-white/65">{exercise.sourceMachine || "-"}</td><td className="px-2 py-2 text-white/65">{exercise.sets ?? "-"}</td><td className="px-2 py-2 text-white/65">{exercise.reps ?? "-"}</td><td className="px-2 py-2 text-white/65">{exercise.time || "-"}</td>
    <td className="px-2 py-2"><input aria-label={`Carga real para ${exercise.name}`} type="number" min={0} max={1000} step="0.5" className="min-h-9 w-24 border border-white/20 bg-[#111] px-2 text-xs text-white outline-none focus:border-cyan-300" disabled={busy} value={weight ?? ""} placeholder="-" onChange={(e) => onWeight(e.target.value === "" ? null : Number(e.target.value))} /></td>
  </tr>;
}

function InlineText({ value, ariaLabel, disabled, onCommit }: { value: string; ariaLabel: string; disabled: boolean; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <input aria-label={ariaLabel} className="min-h-9 w-full min-w-20 border border-white/20 bg-[#111] px-2 text-[11px] text-white outline-none focus:border-cyan-300 disabled:opacity-40" disabled={disabled} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft.trim() !== value) onCommit(draft.trim()); }} />;
}

function InlineNumber({ value, ariaLabel, disabled, onCommit }: { value: number | null; ariaLabel: string; disabled: boolean; onCommit: (value: number | null) => void }) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  useEffect(() => setDraft(value === null ? "" : String(value)), [value]);
  return <input aria-label={ariaLabel} type="number" min={0} max={500} className="min-h-9 w-16 border border-white/20 bg-[#111] px-2 text-[11px] text-white outline-none focus:border-cyan-300 disabled:opacity-40" disabled={disabled} value={draft} placeholder="-" onChange={(event) => setDraft(event.target.value)} onBlur={() => { const next = draft.trim() === "" ? null : Math.max(0, Math.min(500, Math.round(Number(draft) || 0))); if (next !== value) onCommit(next); }} />;
}

function MachineCategoryAssignments({ exercises, data, busy, mutate }: { exercises: GroupExercise[]; data: GroupDashboard; busy: boolean; mutate: Mutate }) {
  const categories = [...new Map(data.inventory.filter((asset) => asset.machineGuideId).map((asset) => [asset.machineGuideId!, asset])).values()];
  return <details className="mt-3 border border-cyan-300/20 bg-black/20 p-3"><summary className="cursor-pointer text-[10px] font-black uppercase tracking-[.12em] text-cyan-200">Elegir categoría y unidad de máquina</summary><p className="mt-2 text-xs text-white/45">Si la sugerencia automática no sirve, elegí otra categoría. Las unidades ocupadas siguen visibles para que la entrenadora decida.</p><div className="mt-3 grid gap-2">{exercises.map((exercise) => <MachineCategoryRow key={exercise.id} exercise={exercise} data={data} categories={categories} busy={busy} mutate={mutate} />)}</div></details>;
}

function MachineCategoryRow({ exercise, data, categories, busy, mutate }: { exercise: GroupExercise; data: GroupDashboard; categories: GroupEquipment[]; busy: boolean; mutate: Mutate }) {
  const mapping = data.mappings.find((entry) => entry.exerciseId === exercise.id);
  const alignment = alignGroupExercise(exercise, data.inventory, mapping);
  const [category, setCategory] = useState(mapping?.machineGuideId ?? "");
  useEffect(() => setCategory(mapping?.machineGuideId ?? ""), [mapping?.machineGuideId]);
  const units = category ? data.inventory.filter((asset) => asset.machineGuideId === category) : alignment.candidates;
  const selectedUnit = mapping && (!category || mapping.machineGuideId === category) ? mapping.assetId : "";
  return <div className="grid gap-2 border border-white/10 p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"><span className="text-xs font-bold text-white/75">{exercise.name}</span><select aria-label={`Categoría de máquina para ${exercise.name}`} className="min-h-9 border border-white/20 bg-[#111] px-2 text-[11px] text-white outline-none focus:border-cyan-300" value={category} disabled={busy} onChange={(event) => setCategory(event.target.value)}><option value="">Automático según ejercicio</option>{categories.map((asset) => <option key={asset.machineGuideId} value={asset.machineGuideId}>{asset.name} ({data.inventory.filter((entry) => entry.machineGuideId === asset.machineGuideId).length})</option>)}</select><select aria-label={`Unidad de máquina para ${exercise.name}`} className="min-h-9 border border-white/20 bg-[#111] px-2 text-[11px] text-white outline-none focus:border-cyan-300" value={selectedUnit} disabled={busy || !units.length} onChange={(event) => { if (event.target.value) void mutate({ action: "mapping", exerciseId: exercise.id, assetId: event.target.value, ...(category ? { machineGuideId: category } : {}), revision: mapping?.revision ?? 0 }, "Categoría y unidad vinculadas."); }}><option value="">{units.length ? "Elegí unidad" : "No hay unidades"}</option>{units.map((asset) => <option key={asset.id} value={asset.id} disabled={!isGroupEquipmentAvailable(asset)}>{asset.code} · {asset.name}{!isGroupEquipmentAvailable(asset) ? " · no disponible" : ""}</option>)}</select></div>;
}

export function GroupManager({ data, members, groupId, profiles, busy, mutate, onGroupChange }: {
  data: GroupDashboard; members: TrainerMember[]; groupId: string; profiles: GroupProfile[]; busy: boolean;
  mutate: Mutate; onGroupChange: (groupId: string) => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [routineId, setRoutineId] = useState(data.routines[0]?.id ?? "");
  const [groupName, setGroupName] = useState("");
  const assigned = new Set(profiles.map((profile) => profile.memberId).filter(Boolean));
  const available = members.filter((member) => !assigned.has(member.memberId));
  return <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4">
    <p className="mb-3 text-xs font-black uppercase tracking-[.12em] text-cyan-200">Editando: {data.groups.find((group) => group.id === groupId)?.name ?? "Grupo"}</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-52 flex-1 text-xs font-black uppercase tracking-[.12em] text-white/60">Grupo activo<select className={`${field} mt-1 normal-case tracking-normal`} value={groupId} disabled={busy} onChange={(event) => onGroupChange(event.target.value)}>{data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      <form className="flex min-w-64 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); if (!groupName.trim()) return; void mutate({ action: "create_group", name: groupName, revision: 0 }, "Grupo creado.").then((ok) => { if (ok) setGroupName(""); }); }}><input className={field} value={groupName} disabled={busy} onChange={(event) => setGroupName(event.target.value)} placeholder="Nombre del nuevo grupo" aria-label="Nombre del nuevo grupo" /><GameButton type="submit" disabled={busy || !groupName.trim()}>Crear grupo</GameButton></form>
    </div>
    <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,.8fr)]">
      <label className="text-xs font-black uppercase tracking-[.12em] text-white/60">Agregar socio desde Todos<select className={`${field} mt-1 normal-case tracking-normal`} value={memberId} disabled={busy} onChange={(event) => setMemberId(event.target.value)}><option value="">Elegí una persona</option>{available.map((member) => <option key={member.memberId} value={member.memberId}>{member.memberName}</option>)}</select></label>
      <label className="text-xs font-black uppercase tracking-[.12em] text-white/60">Rutina inicial<select className={`${field} mt-1 normal-case tracking-normal`} value={routineId} disabled={busy} onChange={(event) => setRoutineId(event.target.value)}>{data.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.objective} · {routine.days.length} {routine.days.length === 1 ? "módulo" : "módulos"}</option>)}</select></label>
      <GameButton disabled={busy || !memberId} onClick={() => void mutate({ action: "add_member", groupId, memberId, routineId, revision: 0 }, "Persona agregada al grupo.").then((ok) => { if (ok) setMemberId(""); })}>Agregar</GameButton>
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><span className="text-xs font-black uppercase tracking-[.12em] text-white/45">Personas en este grupo</span>{profiles.length ? profiles.map((profile) => <span key={profile.id} className="inline-flex items-center gap-2 border border-white/15 px-2 py-1 text-xs text-white/70">{profile.name}<button type="button" disabled={busy} className="text-red-200 hover:text-red-100" aria-label={`Eliminar a ${profile.name} del grupo`} onClick={() => { if (window.confirm(`¿Eliminar a ${profile.name} del grupo?`)) void mutate({ action: "remove_member", groupId, profileId: profile.id, revision: 0 }, "Persona sacada del grupo."); }}>×</button></span>) : <span className="text-xs text-white/45">Todavía no hay personas.</span>}</div>
  </section>;
}

function GroupManagerWithSearch({ data, members, groupId, profiles, busy, mutate, onGroupChange }: {
  data: GroupDashboard; members: TrainerMember[]; groupId: string; profiles: GroupProfile[]; busy: boolean;
  mutate: Mutate; onGroupChange: (groupId: string) => void;
}) {
  const [memberQuery, setMemberQuery] = useState("");
  const [routineId, setRoutineId] = useState(data.routines[0]?.id ?? "");
  const [routineCreatorOpen, setRoutineCreatorOpen] = useState(false);
  const [routineObjective, setRoutineObjective] = useState("");
  const [routineStartDate, setRoutineStartDate] = useState(data.date);
  const [routineEndDate, setRoutineEndDate] = useState("");
  const [routineDayLabel, setRoutineDayLabel] = useState("");
  const [routineFocus, setRoutineFocus] = useState("");
  const [groupName, setGroupName] = useState("");
  const assigned = new Set(profiles.map((profile) => profile.memberId).filter(Boolean));
  const available = members.filter((member) => !assigned.has(member.memberId));
  const activeGroupName = data.groups.find((group) => group.id === groupId)?.name ?? "Grupo";
  return <div className="space-y-4">
    <section className="border-[3px] border-cyan-300/35 bg-[#0c0c0c] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><GameLabel tone="cyan">Administrar integrantes</GameLabel><h2 className="mt-2 text-2xl font-black uppercase">{activeGroupName}</h2><p className="mt-1 text-sm text-white/50">Revisá quiénes están adentro, sacá a alguien o agregá una persona nueva.</p></div>
        <label className="w-full text-xs font-black uppercase tracking-[.12em] text-white/60 sm:w-72">Cambiar de grupo<select className={`${field} mt-1 normal-case tracking-normal`} value={groupId} disabled={busy} onChange={(event) => onGroupChange(event.target.value)}>{data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      </div>
    </section>

    <div className="grid items-start gap-4 xl:grid-cols-2">
      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3 border-b border-white/10 pb-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-cyan-200">Personas en el grupo</p><p className="mt-1 text-sm text-white/45">Usá “Eliminar” para remover una persona.</p></div><strong className="text-3xl font-black text-cyan-200">{profiles.length}</strong></div>
        <div className="mt-3 space-y-2">{profiles.length ? profiles.map((profile) => {
          const routine = data.routines.find((entry) => entry.id === profile.routineId);
          return <div key={profile.id} className="flex flex-wrap items-end gap-3 border-2 border-white/10 bg-black/20 p-3"><div className="min-w-40 flex-1"><strong className="block truncate text-sm uppercase text-white/85">{profile.name}</strong><span className="mt-1 block text-xs text-white/40">{routine ? routine.objective : "Rutina sin identificar"}</span></div><label className="min-w-56 flex-1 text-[10px] font-black uppercase tracking-[.1em] text-white/45">Rutina asignada<select className={`${field} mt-1 normal-case tracking-normal`} value={profile.routineId} disabled={busy} onChange={(event) => void mutate({ action: "assign_routine", groupId, profileId: profile.id, routineId: event.target.value, revision: profile.routineRevision ?? 0 }, "Rutina cambiada para esta persona.")}>{data.routines.map((entry) => <option key={entry.id} value={entry.id}>{entry.objective} · {entry.days.length} {entry.days.length === 1 ? "módulo" : "módulos"}</option>)}</select></label><button type="button" disabled={busy} className="min-h-10 border-2 border-red-300/35 px-3 text-[10px] font-black uppercase text-red-200 transition hover:border-red-300 hover:bg-red-300/10 disabled:opacity-40" onClick={() => { if (window.confirm(`¿Eliminar a ${profile.name} del grupo?`)) void mutate({ action: "remove_member", groupId, profileId: profile.id, revision: 0 }, "Persona sacada del grupo."); }}>Eliminar</button></div>;
        }) : <p className="border-2 border-dashed border-white/10 p-6 text-center text-sm text-white/45">Este grupo todavía no tiene personas.</p>}</div>
      </section>

      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5">
        <div className="border-b border-white/10 pb-3"><p className="text-xs font-black uppercase tracking-[.12em] text-cyan-200">Buscar y agregar</p><p className="mt-1 text-sm text-white/45">Buscá por nombre, meta o entrenador y elegí “Agregar”.</p></div>
        <label className="mt-4 block text-xs font-black uppercase tracking-[.12em] text-white/60">Rutina que recibirá<select className={`${field} mt-1 normal-case tracking-normal`} value={routineId} disabled={busy} onChange={(event) => setRoutineId(event.target.value)}>{data.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.objective} · {routine.days.length} {routine.days.length === 1 ? "módulo" : "módulos"}</option>)}</select></label>
        <button type="button" disabled={busy} aria-expanded={routineCreatorOpen} onClick={() => setRoutineCreatorOpen((open) => !open)} className="mt-2 min-h-10 border-2 border-cyan-300/35 px-3 text-[10px] font-black uppercase text-cyan-200 transition hover:border-cyan-300 disabled:opacity-40">{routineCreatorOpen ? "Cancelar rutina nueva" : "+ Crear rutina desde cero"}</button>
        {routineCreatorOpen && <form className="mt-3 grid gap-3 border-2 border-cyan-300/20 bg-cyan-300/[.04] p-3 sm:grid-cols-2" onSubmit={(event) => {
          event.preventDefault();
          void mutate({ action: "create_routine", objective: routineObjective, startDate: routineStartDate, endDate: routineEndDate, dayLabel: routineDayLabel, focus: routineFocus, revision: 0 }, "Rutina creada y lista para asignar.", (result) => {
            if (result.routineId) setRoutineId(result.routineId);
            setRoutineObjective(""); setRoutineEndDate(""); setRoutineDayLabel(""); setRoutineFocus(""); setRoutineCreatorOpen(false);
          });
        }}>
          <div className="sm:col-span-2"><p className="text-xs font-black uppercase tracking-[.12em] text-cyan-200">Nueva rutina</p><p className="mt-1 text-xs text-white/45">Creá la base ahora. Después de asignarla, agregá los ejercicios desde la tabla de Grupo A.</p></div>
          <label className="text-xs font-black uppercase tracking-[.1em] text-white/55 sm:col-span-2">Objetivo de la rutina<input className={`${field} mt-1 normal-case tracking-normal`} value={routineObjective} maxLength={120} disabled={busy} onChange={(event) => setRoutineObjective(event.target.value)} placeholder="Ej. Fuerza y movilidad" required /></label>
          <label className="text-xs font-black uppercase tracking-[.1em] text-white/55">Fecha de inicio<input className={`${field} mt-1 normal-case tracking-normal`} type="date" value={routineStartDate} disabled={busy} onChange={(event) => setRoutineStartDate(event.target.value)} required /></label>
          <label className="text-xs font-black uppercase tracking-[.1em] text-white/55">Fecha final<input className={`${field} mt-1 normal-case tracking-normal`} type="date" min={routineStartDate} value={routineEndDate} disabled={busy} onChange={(event) => setRoutineEndDate(event.target.value)} required /></label>
          <label className="text-xs font-black uppercase tracking-[.1em] text-white/55">Nombre del primer módulo<input className={`${field} mt-1 normal-case tracking-normal`} value={routineDayLabel} maxLength={80} disabled={busy} onChange={(event) => setRoutineDayLabel(event.target.value)} placeholder="Ej. Día 1" required /></label>
          <label className="text-xs font-black uppercase tracking-[.1em] text-white/55">Enfoque<input className={`${field} mt-1 normal-case tracking-normal`} value={routineFocus} maxLength={120} disabled={busy} onChange={(event) => setRoutineFocus(event.target.value)} placeholder="Ej. Tren inferior" /></label>
          <GameButton type="submit" className="sm:col-span-2" disabled={busy || routineObjective.trim().length < 2 || !routineStartDate || !routineEndDate || routineEndDate < routineStartDate || routineDayLabel.trim().length < 2}>Crear y seleccionar rutina</GameButton>
        </form>}
        <div className="mt-4 min-w-0"><TrainerMemberSearch members={available} query={memberQuery} onQueryChange={setMemberQuery} compact emptyText="No hay socios disponibles para agregar." renderAction={(member) => <GameButton type="button" disabled={busy} onClick={() => void mutate({ action: "add_member", groupId, memberId: member.memberId, routineId, revision: 0 }, "Persona agregada al grupo.").then((ok) => { if (ok) setMemberQuery(""); })}>Agregar</GameButton>} /></div>
      </section>
    </div>

    <section className="border-[3px] border-white/10 bg-white/[.02] p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-60 flex-1"><p className="text-xs font-black uppercase tracking-[.12em] text-white/60">Crear otro grupo</p><p className="mt-1 text-sm text-white/40">Esta acción está separada de la administración de {activeGroupName}.</p></div><form className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[420px] sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (!groupName.trim()) return; void mutate({ action: "create_group", name: groupName, revision: 0 }, "Grupo creado.").then((ok) => { if (ok) setGroupName(""); }); }}><input className={field} value={groupName} disabled={busy} onChange={(event) => setGroupName(event.target.value)} placeholder="Nombre del nuevo grupo" aria-label="Nombre del nuevo grupo" /><GameButton type="submit" disabled={busy || !groupName.trim()}>Crear grupo</GameButton></form></div>
    </section>
  </div>;
}

function AddRoutineLine({ routineId, dayId, data, busy, mutate }: { routineId: string; dayId: string; data: GroupDashboard; busy: boolean; mutate: Mutate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [category, setCategory] = useState("");
  const [assetId, setAssetId] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [time, setTime] = useState("");
  const categories = [...new Map(data.inventory.filter((asset) => asset.machineGuideId).map((asset) => [asset.machineGuideId!, asset])).values()];
  const units = category ? data.inventory.filter((asset) => asset.machineGuideId === category) : [];
  const machine = data.inventory.find((asset) => asset.id === assetId);
  const muscles = [...new Set(data.routines.flatMap((routine) => routine.days.flatMap((day) => day.exercises.map((exercise) => exercise.muscle).filter(Boolean))))];
  return <details className="mt-3 border border-white/15 bg-black/20" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}><summary className="cursor-pointer px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-cyan-200">Agregar línea a esta rutina</summary><form className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void mutate({ action: "add_exercise", routineId, dayId, patch: { name: name.trim(), muscle: muscle.trim(), equipment: machine ? `${machine.code} · ${machine.name}` : equipment.trim(), ...(machine ? { sourceMachine: machine.code || machine.name } : {}), sets: sets === "" ? null : Number(sets), reps: reps === "" ? null : Number(reps), time: time.trim() }, revision: 0 }, "Línea agregada a la rutina.").then((ok) => { if (ok) { setName(""); setMuscle(""); setEquipment(""); setCategory(""); setAssetId(""); setSets(""); setReps(""); setTime(""); setOpen(false); } }); }}>
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Grupo muscular<input className={field} list="group-a-muscles" value={muscle} disabled={busy} onChange={(event) => setMuscle(event.target.value)} placeholder="Ej. Glúteos" aria-label="Grupo muscular" /><datalist id="group-a-muscles">{muscles.map((value) => <option key={value} value={value} />)}</datalist></label>
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Ejercicio<input className={field} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} placeholder="Ej. Glúteo en polea" aria-label="Nombre del ejercicio" required /></label>
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Categoría de máquina<select className={field} value={category} disabled={busy} onChange={(event) => { setCategory(event.target.value); setAssetId(""); setEquipment(""); }}><option value="">Sin máquina vinculada</option>{categories.map((asset) => <option key={asset.machineGuideId} value={asset.machineGuideId}>{asset.name}</option>)}</select></label>
    {category ? <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Máquina / unidad<select className={field} value={assetId} disabled={busy || !units.length} onChange={(event) => setAssetId(event.target.value)}><option value="">Elegí una unidad</option>{units.map((asset) => <option key={asset.id} value={asset.id} disabled={!isGroupEquipmentAvailable(asset)}>{asset.code} · {asset.name}{!isGroupEquipmentAvailable(asset) ? " · no disponible" : ""}</option>)}</select></label> : <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Equipo / detalle<input className={field} value={equipment} disabled={busy} onChange={(event) => setEquipment(event.target.value)} placeholder="Opcional" aria-label="Equipo o unidad" /></label>}
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Series<input className={field} type="number" min="1" max="500" value={sets} disabled={busy} onChange={(event) => setSets(event.target.value)} placeholder="Ej. 3" aria-label="Series" /></label>
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Repeticiones<input className={field} type="number" min="1" max="500" value={reps} disabled={busy} onChange={(event) => setReps(event.target.value)} placeholder="Ej. 12" aria-label="Repeticiones" /></label>
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Tiempo<input className={field} value={time} disabled={busy} onChange={(event) => setTime(event.target.value)} placeholder="Ej. 30 seg (opcional)" aria-label="Tiempo" /></label>
    <GameButton type="submit" className="lg:col-span-3" disabled={busy || !name.trim() || Boolean(category && !assetId)}>Agregar línea</GameButton>
  </form></details>;
}
