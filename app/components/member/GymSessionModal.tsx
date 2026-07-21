"use client";

/**
 * GymSessionModal — wizard unificado de 3 pasos con animaciones y diseño premium:
 *   1. Ingreso  → timer en vivo de la visita activa / marcar entrada manual
 *   2. Entreno  → selector de tiempo + actividades con UX tipo game card
 *   3. Salida   → pantalla de celebración + resumen rico de sesión
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Award,
  Check,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Flame,
  Loader2,
  LogIn,
  LogOut,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { GameButton, GameModal } from "../GameOS";
import { FREE_WORKOUT } from "./constants";
import type { MemberOs } from "./useMemberOs";

/* ─────────────────────────── tipos ─────────────────────────── */
type Step = "entry" | "workout" | "exit";

const STEPS: { id: Step; label: string; emoji: string }[] = [
  { id: "entry", label: "Ingreso", emoji: "🚪" },
  { id: "workout", label: "Entreno", emoji: "💪" },
  { id: "exit", label: "Salida", emoji: "✅" },
];

/* ─────────────────── actividades ───────────────────────────── */
const QUICK_ACTIVITIES = [
  { id: "pesas",    label: "Pesas",          emoji: "🏋️", accent: "#fb923c" },
  { id: "maquinas", label: "Máquinas",       emoji: "⚙️", accent: "#67e8f9" },
  { id: "cardio",   label: "Cardio",         emoji: "🏃", accent: "#d8ff3e" },
  { id: "funcional",label: "Funcional",      emoji: "🔥", accent: "#fb923c" },
  { id: "pierna",   label: "Pierna",         emoji: "🦵", accent: "#c084fc" },
  { id: "pecho",    label: "Pecho / Espalda",emoji: "💪", accent: "#67e8f9" },
  { id: "core",     label: "Core",           emoji: "🎯", accent: "#d8ff3e" },
  { id: "movilidad",label: "Movilidad",      emoji: "🧘", accent: "#c084fc" },
] as const;

/* ─────────────────── presets de tiempo ─────────────────────── */
const TIME_PRESETS = [
  { min: 20, label: "20m",  tag: "Flash",    desc: "Rápido pero vale" },
  { min: 30, label: "30m",  tag: "Normal",   desc: "Sesión clásica" },
  { min: 45, label: "45m",  tag: "Completo", desc: "El punto dulce" },
  { min: 60, label: "1h",   tag: "Fuerte",   desc: "Nivel pro" },
  { min: 90, label: "1.5h", tag: "Bestia",   desc: "Sin límites" },
] as const;

/* ─────────────────── helpers ────────────────────────────────── */
function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return `${h} h${m ? ` ${m} min` : ""}`;
}

function timeLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-CR", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );
  } catch {
    return "—";
  }
}

function intensityLabel(min: number) {
  if (min >= 90) return { label: "Máxima", color: "#fb923c", pct: 100 };
  if (min >= 60) return { label: "Alta",   color: "#fb923c", pct: 80  };
  if (min >= 45) return { label: "Media",  color: "#d8ff3e", pct: 60  };
  if (min >= 30) return { label: "Moderada",color: "#67e8f9",pct: 40  };
  return                { label: "Baja",   color: "#67e8f9", pct: 20  };
}

function xpForMinutes(min: number, activities: number) {
  const base = Math.round(min * 1.2);
  const bonus = activities * 5;
  return base + bonus;
}

/* ─────────────────── componente: breadcrumb ─────────────────── */
function StepBreadcrumb({
  step,
  entryDone,
  workoutDone,
  onStepClick,
}: {
  step: Step;
  entryDone: boolean;
  workoutDone: boolean;
  onStepClick: (s: Step) => void;
}) {
  const curIdx = STEPS.findIndex((s) => s.id === step);
  const isDone = (id: Step) =>
    id === "entry" ? entryDone : id === "workout" ? workoutDone : false;

  return (
    <div className="mb-5 flex items-stretch gap-0">
      {STEPS.map((s, i) => {
        const done = isDone(s.id) || i < curIdx;
        const active = s.id === step;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onStepClick(s.id)}
            className={`group flex flex-1 flex-col items-center gap-1 border-b-[3px] pb-2.5 pt-1 transition-colors ${
              done
                ? "border-[#d8ff3e] hover:border-[#d8ff3e]"
                : active
                  ? "border-white"
                  : "border-white/15 hover:border-white/30"
            }`}
            aria-label={`Ir a ${s.label}`}
          >
            <span
              className={`grid h-6 w-6 place-items-center border-2 text-[9px] font-black transition ${
                done
                  ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                  : active
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-white/30"
              }`}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={`text-[9px] font-black uppercase tracking-[.14em] transition ${
                done ? "text-[#d8ff3e]" : active ? "text-white" : "text-white/25"
              }`}
            >
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────── paso 1: ingreso ───────────────────────── */
function EntryStep({
  hasActiveVisit,
  checkedInAt,
  elapsedMinutes,
  onNext,
  onMarkEntry,
  isBusy,
}: {
  hasActiveVisit: boolean;
  checkedInAt?: string;
  elapsedMinutes?: number;
  onNext: () => void;
  onMarkEntry: () => Promise<void>;
  isBusy: boolean;
}) {
  /* Timer local en vivo (incrementa cada 60s) */
  const [liveMin, setLiveMin] = useState(elapsedMinutes ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hasActiveVisit || elapsedMinutes === undefined) return;
    setLiveMin(elapsedMinutes);
    intervalRef.current = setInterval(() => {
      setLiveMin((m) => m + 1);
    }, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasActiveVisit, elapsedMinutes]);

  if (hasActiveVisit) {
    const h = Math.floor(liveMin / 60);
    const m = liveMin % 60;
    return (
      <div className="space-y-4">
        {/* Hero de visita activa */}
        <div className="relative overflow-hidden border-[3px] border-[#d8ff3e] bg-[#050a00] p-5">
          {/* Glow de fondo */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#d8ff3e]/12 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-[#d8ff3e]/6 blur-2xl"
          />
          <div className="relative">
            {/* Badge live */}
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#d8ff3e]" />
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#d8ff3e]">
                Sesión activa
              </span>
              {checkedInAt && (
                <span className="ml-auto text-[10px] font-bold text-white/35">
                  desde las {timeLabel(checkedInAt)}
                </span>
              )}
            </div>
            {/* Timer grande */}
            <div className="flex items-end gap-2">
              {h > 0 && (
                <>
                  <span className="text-6xl font-black tabular-nums leading-none text-white">
                    {h}
                  </span>
                  <span className="mb-1.5 text-lg font-black text-white/40">h</span>
                </>
              )}
              <span className="text-6xl font-black tabular-nums leading-none text-[#d8ff3e]">
                {String(m).padStart(h > 0 ? 2 : 1, "0")}
              </span>
              <span className="mb-1.5 text-lg font-black text-[#d8ff3e]/60">min</span>
            </div>
            <p className="mt-2 text-xs font-bold text-white/45">entrenando en Xtreme Gym</p>
          </div>
        </div>

        {/* CTA directo */}
        <GameButton full variant="lime" onClick={onNext}>
          <Dumbbell className="h-4 w-4" />
          Registrar mi entreno de hoy →
        </GameButton>

        <p className="text-center text-[11px] font-bold text-white/30">
          Ya podés saltar al Paso 2 para marcar lo que entrenaste
        </p>
      </div>
    );
  }

  /* Sin visita activa */
  return (
    <div className="space-y-4">
      {/* Info callout */}
      <div className="flex items-start gap-3 border-[2px] border-orange-300/30 bg-orange-300/8 p-3.5">
        <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
        <p className="text-xs font-bold leading-5 text-orange-100">
          El kiosco de recepción no está disponible. Podés marcar tu ingreso desde acá para
          llevar el registro en el sistema.
        </p>
      </div>

      {/* Botón grande de ingreso */}
      <button
        type="button"
        disabled={isBusy}
        onClick={() => void onMarkEntry()}
        className="group relative flex min-h-[8.5rem] w-full flex-col items-center justify-center gap-2.5 overflow-hidden border-[3px] border-orange-300/40 bg-black/50 transition hover:border-orange-300 hover:bg-orange-300/5 active:scale-[0.99] disabled:opacity-50"
      >
        <div
          aria-hidden
          className="absolute inset-0 translate-y-full bg-gradient-to-t from-orange-300/10 to-transparent transition-transform duration-500 group-hover:translate-y-0"
        />
        {isBusy ? (
          <Loader2 className="relative h-9 w-9 animate-spin text-orange-300" />
        ) : (
          <LogIn className="relative h-9 w-9 text-orange-300 transition group-hover:scale-110" />
        )}
        <span className="relative text-lg font-black uppercase tracking-wide">
          {isBusy ? "Registrando entrada..." : "Marcar mi ingreso"}
        </span>
        <span className="relative text-[11px] font-bold text-white/40">
          Registra la hora de entrada · se guarda en el sistema
        </span>
      </button>

      <button
        type="button"
        onClick={onNext}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wide text-white/30 transition hover:text-white/60"
      >
        Saltar — solo quiero marcar el entreno <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─────────────────── paso 2: entreno ───────────────────────── */
function WorkoutStep({
  trainedToday,
  minutes,
  onMinutes,
  activities,
  onToggleActivity,
  streak,
  onSave,
  isBusy,
  hasPlan,
  activePlanName,
  onGoToPlan,
  onNextStep,
}: {
  trainedToday: boolean;
  minutes: number;
  onMinutes: (m: number) => void;
  activities: string[];
  onToggleActivity: (label: string) => void;
  streak: number;
  onSave: () => Promise<boolean>;
  isBusy: boolean;
  hasPlan: boolean;
  activePlanName?: string;
  onGoToPlan: () => void;
  onNextStep: () => void;
}) {
  const intensity = intensityLabel(minutes);
  const estimatedXp = xpForMinutes(minutes, activities.length);

  if (trainedToday) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden border-[3px] border-[#d8ff3e]/50 bg-gradient-to-br from-[#d8ff3e]/10 via-black to-black p-5">
          <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#d8ff3e]/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center bg-[#d8ff3e] text-black">
              <Trophy className="h-7 w-7" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#d8ff3e]">
                ¡Misión cumplida!
              </p>
              <p className="text-xl font-black uppercase">El entreno de hoy ya está</p>
              <p className="mt-0.5 text-xs font-bold text-white/45">
                {streak > 0 ? `Racha activa: ${streak} días 🔥` : "Mañana volvemos a sumar."}
              </p>
            </div>
          </div>
        </div>
        <GameButton full variant="lime" onClick={onNextStep}>
          <LogOut className="h-4 w-4" />
          Ir a Salida →
        </GameButton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Plan del coach si hay */}
      {hasPlan && (
        <button
          type="button"
          onClick={onGoToPlan}
          className="flex w-full items-center gap-3 border-[2px] border-cyan-300/30 bg-cyan-300/5 p-3.5 text-left transition hover:border-cyan-300/60 hover:bg-cyan-300/8"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center border-[2px] border-cyan-300/40 bg-cyan-300/10">
            <ClipboardList className="h-5 w-5 text-cyan-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[.14em] text-cyan-400">
              {activePlanName ? "Sesión del plan activa" : "Plan del coach disponible"}
            </p>
            <p className="truncate text-sm font-black uppercase">
              {activePlanName ?? "Ver mi plan de entrenamiento →"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
        </button>
      )}

      {/* ── Selector de tiempo ── */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-300">
            ¿Cuántos minutos?
          </p>
          {/* XP estimado */}
          <span className="flex items-center gap-1 text-[10px] font-black text-[#d8ff3e]/70">
            <Zap className="h-3 w-3" />
            ~{estimatedXp} XP estimados
          </span>
        </div>

        {/* Presets tipo card */}
        <div className="grid grid-cols-5 gap-1.5">
          {TIME_PRESETS.map((preset) => {
            const on = minutes === preset.min;
            return (
              <button
                key={preset.min}
                type="button"
                onClick={() => onMinutes(preset.min)}
                className={`group relative flex flex-col items-center justify-center gap-0.5 overflow-hidden border-[3px] py-3 transition active:scale-95 ${
                  on
                    ? "border-orange-300 bg-orange-300 text-black"
                    : "border-white/10 bg-black/50 text-white hover:border-orange-300/50 hover:bg-orange-300/5"
                }`}
              >
                {on && (
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"
                  />
                )}
                <span className="relative text-lg font-black tabular-nums leading-none">
                  {preset.label}
                </span>
                <span
                  className={`relative text-[8px] font-black uppercase ${
                    on ? "text-black/50" : "text-white/25"
                  }`}
                >
                  {preset.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Slider fino + display */}
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={150}
            step={5}
            value={Math.min(150, Math.max(10, minutes))}
            onChange={(e) => onMinutes(Number(e.target.value))}
            className="min-w-0 flex-1 accent-orange-300"
            aria-label="Ajustar minutos exactos"
          />
          <span className="w-16 shrink-0 text-right text-2xl font-black tabular-nums text-orange-200">
            {minutes}
            <span className="text-xs font-bold text-white/35">m</span>
          </span>
        </div>

        {/* Barra de intensidad */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/30">
              Intensidad
            </span>
            <span
              className="text-[9px] font-black uppercase tracking-[.12em]"
              style={{ color: intensity.color }}
            >
              {intensity.label}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/10">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${intensity.pct}%`, backgroundColor: intensity.color }}
            />
          </div>
        </div>
      </div>

      {/* ── Actividades ── */}
      <div>
        <p className="mb-2.5 text-[10px] font-black uppercase tracking-[.16em] text-white/30">
          ¿Qué hiciste?{" "}
          <span className="text-white/18 font-bold normal-case tracking-normal">
            (opcional — elegí todos los que apliquen)
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_ACTIVITIES.map((act) => {
            const sel = activities.includes(act.label);
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => onToggleActivity(act.label)}
                className={`group relative flex min-h-[3rem] items-center gap-2 overflow-hidden border-[2px] px-3 text-left text-[11px] font-black uppercase transition active:scale-95 ${
                  sel
                    ? "border-current text-current"
                    : "border-white/10 bg-black/30 text-white/55 hover:border-white/25"
                }`}
                style={sel ? { color: act.accent, borderColor: act.accent } : undefined}
              >
                {sel && (
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundColor: act.accent }}
                  />
                )}
                <span className="relative text-base leading-none">{act.emoji}</span>
                <span className="relative min-w-0 flex-1 truncate">{act.label}</span>
                {sel && (
                  <Check
                    className="relative ml-auto h-3.5 w-3.5 shrink-0"
                    style={{ color: act.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Chips de actividades seleccionadas */}
        {activities.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {activities.map((a) => {
              const act = QUICK_ACTIVITIES.find((x) => x.label === a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => onToggleActivity(a)}
                  className="flex items-center gap-1 border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-white/55 transition hover:border-red-400/50 hover:text-red-300"
                  title="Quitar"
                >
                  {act?.emoji} {a} ×
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA guardar */}
      <GameButton full variant="lime" disabled={isBusy} onClick={() => void onSave()}>
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isBusy
          ? "Guardando..."
          : activities.length
            ? `Guardar ${durationLabel(minutes)} · ${activities.length} actividad${activities.length > 1 ? "es" : ""}`
            : `Guardar ${durationLabel(minutes)} de entreno`}
      </GameButton>
    </div>
  );
}

/* ─────────────────── paso 3: salida / resumen ───────────────── */
function ExitStep({
  hasActiveVisit,
  elapsedMinutes,
  workoutDone,
  streak,
  savedMinutes,
  savedActivities,
  onCheckout,
  isCheckingOut,
  onClose,
}: {
  hasActiveVisit: boolean;
  elapsedMinutes?: number;
  workoutDone: boolean;
  streak: number;
  savedMinutes: number;
  savedActivities: string[];
  onCheckout: () => Promise<void>;
  isCheckingOut: boolean;
  onClose: () => void;
}) {
  const estimatedXp = workoutDone ? xpForMinutes(savedMinutes, savedActivities.length) : 0;

  return (
    <div className="space-y-4">
      {/* Resumen de sesión */}
      <div className="grid grid-cols-3 gap-2">
        {/* Tiempo en gym */}
        <div className="flex flex-col items-center justify-center gap-1 border-[3px] border-[#d8ff3e]/20 bg-[#d8ff3e]/4 p-3">
          <Timer className="h-5 w-5 text-[#d8ff3e]/70" />
          <p className="text-xl font-black tabular-nums leading-tight">
            {elapsedMinutes !== undefined ? durationLabel(elapsedMinutes) : "—"}
          </p>
          <p className="text-center text-[9px] font-black uppercase text-white/35">
            {elapsedMinutes !== undefined ? "En el gym" : "Sin ingreso"}
          </p>
        </div>
        {/* Racha */}
        <div className="flex flex-col items-center justify-center gap-1 border-[3px] border-orange-300/20 bg-orange-300/4 p-3">
          <Flame className="h-5 w-5 text-orange-300/70" />
          <p className="text-xl font-black tabular-nums leading-tight">{streak}</p>
          <p className="text-center text-[9px] font-black uppercase text-white/35">
            Días racha
          </p>
        </div>
        {/* XP */}
        <div className="flex flex-col items-center justify-center gap-1 border-[3px] border-cyan-300/20 bg-cyan-300/4 p-3">
          <Zap className="h-5 w-5 text-cyan-300/70" />
          <p className="text-xl font-black tabular-nums leading-tight">
            {workoutDone ? `+${estimatedXp}` : "—"}
          </p>
          <p className="text-center text-[9px] font-black uppercase text-white/35">XP ganados</p>
        </div>
      </div>

      {/* Banner de éxito del entreno */}
      {workoutDone && (
        <div className="relative overflow-hidden border-[3px] border-[#d8ff3e]/40 bg-[#d8ff3e]/8 p-4">
          <div aria-hidden className="absolute right-3 top-3 text-4xl opacity-20">🎉</div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#d8ff3e] text-black">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black uppercase">Entreno guardado</p>
              <p className="text-[11px] font-bold text-white/50">
                {savedActivities.length
                  ? savedActivities.join(" · ")
                  : "Entreno libre"}{" "}
                · {durationLabel(savedMinutes)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Acción de salida */}
      {hasActiveVisit ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 border-[2px] border-orange-300/30 bg-orange-300/6 p-3.5">
            <LogOut className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
            <p className="text-xs font-bold leading-5 text-orange-100">
              Registrá tu salida para que el gym tenga el conteo de ocupación correcto. Solo
              toma un segundo.
            </p>
          </div>
          <GameButton
            full
            variant="orange"
            disabled={isCheckingOut}
            onClick={() => void onCheckout()}
          >
            {isCheckingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {isCheckingOut ? "Registrando salida..." : "Registrar mi salida · listo"}
          </GameButton>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 w-full items-center justify-center text-xs font-black uppercase text-white/25 transition hover:text-white/60"
          >
            Cerrar sin registrar salida
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 border-[2px] border-white/15 bg-white/3 p-3.5">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
            <p className="text-xs font-bold leading-5 text-white/45">
              No hay ingreso abierto. Si querés el historial completo de visitas, pedile a
              recepción que lo registren.
            </p>
          </div>
          <GameButton full variant="lime" onClick={onClose}>
            <Check className="h-4 w-4" />
            Listo · Cerrar
          </GameButton>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── modal principal ───────────────────────── */
export default function GymSessionModal({ os }: { os: MemberOs }) {
  const {
    osModal,
    closeOsModal,
    activeVisit,
    trainedToday,
    completeTraining,
    savingTrainingId,
    registerCheckout,
    isRegisteringCheckout,
    gami,
    setTab,
    currentMember,
    unlocked,
  } = os;

  const open = osModal?.kind === "gym-session";
  const initialStep: Step =
    osModal?.kind === "gym-session" ? (osModal.initialStep ?? "entry") : "entry";

  const [step, setStep]           = useState<Step>(initialStep);
  const [minutes, setMinutes]     = useState(45);
  const [activities, setActivities] = useState<string[]>([]);
  const [isMarkingEntry, setIsMarkingEntry] = useState(false);
  const [workoutSaved, setWorkoutSaved]     = useState(false);
  const [savedMinutes, setSavedMinutes]     = useState(45);
  const [savedActivities, setSavedActivities] = useState<string[]>([]);

  const hasActiveVisit      = Boolean(activeVisit);
  const streak              = gami?.streak ?? 0;
  const hasPlan             = Boolean(currentMember.trainingPlan || currentMember.activePlanWorkout);
  const activePlanName      = currentMember.activePlanWorkout?.trainingName;
  const effectiveWorkoutDone = trainedToday || workoutSaved;
  const effectiveEntryDone  = hasActiveVisit || workoutSaved;

  /* Resetear al abrir */
  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setMinutes(45);
    setActivities([]);
    setWorkoutSaved(false);
    setSavedMinutes(45);
    setSavedActivities([]);
    setIsMarkingEntry(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActivity = useCallback((label: string) => {
    setActivities((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label].slice(0, 8),
    );
  }, []);

  /* Ingreso manual (simula el tiempo hasta que haya API real) */
  const handleMarkEntry = useCallback(async () => {
    setIsMarkingEntry(true);
    await new Promise<void>((r) => setTimeout(r, 800));
    setIsMarkingEntry(false);
    setStep("workout");
  }, []);

  /* Guardar entreno */
  const handleSaveWorkout = useCallback(async (): Promise<boolean> => {
    if (!unlocked) return false;
    const name = activities.length
      ? activities.slice(0, 2).join(" · ")
      : "Entreno libre";
    const intensity =
      minutes >= 60 ? "Fuerte" : minutes <= 25 ? "Suave" : "Normal";
    const training = { ...FREE_WORKOUT, name, minutes, intensity };
    const saved = await completeTraining(training, {
      minutes,
      activities,
      allowWithPendingPlan: true,
    });
    if (saved) {
      setSavedMinutes(minutes);
      setSavedActivities(activities);
      setWorkoutSaved(true);
      setStep("exit");
    }
    return saved ?? false;
  }, [activities, completeTraining, minutes, unlocked]);

  /* Ir al plan del coach */
  const handleGoToPlan = useCallback(() => {
    closeOsModal();
    setTab("entrenar");
  }, [closeOsModal, setTab]);

  /* Registrar salida */
  const handleCheckout = useCallback(async () => {
    await registerCheckout();
    closeOsModal();
  }, [closeOsModal, registerCheckout]);

  const isSaving = Boolean(savingTrainingId);

  /* Metadatos del modal por paso */
  type StepMeta = { title: string; subtitle: string; icon: typeof LogIn; tone: "lime" | "orange" };
  const stepMeta: Record<Step, StepMeta> = {
    entry: hasActiveVisit
      ? { title: "Estás dentro",   subtitle: "Sesión activa · contando en vivo", icon: LogIn,   tone: "lime"   }
      : { title: "Marcar ingreso", subtitle: "Recepción no disponible · registrá acá",   icon: LogIn,   tone: "orange" },
    workout: effectiveWorkoutDone
      ? { title: "Hoy ya está",     subtitle: "El entreno de hoy ya sumó",         icon: Dumbbell, tone: "lime"   }
      : { title: "¿Qué entrenaste?", subtitle: "Elegí tiempo · actividades · guardá",  icon: Dumbbell, tone: "lime"   },
    exit:   { title: "Registrar salida", subtitle: "Resumen de tu sesión de hoy",      icon: LogOut,  tone: "orange" },
  };

  const { title, subtitle, icon, tone } = stepMeta[step];

  if (!open) return null;

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <GameModal
      open={open}
      onClose={closeOsModal}
      title={title}
      subtitle={subtitle}
      icon={icon}
      tone={tone}
      size="lg"
      footer={
        step !== "exit" ? (
          <div className="flex items-center justify-between gap-3">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  aria-label={`Ir a ${s.label}`}
                  className={`h-[3px] rounded-none transition-all duration-300 ${
                    s.id === step
                      ? "w-8 bg-white"
                      : i < stepIndex
                        ? "w-3 bg-[#d8ff3e]"
                        : "w-3 bg-white/20"
                  }`}
                />
              ))}
            </div>
            {/* Navegación */}
            <div className="flex items-center gap-2">
              {step === "workout" && (
                <button
                  type="button"
                  onClick={() => setStep("entry")}
                  className="min-h-10 px-3 text-[11px] font-black uppercase text-white/30 transition hover:text-white/70"
                >
                  ← Atrás
                </button>
              )}
              {step === "entry" && (
                <button
                  type="button"
                  onClick={() => setStep("workout")}
                  className="inline-flex min-h-10 items-center gap-1.5 border-[2px] border-white/15 px-3 text-[11px] font-black uppercase text-white/50 transition hover:border-white/40 hover:text-white"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
              {step === "workout" && effectiveWorkoutDone && (
                <button
                  type="button"
                  onClick={() => setStep("exit")}
                  className="inline-flex min-h-10 items-center gap-1.5 bg-white px-3 text-[11px] font-black uppercase text-black transition hover:bg-[#d8ff3e]"
                >
                  Ver salida <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
              {step === "workout" && !effectiveWorkoutDone && (
                <button
                  type="button"
                  onClick={() => setStep("exit")}
                  className="inline-flex min-h-10 items-center gap-1.5 border-[2px] border-white/15 px-3 text-[11px] font-black uppercase text-white/30 transition hover:border-white/40 hover:text-white"
                >
                  Saltar <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : null
      }
    >
      {/* Breadcrumb interactivo */}
      <StepBreadcrumb
        step={step}
        entryDone={effectiveEntryDone}
        workoutDone={effectiveWorkoutDone}
        onStepClick={setStep}
      />

      {step === "entry" && (
        <EntryStep
          hasActiveVisit={hasActiveVisit}
          checkedInAt={activeVisit?.checkedInAt}
          elapsedMinutes={activeVisit?.elapsedMinutes}
          onNext={() => setStep("workout")}
          onMarkEntry={handleMarkEntry}
          isBusy={isMarkingEntry}
        />
      )}
      {step === "workout" && (
        <WorkoutStep
          trainedToday={effectiveWorkoutDone}
          minutes={minutes}
          onMinutes={setMinutes}
          activities={activities}
          onToggleActivity={toggleActivity}
          streak={streak}
          onSave={handleSaveWorkout}
          isBusy={isSaving}
          hasPlan={hasPlan}
          activePlanName={activePlanName}
          onGoToPlan={handleGoToPlan}
          onNextStep={() => setStep("exit")}
        />
      )}
      {step === "exit" && (
        <ExitStep
          hasActiveVisit={hasActiveVisit}
          elapsedMinutes={activeVisit?.elapsedMinutes}
          workoutDone={effectiveWorkoutDone}
          streak={streak}
          savedMinutes={savedMinutes}
          savedActivities={savedActivities}
          onCheckout={handleCheckout}
          isCheckingOut={isRegisteringCheckout}
          onClose={closeOsModal}
        />
      )}
    </GameModal>
  );
}
