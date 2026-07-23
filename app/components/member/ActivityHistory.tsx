"use client";

/**
 * Historial de ingresos al gym y de entrenamientos marcados.
 * Listas scrolleables con formato es-CR (voseo en vacíos).
 */

import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  DoorOpen,
  Dumbbell,
  LogIn,
  LogOut,
  Timer,
} from "lucide-react";
import { GameLabel } from "../GameOS";
import type { VisitHistoryRecord, Workout } from "./types";

const METHOD_LABELS: Record<string, string> = {
  pin: "PIN",
  code: "Código",
  cedula: "Cédula",
  face: "Rostro",
  name: "Nombre",
  admin: "Recepción",
};

const BY_LABELS: Record<string, string> = {
  kiosk: "Kiosco / app",
  reception: "Recepción",
  admin: "Admin",
};

function formatDay(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  return new Date(`${isoDate}T12:00:00-06:00`).toLocaleDateString("es-CR", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number | null | undefined) {
  if (minutes == null || minutes < 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const PAGE = 15;

export function VisitHistoryList({
  visits,
  totalVisits,
  loading,
}: {
  visits: VisitHistoryRecord[];
  totalVisits?: number;
  loading?: boolean;
}) {
  const [limit, setLimit] = useState(PAGE);
  const shown = visits.slice(0, limit);
  const total = totalVisits ?? visits.length;

  return (
    <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-3 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center border-2 border-black/20 bg-cyan-300 text-black">
            <DoorOpen className="h-5 w-5" />
          </span>
          <div>
            <GameLabel tone="cyan">Ingresos al gym</GameLabel>
            <p className="text-sm font-black uppercase">Historial de visitas</p>
          </div>
        </div>
        {total > 0 && (
          <span className="shrink-0 border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-200">
            {total} total
          </span>
        )}
      </div>

      {loading && (
        <p className="py-6 text-center text-sm font-semibold text-white/45">
          Cargando tus ingresos…
        </p>
      )}

      {!loading && !visits.length && (
        <p className="py-6 text-center text-sm font-semibold text-white/45">
          Todavía no hay ingresos registrados. Cuando pases por el kiosco o recepción,
          van a aparecer acá.
        </p>
      )}

      {!loading && shown.length > 0 && (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {shown.map((visit) => {
            const duration = formatDuration(visit.durationMinutes);
            return (
              <div
                key={visit.id}
                className="border border-white/10 bg-black/25 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-black uppercase text-white">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                      {formatDay(visit.date)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-white/50">
                      <span className="inline-flex items-center gap-1">
                        <LogIn className="h-3 w-3 text-[#d8ff3e]" />
                        Entrada {formatTime(visit.checkedInAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <LogOut className="h-3 w-3 text-orange-300" />
                        {visit.open
                          ? "Aún adentro"
                          : `Salida ${formatTime(visit.checkedOutAt)}`}
                      </span>
                      {duration && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-white/40" />
                          {duration}
                          {visit.open ? " (en curso)" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {visit.open && (
                    <span className="shrink-0 bg-[#d8ff3e] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                      Ahora
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
                  {METHOD_LABELS[visit.method] || visit.method}
                  {" · "}
                  {BY_LABELS[visit.by] || visit.by}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {!loading && visits.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE)}
          className="mt-3 w-full border border-cyan-300/30 bg-cyan-300/10 py-2.5 text-xs font-black uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-300/20"
        >
          Ver más ({visits.length - limit} restantes)
        </button>
      )}
    </div>
  );
}

export function WorkoutHistoryList({ workouts }: { workouts: Workout[] }) {
  const [limit, setLimit] = useState(PAGE);
  const sorted = useMemo(
    () =>
      [...workouts].sort((a, b) => {
        const byDate = (b.completedDate || "").localeCompare(a.completedDate || "");
        if (byDate !== 0) return byDate;
        return (b.completedAt || "").localeCompare(a.completedAt || "");
      }),
    [workouts],
  );
  const shown = sorted.slice(0, limit);
  const totalMinutes = workouts.reduce((sum, w) => sum + (w.minutes || 0), 0);

  return (
    <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-3 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center border-2 border-black/20 bg-[#d8ff3e] text-black">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div>
            <GameLabel tone="lime">Entrenamientos</GameLabel>
            <p className="text-sm font-black uppercase">Historial de entrenos</p>
          </div>
        </div>
        {workouts.length > 0 && (
          <span className="shrink-0 border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#eaff93]">
            {workouts.length} · {totalMinutes} min
          </span>
        )}
      </div>

      {!sorted.length && (
        <p className="py-6 text-center text-sm font-semibold text-white/45">
          Todavía no hay entrenos marcados. Tocá Entrenar, registrá el del día y arranca la
          racha, pura vida.
        </p>
      )}

      {shown.length > 0 && (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {shown.map((workout) => (
            <div
              key={workout.id}
              className="border border-white/10 bg-black/25 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-black uppercase text-white">
                    {workout.trainingName}
                  </p>
                  {workout.planTitle && (
                    <p className="mt-0.5 text-[11px] font-bold text-[#d8ff3e]/80">
                      Plan: {workout.planTitle}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-white/40">
                  {workout.intensity}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-white/50">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#d8ff3e]" />
                  {formatDay(workout.completedDate)}
                </span>
                {workout.completedAt && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(workout.completedAt)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Timer className="h-3 w-3 text-cyan-300" />
                  {workout.minutes > 0 ? `${workout.minutes} min` : "Sin duración"}
                </span>
              </div>
              {!!workout.exercises?.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {workout.exercises.map((exercise) => (
                    <span
                      key={exercise.id}
                      className="border border-cyan-300/25 bg-cyan-300/[.06] px-2 py-1 text-[10px] font-black uppercase text-cyan-100/70"
                    >
                      {exercise.exerciseName}
                      {exercise.sets > 0 && exercise.reps > 0
                        ? ` · ${exercise.sets}×${exercise.reps}`
                        : ""}
                      {exercise.weightKg > 0 ? ` · ${exercise.weightKg} kg` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sorted.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE)}
          className="mt-3 w-full border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 py-2.5 text-xs font-black uppercase tracking-wide text-[#eaff93] transition hover:bg-[#d8ff3e]/20"
        >
          Ver más ({sorted.length - limit} restantes)
        </button>
      )}
    </div>
  );
}
