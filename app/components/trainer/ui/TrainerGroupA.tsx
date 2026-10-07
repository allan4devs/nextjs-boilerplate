"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Users } from "lucide-react";
import { GameButton, GameLabel } from "@/app/components/GameOS";
import {
  alignGroupExercise, normalizeGroupName, isGroupEquipmentAvailable,
  type GroupDashboard, type GroupDay, type GroupExercise, type GroupLog, type GroupProfile, type GroupRoutine,
} from "@/lib/xtreme/trainer-group-a-model";
import type { TrainerMember } from "../types";

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

  const mutate = async (body: Record<string, unknown>, text: string) => {
    setBusy(true); setMessage(null);
    try {
      await groupRequest(body);
      if (body.action === "log") setDraftDirty(false);
      const fresh = await groupRequest() as GroupDashboard;
      // Mapping/link changes must not replace an unsaved session draft.
      setData((current) => body.action === "log" || !current ? fresh : { ...current, mappings: fresh.mappings, links: fresh.links, inventory: fresh.inventory });
      setMessage({ error: false, text });
      return true;
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : "No se pudo guardar." });
      return false;
    } finally { setBusy(false); }
  };
  const permitSwitch = () => !dirty || window.confirm("¿Descartar los cambios de esta sesión sin guardar?");
  const profile = data?.profiles.find((p) => p.id === profileId);
  const routine = data?.routines.find((r) => r.id === profile?.routineId);
  const link = data?.links.find((l) => l.profileId === profileId);
  const member = members.find((m) => m.memberId === link?.memberId);
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
    {message && <p role={message.error ? "alert" : "status"} className={`border-2 p-3 text-sm ${message.error ? "border-orange-300/50 text-orange-200" : "border-[#d8ff3e]/50 text-[#d8ff3e]"}`}>{message.text}</p>}
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <nav aria-label="Personas del Grupo A" className="space-y-2">{data.profiles.map((person) => {
        const plan = data.routines.find((r) => r.id === person.routineId)!;
        const logs = data.logs.filter((log) => log.profileId === person.id);
        const personLink = data.links.find((l) => l.profileId === person.id);
        const linked = members.find((m) => m.memberId === personLink?.memberId);
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
          <MemberLink key={profileId} profile={profile} members={members} value={link?.memberId ?? ""} busy={busy} onChange={(memberId) => void mutate({ action: "link", profileId, memberId, revision: link?.revision ?? 0 }, "Ficha del socio vinculada.")} />
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
function MemberLink({ profile, members, value, busy, onChange }: {
  profile: GroupProfile; members: TrainerMember[]; value: string; busy: boolean; onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState(profile.name.split(" ")[0]);
  const candidates = members.filter((m) => m.memberId === value || normalizeGroupName(m.memberName).includes(normalizeGroupName(query)));
  return <div className="mt-4 grid gap-2 sm:grid-cols-2"><label className="text-xs text-white/60">Buscar ficha de socio<input className={`${field} mt-1`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o apellidos" /></label><label className="text-xs text-white/60">Vincular a la persona correcta<select className={`${field} mt-1`} value={value} disabled={busy} onChange={(event) => onChange(event.target.value)}><option value="">Sin vincular</option>{candidates.map((m) => <option key={m.memberId} value={m.memberId}>{m.memberName}</option>)}</select></label></div>;
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
    <div className="mt-3 overflow-x-auto border-2 border-white/15"><table className="w-full min-w-[920px] border-collapse text-left text-xs"><thead className="bg-white/[.06] text-[9px] font-black uppercase tracking-[.1em] text-white/50"><tr className="border-b-2 border-white/15"><th className="w-10 px-2 py-2">OK</th><th className="px-2 py-2">Grupo muscular</th><th className="px-2 py-2">Ejercicio</th><th className="px-2 py-2">Equipo / unidad</th><th className="w-16 px-2 py-2">Maq #</th><th className="w-14 px-2 py-2">Sets</th><th className="w-14 px-2 py-2">Reps</th><th className="w-24 px-2 py-2">Tiempo</th><th className="w-28 px-2 py-2">Carga kg</th></tr></thead><tbody>{day.exercises.map((exercise, index) => <ExerciseRow key={exercise.id} exercise={exercise} index={index} data={data} busy={busy} checked={checked.includes(exercise.id)} weight={weights[exercise.id] ?? null} onCheck={(value) => { markDirty(); setChecked((current) => value ? [...new Set([...current, exercise.id])] : current.filter((id) => id !== exercise.id)); }} onWeight={(value) => { markDirty(); setWeights((current) => ({ ...current, [exercise.id]: value })); }} mutate={mutate} />)}</tbody></table></div>
    <label className="mt-4 block text-xs text-white/60">Observación del entrenador<textarea rows={3} maxLength={2000} className={`${field} mt-1`} disabled={busy} value={note} onChange={(e) => { markDirty(); setNote(e.target.value); }} placeholder="Técnica, avances, dificultades y próximo paso" /></label>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/40">Registrar acá conserva el plan y el historial del socio en Member OS.</p><GameButton type="submit" disabled={busy || !date || !changed || (!checked.length && !note.trim())}><CheckCircle2 className="h-4 w-4" />{busy ? "Guardando..." : saved ? "Actualizar seguimiento" : "Guardar seguimiento"}</GameButton></div>
  </form>;
}

function ExerciseRow({ exercise, index, data, busy, checked, weight, onCheck, onWeight, mutate }: {
  exercise: GroupExercise; index: number; data: GroupDashboard; busy: boolean; checked: boolean; weight: number | null;
  onCheck: (checked: boolean) => void; onWeight: (weight: number | null) => void; mutate: Mutate;
}) {
  const mapping = data.mappings.find((m) => m.exerciseId === exercise.id);
  const alignment = alignGroupExercise(exercise, data.inventory, mapping);
  const pending = alignment.status === "review" || alignment.status === "unavailable";
  return <tr className={`border-b border-white/10 align-middle ${pending ? "bg-orange-300/[.05]" : "bg-black/20"}`}>
    <td className="px-2 py-2"><input aria-label={`Realizado: ${exercise.name}, ejercicio ${index + 1}`} type="checkbox" className="h-5 w-5 accent-cyan-300" checked={checked} disabled={busy || (pending && !checked)} onChange={(e) => onCheck(e.target.checked)} /></td>
    <td className="px-2 py-2 font-bold text-white/65">{exercise.muscle}</td>
    <td className="px-2 py-2"><span className="font-bold">{index + 1}. {exercise.name}</span><span className="block text-[10px] text-white/35">PDF pág. {exercise.sourcePage}{alignment.issues.length ? " · revisar" : ""}</span></td>
    <td className="min-w-56 px-2 py-2">{alignment.candidates.length > 0 ? <select aria-label={`Unidad para ${exercise.name}`} className="min-h-9 w-full border border-white/20 bg-[#111] px-2 text-[11px] text-white outline-none focus:border-cyan-300" value={alignment.asset?.id ?? ""} disabled={busy} onChange={(e) => { if (e.target.value) void mutate({ action: "mapping", exerciseId: exercise.id, assetId: e.target.value, revision: mapping?.revision ?? 0 }, "Máquina vinculada a la rutina."); }}><option value="">Elegí unidad</option>{alignment.candidates.map((asset) => <option key={asset.id} value={asset.id} disabled={!isGroupEquipmentAvailable(asset)}>{asset.code} · {asset.name}</option>)}</select> : <span className="text-white/55">{exercise.equipment || "Sin equipo"}</span>}{alignment.asset && <Link href={`/maquinas/equipo/${encodeURIComponent(alignment.asset.id)}`} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[10px] text-cyan-200 underline">Ficha de {alignment.asset.code} ↗</Link>}</td>
    <td className="px-2 py-2 text-white/60">{exercise.sourceMachine || "-"}</td><td className="px-2 py-2 font-bold">{exercise.sets ?? "-"}</td><td className="px-2 py-2 font-bold">{exercise.reps ?? "-"}</td><td className="px-2 py-2 italic text-white/70">{exercise.time || "-"}</td>
    <td className="px-2 py-2"><input aria-label={`Carga real para ${exercise.name}`} type="number" min={0} max={1000} step="0.5" className="min-h-9 w-24 border border-white/20 bg-[#111] px-2 text-xs text-white outline-none focus:border-cyan-300" disabled={busy} value={weight ?? ""} placeholder="-" onChange={(e) => onWeight(e.target.value === "" ? null : Number(e.target.value))} /></td>
  </tr>;
}
