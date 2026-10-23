"use client";

import { useId, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { GameButton, GameLabel } from "@/app/components/GameOS";
import type { GroupDashboard } from "@/lib/xtreme/trainer-group-a-model";

export type RoutineMutation = (body: Record<string, unknown>, success: string, onSuccess?: (result: { ok: true; routineId?: string; dayId?: string }) => void, onError?: (message: string) => void) => Promise<boolean>;

const field = "mt-1 min-h-11 w-full min-w-0 border-2 border-white/20 bg-[#111] px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-cyan-300 disabled:opacity-40";
const label = "min-w-0 text-xs font-black uppercase tracking-wide text-white/60";

export function TrainerRoutineCreator({ data, busy, mutate, onDirtyChange, onCreated }: {
  data: GroupDashboard; busy: boolean; mutate: RoutineMutation; onDirtyChange?: (dirty: boolean) => void; onCreated: (routineId: string) => void;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState(data.date);
  const [endDate, setEndDate] = useState("");
  const [dayLabel, setDayLabel] = useState("Día 1");
  const [focus, setFocus] = useState("");
  const [moduleCount, setModuleCount] = useState(1);
  const [templateRoutineId, setTemplateRoutineId] = useState("");
  const [templateDayId, setTemplateDayId] = useState("");
  const template = data.routines.find((routine) => routine.id === templateRoutineId);
  const templateDay = template?.days.find((day) => day.id === templateDayId);

  return <section className="min-w-0 border-[3px] border-cyan-300/35 bg-[#0c0c0c] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><GameLabel tone="cyan">Nueva rutina</GameLabel><p className="mt-1 text-sm text-white/60">Creá los días, agregá los ejercicios y asigná la rutina a una persona.</p></div>
      <button type="button" disabled={busy} aria-expanded={open} aria-controls={formId} onClick={() => { const nextOpen = !open; setOpen(nextOpen); if (!nextOpen) onDirtyChange?.(false); }} className="inline-flex min-h-11 w-full items-center justify-center gap-2 border-2 border-cyan-300 bg-cyan-300 px-4 py-2 text-xs font-black uppercase text-black hover:bg-white disabled:opacity-40 sm:w-auto"><Plus className="h-4 w-4" />{open ? "Cerrar formulario" : "Nueva rutina"}</button>
    </div>
    {open && <form id={formId} className="mt-4 grid min-w-0 gap-4 border-t border-white/15 pt-4 sm:grid-cols-2" onInput={() => onDirtyChange?.(true)} onSubmit={(event) => {
      event.preventDefault();
      if (busy) return;
      void mutate({ action: "create_routine", objective, startDate, endDate, dayLabel, focus, moduleCount,
        ...(templateRoutineId ? { templateRoutineId, templateDayId } : {}), revision: 0,
      }, "Rutina creada. Agregá los ejercicios y luego asignala a una persona.", (result) => {
        if (!result.routineId) return;
        setObjective(""); setStartDate(data.date); setEndDate(""); setDayLabel("Día 1"); setFocus("");
        setModuleCount(1); setTemplateRoutineId(""); setTemplateDayId(""); setOpen(false); onDirtyChange?.(false);
        onCreated(result.routineId);
      });
    }}>
      <label className={`${label} sm:col-span-2`}>Nombre u objetivo<input autoFocus className={field} value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={120} minLength={2} required disabled={busy} placeholder="Ej. Fuerza y movilidad" /></label>
      <label className={label}>Fecha de inicio<input className={field} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required disabled={busy} /></label>
      <label className={label}>Fecha final<input className={field} type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} required disabled={busy} /></label>
      <label className={label}>Nombre del primer día<input className={field} value={dayLabel} onChange={(event) => setDayLabel(event.target.value)} maxLength={80} minLength={2} required disabled={busy} /></label>
      <label className={label}>Enfoque del primer día<input className={field} value={focus} onChange={(event) => setFocus(event.target.value)} maxLength={120} disabled={busy} placeholder="Ej. Tren inferior (opcional)" /></label>
      <label className={label}>Cantidad de días<select className={field} value={moduleCount} onChange={(event) => setModuleCount(Number(event.target.value))} disabled={busy}>{Array.from({ length: 7 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? "día" : "días"}</option>)}</select></label>
      <label className={label}>Ejercicios iniciales<select className={field} value={templateRoutineId} disabled={busy} onChange={(event) => { const routine = data.routines.find((entry) => entry.id === event.target.value); setTemplateRoutineId(event.target.value); setTemplateDayId(routine?.days[0]?.id ?? ""); }}><option value="">Desde cero · sin ejercicios</option>{data.routines.filter((routine) => routine.days.length).map((routine) => <option key={routine.id} value={routine.id}>Copiar de: {routine.objective}</option>)}</select></label>
      {template && <label className={`${label} sm:col-span-2`}>Día que se copiará al primer día<select className={field} value={templateDayId} onChange={(event) => setTemplateDayId(event.target.value)} disabled={busy}>{template.days.map((day) => <option key={day.id} value={day.id}>{day.label} · {day.exercises.length} ejercicios</option>)}</select></label>}
      <p className="border-l-2 border-cyan-300/50 pl-3 text-sm text-white/60 sm:col-span-2">{templateDay ? `Se copiarán ${templateDay.exercises.length} ejercicios al primer día. Los demás días quedarán vacíos.` : `Se crearán ${moduleCount} ${moduleCount === 1 ? "día vacío" : "días vacíos"} para que agregués tus ejercicios.`}</p>
      <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end"><GameButton variant="ghost" disabled={busy} onClick={() => { setOpen(false); onDirtyChange?.(false); }}>Cancelar</GameButton><GameButton type="submit" variant="cyan" disabled={busy || objective.trim().length < 2 || !startDate || !endDate || endDate < startDate || dayLabel.trim().length < 2 || Boolean(templateRoutineId && !templateDay)}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : "Crear y editar rutina"}</GameButton></div>
    </form>}
  </section>;
}
