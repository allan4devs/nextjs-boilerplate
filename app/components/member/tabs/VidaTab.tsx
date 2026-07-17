"use client";

import { useMemo, useState } from "react";
import {
  BatteryCharging,
  BedDouble,
  Check,
  ChevronRight,
  ClipboardCheck,
  Droplets,
  Flag,
  Footprints,
  HeartPulse,
  Loader2,
  MessageSquareText,
  Plus,
  Smile,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { GameButton, GameLabel } from "../../GameOS";
import type { HabitId, LifestyleChallengeId } from "../types";
import type { MemberOs } from "../useMemberOs";
import { todayIso } from "../utils";

const HABITS: Array<{ id: HabitId; label: string; detail: string }> = [
  { id: "water", label: "Hidratacion", detail: "8 vasos o mas" },
  { id: "protein", label: "Proteina", detail: "En comidas principales" },
  { id: "produce", label: "Frutas / vegetales", detail: "Color en el plato" },
  { id: "mobility", label: "Movilidad", detail: "5 minutos" },
  { id: "walk", label: "Caminata", detail: "Movimiento extra" },
  { id: "sleep", label: "Rutina de sueno", detail: "Preparar descanso" },
];

const CHALLENGES: Array<{
  id: LifestyleChallengeId;
  title: string;
  detail: string;
  target: number;
  metric: (entry: MemberOs["lifestyle"]["recent"][number]) => boolean;
}> = [
  { id: "hydration-7", title: "Hidratacion 7", detail: "8 vasos durante 7 dias", target: 7, metric: (entry) => entry.waterCups >= 8 },
  { id: "mobility-7", title: "Movilidad diaria", detail: "5 minutos durante 7 dias", target: 7, metric: (entry) => Boolean(entry.habits.mobility) },
  { id: "steps-5", title: "Semana activa", detail: "7.000 pasos en 5 dias", target: 5, metric: (entry) => entry.steps >= 7000 },
  { id: "sleep-7", title: "Sueno elite", detail: "7+ horas durante 7 dias", target: 7, metric: (entry) => entry.sleepHours >= 7 },
];

const INPUT = "min-h-12 w-full border-[3px] border-white/15 bg-black/40 px-3 py-2.5 font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]";

function ScorePicker({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">{label}</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`min-h-11 border-[2px] text-sm font-black transition ${value === score ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/12 bg-white/[.03] text-white/45"}`}
            aria-label={`${label}: ${score} de 5`}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, eyebrow, title }: { icon: typeof HeartPulse; eyebrow: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center border-[3px] border-white/15 bg-white/[.05] text-[#d8ff3e]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">{eyebrow}</p>
        <h2 className="text-xl font-black uppercase">{title}</h2>
      </div>
    </div>
  );
}

export default function VidaTab({ os }: { os: MemberOs }) {
  const {
    lifestyle,
    isLoadingLifestyle,
    lifestyleBusy,
    saveDailyWellness,
    toggleLifestyleHabit,
    toggleLifestyleChallenge,
    addLifestyleGoal,
    updateLifestyleGoal,
    deleteLifestyleGoal,
    addPersonalRecord,
    deletePersonalRecord,
    sendVisitFeedback,
  } = os;

  const [energyDraft, setEnergy] = useState<number | null>(null);
  const [moodDraft, setMood] = useState<number | null>(null);
  const [sorenessDraft, setSoreness] = useState<number | null>(null);
  const [sleepHoursDraft, setSleepHours] = useState<number | null>(null);
  const [waterCupsDraft, setWaterCups] = useState<number | null>(null);
  const [stepsDraft, setSteps] = useState<number | null>(null);
  const [noteDraft, setNote] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState(12);
  const [goalUnit, setGoalUnit] = useState("veces");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [recordExercise, setRecordExercise] = useState("");
  const [recordValue, setRecordValue] = useState("");
  const [recordUnit, setRecordUnit] = useState("kg");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackCategory, setFeedbackCategory] = useState("general");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const energy = energyDraft ?? lifestyle.today?.energy ?? 3;
  const mood = moodDraft ?? lifestyle.today?.mood ?? 3;
  const soreness = sorenessDraft ?? lifestyle.today?.soreness ?? 2;
  const sleepHours = sleepHoursDraft ?? lifestyle.today?.sleepHours ?? 0;
  const waterCups = waterCupsDraft ?? lifestyle.today?.waterCups ?? 0;
  const steps = stepsDraft ?? lifestyle.today?.steps ?? 0;
  const note = noteDraft ?? lifestyle.today?.note ?? "";

  const readiness = useMemo(() => {
    const sleepScore = Math.min(5, sleepHours > 0 ? (sleepHours / 8) * 5 : 3);
    return Math.round(((energy + mood + (6 - soreness) + sleepScore) / 20) * 100);
  }, [energy, mood, sleepHours, soreness]);
  const readinessTone = readiness >= 75 ? "text-[#d8ff3e]" : readiness >= 55 ? "text-orange-300" : "text-red-300";
  const recoveryTip = soreness >= 4
    ? "Carga alta detectada: prioriza movilidad, tecnica y una sesion suave."
    : sleepHours > 0 && sleepHours < 6
      ? "Dormiste poco: baja un punto la intensidad y cuida la hidratacion."
      : energy >= 4 && readiness >= 75
        ? "Buen dia para progresar carga o completar una sesion exigente."
        : "Estas en zona estable: entrena con buena tecnica y escucha el cuerpo.";
  const completedHabits = HABITS.filter((habit) => lifestyle.today?.habits[habit.id]).length;

  if (isLoadingLifestyle && !lifestyle.recent.length) {
    return <div className="grid min-h-[420px] place-items-center border-[3px] border-white/15 bg-[#0c0c0c]"><Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" /></div>;
  }

  return (
    <div className="xg-tab-in space-y-4">
      <section className="relative overflow-hidden border-[3px] border-cyan-300/45 bg-gradient-to-br from-cyan-300/[.12] via-[#0b0b0b] to-[#d8ff3e]/[.07] p-4 shadow-[6px_6px_0_rgba(34,211,238,.13)] sm:p-6">
        <div aria-hidden className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
          <div className="grid h-36 w-36 place-items-center border-[5px] border-cyan-300/45 bg-black/35 text-center">
            <div><p className={`text-5xl font-black ${readinessTone}`}>{readiness}</p><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/40">Readiness</p></div>
          </div>
          <div>
            <GameLabel tone="cyan">Vida Xtreme</GameLabel>
            <h1 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Tu rendimiento empieza fuera del gym</h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/55">Registra como llegas, construye habitos y convierte tus avances diarios en decisiones simples.</p>
            <div className="mt-4 flex items-start gap-3 border-l-4 border-[#d8ff3e] bg-black/30 p-3">
              <BatteryCharging className="mt-0.5 h-5 w-5 shrink-0 text-[#d8ff3e]" />
              <p className="text-sm font-bold text-white/70">{recoveryTip}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 shadow-[5px_5px_0_rgba(0,0,0,.5)] sm:p-5">
        <SectionTitle icon={HeartPulse} eyebrow="Pulso diario" title="Como llegas hoy" />
        <div className="grid gap-5 lg:grid-cols-3">
          <ScorePicker label="Energia" value={energy} onChange={setEnergy} />
          <ScorePicker label="Animo" value={mood} onChange={setMood} />
          <ScorePicker label="Carga muscular" value={soreness} onChange={setSoreness} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">Horas de sueno</span><input type="number" min="0" max="16" step="0.5" value={sleepHours} onChange={(event) => setSleepHours(Number(event.target.value))} className={`${INPUT} mt-2`} /></label>
          <label><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">Vasos de agua</span><input type="number" min="0" max="30" value={waterCups} onChange={(event) => setWaterCups(Number(event.target.value))} className={`${INPUT} mt-2`} /></label>
          <label><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">Pasos</span><input type="number" min="0" max="100000" value={steps} onChange={(event) => setSteps(Number(event.target.value))} className={`${INPUT} mt-2`} /></label>
        </div>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} placeholder="Nota opcional: dolor, estres, victoria del dia..." className={`${INPUT} mt-3 min-h-24 resize-y`} />
        <GameButton full className="mt-3" disabled={lifestyleBusy === "daily"} onClick={() => void saveDailyWellness({ energy, mood, soreness, sleepHours, waterCups, steps, note })}>
          {lifestyleBusy === "daily" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} Guardar check-in
        </GameButton>
      </section>

      <section className="border-[3px] border-[#d8ff3e]/35 bg-[#d8ff3e]/[.045] p-4 sm:p-5">
        <SectionTitle icon={Check} eyebrow={`${completedHabits}/${HABITS.length} completados`} title="Habitos de hoy" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {HABITS.map((habit) => {
            const done = Boolean(lifestyle.today?.habits[habit.id]);
            return <button key={habit.id} type="button" disabled={Boolean(lifestyleBusy)} onClick={() => void toggleLifestyleHabit(habit.id)} className={`flex min-h-16 items-center gap-3 border-[3px] p-3 text-left transition ${done ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/12 bg-black/25 text-white"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center border-[2px] ${done ? "border-black/25" : "border-white/15"}`}>{done ? <Check className="h-5 w-5" /> : <Plus className="h-4 w-4" />}</span><span><strong className="block text-xs font-black uppercase">{habit.label}</strong><small className={`font-bold ${done ? "text-black/55" : "text-white/35"}`}>{habit.detail}</small></span></button>;
          })}
        </div>
      </section>

      <section className="border-[3px] border-orange-300/35 bg-orange-300/[.045] p-4 sm:p-5">
        <SectionTitle icon={Flag} eyebrow="Constancia con proposito" title="Retos Xtreme" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CHALLENGES.map((challenge) => {
            const joined = lifestyle.joinedChallenges.includes(challenge.id);
            const progress = lifestyle.recent.slice(0, 7).filter(challenge.metric).length;
            const pct = Math.min(100, Math.round((progress / challenge.target) * 100));
            return <article key={challenge.id} className={`flex flex-col border-[3px] p-3 ${joined ? "border-orange-300/70 bg-orange-300/10" : "border-white/12 bg-black/25"}`}><div className="flex items-start justify-between gap-2"><div><h3 className="font-black uppercase">{challenge.title}</h3><p className="mt-1 text-xs font-bold text-white/40">{challenge.detail}</p></div>{joined && <Sparkles className="h-5 w-5 shrink-0 text-orange-300" />}</div><div className="mt-4 h-3 border-2 border-white/15 bg-black/35"><div className="h-full bg-orange-300" style={{ width: `${pct}%` }} /></div><p className="mt-2 text-[10px] font-black uppercase text-white/45">{progress}/{challenge.target} dias</p><button type="button" disabled={Boolean(lifestyleBusy)} onClick={() => void toggleLifestyleChallenge(challenge.id)} className={`mt-3 min-h-11 border-[2px] px-3 text-xs font-black uppercase ${joined ? "border-white/15 text-white/60" : "border-orange-300 bg-orange-300 text-black"}`}>{joined ? "Salir del reto" : "Unirme"}</button></article>;
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="border-[3px] border-cyan-300/30 bg-[#0c0c0c] p-4 sm:p-5">
          <SectionTitle icon={Target} eyebrow="Objetivos medibles" title="Mis metas" />
          <div className="space-y-2">
            {lifestyle.goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.progress / goal.target) * 100));
              return <div key={goal.id} className="border-[2px] border-white/12 bg-black/25 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-black uppercase">{goal.title}</p><p className="text-xs font-bold text-white/40">{goal.progress}/{goal.target} {goal.unit}{goal.deadline ? ` · hasta ${goal.deadline}` : ""}</p></div><button type="button" onClick={() => void deleteLifestyleGoal(goal.id)} className="grid h-9 w-9 place-items-center text-white/30 hover:text-red-300" aria-label="Eliminar meta"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 h-3 border-2 border-white/12 bg-black"><div className="h-full bg-cyan-300" style={{ width: `${pct}%` }} /></div><div className="mt-2 flex gap-2"><button type="button" disabled={goal.progress >= goal.target || Boolean(lifestyleBusy)} onClick={() => void updateLifestyleGoal(goal.id, Math.min(goal.target, goal.progress + 1))} className="min-h-10 flex-1 border-2 border-cyan-300/40 text-xs font-black uppercase text-cyan-200">+1</button><button type="button" disabled={goal.progress >= goal.target || Boolean(lifestyleBusy)} onClick={() => void updateLifestyleGoal(goal.id, Math.min(goal.target, goal.progress + Math.max(1, Math.ceil(goal.target * 0.1))))} className="min-h-10 flex-1 border-2 border-white/12 text-xs font-black uppercase text-white/55">+10%</button></div></div>;
            })}
            {!lifestyle.goals.length && <p className="border-[2px] border-dashed border-white/12 p-4 text-sm font-bold text-white/35">Crea una meta concreta y dale seguimiento sin salir de la app.</p>}
          </div>
          <details className="mt-3 border-[2px] border-white/12 bg-black/20 p-3"><summary className="cursor-pointer text-xs font-black uppercase text-[#d8ff3e]">Nueva meta</summary><div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="Ej. 12 entrenos este mes" className={`${INPUT} sm:col-span-2`} /><input type="number" min="1" value={goalTarget} onChange={(event) => setGoalTarget(Number(event.target.value))} className={INPUT} /><input value={goalUnit} onChange={(event) => setGoalUnit(event.target.value)} placeholder="Unidad" className={INPUT} /><input type="date" value={goalDeadline} onChange={(event) => setGoalDeadline(event.target.value)} className={`${INPUT} sm:col-span-2`} /><GameButton full className="sm:col-span-2" disabled={!goalTitle.trim() || lifestyleBusy === "goal-add"} onClick={() => void addLifestyleGoal({ title: goalTitle, target: goalTarget, unit: goalUnit, deadline: goalDeadline }).then((ok) => { if (ok) setGoalTitle(""); })}>Crear meta <ChevronRight className="h-4 w-4" /></GameButton></div></details>
        </section>

        <section className="border-[3px] border-[#d8ff3e]/30 bg-[#0c0c0c] p-4 sm:p-5">
          <SectionTitle icon={Trophy} eyebrow="Benchmarks personales" title="Records" />
          <div className="space-y-2">
            {lifestyle.personalRecords.slice(0, 8).map((record) => <div key={record.id} className="flex items-center gap-3 border-[2px] border-white/12 bg-black/25 p-3"><span className="grid h-11 w-11 shrink-0 place-items-center bg-[#d8ff3e] text-black"><Trophy className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-black uppercase">{record.exercise}</p><p className="text-xs font-bold text-white/40">{record.achievedOn}</p></div><strong className="text-xl font-black text-[#d8ff3e]">{record.value} <small className="text-xs">{record.unit}</small></strong><button type="button" onClick={() => void deletePersonalRecord(record.id)} className="text-white/25 hover:text-red-300" aria-label="Eliminar record"><Trash2 className="h-4 w-4" /></button></div>)}
            {!lifestyle.personalRecords.length && <p className="border-[2px] border-dashed border-white/12 p-4 text-sm font-bold text-white/35">Guarda pesos, tiempos, repeticiones o distancias que quieras superar.</p>}
          </div>
          <details className="mt-3 border-[2px] border-white/12 bg-black/20 p-3"><summary className="cursor-pointer text-xs font-black uppercase text-[#d8ff3e]">Agregar record</summary><div className="mt-3 grid grid-cols-[1fr_90px] gap-2"><input value={recordExercise} onChange={(event) => setRecordExercise(event.target.value)} placeholder="Ejercicio o prueba" className={`${INPUT} col-span-2`} /><input type="number" min="0" step="0.01" value={recordValue} onChange={(event) => setRecordValue(event.target.value)} placeholder="Marca" className={INPUT} /><select value={recordUnit} onChange={(event) => setRecordUnit(event.target.value)} className={INPUT}><option value="kg">kg</option><option value="lb">lb</option><option value="reps">reps</option><option value="min">min</option><option value="seg">seg</option><option value="km">km</option></select><GameButton full className="col-span-2" disabled={!recordExercise.trim() || !Number(recordValue) || lifestyleBusy === "record-add"} onClick={() => void addPersonalRecord({ exercise: recordExercise, value: Number(recordValue), unit: recordUnit, achievedOn: todayIso() }).then((ok) => { if (ok) { setRecordExercise(""); setRecordValue(""); } })}>Guardar record</GameButton></div></details>
        </section>
      </div>

      <section className="border-[3px] border-violet-300/30 bg-violet-300/[.045] p-4 sm:p-5">
        <SectionTitle icon={MessageSquareText} eyebrow="Experiencia del club" title="Como estuvo tu visita" />
        <div className="grid gap-4 lg:grid-cols-[auto_180px_1fr_auto] lg:items-end">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">Calificacion</p><div className="mt-2 flex gap-1.5">{[1,2,3,4,5].map((rating) => <button key={rating} type="button" onClick={() => setFeedbackRating(rating)} className={`grid h-11 w-11 place-items-center border-2 ${feedbackRating === rating ? "border-violet-300 bg-violet-300 text-black" : "border-white/12 text-white/40"}`}><Smile className="h-5 w-5" /></button>)}</div></div>
          <label><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">Area</span><select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value)} className={`${INPUT} mt-2`}><option value="general">General</option><option value="equipo">Equipo</option><option value="limpieza">Limpieza</option><option value="atencion">Atencion</option><option value="clases">Clases</option><option value="ambiente">Ambiente</option></select></label>
          <label><span className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">Comentario opcional</span><input value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} maxLength={500} placeholder="Que estuvo bien o que podemos mejorar" className={`${INPUT} mt-2`} /></label>
          <GameButton disabled={lifestyleBusy === "feedback"} onClick={() => void sendVisitFeedback({ rating: feedbackRating, category: feedbackCategory, message: feedbackMessage }).then((ok) => { if (ok) setFeedbackMessage(""); })}>Enviar</GameButton>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="border-[2px] border-white/10 bg-black/25 p-3"><BedDouble className="mx-auto h-5 w-5 text-cyan-300" /><p className="mt-1 text-lg font-black">{sleepHours || "—"}</p><p className="text-[9px] font-black uppercase text-white/35">horas</p></div>
        <div className="border-[2px] border-white/10 bg-black/25 p-3"><Droplets className="mx-auto h-5 w-5 text-cyan-300" /><p className="mt-1 text-lg font-black">{waterCups}</p><p className="text-[9px] font-black uppercase text-white/35">vasos</p></div>
        <div className="border-[2px] border-white/10 bg-black/25 p-3"><Footprints className="mx-auto h-5 w-5 text-cyan-300" /><p className="mt-1 text-lg font-black">{steps.toLocaleString()}</p><p className="text-[9px] font-black uppercase text-white/35">pasos</p></div>
      </div>
    </div>
  );
}
