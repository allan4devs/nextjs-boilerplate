"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Users } from "lucide-react";
import { GameButton, GameLabel } from "@/app/components/GameOS";
import {
  alignGroupExercise, normalizeGroupName, isGroupEquipmentAvailable,
  type GroupDashboard, type GroupDay, type GroupEquipment, type GroupExercise, type GroupExercisePatch, type GroupLog, type GroupProfile, type GroupRoutine,
} from "@/lib/xtreme/trainer-group-a-model";
import type { TrainerMember } from "../types";
import { TrainerMemberSearch } from "./TrainerMemberSearch";

const field = "min-h-11 w-full border-2 border-white/20 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-40";

async function groupRequest(body?: Record<string, unknown>): Promise<GroupDashboard | { ok: true }> {
  const response = await fetch("/api/xtreme/trainer/group-a", body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo cargar el grupo.");
  return data;
}

export function TrainerGroupA({ active, members, refreshKey, onDirtyChange, onBusyChange, onOpenMember }: {
  active: boolean; members: TrainerMember[]; refreshKey: number;
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

  const mutate = async (body: Record<string, unknown>, text: string) => {
    setBusy(true); setMessage(null);
    try {
      await groupRequest(body);
      if (body.action === "log") setDraftDirty(false);
      const fresh = await groupRequest() as GroupDashboard;
      // Mapping/link changes must not replace an unsaved session draft.
      const refreshRoster = ["log", "exercise", "create_group", "add_member", "remove_member", "add_exercise"].includes(String(body.action));
      setData((current) => refreshRoster || !current ? fresh : { ...current, mappings: fresh.mappings, links: fresh.links, inventory: fresh.inventory });
      setMessage({ error: false, text });
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
  const unresolved = aligned.filter((entry) => entry.status === "review" || entry.status === "unavailable");
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
    <section className="border-[3px] border-cyan-300/40 bg-[#0c0c0c] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><GameLabel tone="cyan">Seguimiento cercano</GameLabel><h2 className="mt-2 flex items-center gap-2 text-2xl font-black uppercase"><Users /> Grupo A</h2><p className="mt-2 text-sm text-white/60">6 personas · 5 rutinas originales · Kengie Araya. Yuslin y Lauren comparten rutina y tienen registros separados.</p></div><GameButton variant="ghost" disabled={busy} onClick={() => { if (permitSwitch()) { setDraftDirty(false); void load(); } }}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Actualizar grupo</GameButton></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Personas" value={data.profiles.length} />
        <Stat label="Fichas vinculadas" value={data.links.filter((l) => members.some((m) => m.memberId === l.memberId)).length} />
        <Stat label="Máquinas vinculadas" value={sharedMachines.length} />
        <Stat label="Ejercicios por vincular" value={unresolved.length} />
      </div>
      <p className="mt-3 text-xs leading-5 text-white/45">Los números del PDF se conservan como referencia. Las máquinas vinculadas abren su ficha física. Los tiempos se muestran tal como fueron escritos; el encabezado no aclara siempre si son duración o descanso.</p>
    </section>
    <GroupManagerWithSearch data={data} members={members} groupId={groupId} profiles={groupProfiles} busy={busy} mutate={mutate} onGroupChange={(nextGroupId) => { setGroupId(nextGroupId); setProfileId(""); }} />
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
        <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><h3 className="text-xl font-black">{profile.name}</h3><p className="mt-1 text-sm text-white/60">{routine.objective} · {routine.startDate} al {routine.endDate}</p><p className="mt-2 text-xs text-white/40">Fuente: {routine.sourceFile}</p>
          {routine.endDate <= addDays(data.date, 7) && <p className="mt-3 flex items-center gap-2 text-sm text-orange-200"><AlertTriangle className="h-4 w-4" />{routine.endDate < data.date ? "Esta rutina venció; coordiná su revisión." : "La rutina termina en los próximos 7 días; coordiná su revisión."}</p>}
          <MemberLinkWithSearch key={profileId} profile={profile} members={members} value={profile.memberId ?? link?.memberId ?? ""} busy={busy} onChange={(memberId) => void mutate({ action: "link", profileId, memberId, revision: link?.revision ?? 0 }, "Ficha del socio vinculada.")} />
          {member && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span className="text-cyan-200">{member.memberName}</span><GameButton variant="ghost" disabled={busy} onClick={() => onOpenMember(member.normalizedName)}>Ver ficha e historial</GameButton></div>}
        </div>
        <SessionTracker key={profileId} profile={profile} routine={routine} data={data} busy={busy} dirty={dirty} setDirty={setDraftDirty} mutate={mutate} />
        {member && <details className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><summary className="cursor-pointer font-black">Actividad en Member OS</summary><p className="mt-3 text-xs text-white/45">Actividad del socio; no se cuenta automáticamente como cumplimiento de los PDF.</p><div className="mt-3 space-y-2">{member.recentWorkouts.length ? member.recentWorkouts.map((workout, i) => <p key={workout.id || i} className="border-l-2 border-cyan-300/40 pl-3 text-sm">{workout.completedDate || "Sin fecha"} · {workout.trainingName || "Entreno"} · {workout.minutes ?? 0} min</p>) : <p className="text-sm text-white/50">Sin entrenos registrados.</p>}</div></details>}
      </section>}
    </div>
    <details className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><summary className="cursor-pointer font-black uppercase">Máquinas compartidas por el grupo ({sharedMachines.length})</summary><p className="mt-3 text-xs text-white/45">Útil para organizar turnos. Las unidades pendientes aparecen en cada rutina hasta que se elijan.</p><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{sharedMachines.map(([assetId, machine]) => <Link key={assetId} href={`/maquinas/equipo/${encodeURIComponent(assetId)}`} target="_blank" rel="noopener noreferrer" className="border-2 border-white/15 p-3 hover:border-cyan-300"><strong className="text-sm">{machine.code} · {machine.name}</strong><p className="mt-1 text-xs text-white/50">{[...machine.people].join(", ")}</p></Link>)}</div></details>
  </div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="border-2 border-white/10 p-3"><p className="text-2xl font-black text-cyan-200">{value}</p><p className="text-xs text-white/50">{label}</p></div>;
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

function MemberLinkWithSearch({ profile, members, value, busy, onChange }: {
  profile: GroupProfile; members: TrainerMember[]; value: string; busy: boolean; onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState(profile.name.split(" ")[0]);
  const candidates = members.filter((member) => member.memberId === value || normalizeGroupName(member.memberName).includes(normalizeGroupName(query)));
  return <div className="mt-4"><p className="mb-2 text-xs font-black uppercase tracking-[.12em] text-white/60">Buscar ficha de socio para {profile.name}</p><TrainerMemberSearch members={candidates} query={query} onQueryChange={setQuery} selectedKey={members.find((member) => member.memberId === value)?.normalizedName} onSelect={(member) => onChange(member.memberId)} compact emptyText="No se encontró una ficha con esa búsqueda." /><button type="button" disabled={busy || !value} onClick={() => onChange("")} className="mt-2 min-h-9 text-xs font-bold text-white/45 underline disabled:opacity-40">Quitar vínculo</button></div>;
}

type Mutate = (body: Record<string, unknown>, success: string) => Promise<boolean>;
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
      <div className="flex flex-wrap items-end gap-3"><label className="min-w-52 flex-1 text-xs font-black uppercase tracking-[.12em] text-white/60">Filtrar módulo<select className={`${field} mt-1 normal-case tracking-normal`} value={dayId} disabled={busy} onChange={(e) => switchTo(e.target.value, date)}>{routine.days.map((d) => <option key={d.id} value={d.id}>{d.label} · {d.focus}</option>)}</select></label><label className="text-xs font-black uppercase tracking-[.12em] text-white/60">Fecha<input className={`${field} mt-1 normal-case tracking-normal`} type="date" value={date} max={data.date} disabled={busy} onChange={(e) => switchTo(dayId, e.target.value)} /></label></div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Módulos de entrenamiento">{routine.days.map((entry) => <button key={entry.id} type="button" disabled={busy} onClick={() => switchTo(entry.id, date)} className={`border-2 px-3 py-2 text-[10px] font-black uppercase ${entry.id === dayId ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/50 hover:border-cyan-300/60"}`}>{entry.label}</button>)}</div>
      <AddRoutineLine routineId={routine.id} dayId={day.id} busy={busy} mutate={mutate} />
      <SessionForm key={`${profile.id}:${dayId}:${date}:${saved?.revision ?? 0}`} profile={profile} day={day} date={date} data={data} saved={saved} busy={busy} setDirty={setDirty} mutate={mutate} />
    </div>
    <details open className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><summary className="cursor-pointer font-black">Seguimientos de {profile.name} ({logs.length})</summary><p className="mt-2 text-xs text-white/45">Hasta 60 registros recientes por persona. Elegí una sesión para consultar o corregirla.</p><div className="mt-3 space-y-2">{logs.length ? logs.map((log) => {
      const logDay = routine.days.find((d) => d.id === log.dayId);
      return <article key={log.id} className="border-2 border-white/10 p-3"><button disabled={busy} onClick={() => switchTo(log.dayId, log.date)} className="text-left text-sm font-bold text-cyan-200">{log.date} · {logDay?.label} · {log.completedIds.length}/{logDay?.exercises.length} realizados</button><p className="mt-1 whitespace-pre-wrap text-sm text-white/60">{log.note || "Sin observaciones"}</p><p className="mt-1 text-xs text-white/40">Registró: {log.trainer}</p>{log.executions.some((e) => e.machineCode || e.weightKg !== null) && <p className="mt-2 text-xs text-white/45">{log.executions.filter((e) => e.machineCode || e.weightKg !== null).map((e) => `${logDay?.exercises.find((x) => x.id === e.exerciseId)?.name}: ${e.machineCode || e.machineName}${e.weightKg !== null ? ` · ${e.weightKg} kg` : ""}`).join("; ")}</p>}</article>;
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
    <div className="mt-3 overflow-x-auto border-2 border-white/15"><table className="w-full min-w-[1040px] border-collapse text-left text-xs"><thead className="bg-white/[.06] text-[9px] font-black uppercase tracking-[.1em] text-white/50"><tr className="border-b-2 border-white/15"><th className="w-10 px-2 py-2">OK</th><th className="min-w-32 px-2 py-2">Grupo muscular</th><th className="min-w-44 px-2 py-2">Ejercicio</th><th className="min-w-56 px-2 py-2">Equipo / unidad</th><th className="w-20 px-2 py-2">Maq #</th><th className="w-16 px-2 py-2">Sets</th><th className="w-16 px-2 py-2">Reps</th><th className="w-28 px-2 py-2">Tiempo</th><th className="w-28 px-2 py-2">Carga kg</th></tr></thead><tbody>{day.exercises.map((exercise, index) => <ExerciseRow key={exercise.id} exercise={exercise} index={index} data={data} busy={busy} checked={checked.includes(exercise.id)} weight={weights[exercise.id] ?? null} onCheck={(value) => { markDirty(); setChecked((current) => value ? [...new Set([...current, exercise.id])] : current.filter((id) => id !== exercise.id)); }} onWeight={(value) => { markDirty(); setWeights((current) => ({ ...current, [exercise.id]: value })); }} mutate={mutate} />)}</tbody></table></div>
    <MachineCategoryAssignments exercises={day.exercises} data={data} busy={busy} mutate={mutate} />
    <details className="mt-3 border border-white/15 bg-black/20 p-3"><summary className="cursor-pointer text-[10px] font-black uppercase tracking-[.12em] text-cyan-200">Editar nombre y equipo de las filas</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{day.exercises.map((exercise) => { const edit = data.routineEdits.find((entry) => entry.exerciseId === exercise.id); const savePatch = (patch: GroupExercisePatch) => void mutate({ action: "exercise", exerciseId: exercise.id, patch, revision: edit?.revision ?? 0 }, "Valor de la rutina actualizado."); return <div key={exercise.id} className="grid gap-2 border border-white/10 p-2 sm:grid-cols-2"><InlineText value={exercise.name} ariaLabel={`Nombre editable de ${exercise.name}`} disabled={busy} onCommit={(value) => savePatch({ name: value })} /><InlineText value={exercise.equipment} ariaLabel={`Equipo editable de ${exercise.name}`} disabled={busy} onCommit={(value) => savePatch({ equipment: value })} /></div>; })}</div></details>
    <label className="mt-4 block text-xs text-white/60">Observación del entrenador<textarea rows={3} maxLength={2000} className={`${field} mt-1`} disabled={busy} value={note} onChange={(e) => { markDirty(); setNote(e.target.value); }} placeholder="Técnica, avances, dificultades y próximo paso" /></label>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/40">Registrar acá conserva el plan y el historial del socio en Member OS.</p><GameButton type="submit" disabled={busy || !date || !changed || (!checked.length && !note.trim())}><CheckCircle2 className="h-4 w-4" />{busy ? "Guardando..." : saved ? "Actualizar seguimiento" : "Guardar seguimiento"}</GameButton></div>
  </form>;
}

function ExerciseRow({ exercise, index, data, busy, checked, weight, onCheck, onWeight, mutate }: {
  exercise: GroupExercise; index: number; data: GroupDashboard; busy: boolean; checked: boolean; weight: number | null;
  onCheck: (checked: boolean) => void; onWeight: (weight: number | null) => void; mutate: Mutate;
}) {
  const mapping = data.mappings.find((m) => m.exerciseId === exercise.id);
  const edit = data.routineEdits.find((entry) => entry.exerciseId === exercise.id);
  const alignment = alignGroupExercise(exercise, data.inventory, mapping);
  const pending = alignment.status === "review" || alignment.status === "unavailable";
  const savePatch = (patch: GroupExercisePatch) => mutate({ action: "exercise", exerciseId: exercise.id, patch, revision: edit?.revision ?? 0 }, "Valor de la rutina actualizado.");
  return <tr className={`border-b border-white/10 align-middle ${pending ? "bg-orange-300/[.05]" : "bg-black/20"}`}>
    <td className="px-2 py-2"><input aria-label={`Realizado: ${exercise.name}, ejercicio ${index + 1}`} type="checkbox" className="h-5 w-5 accent-cyan-300" checked={checked} disabled={busy || (pending && !checked)} onChange={(e) => onCheck(e.target.checked)} /></td>
    <td className="px-2 py-2"><InlineText value={exercise.muscle} ariaLabel={`Grupo muscular para ${exercise.name}`} disabled={busy} onCommit={(value) => void savePatch({ muscle: value })} /></td>
    <td className="px-2 py-2"><span className="font-bold">{index + 1}. {exercise.name}</span><span className="block text-[10px] text-white/35">PDF pág. {exercise.sourcePage}{alignment.issues.length ? " · revisar" : ""}</span></td>
    <td className="min-w-56 px-2 py-2">{alignment.candidates.length > 0 ? <select aria-label={`Unidad para ${exercise.name}`} className="min-h-9 w-full border border-white/20 bg-[#111] px-2 text-[11px] text-white outline-none focus:border-cyan-300" value={alignment.asset?.id ?? ""} disabled={busy} onChange={(e) => { if (e.target.value) void mutate({ action: "mapping", exerciseId: exercise.id, assetId: e.target.value, revision: mapping?.revision ?? 0 }, "Máquina vinculada a la rutina."); }}><option value="">Elegí unidad</option>{alignment.candidates.map((asset) => <option key={asset.id} value={asset.id} disabled={!isGroupEquipmentAvailable(asset)}>{asset.code} · {asset.name}</option>)}</select> : <span className="text-white/55">{exercise.equipment || "Sin equipo"}</span>}{alignment.asset && <Link href={`/maquinas/equipo/${encodeURIComponent(alignment.asset.id)}`} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[10px] text-cyan-200 underline">Ficha de {alignment.asset.code} ↗</Link>}</td>
    <td className="px-2 py-2"><InlineText value={exercise.sourceMachine} ariaLabel={`Número de máquina para ${exercise.name}`} disabled={busy} onCommit={(value) => void savePatch({ sourceMachine: value })} /></td><td className="px-2 py-2"><InlineNumber value={exercise.sets} ariaLabel={`Series para ${exercise.name}`} disabled={busy} onCommit={(value) => void savePatch({ sets: value })} /></td><td className="px-2 py-2"><InlineNumber value={exercise.reps} ariaLabel={`Repeticiones para ${exercise.name}`} disabled={busy} onCommit={(value) => void savePatch({ reps: value })} /></td><td className="px-2 py-2"><InlineText value={exercise.time} ariaLabel={`Tiempo para ${exercise.name}`} disabled={busy} onCommit={(value) => void savePatch({ time: value })} /></td>
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
      <label className="text-xs font-black uppercase tracking-[.12em] text-white/60">Rutina inicial<select className={`${field} mt-1 normal-case tracking-normal`} value={routineId} disabled={busy} onChange={(event) => setRoutineId(event.target.value)}>{data.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.id} · {routine.objective}</option>)}</select></label>
      <GameButton disabled={busy || !memberId} onClick={() => void mutate({ action: "add_member", groupId, memberId, routineId, revision: 0 }, "Persona agregada al grupo.").then((ok) => { if (ok) setMemberId(""); })}>Agregar</GameButton>
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><span className="text-xs font-black uppercase tracking-[.12em] text-white/45">Personas en este grupo</span>{profiles.length ? profiles.map((profile) => <span key={profile.id} className="inline-flex items-center gap-2 border border-white/15 px-2 py-1 text-xs text-white/70">{profile.name}<button type="button" disabled={busy} className="text-red-200 hover:text-red-100" aria-label={`Sacar a ${profile.name} del grupo`} onClick={() => { if (window.confirm(`¿Sacar a ${profile.name} del grupo?`)) void mutate({ action: "remove_member", groupId, profileId: profile.id, revision: 0 }, "Persona sacada del grupo."); }}>×</button></span>) : <span className="text-xs text-white/45">Todavía no hay personas.</span>}</div>
  </section>;
}

function GroupManagerWithSearch({ data, members, groupId, profiles, busy, mutate, onGroupChange }: {
  data: GroupDashboard; members: TrainerMember[]; groupId: string; profiles: GroupProfile[]; busy: boolean;
  mutate: Mutate; onGroupChange: (groupId: string) => void;
}) {
  const [memberQuery, setMemberQuery] = useState("");
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
      <div className="min-w-0"><p className="mb-2 text-xs font-black uppercase tracking-[.12em] text-white/60">Agregar socio desde Todos</p><TrainerMemberSearch members={available} query={memberQuery} onQueryChange={setMemberQuery} compact emptyText="No hay socios disponibles para agregar." renderAction={(member) => <GameButton type="button" disabled={busy} onClick={() => void mutate({ action: "add_member", groupId, memberId: member.memberId, routineId, revision: 0 }, "Persona agregada al grupo.").then((ok) => { if (ok) setMemberQuery(""); })}>Agregar</GameButton>} /></div>
      <label className="text-xs font-black uppercase tracking-[.12em] text-white/60">Rutina inicial<select className={`${field} mt-1 normal-case tracking-normal`} value={routineId} disabled={busy} onChange={(event) => setRoutineId(event.target.value)}>{data.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.id} · {routine.objective}</option>)}</select></label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><span className="text-xs font-black uppercase tracking-[.12em] text-white/45">Personas en este grupo</span>{profiles.length ? profiles.map((profile) => <span key={profile.id} className="inline-flex items-center gap-2 border border-white/15 px-2 py-1 text-xs text-white/70">{profile.name}<button type="button" disabled={busy} className="text-red-200 hover:text-red-100" aria-label={`Sacar a ${profile.name} del grupo`} onClick={() => { if (window.confirm(`¿Sacar a ${profile.name} del grupo?`)) void mutate({ action: "remove_member", groupId, profileId: profile.id, revision: 0 }, "Persona sacada del grupo."); }}>×</button></span>) : <span className="text-xs text-white/45">Todavía no hay personas.</span>}</div>
  </section>;
}

function AddRoutineLine({ routineId, dayId, busy, mutate }: { routineId: string; dayId: string; busy: boolean; mutate: Mutate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [time, setTime] = useState("");
  return <details className="mt-3 border border-white/15 bg-black/20" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}><summary className="cursor-pointer px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-cyan-200">Agregar línea a esta rutina</summary><form className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void mutate({ action: "add_exercise", routineId, dayId, patch: { name, muscle, equipment, sets: sets === "" ? null : Number(sets), reps: reps === "" ? null : Number(reps), time }, revision: 0 }, "Línea agregada a la rutina.").then((ok) => { if (ok) { setName(""); setMuscle(""); setEquipment(""); setSets(""); setReps(""); setTime(""); setOpen(false); } }); }}>
    <input className={field} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} placeholder="Nombre del ejercicio" aria-label="Nombre del ejercicio" required />
    <input className={field} value={muscle} disabled={busy} onChange={(event) => setMuscle(event.target.value)} placeholder="Grupo muscular" aria-label="Grupo muscular" />
    <input className={field} value={equipment} disabled={busy} onChange={(event) => setEquipment(event.target.value)} placeholder="Equipo / unidad" aria-label="Equipo o unidad" />
    <input className={field} type="number" min="0" max="500" value={sets} disabled={busy} onChange={(event) => setSets(event.target.value)} placeholder="Series" aria-label="Series" />
    <input className={field} type="number" min="0" max="500" value={reps} disabled={busy} onChange={(event) => setReps(event.target.value)} placeholder="Repeticiones" aria-label="Repeticiones" />
    <input className={field} value={time} disabled={busy} onChange={(event) => setTime(event.target.value)} placeholder="Tiempo" aria-label="Tiempo" />
    <GameButton type="submit" disabled={busy || !name.trim()}>Agregar línea</GameButton>
  </form></details>;
}
