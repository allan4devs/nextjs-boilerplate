"use client";

import { useState } from "react";
import { ArrowRight, Check, Flag, MapPin } from "lucide-react";
import { journeyPhase } from "@/lib/xtreme/member-journey";
import type { MemberOs } from "../useMemberOs";
import BodyMetricsForm from "../BodyMetricsForm";
import WellnessCheck from "./WellnessCheck";
import WorkoutGuide from "./WorkoutGuide";
import { todayIso } from "../utils";

const primary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d8ff3e] px-5 font-black text-black disabled:opacity-40";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold text-white/75 disabled:opacity-40";

export default function MemberJourneyHome({ os }: { os: MemberOs }) {
  const [editWellness, setEditWellness] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [selection, setSelection] = useState("");
  const [focus, setFocus] = useState("");
  const [startingPlan, setStartingPlan] = useState(false);
  const { currentMember: member, activeVisit, journey } = os;
  const today = todayIso();
  const wellness = os.lifestyle.today?.date === today ? os.lifestyle.today : null;
  const active = member.activePlanWorkout ?? journey?.workout;
  const trained = member.workouts.some((workout) => workout.completedDate === today);
  const pending = member.trainingPlan?.items.filter((item) => !item.done) ?? [];
  const selected = pending.find((item) => item.id === selection) ?? pending[0];
  const phase = journeyPhase({ inside: Boolean(activeVisit), activeWorkout: Boolean(active), completed: trained, assessed: Boolean(wellness?.assessedAt), skipped: Boolean(activeVisit && journey?.wellnessSkippedFor === activeVisit.id) });
  const phaseIndex = phase === "arrival" ? 0 : phase === "wellness" ? 1 : phase === "choose" ? 2 : phase === "training" ? 3 : 4;
  const steps = ["Llegada", "Cómo llegás", "Tu enfoque", "Entrenamiento", "Tu avance"];
  const latestToday = member.workouts.filter((workout) => workout.completedDate === today).at(-1);

  return <div className="mx-auto max-w-6xl space-y-4 pb-6">
    <header className="rounded-2xl border border-white/15 bg-gradient-to-br from-[#d8ff3e]/10 via-[#0c0c0c] to-[#0c0c0c] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold text-[#d8ff3e]"><MapPin className="h-4 w-4" />{activeVisit ? "Estás en Xtreme Gym" : trained ? "Tu sesión de hoy está guardada" : "Preparando tu próxima visita"}</p>
        {activeVisit && <button type="button" onClick={() => os.setOsModal({ kind: "gym-session" })} className="min-h-11 text-xs text-white/45">Terminar visita / salir</button>}
      </div>
      <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">{active ? "Sigamos donde estás" : trained ? "Hoy avanzaste" : `Vamos a tu ritmo, ${os.memberName.split(" ")[0]}`}</h1>
      <p className="mt-3 text-sm text-white/60">{active ? `Trabajando: ${active.trainingName}` : member.goal ? `Tu destino: ${member.goal}` : "Elegí un objetivo y construyamos el camino, una sesión a la vez."}</p>
      <ol aria-label="Tu camino de hoy" className="mt-6 grid grid-cols-5 gap-1 sm:gap-3">{steps.map((step, index) => <li key={step} aria-current={phaseIndex === index ? "step" : undefined} className={`border-t-2 pt-2 text-[10px] font-bold sm:text-xs ${phaseIndex === index ? "border-[#d8ff3e] text-[#d8ff3e]" : phaseIndex > index ? "border-white/40 text-white/60" : "border-white/10 text-white/30"}`}><span className="mb-1 block">{index + 1}</span>{step}</li>)}</ol>
    </header>

    {os.journeyError && <div role="alert" className="rounded-xl border border-orange-300/30 bg-orange-300/10 p-4 text-sm text-orange-100">{os.journeyError}<button type="button" onClick={os.reloadJourney} className="ml-3 min-h-11 font-bold underline">Actualizar y reintentar</button></div>}

    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label="Tu siguiente paso" className="min-w-0 rounded-2xl border border-white/15 bg-[#0c0c0c] p-5 sm:p-6">
        {!journey && !os.journeyError && <p role="status" className="mb-4 text-sm text-white/50">Cargando tu recorrido guardado…</p>}
        {phase === "arrival" && <div className="space-y-5">
          <div><p className="text-xs font-bold uppercase tracking-widest text-[#d8ff3e]">Primer paso</p><h2 className="mt-2 text-2xl font-black">¿Ya llegaste al gimnasio?</h2><p className="mt-2 text-sm leading-6 text-white/60">Marcá tu ingreso y pasemos a lo que vas a trabajar. Tu tiempo queda en un contador pequeño arriba.</p></div>
          <button type="button" disabled={os.isRegisteringCheckin || os.isLoadingVisitHistory} onClick={() => void os.registerCheckin()} className={`${primary} w-full`}>{os.isRegisteringCheckin ? "Registrando ingreso…" : os.isLoadingVisitHistory ? "Consultando tu ingreso…" : "Ya llegué · registrar ingreso"}<ArrowRight className="h-4 w-4" /></button>
          <div className="rounded-xl bg-white/5 p-4"><p className="text-sm font-bold">{member.trainingPlan ? `Tu plan: ${member.trainingPlan.title}` : "Todavía no tenés un entrenamiento asignado"}</p><p className="mt-2 text-sm text-white/50">{selected ? `Próxima sesión: ${selected.focus || selected.day}` : member.trainingPlan ? "Completaste las sesiones del plan. Coordiná el siguiente con tu entrenador." : "Podés elegir un entrenamiento libre al ingresar o coordinar tu plan con el entrenador."}</p></div>
          <button type="button" onClick={() => os.setTab("entrenar")} className={secondary}>Ver mi plan y clases</button>
        </div>}
        {(phase === "wellness" || editWellness) && <WellnessCheck key={`${activeVisit?.id ?? today}:${editWellness}`} os={os} onDone={() => setEditWellness(false)} />}
        {phase === "choose" && !editWellness && <div className="space-y-5">
          <div><p className="text-xs font-bold uppercase tracking-widest text-[#d8ff3e]">Tu siguiente paso</p><h2 className="mt-2 text-2xl font-black">¿Qué vamos a trabajar primero?</h2><p className="mt-2 text-sm text-white/55">{wellness?.assessedAt ? `Energía ${wellness.energy}/5 · ánimo ${wellness.mood}/5. ` : ""}Podés seguir tu plan o elegir otra sesión para hoy.</p></div>
          {member.trainingPlan && selected ? <div className="space-y-3 rounded-xl border border-[#d8ff3e]/25 p-4">
            <p className="text-xs font-bold text-[#d8ff3e]">Asignado · {member.trainingPlan.title}</p>
            <label className="block text-xs text-white/60">Sesión<select value={selected.id} onChange={(event) => setSelection(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg bg-[#171717] px-3 text-sm text-white">{pending.map((item) => <option key={item.id} value={item.id}>{item.day} · {item.focus}</option>)}</select></label>
            <p className="text-sm text-white/60">{selected.exercises || selected.focus}{selected.targetMinutes ? ` · ${selected.targetMinutes} min previstos` : ""}</p>
            {member.trainingPlan.coachNote && <p className="text-xs text-white/50">Tu entrenador: {member.trainingPlan.coachNote}</p>}
            <button type="button" disabled={startingPlan || !journey || Boolean(journey.workout)} onClick={async () => { setStartingPlan(true); await os.startPlanWorkout(selected); setStartingPlan(false); }} className={`${primary} w-full`}>{startingPlan ? "Iniciando…" : "Empezar esta sesión"}</button>
          </div> : <div className="rounded-xl border border-dashed border-white/20 p-4"><h3 className="font-bold">{member.trainingPlan ? "Terminaste tu plan asignado" : "Aún no te asignaron un plan"}</h3><p className="mt-2 text-sm text-white/55">{member.trainingPlan ? "Coordiná tu siguiente plan con el entrenador. Hoy podés registrar una sesión libre." : "Pedile al entrenador que te lo asigne. Mientras tanto, podés registrar los ejercicios que vas a hacer."}</p></div>}
          <div className="space-y-3"><h3 className="font-bold">Elegir mi enfoque de hoy</h3><div className="flex flex-wrap gap-2">{["Pierna", "Tren superior", "Cuerpo completo", "Cardio", "Movilidad"].map((label) => <button type="button" key={label} onClick={() => setFocus(label)} aria-pressed={focus === label} className={`${secondary} ${focus === label ? "!border-[#d8ff3e] !text-[#d8ff3e]" : ""}`}>{label}</button>)}</div><label className="block text-xs text-white/60">O escribí qué querés trabajar<input value={focus} maxLength={100} onChange={(event) => setFocus(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-sm text-white" /></label><button type="button" disabled={!focus.trim() || !journey || Boolean(os.journeyBusy)} onClick={() => void os.updateJourney("start", { trainingName: focus })} className={`${primary} w-full`}>{os.journeyBusy === "start" ? "Iniciando…" : "Empezar mi entrenamiento libre"}</button></div>
          <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setEditWellness(true)} className="min-h-11 text-sm text-white/55">Actualizar cómo me siento</button><button type="button" onClick={() => os.setTab("entrenar")} className="min-h-11 text-sm text-white/55">Ver clases y otros entrenamientos</button><button type="button" onClick={async () => { try { await os.reloadFullMember(os.memberName, member.cedula); os.reloadJourney(); } catch { os.setError("No se pudo actualizar tu plan. Reintentá."); } }} className="min-h-11 text-sm text-white/55">Actualizar plan asignado</button></div>
        </div>}
        {phase === "training" && !editWellness && <WorkoutGuide os={os} />}
        {phase === "recovery" && !editWellness && <div className="space-y-5">
          <Check className="h-10 w-10 text-[#d8ff3e]" /><h2 className="text-2xl font-black">Tu entrenamiento quedó guardado</h2>
          <p className="text-sm text-white/60">{latestToday?.trainingName} · {latestToday?.minutes ?? 0} min{latestToday?.exercises?.length ? ` · ${latestToday.exercises.length} ejercicios registrados` : ""}</p>
          <p className="text-sm leading-6 text-white/55">Revisá lo que lograste y los requisitos de tu próximo nivel. Tu siguiente sesión sigue en el plan.</p>
          <button type="button" onClick={() => setEditWellness(true)} className={secondary}>¿Cómo me siento después de entrenar?</button>
          {activeVisit && <button type="button" onClick={() => os.setOsModal({ kind: "gym-session" })} className={`${primary} w-full`}>Ya terminé · registrar salida</button>}
          <button type="button" onClick={() => os.setTab("progreso")} className="min-h-11 text-sm font-bold text-[#d8ff3e]">Ver historial y evolución</button>
        </div>}
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-white/15 bg-[#0c0c0c] p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/45"><Flag className="h-4 w-4" />Hacia dónde vas</p>
          <h2 className="mt-3 text-lg font-black">{member.goal || "Definamos tu objetivo"}</h2>
          {(!member.goal || editingGoal) ? <form className="mt-3 space-y-2" onSubmit={async (event) => { event.preventDefault(); setSavingGoal(true); if (await os.saveProfileField({ goal: goalDraft.trim() }, "Objetivo actualizado.")) { setEditingGoal(false); os.reloadJourney(); } setSavingGoal(false); }}><label className="text-xs text-white/50">¿Qué querés lograr?<input required value={goalDraft} maxLength={80} onChange={(event) => setGoalDraft(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-sm text-white" /></label><button disabled={savingGoal || !goalDraft.trim()} className={`${primary} w-full`} type="submit">{savingGoal ? "Guardando…" : "Guardar mi objetivo"}</button></form> : <button type="button" onClick={() => { setGoalDraft(member.goal); setEditingGoal(true); }} className="mt-2 min-h-11 text-xs text-white/45">Ajustar mi objetivo</button>}
        </section>
        <section className="rounded-2xl border border-[#d8ff3e]/25 bg-[#d8ff3e]/[.04] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#d8ff3e]">Mi camino comprobado</p>
          <h2 className="mt-2 text-2xl font-black">{journey ? journey.level ? `Nivel ${journey.level}` : "Punto de partida" : "Cargando nivel…"}</h2>
          <p className="mt-2 text-xs leading-5 text-white/50">Cada nivel reconoce constancia registrada: ingresos y ejercicios que confirmaste. No es una certificación de técnica o capacidad física.</p>
          {journey && <><h3 className="mt-4 text-sm font-bold">Para llegar al nivel {journey.nextLevel}</h3><ul className="mt-3 space-y-3">{journey.requirements.map((item) => <li key={item.id} className="flex gap-2 text-xs leading-5"><span className={item.done ? "text-[#d8ff3e]" : "text-white/30"}>{item.done ? "✓" : "○"}</span><span className="flex-1 text-white/65">{item.label}<span className="block font-bold text-white">{Math.min(item.current, item.target)} / {item.target}</span></span></li>)}</ul><button type="button" disabled={Boolean(os.journeyBusy) || !journey.ready} onClick={() => void os.updateJourney("verify")} className={`${primary} mt-4 w-full text-sm`}>{os.journeyBusy === "verify" ? "Comprobando…" : journey.ready ? `Comprobar y subir al nivel ${journey.nextLevel}` : "Seguí tu camino"}</button>
          {!!journey.proofs.length && <details className="mt-4"><summary className="min-h-11 cursor-pointer text-xs text-white/50">Ver niveles comprobados</summary><ul className="space-y-2">{journey.proofs.map((proof) => <li key={proof.level} className="text-xs text-white/60">Nivel {proof.level} · {proof.verifiedAt.slice(0, 10)} · {proof.workoutIds.length} entrenos respaldados</li>)}</ul></details>}</>}
        </section>
      </aside>
    </div>

    <details className="rounded-2xl border border-white/15 bg-[#0c0c0c] p-5"><summary className="min-h-11 cursor-pointer font-bold">Mi peso e InBody <span className="ml-2 text-xs font-normal text-white/45">{member.latestBodyMetric ? `${member.latestBodyMetric.weightKg} kg · ${member.latestBodyMetric.date}` : "Cuando tengas una medición"}</span></summary><div className="mt-4"><BodyMetricsForm key={member.normalizedName} os={os} /></div></details>
    <nav aria-label="Más opciones de socio" className="flex flex-wrap gap-2"><button type="button" onClick={() => os.setOsModal({ kind: "membership" })} className={secondary}>Mi membresía</button><button type="button" onClick={() => os.setTab("entrenar")} className={secondary}>Plan y clases</button><button type="button" onClick={() => os.setTab("vida")} className={secondary}>Hábitos y bienestar</button><button type="button" onClick={() => os.setTab("progreso")} className={secondary}>Mi historial</button></nav>
  </div>;
}
