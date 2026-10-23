"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { GameButton, GameLabel } from "@/app/components/GameOS";
import {
  alignGroupExercise, normalizeGroupName, isGroupEquipmentAvailable,
  type GroupDashboard, type GroupDay, type GroupExercise, type GroupExercisePatch, type GroupLog, type GroupProfile, type GroupRoutine,
} from "@/lib/xtreme/trainer-group-a-model";
import type { TrainerMember } from "../types";
import { TrainerMemberSearch } from "./TrainerMemberSearch";
import { TrainerRoutineCreator, type RoutineMutation } from "./TrainerRoutineCreator";
import { TrainerEquipmentPicker } from "./TrainerEquipmentPicker";

const field = "min-h-11 w-full min-w-0 border-2 border-white/20 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-40";

async function groupRequest(body?: Record<string, unknown>): Promise<GroupDashboard | { ok: true; routineId?: string; dayId?: string }> {
  const response = await fetch("/api/xtreme/trainer/group-a", body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo cargar el grupo.");
  return data;
}

export function TrainerGroupA({ active, view, members, refreshKey, onDirtyChange, onBusyChange, onRefreshMembers, onOpenMember, onRequestView, initialRoutineId, initialProfileId }: {
  active: boolean; view: "tracking" | "routines" | "settings"; members: TrainerMember[]; refreshKey: number;
  onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void; onRefreshMembers: () => Promise<void>; onOpenMember: (key: string) => void; onRequestView?: (view: "tracking" | "routines" | "settings", routineId?: string, profileId?: string) => void; initialRoutineId?: string; initialProfileId?: string;
}) {
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [groupId, setGroupId] = useState("group-a");
  const [profileId, setProfileId] = useState("tiffany");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [personQuery, setPersonQuery] = useState("");
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
    if (!active || view !== "tracking") return;
    const refreshIfSafe = () => {
      if (document.visibilityState === "visible" && !dirty && !busy) {
        void onRefreshMembers();
        void load();
      }
    };
    const interval = window.setInterval(refreshIfSafe, 5_000);
    window.addEventListener("focus", refreshIfSafe);
    const channel = typeof window.BroadcastChannel === "undefined" ? null : new window.BroadcastChannel("xtreme-member-workout");
    const onWorkoutUpdated = () => refreshIfSafe();
    channel?.addEventListener("message", onWorkoutUpdated);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfSafe);
      channel?.removeEventListener("message", onWorkoutUpdated);
      channel?.close();
    };
  }, [active, busy, dirty, load, onRefreshMembers, view]);
  useEffect(() => {
    if (!data?.groups.some((group) => group.id === groupId)) {
      setGroupId(data?.groups[0]?.id ?? "group-a");
      return;
    }
    const nextProfile = data.profiles.find((profile) => profile.groupId === groupId);
    if (!data.profiles.some((profile) => profile.groupId === groupId && profile.id === profileId)) setProfileId(nextProfile?.id ?? "");
  }, [data, groupId, profileId]);

  const mutate = async (body: Record<string, unknown>, text: string, onSuccess?: (result: { ok: true; routineId?: string; dayId?: string }) => void, onError?: (message: string) => void) => {
    setBusy(true); setMessage(null);
    try {
      const result = await groupRequest(body) as { ok: true; routineId?: string; dayId?: string };
      if (body.action === "log") setDraftDirty(false);
      try {
        const fresh = await groupRequest() as GroupDashboard;
        // Mapping/link changes must not replace an unsaved session draft.
        const refreshRoster = ["log", "exercise", "create_group", "create_routine", "add_day", "add_member", "assign_routine", "remove_member", "delete_group", "add_exercise"].includes(String(body.action));
        setData((current) => refreshRoster || !current ? fresh : { ...current, mappings: fresh.mappings, links: fresh.links, inventory: fresh.inventory });
        setMessage({ error: false, text });
      } catch (refreshError) {
        const refreshMessage = refreshError instanceof Error ? refreshError.message : "No se pudo actualizar la pantalla.";
        setMessage({ error: false, text: `${text} La operación sí se guardó, pero no se pudo actualizar la pantalla: ${refreshMessage}` });
      }
      onSuccess?.(result);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo guardar.";
      setMessage({ error: true, text: errorMessage });
      onError?.(errorMessage);
      return false;
    } finally { setBusy(false); }
  };
  const permitSwitch = () => !dirty || window.confirm("¿Descartar los cambios de esta sesión sin guardar?");
  const groupProfiles = data?.profiles.filter((p) => p.groupId === groupId) ?? [];
  const visibleGroupProfiles = groupProfiles.filter((person) => {
    const linked = members.find((member) => member.memberId === person.memberId || member.memberId === data?.links.find((entry) => entry.profileId === person.id)?.memberId);
    const needle = normalizeGroupName(personQuery);
    return !needle || normalizeGroupName(`${person.name} ${linked?.memberName ?? ""}`).includes(needle);
  });
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
       const peopleInGroup = data?.profiles.filter((p) => p.groupId === groupId && p.routineId === row.routine.id) ?? [];
       if (!peopleInGroup.length) continue;
      const entry = machineMap.get(row.asset.id) ?? { code: row.asset.code, name: row.asset.name, people: new Set<string>() };
       peopleInGroup.forEach((p) => entry.people.add(p.name));
      machineMap.set(row.asset.id, entry);
    }
    return [...machineMap.entries()].sort((a, b) => b[1].people.size - a[1].people.size);
   }, [aligned, data, groupId]);

  if (!data) return <section className="border-[3px] border-cyan-300/30 bg-[#0c0c0c] p-6"><p role="status">{message?.text || "Cargando seguimiento..."}</p><GameButton className="mt-4" disabled={busy} onClick={() => void load()}>Volver a intentar</GameButton></section>;

  return <div hidden={!active} className="space-y-4">
    {message && <p role={message.error ? "alert" : "status"} className={`border-2 p-3 text-sm ${message.error ? "border-orange-300/50 text-orange-200" : "border-[#d8ff3e]/50 text-[#d8ff3e]"}`}>{message.text}</p>}
    {view === "tracking" && <>
    <div className="flex flex-wrap items-center gap-2 border-[3px] border-white/15 bg-[#0c0c0c] p-2" aria-label="Grupos"><span className="self-center px-2 text-[10px] font-black uppercase tracking-[.12em] text-white/45">Grupo activo</span>{data.groups.map((group) => <button key={group.id} type="button" disabled={busy} onClick={() => { if (group.id !== groupId && permitSwitch()) { setGroupId(group.id); setProfileId(""); setDraftDirty(false); } }} className={`min-h-10 shrink-0 border-2 px-4 text-xs font-black uppercase ${group.id === groupId ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/55 hover:border-cyan-300/60"}`}>{group.name}</button>)}<span className="ml-auto px-2 text-[10px] font-black uppercase tracking-[.1em] text-white/40">{groupProfiles.length} {groupProfiles.length === 1 ? "persona" : "personas"}</span></div>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-l-4 border-cyan-300 bg-cyan-300/[.05] px-3 py-2 text-[10px] font-black uppercase tracking-[.1em] text-white/55"><span><b className="text-cyan-200">1</b> Elegí grupo</span><span><b className="text-cyan-200">2</b> Elegí persona</span><span><b className="text-cyan-200">3</b> Registrá el día</span></div>
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[.12em] text-cyan-200">Personas del grupo</p><p className="mt-1 text-sm text-white/45">Cada card reúne el resumen y el seguimiento de una persona.</p></div>
        <label className="block w-full max-w-md border-2 border-white/15 bg-[#0c0c0c] p-2.5 text-[10px] font-black uppercase tracking-[.1em] text-white/50 focus-within:border-cyan-300">
          <span className="mb-1.5 flex items-center gap-2"><Search className="h-3.5 w-3.5 text-cyan-200" />Buscar persona</span>
          <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} placeholder="Nombre o ficha vinculada" className="min-h-9 w-full bg-transparent text-sm font-bold normal-case tracking-normal text-white outline-none placeholder:text-white/30" aria-label="Buscar persona en el Grupo A" />
        </label>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{visibleGroupProfiles.length} de {groupProfiles.length} personas</p>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {visibleGroupProfiles.map((person) => {
          const plan = data.routines.find((r) => r.id === person.routineId);
          if (!plan) return null;
          const logs = data.logs.filter((log) => log.profileId === person.id);
          const personLink = data.links.find((l) => l.profileId === person.id);
          const linked = members.find((m) => m.memberId === person.memberId || m.memberId === personLink?.memberId);
          const pending = aligned.filter((row) => row.routine.id === plan.id && ["review", "unavailable"].includes(row.status)).length;
          const isSelected = person.id === profileId;
          return <details key={person.id} defaultOpen={isSelected} className={`min-w-0 border-[3px] bg-[#0c0c0c] ${isSelected ? "border-cyan-300" : "border-white/15"}`}>
            <summary onClick={(event) => { if (person.id !== profileId && !permitSwitch()) { event.preventDefault(); return; } setDraftDirty(false); setProfileId(person.id); setMessage(null); }} className="cursor-pointer list-none p-4 marker:hidden">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-black">{person.name}</h3><p className="mt-1 text-xs text-white/55">{plan.days.length} días · {pending ? `${pending} ejercicios por revisar` : "Rutina lista"}</p></div><span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-cyan-200">{isSelected ? "Abierta" : "Ver detalle"}</span></div>
              <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2"><span className="text-cyan-200">{linked?.activePlanWorkout ? "Entrenando en Member OS" : logs[0] ? `Último seguimiento: ${logs[0].date}` : "Sin seguimiento registrado"}</span><span className="text-white/45 sm:text-right">{linked ? `Ficha: ${linked.memberName}` : "Sin ficha vinculada"}</span></div>
            </summary>
            <div className="space-y-3 border-t border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-black text-white/85">{plan.objective}</p><p className="mt-1 text-xs text-white/45">Vigencia: {plan.startDate} al {plan.endDate}</p></div>{plan.endDate <= addDays(data.date, 7) && <span className="flex items-center gap-1 text-xs font-bold text-orange-200"><AlertTriangle className="h-4 w-4" /> {plan.endDate < data.date ? "Vencida" : "Por vencer"}</span>}</div>
              <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !linked} onClick={() => linked && onOpenMember(linked.normalizedName)} className="min-h-9 border-2 border-cyan-300/40 px-3 text-[10px] font-black uppercase text-cyan-200 hover:border-cyan-300 disabled:opacity-40">Ver ficha</button><button type="button" disabled={busy} onClick={() => onRequestView?.("routines", plan.id, person.id)} className="min-h-9 border-2 border-[#d8ff3e]/45 px-3 text-[10px] font-black uppercase text-[#d8ff3e] hover:border-[#d8ff3e]">Editar rutina</button></div>
              <details className="border border-white/15 bg-black/20 p-3"><summary className="cursor-pointer text-xs font-black uppercase tracking-[.1em] text-cyan-200">Ficha vinculada y acciones</summary><MemberLinkWithSearch key={person.id} profile={person} members={members} value={person.memberId ?? personLink?.memberId ?? ""} busy={busy} onOpenMember={onOpenMember} onOpenRoutine={(routineId) => onRequestView?.("routines", routineId, person.id)} onChange={(memberId) => void mutate({ action: "link", profileId: person.id, memberId, revision: personLink?.revision ?? 0 }, memberId ? "Ficha del socio vinculada." : "Vínculo eliminado")} /></details>
              <details defaultOpen={isSelected} className="border border-white/15 bg-black/20 p-3"><summary className="cursor-pointer text-xs font-black uppercase tracking-[.1em] text-cyan-200">Registrar entrenamiento</summary><div className="mt-3"><SessionTracker key={person.id} profile={person} routine={plan} data={data} busy={busy} dirty={dirty && isSelected} setDirty={setDraftDirty} mutate={mutate} /></div></details>
              {linked && <details className="border border-cyan-300/35 bg-cyan-300/[.04] p-3"><summary className="cursor-pointer text-xs font-black uppercase tracking-[.1em] text-cyan-200">Ejecución desde Member OS</summary><div className="mt-3"><MemberWorkoutProgress member={linked} routine={plan} /></div></details>}
              {linked && <details className="border border-white/15 bg-black/20 p-3"><summary className="cursor-pointer text-xs font-black uppercase tracking-[.1em] text-white/65">Actividad en Member OS</summary><p className="mt-3 text-xs text-white/45">Actividad del socio; no se cuenta automáticamente como cumplimiento de los PDF.</p><div className="mt-3 space-y-2">{linked.recentWorkouts.length ? linked.recentWorkouts.map((workout, i) => <p key={workout.id || i} className="border-l-2 border-cyan-300/40 pl-3 text-sm">{workout.completedDate || "Sin fecha"} · {workout.trainingName || "Entreno"} · {workout.minutes ?? 0} min</p>) : <p className="text-sm text-white/50">Sin entrenos registrados.</p>}</div></details>}
            </div>
          </details>;
        })}
      </div>
      {!visibleGroupProfiles.length && <p className="border border-dashed border-white/15 p-6 text-center text-sm text-white/45">No hay personas con esa búsqueda.</p>}
    </div>
    <div className="hidden">
      <nav aria-label="Personas del grupo seleccionado" className="space-y-2">
        <label className="block border-2 border-white/15 bg-[#0c0c0c] p-2.5 text-[10px] font-black uppercase tracking-[.1em] text-white/50 focus-within:border-cyan-300">
          <span className="mb-1.5 flex items-center gap-2"><Search className="h-3.5 w-3.5 text-cyan-200" />Buscar persona</span>
          <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} placeholder="Nombre o ficha vinculada" className="min-h-10 w-full bg-transparent text-sm font-bold normal-case tracking-normal text-white outline-none placeholder:text-white/30" aria-label="Buscar persona en el Grupo A" />
        </label>
        <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-white/35">{visibleGroupProfiles.length} de {groupProfiles.length} personas</p>
        {visibleGroupProfiles.map((person) => {
        const plan = data.routines.find((r) => r.id === person.routineId)!;
        const logs = data.logs.filter((log) => log.profileId === person.id);
        const personLink = data.links.find((l) => l.profileId === person.id);
        const linked = members.find((m) => m.memberId === person.memberId || m.memberId === personLink?.memberId);
        const pending = aligned.filter((row) => row.routine.id === plan.id && ["review", "unavailable"].includes(row.status)).length;
        return <div key={person.id} role="button" tabIndex={busy ? -1 : 0} aria-pressed={person.id === profileId} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !busy) { event.preventDefault(); if (person.id !== profileId && permitSwitch()) { setDraftDirty(false); setProfileId(person.id); setMessage(null); } } }} onClick={() => { if (person.id !== profileId && permitSwitch()) { setDraftDirty(false); setProfileId(person.id); setMessage(null); } }} className={`w-full border-[3px] p-3 text-left ${person.id === profileId ? "border-cyan-300 bg-cyan-300/10" : "border-white/15 bg-[#0c0c0c]"}`}>
          <div className="flex items-start justify-between gap-2"><strong className="block truncate font-black">{person.name}</strong><button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); onRequestView?.("routines", plan.id, person.id); }} className="min-h-8 shrink-0 border border-[#d8ff3e]/45 px-2 text-[9px] font-black uppercase text-[#d8ff3e] hover:border-[#d8ff3e]">Ver rutina</button></div><span className="mt-1 block text-xs text-white/60">{plan.days.length} días · {pending ? `${pending} ejercicios por revisar` : "Rutina lista"}</span>
          <span className="mt-2 block text-xs text-cyan-200">{linked?.activePlanWorkout ? "Entrenando en Member OS" : logs[0] ? `Último seguimiento: ${logs[0].date}` : "Sin seguimiento registrado"}</span>
          <span className="mt-1 block text-[11px] text-white/45">{linked ? "Ficha vinculada" : "Sin ficha vinculada"}{plan.endDate < data.date ? " · Rutina vencida" : plan.endDate <= addDays(data.date, 7) ? " · Próxima revisión" : ""}</span>
        </div>;
        })}
        {!visibleGroupProfiles.length && <p className="border border-dashed border-white/15 p-4 text-center text-xs text-white/45">No hay personas con esa búsqueda.</p>}
      </nav>
      {profile && routine && <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-[3px] border-white/15 bg-[#0c0c0c] p-3">
          <h3 className="shrink-0 text-lg font-black">{profile.name}</h3>
          <p className="min-w-0 flex-1 truncate text-sm text-white/60"><strong className="text-white/80">{routine.objective}</strong> · {routine.startDate} al {routine.endDate} <span className="text-white/30">· {routine.sourceFile}</span></p>
          {routine.endDate <= addDays(data.date, 7) && <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-orange-200" title={routine.endDate < data.date ? "Esta rutina venció; coordiná su revisión." : "La rutina termina en los próximos 7 días; coordiná su revisión."}><AlertTriangle className="h-4 w-4" /> {routine.endDate < data.date ? "Vencida" : "Por vencer"}</span>}
          <MemberLinkWithSearch key={profileId} profile={profile} members={members} value={profile.memberId ?? link?.memberId ?? ""} busy={busy} onOpenMember={onOpenMember} onOpenRoutine={(routineId) => onRequestView?.("routines", routineId, profile.id)} onChange={(memberId) => void mutate({ action: "link", profileId, memberId, revision: link?.revision ?? 0 }, memberId ? "Ficha del socio vinculada." : "Vínculo eliminado.")} />
          {member && <button type="button" disabled={busy} onClick={() => onOpenMember(member.normalizedName)} className="min-h-10 border-2 border-cyan-300/40 px-3 text-[10px] font-black uppercase text-cyan-200 hover:border-cyan-300">Ver ficha</button>}
          <button type="button" disabled={busy} onClick={() => onRequestView?.("routines", routine.id)} className="min-h-10 border-2 border-[#d8ff3e]/45 px-3 text-[10px] font-black uppercase text-[#d8ff3e] hover:border-[#d8ff3e]">Editar rutina</button>
        </div>
        <SessionTracker key={profileId} profile={profile} routine={routine} data={data} busy={busy} dirty={dirty} setDirty={setDraftDirty} mutate={mutate} />
        {member && <MemberWorkoutProgress member={member} routine={routine} />}
        {member && <details className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><summary className="cursor-pointer font-black">Actividad en Member OS</summary><p className="mt-3 text-xs text-white/45">Actividad del socio; no se cuenta automáticamente como cumplimiento de los PDF.</p><div className="mt-3 space-y-2">{member.recentWorkouts.length ? member.recentWorkouts.map((workout, i) => <p key={workout.id || i} className="border-l-2 border-cyan-300/40 pl-3 text-sm">{workout.completedDate || "Sin fecha"} · {workout.trainingName || "Entreno"} · {workout.minutes ?? 0} min</p>) : <p className="text-sm text-white/50">Sin entrenos registrados.</p>}</div></details>}
      </section>}
    </div>
    <details className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><summary className="cursor-pointer font-black uppercase">Máquinas compartidas por el grupo ({sharedMachines.length})</summary><p className="mt-3 text-xs text-white/45">Útil para organizar turnos. Las unidades pendientes aparecen en cada rutina hasta que se elijan.</p><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{sharedMachines.map(([assetId, machine]) => <Link key={assetId} href={`/maquinas/equipo/${encodeURIComponent(assetId)}`} target="_blank" rel="noopener noreferrer" className="border-2 border-white/15 p-3 hover:border-cyan-300"><strong className="text-sm">{machine.code} · {machine.name}</strong><p className="mt-1 text-xs text-white/50">{[...machine.people].join(", ")}</p></Link>)}</div></details>
    </>}
    {view === "routines" && <RoutineLibrary key={`${initialRoutineId ?? "library"}:${initialProfileId ?? ""}`} data={data} members={members} busy={busy} mutate={mutate} onDirtyChange={setDraftDirty} initialRoutineId={initialRoutineId} initialProfileId={initialProfileId} />}
    {view === "settings" && <>
      <GroupSettings data={data} members={members} groupId={groupId} profiles={groupProfiles} busy={busy} mutate={mutate} onGroupChange={(nextGroupId) => { setGroupId(nextGroupId); setProfileId(""); }} onRequestView={onRequestView} />
    </>}
  </div>;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}
function isSunday(date: string) {
  return Boolean(date) && new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
}
function routineDayForDate(routine: GroupRoutine, date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (weekday === 0 || !routine.days.length) return routine.days[0]?.id ?? "";
  return routine.days[Math.min(weekday - 1, routine.days.length - 1)]?.id ?? routine.days[0].id;
}
export function MemberLink({ profile, members, value, busy, onChange }: {
  profile: GroupProfile; members: TrainerMember[]; value: string; busy: boolean; onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState(profile.name.split(" ")[0]);
  const candidates = members.filter((m) => m.memberId === value || normalizeGroupName(m.memberName).includes(normalizeGroupName(query)));
  return <div className="mt-4 grid gap-2 sm:grid-cols-2"><label className="text-xs text-white/60">Buscar ficha de socio<input className={`${field} mt-1`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o apellidos" /></label><label className="text-xs text-white/60">Vincular a la persona correcta<select className={`${field} mt-1`} value={value} disabled={busy} onChange={(event) => onChange(event.target.value)}><option value="">Sin vincular</option>{candidates.map((m) => <option key={m.memberId} value={m.memberId}>{m.memberName}</option>)}</select></label></div>;
}

function MemberLinkWithSearch({ profile, members, value, busy, onChange, onOpenMember, onOpenRoutine }: {
  profile: GroupProfile; members: TrainerMember[]; value: string; busy: boolean; onChange: (id: string) => void; onOpenMember: (key: string) => void; onOpenRoutine?: (routineId: string) => void;
}) {
  const [query, setQuery] = useState(profile.name.split(" ")[0]);
  const [editing, setEditing] = useState(!value);
  const linkedMember = members.find((member) => member.memberId === value);
  const candidates = members.filter((member) => member.memberId === value || normalizeGroupName(member.memberName).includes(normalizeGroupName(query)));
  if (value && !editing) return <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
    <p className="max-w-64 truncate text-sm font-black text-cyan-200" title={linkedMember?.memberName || profile.name}>{linkedMember?.memberName || profile.name}</p>
    {linkedMember && <GameButton variant="ghost" disabled={busy} onClick={() => onOpenMember(linkedMember.normalizedName)}>Ver ficha de salud</GameButton>}
    <GameButton variant="ghost" disabled={busy} onClick={() => onOpenRoutine?.(profile.routineId)}>Ver rutina</GameButton>
    <button type="button" disabled={busy} onClick={() => { setQuery(profile.name.split(" ")[0]); setEditing(true); }} className="min-h-10 px-2 text-[10px] font-black uppercase text-white/50 underline hover:text-cyan-200 disabled:opacity-40">Cambiar</button>
    <button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Quitar el vínculo con ${linkedMember?.memberName || profile.name}?`)) { onChange(""); setEditing(true); } }} className="min-h-10 px-2 text-[10px] font-black uppercase text-red-200/75 underline hover:text-red-200 disabled:opacity-40">Quitar</button>
  </div>;
  return <div className="basis-full border-t border-white/10 pt-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-[.12em] text-white/60">{value ? "Cambiar ficha vinculada" : "Vincular ficha de socio"}</p><p className="mt-1 text-xs text-white/40">Buscá y seleccioná a la persona correcta.</p></div>{value && <button type="button" disabled={busy} onClick={() => setEditing(false)} className="min-h-9 px-2 text-[10px] font-black uppercase text-white/50 underline">Cancelar</button>}</div>
    <TrainerMemberSearch members={candidates} query={query} onQueryChange={setQuery} selectedKey={linkedMember?.normalizedName} onSelect={(selected) => { onChange(selected.memberId); setEditing(false); }} compact emptyText="No se encontró una ficha con esa búsqueda." />
  </div>;
}

type Mutate = RoutineMutation;

function RoutineLibrary({ data, members, busy, mutate, onDirtyChange, initialRoutineId, initialProfileId }: { data: GroupDashboard; members: TrainerMember[]; busy: boolean; mutate: Mutate; onDirtyChange: (dirty: boolean) => void; initialRoutineId?: string; initialProfileId?: string }) {
  const [routineId, setRoutineId] = useState(initialRoutineId || data.profiles[0]?.routineId || data.routines[0]?.id || "");
  const [personId, setPersonId] = useState(initialProfileId ?? (initialRoutineId ? "" : data.profiles[0]?.id ?? ""));
  const routine = data.routines.find((entry) => entry.id === routineId) ?? data.routines[0];
  const [dayId, setDayId] = useState(routine?.days[0]?.id ?? "");
  const [addingModule, setAddingModule] = useState(false);
  const [moduleLabel, setModuleLabel] = useState("");
  const [moduleFocus, setModuleFocus] = useState("");
  const [targetGroupId, setTargetGroupId] = useState(data.groups[0]?.id ?? "group-a");
  const [targetProfileId, setTargetProfileId] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const selectCreatedRoutine = (id: string) => { setRoutineId(id); setPersonId(""); setDayId(""); setAddingModule(false); };
  if (!routine) return <div className="space-y-4"><TrainerRoutineCreator data={data} busy={busy} mutate={mutate} onDirtyChange={onDirtyChange} onCreated={selectCreatedRoutine} /><p className="border-[3px] border-dashed border-white/15 p-6 text-sm text-white/60">Todavía no hay rutinas. Creá la primera desde cero.</p></div>;
  const day = routine.days.find((entry) => entry.id === dayId) ?? routine.days[0];
  const assigned = data.profiles.filter((profile) => profile.routineId === routine.id);
  const targetProfiles = data.profiles.filter((profile) => profile.groupId === targetGroupId);
  const memberIdForProfile = (profile?: GroupProfile) => profile?.memberId || (profile ? data.links.find((link) => link.profileId === profile.id)?.memberId : undefined);
  const selectedTargetProfile = targetProfiles.find((profile) => profile.id === targetProfileId);
  return <div className="min-w-0 space-y-4">
    <TrainerRoutineCreator data={data} busy={busy} mutate={mutate} onDirtyChange={onDirtyChange} onCreated={selectCreatedRoutine} />
    <section className="border-[3px] border-cyan-300/35 bg-[#0c0c0c] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(240px,1fr)] lg:items-end"><div><GameLabel tone="cyan">Rutina abierta</GameLabel><h2 className="mt-2 break-words text-xl font-black uppercase">{routine.objective}</h2><p className="mt-1 text-sm text-white/45">Elegí una persona para ver su plan o abrí una rutina de la biblioteca.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black uppercase tracking-[.12em] text-white/60">Persona<select className={`${field} mt-1 normal-case tracking-normal`} value={personId} disabled={busy} onChange={(event) => { const nextProfile = data.profiles.find((profile) => profile.id === event.target.value); setPersonId(event.target.value); if (nextProfile) { const nextRoutine = data.routines.find((entry) => entry.id === nextProfile.routineId); setRoutineId(nextProfile.routineId); setDayId(nextRoutine?.days[0]?.id ?? ""); } }}><option value="">Biblioteca de rutinas</option>{data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><label className="text-xs font-black uppercase tracking-[.12em] text-white/60">Rutina abierta<select className={`${field} mt-1 normal-case tracking-normal`} value={routine.id} disabled={busy} onChange={(event) => { const next = data.routines.find((entry) => entry.id === event.target.value); setRoutineId(event.target.value); setPersonId(""); setAddingModule(false); setDayId(next?.days[0]?.id ?? ""); }}>{data.routines.map((entry) => <option key={entry.id} value={entry.id}>{entry.objective} · {entry.days.length} {entry.days.length === 1 ? "día" : "días"}</option>)}</select></label></div></div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/50"><strong className="text-white/75">Personas con esta rutina: {assigned.length}</strong>{assigned.length ? assigned.map((profile) => <button key={profile.id} type="button" disabled={busy} onClick={() => setPersonId(profile.id)} className={`border px-2 py-1 ${personId === profile.id ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-white/15 hover:border-cyan-300/60"}`}>{profile.name}</button>) : <span>Ninguna todavía</span>}</div>
    </section>

    <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4">
        <div className="flex flex-wrap items-center gap-2">{routine.days.map((entry) => <button key={entry.id} type="button" disabled={busy} onClick={() => setDayId(entry.id)} className={`min-h-11 border-2 px-4 text-[10px] font-black uppercase ${entry.id === day?.id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/50 hover:border-cyan-300/60"}`}>{entry.label}</button>)}<button type="button" disabled={busy} onClick={() => setAddingModule((open) => !open)} className="min-h-11 border-2 border-dashed border-cyan-300/40 px-4 text-[10px] font-black uppercase text-cyan-200">+ Nuevo día</button></div>
      {addingModule && <form className="mt-3 flex flex-wrap items-end gap-2 border-2 border-cyan-300/20 p-3" onSubmit={(event) => { event.preventDefault(); void mutate({ action: "add_day", routineId: routine.id, label: moduleLabel, focus: moduleFocus, revision: 0 }, "Día creado.", (result) => { if (result.dayId) setDayId(result.dayId); setModuleLabel(""); setModuleFocus(""); setAddingModule(false); }); }}><label className="w-full min-w-0 flex-1 text-xs font-black uppercase text-white/55 sm:min-w-52">Nombre del día<input className={`${field} mt-1 normal-case`} value={moduleLabel} onChange={(event) => setModuleLabel(event.target.value)} placeholder={`Día ${routine.days.length + 1}`} required /></label><label className="w-full min-w-0 flex-1 text-xs font-black uppercase text-white/55 sm:min-w-52">Enfoque<input className={`${field} mt-1 normal-case`} value={moduleFocus} onChange={(event) => setModuleFocus(event.target.value)} placeholder="Ej. Tren superior" /></label><GameButton type="submit" disabled={busy || moduleLabel.trim().length < 2}>Crear día</GameButton></form>}
      {day && <><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black uppercase">{day.label}</h3><p className="text-sm text-white/45">{day.focus}</p></div><span className="text-xs font-bold text-cyan-200">{day.exercises.length} ejercicios</span></div>{day.exercises.length ? <div className="mt-3 overflow-x-auto border-2 border-white/15"><table className="w-full min-w-[980px] border-collapse text-left text-xs"><thead className="bg-white/[.06] text-[9px] font-black uppercase tracking-[.1em] text-white/50"><tr><th className="px-2 py-2">Grupo muscular</th><th className="px-2 py-2">Ejercicio</th><th className="px-2 py-2">Equipo / unidad</th><th className="px-2 py-2">Maq #</th><th className="px-2 py-2">Sets</th><th className="px-2 py-2">Reps</th><th className="px-2 py-2">Tiempo</th><th className="px-2 py-2">Peso ref.</th><th className="px-2 py-2">Editar</th></tr></thead><tbody>{day.exercises.map((exercise) => <RoutineExerciseEditorRow key={exercise.id} exercise={exercise} data={data} busy={busy} mutate={mutate} />)}</tbody></table></div> : <div className="mt-4 border-2 border-dashed border-cyan-300/30 p-5"><h4 className="font-black text-cyan-200">Este día está vacío</h4><p className="mt-1 text-sm text-white/60">Agregá el primer ejercicio para empezar a armar la rutina.</p></div>}<AddRoutineLineDetails key={`${routine.id}:${day.id}`} routineId={routine.id} dayId={day.id} data={data} busy={busy} mutate={mutate} initiallyOpen={!day.exercises.length} /><MachineCategoryAssignments exercises={day.exercises} data={data} busy={busy} mutate={mutate} /></>}
    </section>
    <section className="border-[3px] border-[#d8ff3e]/35 bg-[#d8ff3e]/[.04] p-4 sm:p-5"><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center"><div><GameLabel tone="lime">Asignar esta rutina</GameLabel><p className="mt-1 max-w-sm text-sm text-white/50">Elegí un grupo y buscá la persona por nombre.</p></div><label className="block text-[10px] font-black uppercase tracking-[.12em] text-white/55">Grupo<select className={`${field} mt-1 normal-case tracking-normal`} value={targetGroupId} disabled={busy} onChange={(event) => { setTargetGroupId(event.target.value); setTargetProfileId(""); setTargetQuery(""); }}>{data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div className="min-w-0 space-y-2"><label className="block text-[10px] font-black uppercase tracking-[.12em] text-white/55">Buscar persona<input className={`${field} mt-1 normal-case tracking-normal`} value={targetQuery} disabled={busy} onChange={(event) => { setTargetQuery(event.target.value); setTargetProfileId(""); }} placeholder="Nombre o apellidos" /></label><label className="block text-[10px] font-black uppercase tracking-[.12em] text-white/55">Persona<select className={`${field} mt-1 normal-case tracking-normal`} value={targetProfileId} disabled={busy} onChange={(event) => setTargetProfileId(event.target.value)}><option value="">Elegí una persona</option>{targetProfiles.filter((profile) => normalizeGroupName(`${profile.name} ${members.find((member) => memberIdForProfile(profile) === member.memberId)?.memberName ?? ""}`).includes(normalizeGroupName(targetQuery))).map((profile) => <option key={profile.id} value={profile.id}>{profile.name}{profile.routineId === routine.id ? " · ya asignada" : ""}</option>)}</select></label></div><GameButton type="button" className="w-full xl:w-auto" disabled={busy || !selectedTargetProfile || selectedTargetProfile.routineId === routine.id} onClick={() => void mutate({ action: "assign_routine", groupId: targetGroupId, profileId: targetProfileId, routineId: routine.id, revision: data.profiles.find((profile) => profile.id === targetProfileId)?.routineRevision ?? 0 }, "Rutina asignada a la persona.", () => { setTargetProfileId(""); setTargetQuery(""); })}>Asignar rutina</GameButton></div></section>
  </div>;
}

function RoutineExerciseEditorRow({ exercise, data, busy, mutate }: { exercise: GroupExercise; data: GroupDashboard; busy: boolean; mutate: Mutate }) {
  const mapping = data.mappings.find((entry) => entry.exerciseId === exercise.id);
  const edit = data.routineEdits.find((entry) => entry.exerciseId === exercise.id);
  const alignment = alignGroupExercise(exercise, data.inventory, mapping);
  const savePatch = (patch: GroupExercisePatch, onError: (message: string) => void) => mutate({ action: "exercise", exerciseId: exercise.id, patch, revision: edit?.revision ?? 0 }, "Rutina actualizada.", undefined, onError);
  const [editing, setEditing] = useState(false);
  return <><tr className="border-t border-white/10"><td className="px-2 py-2 text-white/70">{exercise.muscle || "—"}</td><td className="px-2 py-2"><strong className="text-white/85">{exercise.name}</strong></td><td className="min-w-56 px-2 py-2 text-white/65">{alignment.asset ? `${alignment.asset.code} · ${alignment.asset.name}` : exercise.equipment || "—"}</td><td className="px-2 py-2 text-white/65">{exercise.sourceMachine || "—"}</td><td className="px-2 py-2 text-white/65">{exercise.sets ?? "—"}</td><td className="px-2 py-2 text-white/65">{exercise.reps ?? "—"}</td><td className="px-2 py-2 text-white/65">{exercise.time || "—"}</td><td className="px-2 py-2 text-white/65">{exercise.weightKg == null ? "—" : `${exercise.weightKg} kg`}</td><td className="px-2 py-2"><button type="button" disabled={busy} onClick={() => setEditing(true)} className="min-h-9 border border-cyan-300/50 px-3 text-[10px] font-black uppercase text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-40">Editar</button></td></tr>{editing && <tr><td colSpan={9}><RoutineLineEditModal exercise={exercise} data={data} busy={busy} onClose={() => setEditing(false)} onSave={savePatch} /></td></tr>}</>;
}

function RoutineLineEditModal({ exercise, data, busy, onClose, onSave }: { exercise: GroupExercise; data: GroupDashboard; busy: boolean; onClose: () => void; onSave: (patch: GroupExercisePatch, onError: (message: string) => void) => Promise<boolean> }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { closeRef.current = onClose; busyRef.current = busy; }, [onClose, busy]);
  const [muscle, setMuscle] = useState(exercise.muscle);
  const [name, setName] = useState(exercise.name);
  const [equipment, setEquipment] = useState(exercise.equipment);
  const [machineNumber, setMachineNumber] = useState(exercise.sourceMachine);
  const [assetId, setAssetId] = useState(() => alignGroupExercise(exercise, data.inventory, data.mappings.find((entry) => entry.exerciseId === exercise.id)).asset?.id ?? exercise.assetId ?? "");
  const selectedMachine = data.inventory.find((asset) => asset.id === assetId);
  const [sets, setSets] = useState(exercise.sets === null ? "" : String(exercise.sets));
  const [reps, setReps] = useState(exercise.reps === null ? "" : String(exercise.reps));
  const [time, setTime] = useState(exercise.time);
  const [weight, setWeight] = useState(exercise.weightKg == null ? "" : String(exercise.weightKg));
  const [saveError, setSaveError] = useState("");
  const muscles = [...new Set(data.routines.flatMap((routine) => routine.days.flatMap((day) => day.exercises.map((entry) => entry.muscle).filter(Boolean))))];
  const inputClass = "min-h-12 w-full border-2 border-white/20 bg-[#111] px-3 text-sm text-white outline-none focus:border-cyan-300";
  const labelClass = "grid gap-1.5 text-[10px] font-black uppercase tracking-[.1em] text-white/55";
  const quickValues = (values: string[], current: string, setValue: (value: string) => void) => <div className="mt-2 flex flex-wrap gap-2">{values.map((value) => <button key={value} type="button" onClick={() => setValue(value)} className={`min-h-10 border px-3 text-xs font-bold ${current === value ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 text-white/65 hover:border-cyan-300/50"}`}>{value}</button>)}</div>;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
    (focusable()[0] ?? dialog).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); if (!busyRef.current) closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); dialog.focus(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => { dialog.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`edit-routine-${exercise.id}`} className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto border-2 border-cyan-300/50 bg-[#101313] p-4 shadow-2xl outline-none sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-200">Editar ejercicio</p><h3 id={`edit-routine-${exercise.id}`} className="mt-1 text-xl font-black uppercase text-white">{exercise.name}</h3><p className="mt-1 text-xs text-white/45">Actualizá todos los datos de la rutina de una vez.</p></div><button type="button" aria-label="Cerrar" disabled={busy} onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center border border-white/20 text-xl text-white/70 hover:border-cyan-300">×</button></div>
    {saveError && <p role="alert" className="mt-4 border-2 border-red-300/50 bg-red-500/10 p-3 text-sm font-bold text-red-200">{saveError}</p>}
    <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); setSaveError(""); const saved = await onSave({ muscle: muscle.trim(), name: name.trim(), equipment: equipment.trim(), sourceMachine: machineNumber.trim(), assetId, sets: sets === "" ? null : Number(sets), reps: reps === "" ? null : Number(reps), time: time.trim(), weightKg: weight === "" ? null : Number(weight) }, setSaveError); if (!saved) setSaveError((current) => current || "No se pudieron guardar los cambios. Revise los datos e intente de nuevo."); else onClose(); }}>
      <label className={labelClass}>Grupo muscular<input className={inputClass} list={`muscles-${exercise.id}`} value={muscle} disabled={busy} onChange={(event) => setMuscle(event.target.value)} placeholder="Ej. Glúteos" /><datalist id={`muscles-${exercise.id}`}>{muscles.map((value) => <option key={value} value={value} />)}</datalist></label>
      <label className={labelClass}>Nombre del ejercicio<input className={inputClass} required value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /></label>
      <div className="sm:col-span-2"><TrainerEquipmentPicker inventory={data.inventory} value={assetId} disabled={busy} onChange={(asset) => { setAssetId(asset?.id ?? ""); setEquipment(asset?.name ?? ""); setMachineNumber(asset?.code ?? ""); }} /></div>
      {!assetId && <label className={`${labelClass} sm:col-span-2`}>Equipo libre / detalle<input className={inputClass} value={equipment} disabled={busy} onChange={(event) => setEquipment(event.target.value)} placeholder="Ej. Mancuernas, barra o peso corporal" /></label>}
      <label className={labelClass}>Series<input className={inputClass} type="number" min="1" max="500" value={sets} disabled={busy} onChange={(event) => setSets(event.target.value)} placeholder="Elegí o escribí" />{quickValues(["2", "3", "4", "5"], sets, setSets)}</label>
      <label className={labelClass}>Repeticiones<input className={inputClass} type="number" min="1" max="500" value={reps} disabled={busy} onChange={(event) => setReps(event.target.value)} placeholder="Elegí o escribí" />{quickValues(["8", "10", "12", "15", "20"], reps, setReps)}</label>
      <label className={`${labelClass} sm:col-span-2`}>Tiempo<input className={inputClass} value={time} disabled={busy} onChange={(event) => setTime(event.target.value)} placeholder="Ej. 30 seg, 1 min o descanso 60 seg" />{quickValues(["30 seg", "45 seg", "60 seg", "1 min", "Sin tiempo"], time, setTime)}</label>
      <label className={`${labelClass} sm:col-span-2`}>Peso de referencia (kg)<input className={inputClass} type="number" min="0" max="1000" step="0.5" value={weight} disabled={busy} onChange={(event) => setWeight(event.target.value)} placeholder="Solo referencia para el entrenador" />{quickValues(["5", "10", "15", "20", "25", "30"], weight, setWeight)}<span className="normal-case font-normal tracking-normal text-white/35">El peso real de cada sesión se registra en Seguimiento; este valor queda como referencia del plan.</span></label>
      <div className="mt-2 flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:col-span-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 border-2 border-white/20 px-5 text-xs font-black uppercase text-white/65">Cancelar</button><button type="submit" disabled={busy || !name.trim() || Boolean(assetId && (!selectedMachine || !isGroupEquipmentAvailable(selectedMachine)))} className="min-h-11 bg-emerald-700 px-6 text-xs font-black uppercase text-white hover:bg-emerald-600 disabled:opacity-40">Guardar cambios</button></div>
    </form></section></div>;
}

function MemberWorkoutProgress({ member, routine }: { member: TrainerMember; routine: GroupRoutine }) {
  const active = member.activePlanWorkout;
  const exercises = active?.exercises ?? member.recentWorkouts[0]?.exercises ?? [];
  if (!exercises.length) return null;
  return <section className="border-[3px] border-cyan-300/35 bg-cyan-300/[.04] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-200">Ejecución desde Member OS</p><h3 className="mt-1 text-lg font-black uppercase">{active ? "En progreso" : "Última sesión completada"}</h3></div><span className="text-xs font-black text-cyan-200">{active?.trainingName || member.recentWorkouts[0]?.trainingName || routine.objective}</span></div>
    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.08em]"><span className="border border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-2 py-1 text-[#d8ff3e]">Completado</span><span className="border border-cyan-300/50 bg-cyan-300/10 px-2 py-1 text-cyan-200">En progreso</span><span className="border border-white/15 bg-black/10 px-2 py-1 text-white/50">Pendiente</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{exercises.map((exercise) => { const completed = Boolean(exercise.completed); const started = Boolean(exercise.tracking?.startedAt || exercise.tracking?.logs?.length); return <div key={exercise.id} className={`border-2 p-3 ${completed ? "border-[#d8ff3e]/60 bg-[#d8ff3e]/10" : started ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/15 bg-black/10"}`}><div className="flex items-start justify-between gap-2"><p className="text-sm font-black uppercase">{exercise.exerciseName || exercise.machineName}</p><span className="shrink-0 text-[9px] font-black uppercase">{completed ? "Completado" : started ? "En progreso" : "Pendiente"}</span></div><p className="mt-1 text-xs text-white/50">{exercise.tracking?.logs?.length ?? 0} series registradas · Meta {exercise.prescribedSets ?? exercise.sets}×{exercise.prescribedReps ?? exercise.reps}</p></div>; })}</div>
  </section>;
}

function SessionTracker({ profile, routine, data, busy, dirty, setDirty, mutate }: {
  profile: GroupProfile; routine: GroupRoutine; data: GroupDashboard; busy: boolean; dirty: boolean;
  setDirty: (dirty: boolean) => void; mutate: Mutate;
}) {
  const [dayId, setDayId] = useState(() => routineDayForDate(routine, data.date));
  const [date, setDate] = useState(data.date);
  const day = routine.days.find((d) => d.id === dayId) ?? routine.days[0];
  const logs = data.logs.filter((log) => log.profileId === profile.id);
  const saved = logs.find((log) => log.dayId === dayId && log.date === date);
  const switchTo = (nextDay: string, nextDate: string) => {
    if (dirty && !window.confirm("¿Cambiar de sesión y descartar los cambios sin guardar?")) return;
    if (isSunday(nextDate)) { window.alert("El domingo el gimnasio no trabaja; elegí otra fecha para registrar el seguimiento."); return; }
    setDirty(false); setDayId(nextDay); setDate(nextDate);
  };
  const sunday = isSunday(date);
  return <div className="space-y-4">
    <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1"><p className="mb-2 text-xs font-black uppercase tracking-[.12em] text-white/60">Día de entrenamiento</p><div className="flex flex-wrap gap-2" aria-label="Días de entrenamiento">{routine.days.map((entry) => <button key={entry.id} type="button" disabled={busy} onClick={() => switchTo(entry.id, date)} className={`min-h-11 border-2 px-4 text-[10px] font-black uppercase ${entry.id === dayId ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/50 hover:border-cyan-300/60"}`}>{entry.label}</button>)}</div></div>
        <div><p className="mb-2 text-xs font-black uppercase tracking-[.12em] text-white/60">Fecha</p><div className="flex flex-wrap items-center gap-2"><button type="button" aria-label="Día anterior" title="Día anterior" disabled={busy} onClick={() => switchTo(dayId, addDays(date, -1))} className="grid min-h-11 min-w-11 place-items-center border-2 border-white/15 text-white/60 hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><input aria-label="Fecha del seguimiento" className="min-h-11 border-2 border-cyan-300/60 bg-[#111] px-3 text-sm font-black text-white outline-none focus:border-cyan-300" type="date" value={date} max={data.date} disabled={busy} onChange={(e) => switchTo(dayId, e.target.value)} /><button type="button" aria-label="Día siguiente" title="Día siguiente" disabled={busy || date >= data.date} onClick={() => switchTo(dayId, addDays(date, 1))} className="grid min-h-11 min-w-11 place-items-center border-2 border-white/15 text-white/60 hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-25"><ChevronRight className="h-4 w-4" /></button><button type="button" disabled={busy || date === data.date} onClick={() => switchTo(dayId, data.date)} className="min-h-11 border-2 border-white/15 px-3 text-[10px] font-black uppercase text-white/60 hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-25">Hoy</button></div></div>
      </div>
       {sunday ? <p role="alert" className="mt-4 border-2 border-orange-300/50 bg-orange-300/10 p-3 text-sm font-bold text-orange-200">El domingo el gimnasio no trabaja y no se pueden registrar seguimientos. Elegí otra fecha.</p> : <SessionForm key={`${profile.id}:${dayId}:${date}:${saved?.revision ?? 0}`} profile={profile} day={day} date={date} data={data} saved={saved} busy={busy} setDirty={setDirty} mutate={mutate} />}
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
  const hasWeight = Object.values(weights).some((value) => value !== null && Number.isFinite(value));
  const markDirty = () => { setChanged(true); setDirty(true); };
  return <form className="mt-4" onSubmit={(e) => { e.preventDefault(); void mutate({ action: "log", profileId: profile.id, dayId: day.id, date, completedIds: checked, weights, note, revision: saved?.revision ?? 0 }, "Seguimiento guardado para esta persona y fecha."); }}>
    <div className="mb-3 flex flex-wrap justify-between gap-2"><h4 className="font-black uppercase">{day.focus}</h4><p className="text-sm text-cyan-200">{checked.length}/{day.exercises.length} realizados{changed ? " · Sin guardar" : saved ? " · Guardado" : ""}</p></div>
    <div className="mt-3 hidden overflow-x-auto border-2 border-white/15 md:block"><table className="w-full min-w-[1040px] border-collapse text-left text-xs"><thead className="bg-white/[.06] text-[9px] font-black uppercase tracking-[.1em] text-white/50"><tr className="border-b-2 border-white/15"><th className="w-10 px-2 py-2">OK</th><th className="min-w-32 px-2 py-2">Grupo muscular</th><th className="min-w-44 px-2 py-2">Ejercicio</th><th className="min-w-56 px-2 py-2">Equipo / unidad</th><th className="w-20 px-2 py-2">Maq #</th><th className="w-16 px-2 py-2">Sets</th><th className="w-16 px-2 py-2">Reps</th><th className="w-28 px-2 py-2">Tiempo</th><th className="w-28 px-2 py-2">Carga kg</th></tr></thead><tbody>{day.exercises.map((exercise, index) => <ExerciseRow key={exercise.id} exercise={exercise} index={index} data={data} busy={busy} checked={checked.includes(exercise.id)} weight={weights[exercise.id] ?? null} onCheck={(value) => { markDirty(); setChecked((current) => value ? [...new Set([...current, exercise.id])] : current.filter((id) => id !== exercise.id)); }} onWeight={(value) => { markDirty(); setWeights((current) => ({ ...current, [exercise.id]: value })); }} />)}</tbody></table></div>
    <div className="mt-3 space-y-2 md:hidden">{day.exercises.map((exercise, index) => <ExerciseCard key={exercise.id} exercise={exercise} index={index} data={data} busy={busy} checked={checked.includes(exercise.id)} weight={weights[exercise.id] ?? null} onCheck={(value) => { markDirty(); setChecked((current) => value ? [...new Set([...current, exercise.id])] : current.filter((id) => id !== exercise.id)); }} onWeight={(value) => { markDirty(); setWeights((current) => ({ ...current, [exercise.id]: value })); }} />)}</div>
    <label className="mt-4 block text-xs text-white/60">Observación del entrenador<textarea rows={3} maxLength={2000} className={`${field} mt-1`} disabled={busy} value={note} onChange={(e) => { markDirty(); setNote(e.target.value); }} placeholder="Técnica, avances, dificultades y próximo paso" /></label>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/40">Registrar acá conserva el plan y el historial del socio en Member OS.</p><GameButton type="submit" disabled={busy || !date || !changed || (!saved && !checked.length && !note.trim() && !hasWeight)}><CheckCircle2 className="h-4 w-4" />{busy ? "Guardando..." : saved ? "Actualizar seguimiento" : "Guardar seguimiento"}</GameButton></div>
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

function ExerciseCard({ exercise, index, data, busy, checked, weight, onCheck, onWeight }: {
  exercise: GroupExercise; index: number; data: GroupDashboard; busy: boolean; checked: boolean; weight: number | null;
  onCheck: (checked: boolean) => void; onWeight: (weight: number | null) => void;
}) {
  const mapping = data.mappings.find((m) => m.exerciseId === exercise.id);
  const alignment = alignGroupExercise(exercise, data.inventory, mapping);
  const pending = alignment.status === "review" || alignment.status === "unavailable";
  return <article className={`border-2 p-3 ${pending ? "border-orange-300/50 bg-orange-300/[.05]" : "border-white/15 bg-black/20"}`}>
    <div className="flex items-start gap-3"><input aria-label={`Realizado: ${exercise.name}, ejercicio ${index + 1}`} type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-cyan-300" checked={checked} disabled={busy || (alignment.status === "review" && !checked)} onChange={(event) => onCheck(event.target.checked)} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="font-black">{index + 1}. {exercise.name}</p><span className="shrink-0 text-[9px] font-black uppercase text-cyan-200">{checked ? "Realizado" : "Pendiente"}</span></div><p className="mt-1 text-xs text-white/55">{exercise.muscle || "Sin grupo muscular"} · {alignment.asset ? `${alignment.asset.code} · ${alignment.asset.name}` : exercise.equipment || "Sin equipo"}</p><p className="mt-1 text-[10px] text-white/35">{exercise.sets ?? "—"} series · {exercise.reps ?? "—"} reps · {exercise.time || "Sin tiempo"}</p></div></div>
    <label className="mt-3 block text-[10px] font-black uppercase tracking-[.1em] text-white/50">Carga real (kg)<input aria-label={`Carga real para ${exercise.name}`} type="number" min={0} max={1000} step="0.5" className="mt-1 min-h-11 w-full border border-white/20 bg-[#111] px-3 text-sm text-white outline-none focus:border-cyan-300" disabled={busy} value={weight ?? ""} placeholder="Sin registrar" onChange={(event) => onWeight(event.target.value === "" ? null : Number(event.target.value))} /></label>
  </article>;
}

function MachineCategoryAssignments({ exercises, data, busy, mutate }: { exercises: GroupExercise[]; data: GroupDashboard; busy: boolean; mutate: Mutate }) {
  return <details className="mt-3 border border-cyan-300/20 bg-black/20 p-3"><summary className="flex min-h-11 cursor-pointer items-center text-xs font-black text-cyan-200">Cambiar máquinas por número o nombre</summary><div className="mt-3 grid gap-4">{exercises.map((exercise) => {
    const alignment = alignGroupExercise(exercise, data.inventory, data.mappings.find((entry) => entry.exerciseId === exercise.id));
    return <div key={exercise.id} className="min-w-0"><p className="mb-2 text-sm font-black text-white/85">{exercise.name}</p><TrainerEquipmentPicker inventory={data.inventory} value={alignment.asset?.id ?? exercise.assetId ?? ""} disabled={busy} onChange={(asset) => void mutate({ action: "exercise", exerciseId: exercise.id, patch: { assetId: asset?.id ?? "", equipment: asset?.name ?? "", sourceMachine: asset?.code ?? "" }, revision: data.routineEdits.find((entry) => entry.exerciseId === exercise.id)?.revision ?? 0 }, "Máquina de la rutina actualizada.")} /></div>;
  })}</div></details>;
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

function GroupPeopleDirectory({ data, profiles, members, groupId, busy, mutate }: { data: GroupDashboard; profiles: GroupProfile[]; members: TrainerMember[]; groupId: string; busy: boolean; mutate: Mutate }) {
  return <section className="border-[3px] border-cyan-300/30 bg-[#0c0c0c] p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
      <div><GameLabel tone="cyan">Personas y planes</GameLabel><h2 className="mt-1 text-2xl font-black uppercase">{profiles.length} integrantes</h2><p className="mt-1 max-w-2xl text-sm text-white/50">La persona, su ficha y la rutina son datos relacionados, pero independientes. Cambiá la rutina sin perder la ficha ni el historial.</p></div>
      <span className="border border-cyan-300/35 px-3 py-2 text-xs font-black uppercase text-cyan-200">{data.routines.length} rutinas disponibles</span>
    </div>
    {profiles.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{profiles.map((profile) => {
      const linked = members.find((member) => member.memberId === profile.memberId);
      const routine = data.routines.find((entry) => entry.id === profile.routineId);
      return <article key={profile.id} className="border-2 border-white/15 bg-black/20 p-4 transition hover:border-cyan-300/50">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center border-2 border-cyan-300/40 bg-cyan-300/10 text-lg font-black text-cyan-200">{profile.name.trim().charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/40">Persona del grupo</p><h3 className="truncate text-lg font-black uppercase text-white">{profile.name}</h3><p className="mt-1 text-xs font-bold text-white/45">{linked ? `Ficha vinculada · ${linked.memberName}` : "Ficha pendiente de vincular"}</p></div>
          <button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Quitar a ${profile.name} del grupo?`)) void mutate({ action: "remove_member", groupId, profileId: profile.id, revision: 0 }, "Persona sacada del grupo."); }} className="min-h-9 border border-red-300/35 px-2 text-[9px] font-black uppercase text-red-200 hover:border-red-300">Quitar</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-[10px] font-black uppercase tracking-[.12em] text-white/50">Rutina asignada<select className={`${field} mt-1 normal-case tracking-normal`} value={profile.routineId} disabled={busy} onChange={(event) => void mutate({ action: "assign_routine", groupId, profileId: profile.id, routineId: event.target.value, revision: profile.routineRevision ?? 0 }, "Rutina actualizada para esta persona.")}>{data.routines.map((entry) => <option key={entry.id} value={entry.id}>{entry.objective} · {entry.days.length} módulos</option>)}</select></label>
          <div className="border border-white/10 px-3 py-2 text-right"><p className="text-[9px] font-black uppercase text-white/35">Contenido</p><p className="mt-1 text-sm font-black text-cyan-200">{routine?.days.reduce((total, day) => total + day.exercises.length, 0) ?? 0} ejercicios</p></div>
        </div>
      </article>;
    })}</div> : <p className="mt-4 border border-dashed border-white/15 p-6 text-center text-sm text-white/45">Este grupo todavía no tiene personas.</p>}
  </section>;
}

function previousGroupForMember(data: GroupDashboard, memberId: string, currentGroupId: string) {
  const profile = data.profiles.find((entry) => entry.groupId !== currentGroupId && (entry.memberId === memberId || data.links.some((link) => link.profileId === entry.id && link.memberId === memberId)));
  return profile ? data.groups.find((group) => group.id === profile.groupId) : undefined;
}

function GroupSettings({ data, members, groupId, profiles, busy, mutate, onGroupChange, onRequestView }: {
  data: GroupDashboard; members: TrainerMember[]; groupId: string; profiles: GroupProfile[]; busy: boolean;
  mutate: Mutate; onGroupChange: (groupId: string) => void; onRequestView?: (view: "tracking" | "routines" | "settings", routineId?: string, profileId?: string) => void;
}) {
  const [memberQuery, setMemberQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const activeGroup = data.groups.find((group) => group.id === groupId);
  const assigned = new Set(profiles.map((profile) => profile.memberId).filter(Boolean));
  const available = members.filter((member) => !assigned.has(member.memberId));
  const [routineId, setRoutineId] = useState(data.routines[0]?.id ?? "");
  return <div className="space-y-4">
    <section className="border-[3px] border-cyan-300/35 bg-[#0c0c0c] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><GameLabel tone="cyan">Grupos</GameLabel><h2 className="mt-2 text-2xl font-black uppercase">Grupos y personas</h2><p className="mt-1 text-sm text-white/50">Acá solo se administran los grupos y sus integrantes.</p></div><form className="flex w-full gap-2 sm:w-auto" onSubmit={(event) => { event.preventDefault(); if (!groupName.trim()) return; void mutate({ action: "create_group", name: groupName, revision: 0 }, "Grupo creado.").then((ok) => { if (ok) setGroupName(""); }); }}><input className={`${field} sm:w-56`} value={groupName} disabled={busy} onChange={(event) => setGroupName(event.target.value)} placeholder="Nuevo grupo" aria-label="Nombre del nuevo grupo" /><GameButton type="submit" disabled={busy || !groupName.trim()}>Crear grupo</GameButton></form></div>
      <div className="mt-4 flex gap-2 overflow-x-auto border-t border-white/10 pt-4">{data.groups.map((group) => <button key={group.id} type="button" disabled={busy} onClick={() => onGroupChange(group.id)} className={`min-h-11 shrink-0 border-2 px-4 text-xs font-black uppercase ${group.id === groupId ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/55 hover:border-cyan-300/60"}`}>{group.name}</button>)}{groupId !== "group-a" && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Eliminar el grupo ${activeGroup?.name ?? "seleccionado"}? Solo se puede eliminar si está vacío.`)) void mutate({ action: "delete_group", groupId, revision: 0 }, "Grupo eliminado.", () => onGroupChange("group-a")); }} className="min-h-11 shrink-0 border-2 border-red-300/35 px-4 text-xs font-black uppercase text-red-200 hover:border-red-300">Eliminar grupo</button>}</div>
    </section>
    <section className="border-[3px] border-cyan-300/25 bg-cyan-300/[.04] p-4 sm:p-5"><GameLabel tone="cyan">Agregar persona a {activeGroup?.name ?? "grupo"}</GameLabel><p className="mt-1 text-sm text-white/50">Buscá una ficha y elegí la rutina que recibirá antes de agregarla.</p><label className="mt-3 block max-w-xl text-[10px] font-black uppercase tracking-[.12em] text-white/50">Rutina inicial<select className={`${field} mt-1 normal-case tracking-normal`} value={routineId} disabled={busy || !data.routines.length} onChange={(event) => setRoutineId(event.target.value)}><option value="">Elegí una rutina</option>{data.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.objective} · {routine.days.length} {routine.days.length === 1 ? "módulo" : "módulos"}</option>)}</select></label><p className="mt-2 text-xs text-cyan-200">Se asignará: {data.routines.find((routine) => routine.id === routineId)?.objective ?? "ninguna; elegí una rutina"}</p><div className="mt-4"><TrainerMemberSearch members={available} query={memberQuery} onQueryChange={setMemberQuery} compact emptyText="No hay personas disponibles para agregar." renderAction={(member) => { const previousGroup = previousGroupForMember(data, member.memberId, groupId); return <GameButton type="button" disabled={busy || !routineId} onClick={() => { if (previousGroup && !window.confirm(`¿Mover a ${member.memberName} de ${previousGroup.name} a ${activeGroup?.name ?? "este grupo"}?`)) return; void mutate({ action: "add_member", groupId, memberId: member.memberId, routineId, confirmMove: Boolean(previousGroup), revision: 0 }, "Persona agregada al grupo.").then((ok) => { if (ok) setMemberQuery(""); }); }}> {previousGroup ? `Mover de ${previousGroup.name}` : "Agregar"}</GameButton>; }} /></div></section>
    <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5"><div className="flex items-center justify-between"><div><GameLabel tone="cyan">Integrantes</GameLabel><p className="mt-1 text-sm text-white/50">Personas actualmente dentro de {activeGroup?.name ?? "este grupo"}.</p></div><strong className="text-3xl font-black text-cyan-200">{profiles.length}</strong></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{profiles.length ? profiles.map((profile) => <div key={profile.id} className="flex items-center justify-between gap-3 border-2 border-white/10 p-3"><span className="min-w-0 truncate text-sm font-black uppercase">{profile.name}</span><div className="flex shrink-0 items-center gap-2"><button type="button" disabled={busy} onClick={() => onRequestView?.("routines", profile.routineId, profile.id)} className="min-h-9 border border-[#d8ff3e]/45 px-2 text-[9px] font-black uppercase text-[#d8ff3e] hover:border-[#d8ff3e]">Ver rutina</button><button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Quitar a ${profile.name} del grupo?`)) void mutate({ action: "remove_member", groupId, profileId: profile.id, revision: 0 }, "Persona sacada del grupo."); }} className="min-h-9 shrink-0 border border-red-300/35 px-2 text-[9px] font-black uppercase text-red-200 hover:border-red-300">Quitar</button></div></div>) : <p className="border border-dashed border-white/15 p-5 text-sm text-white/45">Este grupo todavía no tiene personas.</p>}</div></section>
  </div>;
}

export function GroupManagerWithSearch({ data, members, groupId, profiles, busy, mutate, onGroupChange }: {
  data: GroupDashboard; members: TrainerMember[]; groupId: string; profiles: GroupProfile[]; busy: boolean;
  mutate: Mutate; onGroupChange: (groupId: string) => void;
}) {
  const [memberQuery, setMemberQuery] = useState("");
  const [routineId, setRoutineId] = useState(data.routines[0]?.id ?? "");
  const [groupName, setGroupName] = useState("");
  const assigned = new Set(profiles.map((profile) => profile.memberId).filter(Boolean));
  const available = members.filter((member) => !assigned.has(member.memberId));
  const activeGroupName = data.groups.find((group) => group.id === groupId)?.name ?? "Grupo";
  return <div className="space-y-4">
    <section className="border-[3px] border-cyan-300/35 bg-[#0c0c0c] p-4 sm:p-5">
      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
        {data.groups.map((group) => <button key={group.id} type="button" disabled={busy} onClick={() => onGroupChange(group.id)} className={`min-h-11 shrink-0 border-2 px-4 text-xs font-black uppercase ${group.id === groupId ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/55 hover:border-cyan-300/60"}`}>{group.name}</button>)}
        {groupId !== "group-a" && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Eliminar el grupo ${activeGroupName}? Solo se puede eliminar si está vacío.`)) void mutate({ action: "delete_group", groupId, revision: 0 }, "Grupo eliminado.", () => onGroupChange("group-a")); }} className="min-h-11 shrink-0 border-2 border-red-300/35 px-4 text-xs font-black uppercase text-red-200 hover:border-red-300">Eliminar grupo</button>}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><GameLabel tone="cyan">Administrar integrantes</GameLabel><h2 className="mt-2 text-2xl font-black uppercase">{activeGroupName}</h2><p className="mt-1 text-sm text-white/50">Revisá quiénes están adentro, sacá a alguien o agregá una persona nueva.</p></div>
        <label className="w-full text-xs font-black uppercase tracking-[.12em] text-white/60 sm:w-72">Cambiar de grupo<select className={`${field} mt-1 normal-case tracking-normal`} value={groupId} disabled={busy} onChange={(event) => onGroupChange(event.target.value)}>{data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      </div>
    </section>

    <GroupPeopleDirectory data={data} profiles={profiles} members={members} groupId={groupId} busy={busy} mutate={mutate} />
    <section className="border-2 border-dashed border-cyan-300/35 bg-cyan-300/[.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-56 flex-1"><GameLabel tone="cyan">Agregar integrante</GameLabel><p className="mt-1 text-sm text-white/50">Elegí una persona y asignale una rutina inicial. Después podés cambiar la rutina sin tocar su ficha.</p></div><label className="w-full text-[10px] font-black uppercase tracking-[.12em] text-white/50 sm:w-80">Rutina inicial<select className={`${field} mt-1 normal-case tracking-normal`} value={routineId} disabled={busy} onChange={(event) => setRoutineId(event.target.value)}>{data.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.objective}</option>)}</select></label></div>
      <div className="mt-4"><TrainerMemberSearch members={available} query={memberQuery} onQueryChange={setMemberQuery} compact emptyText="No hay socios disponibles para agregar." renderAction={(member) => { const previousGroup = previousGroupForMember(data, member.memberId, groupId); return <GameButton type="button" disabled={busy || !routineId} onClick={() => { if (previousGroup && !window.confirm(`¿Mover a ${member.memberName} de ${previousGroup.name} a ${activeGroupName}?`)) return; void mutate({ action: "add_member", groupId, memberId: member.memberId, routineId, confirmMove: Boolean(previousGroup), revision: 0 }, "Persona agregada al grupo.").then((ok) => { if (ok) setMemberQuery(""); }); }}>{previousGroup ? `Mover de ${previousGroup.name}` : "Agregar"}</GameButton>; }} /></div>
    </section>

    <div className="grid items-start gap-4 xl:grid-cols-2">
      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3 border-b border-white/10 pb-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-cyan-200">Personas en el grupo</p><p className="mt-1 text-sm text-white/45">Usá “Eliminar” para remover una persona.</p></div><strong className="text-3xl font-black text-cyan-200">{profiles.length}</strong></div>
        <div className="mt-3 space-y-2">{profiles.length ? profiles.map((profile) => {
          const routine = data.routines.find((entry) => entry.id === profile.routineId);
          return <div key={profile.id} className="flex flex-wrap items-end gap-3 border-2 border-white/10 bg-black/20 p-3"><div className="min-w-40 flex-1"><strong className="block truncate text-sm uppercase text-white/85">{profile.name}</strong><span className="mt-1 block text-xs text-white/40">{routine ? routine.objective : "Rutina sin identificar"}</span></div><label className="min-w-56 flex-1 text-[10px] font-black uppercase tracking-[.1em] text-white/45">Rutina asignada<select className={`${field} mt-1 normal-case tracking-normal`} value={profile.routineId} disabled={busy} onChange={(event) => void mutate({ action: "assign_routine", groupId, profileId: profile.id, routineId: event.target.value, revision: profile.routineRevision ?? 0 }, "Rutina cambiada para esta persona.")}>{data.routines.map((entry) => <option key={entry.id} value={entry.id}>{entry.objective} · {entry.days.length} {entry.days.length === 1 ? "módulo" : "módulos"}</option>)}</select></label></div>;
        }) : <p className="border-2 border-dashed border-white/10 p-6 text-center text-sm text-white/45">Este grupo todavía no tiene personas.</p>}</div>
      </section>

      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5">
        <div className="border-b border-white/10 pb-3"><p className="text-xs font-black uppercase tracking-[.12em] text-cyan-200">Buscar y agregar</p><p className="mt-1 text-sm text-white/45">Buscá por nombre, meta o entrenador y elegí “Agregar”.</p></div>
        <label className="mt-4 block text-xs font-black uppercase tracking-[.12em] text-white/60">Rutina que recibirá<select className={`${field} mt-1 normal-case tracking-normal`} value={routineId} disabled={busy} onChange={(event) => setRoutineId(event.target.value)}>{data.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.objective} · {routine.days.length} {routine.days.length === 1 ? "módulo" : "módulos"}</option>)}</select></label>
        <div className="mt-3"><TrainerRoutineCreator data={data} busy={busy} mutate={mutate} onCreated={setRoutineId} /></div>
        <div className="mt-4 min-w-0"><TrainerMemberSearch members={available} query={memberQuery} onQueryChange={setMemberQuery} compact emptyText="No hay socios disponibles para agregar." renderAction={(member) => { const previousGroup = previousGroupForMember(data, member.memberId, groupId); return <GameButton type="button" disabled={busy || !routineId} onClick={() => { if (previousGroup && !window.confirm(`¿Mover a ${member.memberName} de ${previousGroup.name} a ${activeGroupName}?`)) return; void mutate({ action: "add_member", groupId, memberId: member.memberId, routineId, confirmMove: Boolean(previousGroup), revision: 0 }, "Persona agregada al grupo.").then((ok) => { if (ok) setMemberQuery(""); }); }}>{previousGroup ? `Mover de ${previousGroup.name}` : "Agregar"}</GameButton>; }} /></div>
      </section>
    </div>

    <section className="border-[3px] border-white/10 bg-white/[.02] p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-60 flex-1"><p className="text-xs font-black uppercase tracking-[.12em] text-white/60">Crear otro grupo</p><p className="mt-1 text-sm text-white/40">Esta acción está separada de la administración de {activeGroupName}.</p></div><form className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[420px] sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (!groupName.trim()) return; void mutate({ action: "create_group", name: groupName, revision: 0 }, "Grupo creado.").then((ok) => { if (ok) setGroupName(""); }); }}><input className={field} value={groupName} disabled={busy} onChange={(event) => setGroupName(event.target.value)} placeholder="Nombre del nuevo grupo" aria-label="Nombre del nuevo grupo" /><GameButton type="submit" disabled={busy || !groupName.trim()}>Crear grupo</GameButton></form></div>
    </section>
  </div>;
}

function AddRoutineLineDetails({ routineId, dayId, data, busy, mutate, initiallyOpen = false }: { routineId: string; dayId: string; data: GroupDashboard; busy: boolean; mutate: Mutate; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [assetId, setAssetId] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [time, setTime] = useState("");
  const machine = data.inventory.find((asset) => asset.id === assetId);
  const muscles = [...new Set(data.routines.flatMap((routine) => routine.days.flatMap((day) => day.exercises.map((exercise) => exercise.muscle).filter(Boolean))))];
  const exerciseCatalog = [...new Map(data.routines.flatMap((routine) => routine.days.flatMap((day) => day.exercises)).map((exercise) => [exercise.name.toLowerCase(), exercise])).values()];
  const quickChoice = (values: string[], current: string, setValue: (value: string) => void) => <div className="mt-1 flex flex-wrap gap-1">{values.map((value) => <button key={value} type="button" disabled={busy} onClick={() => setValue(value)} className={`min-h-10 border px-3 text-[10px] font-black ${current === value ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 text-white/50 hover:border-cyan-300/50"}`}>{value}</button>)}</div>;
  return <details className="mt-3 border border-white/15 bg-black/20" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-cyan-200">Agregar ejercicio a este día</summary><form className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void mutate({ action: "add_exercise", routineId, dayId, patch: { name: name.trim(), muscle: muscle.trim(), equipment: machine?.name ?? equipment.trim(), sourceMachine: machine?.code ?? "", assetId, sets: sets === "" ? null : Number(sets), reps: reps === "" ? null : Number(reps), time: time.trim() }, revision: 0 }, "Ejercicio agregado a la rutina.").then((ok) => { if (ok) { setName(""); setMuscle(""); setEquipment(""); setAssetId(""); setSets(""); setReps(""); setTime(""); setOpen(false); } }); }}>
    <div className="sm:col-span-2 lg:col-span-3"><TrainerEquipmentPicker inventory={data.inventory} value={assetId} disabled={busy} onChange={(asset) => { setAssetId(asset?.id ?? ""); setEquipment(asset?.name ?? ""); if (asset) setName((current) => !current || current === machine?.name ? asset.name : current); }} /></div>
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Grupo muscular<input className={field} list="group-a-muscles" value={muscle} disabled={busy} onChange={(event) => setMuscle(event.target.value)} placeholder="Ej. Glúteos" aria-label="Grupo muscular" /><datalist id="group-a-muscles">{muscles.map((value) => <option key={value} value={value} />)}</datalist></label>
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Ejercicio<input className={field} list="routine-exercise-catalog" value={name} disabled={busy} onChange={(event) => { const value = event.target.value; const match = exerciseCatalog.find((exercise) => exercise.name.toLowerCase() === value.trim().toLowerCase()); setName(value); if (match) { setMuscle(match.muscle); setEquipment(match.equipment); setAssetId(""); setSets(match.sets == null ? "" : String(match.sets)); setReps(match.reps == null ? "" : String(match.reps)); setTime(match.time); } }} placeholder="Ej. Glúteo en polea" aria-label="Nombre del ejercicio" required /><datalist id="routine-exercise-catalog">{exerciseCatalog.map((exercise) => <option key={exercise.id} value={exercise.name}>{exercise.muscle}</option>)}</datalist></label>
    {!assetId && <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/60">Equipo libre / detalle<input className={field} value={equipment} disabled={busy} onChange={(event) => setEquipment(event.target.value)} placeholder="Mancuernas, barra o peso corporal" /></label>}
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Series<input className={field} type="number" min="1" max="500" value={sets} disabled={busy} onChange={(event) => setSets(event.target.value)} placeholder="Ej. 3" aria-label="Series" />{quickChoice(["2", "3", "4", "5"], sets, setSets)}</label>
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Repeticiones<input className={field} type="number" min="1" max="500" value={reps} disabled={busy} onChange={(event) => setReps(event.target.value)} placeholder="Ej. 12" aria-label="Repeticiones" />{quickChoice(["8", "10", "12", "15", "20"], reps, setReps)}</label>
    <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-white/45">Tiempo<input className={field} value={time} disabled={busy} onChange={(event) => setTime(event.target.value)} placeholder="Ej. 30 seg (opcional)" aria-label="Tiempo" />{quickChoice(["30 seg", "45 seg", "60 seg", "1 min", "Sin tiempo"], time, setTime)}</label>
    <GameButton type="submit" className="sm:col-span-2 lg:col-span-3" disabled={busy || !name.trim() || Boolean(assetId && (!machine || !isGroupEquipmentAvailable(machine)))}>Agregar ejercicio</GameButton>
  </form></details>;
}
