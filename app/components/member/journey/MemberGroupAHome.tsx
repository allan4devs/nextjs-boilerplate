"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, LogIn, MapPin, RefreshCw, Save } from "lucide-react";
import type { GroupAMemberView } from "@/lib/xtreme/trainer-group-a-model";
import type { MemberOs } from "../useMemberOs";
import { todayIso } from "../utils";
import WellnessCheck from "./WellnessCheck";

const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#d8ff3e] px-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40";
const muted = "text-white/55";

type Props = { os: MemberOs; initial: GroupAMemberView };

export default function MemberGroupAHome({ os, initial }: Props) {
  const [view, setView] = useState(initial);
  const [completedIds, setCompletedIds] = useState<string[]>(initial.today.completedIds);
  const [weights, setWeights] = useState<Record<string, number | null>>(initial.today.weights);
  const [note, setNote] = useState(initial.today.note);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWellness, setShowWellness] = useState(false);
  const today = todayIso();
  const wellness = os.lifestyle.today?.date === today ? os.lifestyle.today : null;
  const day = view.routine.days.find((entry) => entry.id === view.today.dayId) ?? view.routine.days[0];
  const completed = useMemo(() => new Set(completedIds), [completedIds]);
  const progress = day.exercises.length ? Math.round((completed.size / day.exercises.length) * 100) : 0;
  const canSave = Boolean(os.activeVisit) && !saving;

  useEffect(() => {
    setCompletedIds(view.today.completedIds);
    setWeights(view.today.weights);
    setNote(view.today.note);
  }, [view]);

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/xtreme/member/group-a", { cache: "no-store" });
      if (!response.ok) throw new Error("refresh");
      const data = await response.json() as { groupA?: GroupAMemberView | null };
      if (data.groupA) setView(data.groupA);
    } catch {
      os.setError("No se pudo actualizar tu plan. Intentá de nuevo.");
    } finally {
      setRefreshing(false);
    }
  }

  async function saveProgress() {
    if (!canSave) return;
    setSaving(true);
    try {
      const response = await fetch("/api/xtreme/member/group-a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "log",
          date: today,
          dayId: day.id,
          revision: view.today.revision,
          completedIds,
          weights,
          note,
        }),
      });
      const data = await response.json().catch(() => null) as { groupA?: GroupAMemberView | null; error?: string } | null;
      if (!response.ok || !data?.groupA) throw new Error(data?.error || "save");
      setView(data.groupA);
      os.setMessage("Tu avance del Grupo A quedó guardado.");
    } catch (error) {
      os.setError(error instanceof Error ? error.message : "No se pudo guardar tu avance.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="mx-auto max-w-6xl space-y-4 pb-6">
    <header className="rounded-2xl border border-[#d8ff3e]/25 bg-gradient-to-br from-[#d8ff3e]/10 via-[#0c0c0c] to-[#0c0c0c] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#d8ff3e]"><MapPin className="h-4 w-4" />{os.activeVisit ? "Ingreso registrado hoy" : "Todavía no has ingresado al gym"}</p>
        <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-white/55"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Actualizar plan</button>
      </div>
      <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">{os.activeVisit ? `Seguimos con tu plan, ${os.memberName.split(" ")[0]}` : "Primero registrá tu ingreso"}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Sos parte de <strong className="text-white">Grupo A</strong>. Acá vas a ver únicamente la rutina que te asignó tu coach y el avance que ya llevás.</p>
      {!os.activeVisit && <button type="button" onClick={() => void os.registerCheckin()} disabled={os.isRegisteringCheckin} className={`${primary} mt-5`}><LogIn className="h-4 w-4" />{os.isRegisteringCheckin ? "Registrando ingreso…" : "Ingresar al gym"}</button>}
      {os.activeVisit && <button type="button" onClick={() => os.setOsModal({ kind: "gym-session" })} className="mt-4 min-h-10 text-xs font-bold text-white/45">Terminar visita / registrar salida</button>}
    </header>

    <section className="rounded-2xl border border-white/15 bg-[#0c0c0c] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-white/45">Antes de empezar</p><h2 className="mt-1 text-xl font-black">¿Cómo llegás hoy?</h2><p className="mt-1 text-sm text-white/55">Tu coach usa esta respuesta para entender cómo venís antes de la rutina.</p></div>
        {wellness?.assessedAt ? <span className="rounded-full border border-[#d8ff3e]/30 px-3 py-1 text-xs font-bold text-[#d8ff3e]">Registrado · energía {wellness.energy}/5</span> : <button type="button" onClick={() => setShowWellness((current) => !current)} className="min-h-10 rounded-xl border border-white/20 px-4 text-xs font-bold text-white/75">{showWellness ? "Cerrar ficha" : "Completar cómo llego"}</button>}
      </div>
      {showWellness && !wellness?.assessedAt && <div className="mt-5 border-t border-white/10 pt-5"><WellnessCheck os={os} onDone={() => setShowWellness(false)} /></div>}
    </section>

    <section className="rounded-2xl border border-white/15 bg-[#0c0c0c] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#d8ff3e]">Plan de coach</p>
          <h2 className="mt-1 text-xl font-black">{view.routine.objective}</h2>
          <p className={`mt-1 text-sm ${muted}`}>{view.today.label} · {view.today.focus}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-[#d8ff3e]">{completed.size}/{day.exercises.length}</p>
          <p className="text-xs text-white/45">ejercicios marcados hoy</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#d8ff3e] transition-all" style={{ width: `${progress}%` }} /></div>
      <p className="mt-2 text-xs text-white/45">{progress === 100 ? "Sesión completa. Excelente trabajo." : "Marcá cada ejercicio conforme lo terminés y guardá tu avance."}</p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-white/[.04] text-[10px] uppercase tracking-widest text-white/45"><tr><th className="w-14 px-3 py-3 text-center">OK</th><th className="px-3 py-3">Ejercicio</th><th className="px-3 py-3">Equipo / unidad</th><th className="px-3 py-3">Series</th><th className="px-3 py-3">Reps / tiempo</th><th className="w-36 px-3 py-3">Carga kg</th></tr></thead>
          <tbody>{day.exercises.map((exercise) => {
            const checked = completed.has(exercise.id);
            return <tr key={exercise.id} className={`border-t border-white/10 ${checked ? "bg-[#d8ff3e]/[.05]" : ""}`}>
              <td className="px-3 py-3 text-center"><label className="inline-flex min-h-10 min-w-10 items-center justify-center"><input aria-label={`Marcar ${exercise.name}`} type="checkbox" checked={checked} onChange={() => setCompletedIds((current) => checked ? current.filter((id) => id !== exercise.id) : [...current, exercise.id])} className="h-5 w-5 accent-[#d8ff3e]" /></label></td>
              <td className="px-3 py-3 font-bold text-white">{exercise.name}<span className="mt-1 block text-[11px] font-normal text-white/45">{exercise.muscle}</span></td>
              <td className="px-3 py-3 text-white/70">{exercise.equipment}<span className="mt-1 block text-[11px] text-white/40">{exercise.sourceMachine || "Sin número de máquina"}</span></td>
              <td className="px-3 py-3 text-white/70">{exercise.sets ?? "-"}</td>
              <td className="px-3 py-3 text-white/70">{exercise.reps ?? "-"}{exercise.time ? <span className="ml-1 text-white/45">· {exercise.time}</span> : null}</td>
              <td className="px-3 py-3"><input aria-label={`Carga de ${exercise.name}`} type="number" min="0" max="1000" step="0.5" value={weights[exercise.id] ?? ""} onChange={(event) => setWeights((current) => ({ ...current, [exercise.id]: event.target.value === "" ? null : Number(event.target.value) }))} className="min-h-10 w-full rounded-lg border border-white/20 bg-black/30 px-2 text-sm text-white" placeholder="-" /></td>
            </tr>;
          })}</tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="text-xs font-bold text-white/55">Nota para tu coach<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2} placeholder="¿Cómo te fue? ¿Algo que deba saber tu coach?" className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm font-normal text-white outline-none focus:border-[#d8ff3e]" /></label>
        <button type="button" onClick={() => void saveProgress()} disabled={!canSave} className={primary}><Save className="h-4 w-4" />{saving ? "Guardando…" : "Guardar mi avance"}</button>
      </div>
      {!os.activeVisit && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200/75"><LogIn className="h-4 w-4" />Registrá tu ingreso para poder guardar esta sesión.</p>}
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-2xl border border-white/15 bg-[#0c0c0c] p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/45"><ClipboardCheck className="h-4 w-4" />Cómo vas</p>
        <h2 className="mt-2 text-lg font-black">Tu historial reciente del Grupo A</h2>
        {view.recent.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-white/40"><tr><th className="pb-2">Fecha</th><th className="pb-2">Día</th><th className="pb-2 text-right">Avance</th></tr></thead><tbody>{view.recent.map((entry) => <tr key={`${entry.date}-${entry.dayId}`} className="border-t border-white/10"><td className="py-3 text-white/65">{entry.date}</td><td className="py-3 text-white/65">{entry.dayLabel}</td><td className="py-3 text-right font-bold text-[#d8ff3e]">{entry.completed}/{entry.total}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm leading-6 text-white/55">Todavía no hay sesiones guardadas. Tu primer registro aparecerá acá y también en la tabla de tu coach.</p>}
      </div>
      <div className="rounded-2xl border border-[#d8ff3e]/20 bg-[#d8ff3e]/[.04] p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#d8ff3e]">Tu siguiente paso</p>
        <h2 className="mt-2 text-xl font-black">Completá {view.today.label}</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">La tabla es la misma que ve tu coach. Al guardar, él verá tus ejercicios realizados, cargas y nota sin tener que transcribirlos.</p>
        {progress === 100 && <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[#d8ff3e]"><Check className="h-4 w-4" />Todo el día está marcado.</p>}
      </div>
    </section>
  </div>;
}
