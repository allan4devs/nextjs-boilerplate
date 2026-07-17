"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, Copy, Dumbbell, Plus, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { GameButton, GameLabel } from "@/app/components/GameOS";
import { MACHINE_GUIDE } from "@/app/components/member/catalog/machines";
import { PLAN_TEMPLATES } from "../constants";
import type { TrainerOs } from "../hooks/useTrainerOs";
import type { PlanExercisePrescription, PlanItem } from "../types";
import { TrainerField, TrainerNumberField, TrainerTextarea } from "./TrainerFields";

export function TrainerPlanEditor({ os }: { os: TrainerOs }) {
  return <div className="space-y-4">
    <section className="border-[3px] border-cyan-300/40 bg-[#0c0c0c] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><GameLabel tone="cyan">Punto de partida</GameLabel><h3 className="mt-2 text-xl font-black uppercase">Plantillas inteligentes</h3><p className="mt-1 text-sm font-bold text-white/40">Aplicá una base y personalizala según la evaluación.</p></div>{os.dirty && <span className="border-2 border-orange-300 px-2 py-1 text-[9px] font-black uppercase text-orange-200">Cambios sin guardar</span>}</div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{PLAN_TEMPLATES.map((template) => <button key={template.id} onClick={() => os.applyTemplate(template.id)} className="group border-[3px] border-white/10 bg-black/30 p-3 text-left transition hover:border-cyan-300"><Sparkles className="h-5 w-5 text-cyan-300" /><p className="mt-3 font-black uppercase">{template.name}</p><p className="mt-1 text-xs font-bold leading-5 text-white/40">{template.description}</p><span className="mt-3 block text-[9px] font-black uppercase text-cyan-300">{template.weeklySessions} días · aplicar →</span></button>)}</div>
    </section>

    <section className="border-[3px] border-white/15 bg-[#0c0c0c]">
      <div className="grid gap-3 border-b-[3px] border-white/15 p-4 sm:grid-cols-2 xl:grid-cols-3">
        <TrainerField label="Título" value={os.draft.title} onChange={(value) => os.updateDraft("title", value)} />
        <TrainerField label="Entrenador responsable" value={os.coachName} onChange={os.setCoachName} />
        <TrainerNumberField label="Sesiones por semana" value={os.draft.weeklySessions} min={1} max={7} onChange={(value) => os.updateDraft("weeklySessions", value)} />
        <TrainerField label="Inicio" type="date" value={os.draft.startDate} onChange={(value) => os.updateDraft("startDate", value)} />
        <TrainerField label="Final estimado" type="date" value={os.draft.endDate} onChange={(value) => os.updateDraft("endDate", value)} />
        <div className="sm:col-span-2 xl:col-span-1"><TrainerField label="Objetivo" value={os.draft.objective} onChange={(value) => os.updateDraft("objective", value)} placeholder="Resultado y criterio de progreso" /></div>
        <div className="sm:col-span-2 xl:col-span-3"><TrainerTextarea label="Nota visible para el socio" value={os.draft.coachNote} onChange={(value) => os.updateDraft("coachNote", value)} rows={2} placeholder="Clave técnica, motivación o indicación de seguridad" /></div>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        {os.draft.items.map((item, index) => <PlanSession key={item.id} item={item} index={index} total={os.draft.items.length} os={os} />)}
        <button onClick={os.addItem} className="inline-flex min-h-12 w-full items-center justify-center gap-2 border-[3px] border-dashed border-cyan-300/45 font-black uppercase text-cyan-200 transition hover:bg-cyan-300/10"><Plus className="h-4 w-4" /> Agregar sesión</button>
      </div>

      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-white/15 bg-[#0c0c0c]/95 p-3 backdrop-blur sm:p-4">
        <div>{os.validationError ? <p className="text-xs font-bold text-orange-300">{os.validationError}</p> : <p className="inline-flex items-center gap-2 text-xs font-bold text-[#d8ff3e]"><Check className="h-4 w-4" /> Plan listo para guardar</p>}<p className="mt-1 text-[10px] font-black uppercase text-white/30">{os.draft.items.length} sesiones · {os.draft.items.reduce((sum, item) => sum + item.targetMinutes, 0)} min totales</p></div>
        <div className="flex gap-2"><GameButton variant="ghost" onClick={os.resetDraft} disabled={!os.dirty}><RotateCcw className="h-4 w-4" /> Descartar</GameButton><GameButton onClick={() => void os.save()} disabled={os.saving || Boolean(os.validationError)}>{os.saving ? <span className="animate-pulse">Guardando...</span> : <><Save className="h-4 w-4" /> Guardar plan</>}</GameButton></div>
      </footer>
    </section>
  </div>;
}

function PlanSession({ item, index, total, os }: { item: PlanItem; index: number; total: number; os: TrainerOs }) {
  const [expanded, setExpanded] = useState(index === 0 || !item.done);
  const [machineId, setMachineId] = useState(MACHINE_GUIDE[0]?.id ?? "");
  const exercises = item.prescribedExercises ?? [];
  return <article className={`border-[3px] ${item.done ? "border-[#d8ff3e]/35 bg-[#d8ff3e]/[.035]" : "border-white/15 bg-black/25"}`}>
    <header className="flex flex-wrap items-center gap-3 p-3">
      <button onClick={() => setExpanded((value) => !value)} className={`grid h-10 w-10 shrink-0 place-items-center font-black ${item.done ? "bg-[#d8ff3e] text-black" : "bg-cyan-300 text-black"}`}>{item.done ? <Check className="h-5 w-5" /> : index + 1}</button>
      <button onClick={() => setExpanded((value) => !value)} className="min-w-0 flex-1 text-left"><p className="truncate font-black uppercase">{item.day || `Sesión ${index + 1}`}</p><p className="truncate text-xs font-bold text-white/40">{item.focus || "Sin enfoque"} · {item.targetMinutes} min · {exercises.length} ejercicios</p></button>
      <div className="flex items-center gap-1"><IconButton label="Subir" disabled={index === 0} onClick={() => os.moveItem(index, -1)}><ArrowUp /></IconButton><IconButton label="Bajar" disabled={index === total - 1} onClick={() => os.moveItem(index, 1)}><ArrowDown /></IconButton><IconButton label="Duplicar" onClick={() => os.duplicateItem(index)}><Copy /></IconButton><IconButton label="Eliminar" danger onClick={() => os.deleteItem(index)}><Trash2 /></IconButton><button onClick={() => setExpanded((value) => !value)} className="p-2 text-white/45">{expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button></div>
    </header>
    {expanded && <div className="border-t border-white/10 p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><TrainerField label="Día / nombre" value={item.day} onChange={(value) => os.updateItem(index, { day: value })} /><TrainerField label="Enfoque" value={item.focus} onChange={(value) => os.updateItem(index, { focus: value })} /><TrainerNumberField label="Minutos meta" value={item.targetMinutes} min={5} max={180} onChange={(value) => os.updateItem(index, { targetMinutes: value })} /><div className="sm:col-span-2 lg:col-span-3"><TrainerTextarea label="Indicaciones generales" value={item.exercises} onChange={(value) => os.updateItem(index, { exercises: value })} rows={2} /></div></div>
      <div className="mt-4 border-t border-white/10 pt-4"><div className="flex items-center justify-between gap-3"><h4 className="flex items-center gap-2 text-sm font-black uppercase"><Dumbbell className="h-4 w-4 text-cyan-300" /> Prescripción detallada</h4><span className="text-[9px] font-black uppercase text-white/30">{exercises.length} ejercicios</span></div>
        <div className="mt-3 space-y-2">{exercises.map((exercise, exerciseIndex) => <ExerciseRow key={exercise.id} exercise={exercise} onChange={(patch) => os.updateExercise(index, exerciseIndex, patch)} onDelete={() => os.deleteExercise(index, exerciseIndex)} />)}</div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={machineId} onChange={(event) => setMachineId(event.target.value)} className="min-h-11 flex-1 bg-white px-3 font-bold text-black">{MACHINE_GUIDE.map((machine) => <option key={machine.id} value={machine.id}>{machine.name} · {machine.zone}</option>)}</select><button onClick={() => os.addExercise(index, machineId)} className="inline-flex min-h-11 items-center justify-center gap-2 bg-cyan-300 px-4 text-xs font-black uppercase text-black"><Plus className="h-4 w-4" /> Prescribir máquina</button></div>
      </div>
    </div>}
  </article>;
}

function ExerciseRow({ exercise, onChange, onDelete }: { exercise: PlanExercisePrescription; onChange: (patch: Partial<PlanExercisePrescription>) => void; onDelete: () => void }) {
  return <div className="grid gap-2 border-2 border-white/10 bg-black/30 p-2 sm:grid-cols-2 xl:grid-cols-[1.5fr_repeat(4,.65fr)_auto]"><TrainerField label="Ejercicio" value={exercise.exerciseName} onChange={(value) => onChange({ exerciseName: value })} /><TrainerNumberField label="Series" value={exercise.sets} min={1} max={20} onChange={(value) => onChange({ sets: value })} /><TrainerNumberField label="Reps" value={exercise.reps} min={0} max={100} onChange={(value) => onChange({ reps: value })} /><TrainerNumberField label="Peso kg" value={exercise.weightKg} min={0} max={1000} onChange={(value) => onChange({ weightKg: value })} /><TrainerNumberField label="Segundos" value={exercise.targetSeconds} min={0} max={3600} onChange={(value) => onChange({ targetSeconds: value })} /><button aria-label="Eliminar ejercicio" onClick={onDelete} className="self-end p-3 text-white/35 transition hover:text-red-300"><Trash2 className="h-4 w-4" /></button><div className="sm:col-span-2 xl:col-span-6"><TrainerField label="Nota técnica" value={exercise.notes} onChange={(value) => onChange({ notes: value })} placeholder="Tempo, rango, descanso o corrección" /></div></div>;
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactElement<{ className?: string }> }) { return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`grid h-9 w-9 place-items-center transition disabled:opacity-20 ${danger ? "text-red-300/60 hover:bg-red-400/10 hover:text-red-300" : "text-white/35 hover:bg-white/10 hover:text-white"}`}>{children}</button>; }

