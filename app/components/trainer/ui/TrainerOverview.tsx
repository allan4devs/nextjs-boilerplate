"use client";

import { Activity, AlertTriangle, CalendarDays, Check, Clock3, Dumbbell, Gauge, Ruler, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { GameLabel } from "@/app/components/GameOS";
import type { TrainerOs } from "../hooks/useTrainerOs";
import { daysSince } from "../utils";

export function TrainerOverview({ os }: { os: TrainerOs }) {
  const member = os.selected!;
  const plan = member.trainingPlan;
  const lastWorkout = member.recentWorkouts[0];
  const latest = member.latestMetrics[0];
  const previous = member.latestMetrics[1];
  const done = plan?.doneItems ?? plan?.items.filter((item) => item.done).length ?? 0;
  const total = plan?.totalItems ?? plan?.items.length ?? 0;
  const weightChange = latest && previous ? Math.round((latest.weightKg - previous.weightKg) * 10) / 10 : null;
  const inactiveDays = daysSince(lastWorkout?.completedDate);

  return <div className="space-y-4">
    {member.activePlanWorkout && <section className="border-[3px] border-cyan-300 bg-cyan-300/10 p-4 shadow-[5px_5px_0_rgba(103,232,249,.15)]"><div className="flex flex-wrap items-center justify-between gap-3"><div><GameLabel tone="cyan">En vivo</GameLabel><h3 className="mt-2 text-xl font-black uppercase">{member.activePlanWorkout.trainingName || "Entrenamiento activo"}</h3><p className="mt-1 text-sm font-bold text-white/50">Empezó {new Date(member.activePlanWorkout.startedAt).toLocaleString("es-CR")}</p></div><span className="relative flex h-5 w-5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300/60" /><span className="relative h-5 w-5 rounded-full bg-cyan-300" /></span></div></section>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Insight icon={Gauge} label="Progreso del plan" value={plan ? `${plan.progressPct ?? 0}%` : "Sin plan"} hint={plan ? `${done}/${total} sesiones` : "Prescribir ahora"} tone="lime" />
      <Insight icon={Clock3} label="Último entreno" value={lastWorkout?.completedDate || "Sin registro"} hint={inactiveDays === null ? "Sin historial" : inactiveDays === 0 ? "Hoy" : `Hace ${inactiveDays} días`} tone={inactiveDays !== null && inactiveDays >= 10 ? "orange" : "cyan"} />
      <Insight icon={Dumbbell} label="Volumen reciente" value={`${member.recentWorkouts.length}`} hint={`${member.recentWorkouts.reduce((sum, workout) => sum + (workout.minutes ?? 0), 0)} minutos`} tone="cyan" />
      <Insight icon={Ruler} label="Peso actual" value={latest?.weightKg ? `${latest.weightKg} kg` : "Sin dato"} hint={weightChange === null ? "Falta otra medición" : `${weightChange > 0 ? "+" : ""}${weightChange} kg`} tone="orange" />
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-4">
        <div className="flex items-center justify-between gap-3"><div><GameLabel tone="cyan">Plan actual</GameLabel><h3 className="mt-2 text-xl font-black uppercase">{plan?.title || "Todavía sin prescripción"}</h3></div><button onClick={() => os.setTab("plan")} className="border-2 border-cyan-300 px-3 py-2 text-[10px] font-black uppercase text-cyan-200">{plan ? "Editar plan" : "Crear plan"}</button></div>
        {plan ? <><p className="mt-2 text-sm font-bold text-white/50">{plan.objective || "Sin objetivo documentado"}</p><div className="mt-4 h-4 border-[3px] border-white/15 bg-black/50"><div className="h-full bg-gradient-to-r from-[#d8ff3e] to-cyan-300" style={{ width: `${plan.progressPct ?? 0}%` }} /></div><div className="mt-4 grid gap-2">{plan.items.slice(0, 5).map((item, index) => <div key={item.id} className={`flex items-center gap-3 border-2 p-3 ${item.done ? "border-[#d8ff3e]/35 bg-[#d8ff3e]/[.06]" : "border-white/10 bg-black/25"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center font-black ${item.done ? "bg-[#d8ff3e] text-black" : "bg-white/10 text-white/45"}`}>{item.done ? <Check className="h-4 w-4" /> : index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-black uppercase">{item.day}</p><p className="truncate text-xs font-bold text-white/40">{item.focus} · {item.targetMinutes} min</p></div></div>)}</div></> : <div className="mt-5 border-[3px] border-dashed border-white/15 p-6 text-center"><Target className="mx-auto h-8 w-8 text-cyan-300" /><p className="mt-3 font-black uppercase">Convertí su meta en un plan ejecutable</p><p className="mt-1 text-sm font-bold text-white/40">Usá una plantilla o empezá desde cero.</p></div>}
      </div>

      <div className="space-y-4">
        <div className="border-[3px] border-orange-300/35 bg-[#0c0c0c] p-4"><h3 className="flex items-center gap-2 font-black uppercase"><Zap className="h-5 w-5 text-orange-300" /> Lectura del entrenador</h3><div className="mt-3 space-y-2"><Signal icon={member.trainingPlan ? Check : AlertTriangle} text={member.trainingPlan ? `${total - done} sesiones pendientes en el plan.` : "Prioridad alta: el socio no tiene plan."} /><Signal icon={inactiveDays !== null && inactiveDays >= 10 ? AlertTriangle : Activity} text={inactiveDays === null ? "Todavía no hay historial para evaluar adherencia." : inactiveDays === 0 ? "Entrenó hoy; buen momento para revisar cargas." : `${inactiveDays} días desde la última ejecución.`} /><Signal icon={CalendarDays} text={`${plan?.weeklySessions ?? 0} sesiones semanales prescritas.`} /></div></div>
        <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-4"><h3 className="font-black uppercase">Mediciones recientes</h3>{member.latestMetrics.length ? <div className="mt-3 space-y-2">{member.latestMetrics.slice(0, 3).map((metric, index) => <div key={`${metric.date}-${index}`} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/10 py-2 text-sm"><span className="font-bold text-white/45">{metric.date}</span><strong>{metric.weightKg || "—"} kg</strong><strong>{metric.waistCm || "—"} cm</strong></div>)}</div> : <p className="mt-3 text-sm font-bold text-white/35">Sin mediciones corporales.</p>}</div>
      </div>
    </section>
  </div>;
}

function Insight({ icon: Icon, label, value, hint, tone }: { icon: typeof Activity; label: string; value: string; hint: string; tone: "lime" | "cyan" | "orange" }) {
  const colors = { lime: "border-[#d8ff3e]/35 text-[#d8ff3e]", cyan: "border-cyan-300/35 text-cyan-300", orange: "border-orange-300/35 text-orange-300" };
  return <div className={`border-[3px] bg-[#0c0c0c] p-4 ${colors[tone]}`}><Icon className="h-5 w-5" /><p className="mt-4 text-[9px] font-black uppercase tracking-[.16em] text-white/35">{label}</p><p className="mt-1 text-xl font-black uppercase text-white">{value}</p><p className="mt-1 text-xs font-bold text-white/40">{hint}</p></div>;
}

function Signal({ icon: Icon, text }: { icon: typeof Activity; text: string }) { return <div className="flex items-start gap-2 border-l-2 border-orange-300/40 bg-black/25 p-2.5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" /><p className="text-sm font-bold text-white/55">{text}</p></div>; }

