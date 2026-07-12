"use client";

/**
 * Tab Entrenar — plan del coach, perfil rapido de meta,
 * clases del dia (reserva + check-in) y rutinas guiadas.
 */

import {
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Loader2,
  Sparkles,
  Video,
} from "lucide-react";
import { GameLabel, GamePanel } from "../../GameOS";
import { GOALS, ROUTINES, TRAININGS } from "../constants";
import { todayIso } from "../utils";
import type { MemberOs } from "../useMemberOs";

export default function EntrenarTab({ os }: { os: MemberOs }) {
  const {
    unlocked,
    currentMember,
    goal,
    setGoal,
    saveProfile,
    togglePlanItem,
    completedToday,
    reservations,
    reservingTrainingId,
    savingTrainingId,
    completeTraining,
    reserveTraining,
    cancelReservation,
  } = os;

  return (
    <div className="xg-tab-in space-y-3 sm:space-y-4">
      {currentMember.trainingPlan ? (
        <div className="border-[3px] border-[#d8ff3e]/55 bg-[#d8ff3e]/[0.07] p-3 shadow-[4px_4px_0_rgba(216,255,62,0.2)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#d8ff3e] text-black">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Plan de tu coach</p>
                <h2 className="text-xl font-black uppercase leading-tight">{currentMember.trainingPlan.title}</h2>
              </div>
            </div>
            <span className="shrink-0 text-sm font-black text-[#eaff93]">
              {currentMember.trainingPlan.doneItems}/{currentMember.trainingPlan.totalItems} · {currentMember.trainingPlan.progressPct}%
            </span>
          </div>

          {currentMember.trainingPlan.objective && (
            <p className="mt-3 text-sm font-semibold text-white/60">
              Objetivo: {currentMember.trainingPlan.objective}
            </p>
          )}

          <div className="mt-4 h-2.5 border border-white/10 bg-black/45">
            <div className="h-full bg-[#d8ff3e] transition-all" style={{ width: `${currentMember.trainingPlan.progressPct}%` }} />
          </div>

          {currentMember.trainingPlan.coachNote && (
            <p className="mt-4 border-l-2 border-[#d8ff3e]/40 pl-3 text-sm font-semibold italic text-white/55">
              {currentMember.trainingPlan.coachNote}
            </p>
          )}

          <div className="mt-5 grid gap-3">
            {currentMember.trainingPlan.items.map((item, index) => (
              <div
                key={item.id}
                className={`flex gap-3 border p-3 ${item.done ? "border-[#d8ff3e]/40 bg-[#d8ff3e]/[0.08]" : "border-white/10 bg-black/20"}`}
              >
                <button
                  type="button"
                  onClick={() => void togglePlanItem(item)}
                  disabled={!unlocked}
                  aria-label={item.done ? "Marcar pendiente" : "Marcar hecha"}
                  className={`grid h-8 w-8 shrink-0 place-items-center border transition ${
                    item.done
                      ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                      : "border-white/25 text-white/40 hover:border-[#d8ff3e] hover:text-[#eaff93]"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-black uppercase ${item.done ? "text-white/60 line-through" : "text-white"}`}>
                      {item.day || `Sesion ${index + 1}`}
                    </p>
                    {item.focus && (
                      <span className="bg-white/10 px-2 py-0.5 text-[11px] font-black uppercase text-white/60">
                        {item.focus}
                      </span>
                    )}
                    {item.targetMinutes > 0 && (
                      <span className="text-[11px] font-bold uppercase text-white/40">{item.targetMinutes} min</span>
                    )}
                  </div>
                  {item.exercises && (
                    <p className="mt-1 text-sm font-semibold text-white/55">{item.exercises}</p>
                  )}
                  {item.done && item.doneDate && (
                    <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-[#eaff93]">
                      Hecho · {item.doneDate}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {!currentMember.trainingPlan.items.length && (
              <p className="text-sm font-semibold text-white/45">Tu coach aun no agrego sesiones al plan.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-white/45" />
            <h2 className="text-lg font-black uppercase">Plan personalizado</h2>
          </div>
          <p className="mt-3 text-sm font-semibold text-white/45">
            Tu coach aun no te asigno un plan. Pedilo en recepcion y aparece aqui para seguirlo dia a dia.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div className="border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#d8ff3e]" />
            <h2 className="text-lg font-black uppercase">Perfil Xtreme</h2>
          </div>
          <label className="mt-5 block text-xs font-black uppercase tracking-[0.16em] text-white/45">
            Meta actual
          </label>
          <div className="mt-3 grid gap-2">
            {GOALS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGoal(option)}
                disabled={!unlocked}
                className={`flex items-center justify-between border px-4 py-3 text-left font-bold transition ${
                  goal === option
                    ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                    : "border-white/10 bg-black/20 text-white/70 hover:border-white/30"
                } disabled:opacity-50`}
              >
                {option}
                {goal === option && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={!unlocked}
            className="mt-5 w-full bg-white px-4 py-3 font-black uppercase text-black transition hover:bg-[#d8ff3e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar perfil
          </button>
          <p className="mt-4 text-sm font-semibold text-white/45">
            Favorito: {currentMember.favoriteTraining || "todavia en blanco"}
          </p>
        </div>

        <div className="border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Hoy disponible</p>
              <h2 className="mt-1 text-2xl font-black uppercase">Entrenamientos</h2>
            </div>
            <p className="text-sm font-semibold text-white/45">{todayIso()}</p>
          </div>

          <div className="mt-5 grid gap-3">
            {TRAININGS.map((training) => {
              const Icon = training.icon;
              const done = completedToday.has(training.id);
              const reservation = reservations[training.id] ?? {
                reserved: 0,
                capacity: training.slots,
                remaining: training.slots,
                isMine: false,
              };
              const isFull = reservation.remaining <= 0 && !reservation.isMine;
              return (
                <div key={training.id} className="grid gap-3 border-[3px] border-white/20 bg-[#0c0c0c] p-3 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:gap-4 sm:p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="flex gap-4">
                    <span className={`grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br ${training.color} text-black`}>
                      <Icon className="h-7 w-7" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black uppercase">{training.name}</h3>
                        <span className="bg-white/10 px-2 py-1 text-[11px] font-black uppercase text-white/55">
                          {training.intensity}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-white/50">
                        {training.time} - {training.minutes} min - {training.coach}
                      </p>
                      <p className="mt-2 text-sm text-white/64">
                        {training.focus} - Cupos: {reservation.remaining}/{reservation.capacity}
                      </p>
                      <div className="mt-3 h-2 border border-white/10 bg-black/35">
                        <div
                          className="h-full bg-[#d8ff3e] transition-all"
                          style={{ width: `${Math.min(100, Math.round((reservation.reserved / reservation.capacity) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 md:min-w-[310px]">
                    <button
                      type="button"
                      onClick={() => reservation.isMine ? cancelReservation(training) : reserveTraining(training)}
                      disabled={!unlocked || Boolean(reservingTrainingId) || isFull}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-black uppercase transition ${
                        reservation.isMine
                          ? "border border-[#d8ff3e] bg-[#d8ff3e]/10 text-[#eaff93] hover:bg-[#d8ff3e] hover:text-black"
                          : "bg-orange-300 text-black hover:bg-white"
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      {reservingTrainingId === training.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : reservation.isMine ? (
                        <CalendarClock className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {reservation.isMine ? "Cancelar" : isFull ? "Lleno" : "Reservar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => completeTraining(training)}
                      disabled={!unlocked || Boolean(savingTrainingId) || done}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-black uppercase transition ${
                        done
                          ? "bg-[#d8ff3e] text-black"
                          : "bg-white text-black hover:bg-[#d8ff3e]"
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      {savingTrainingId === training.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : done ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Dumbbell className="h-4 w-4" />
                      )}
                      {done ? "Hecho" : "Check-in"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <GamePanel title="Rutinas guiadas" icon={Video} tone="orange">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 sm:gap-3">
          {ROUTINES.map((routine) => (
            <div
              key={routine.name}
              className="border-[3px] border-white/15 bg-black/30 p-3 shadow-[3px_3px_0_rgba(0,0,0,.4)]"
            >
              <GameLabel tone="orange">{routine.level}</GameLabel>
              <h3 className="mt-2 font-black uppercase">{routine.name}</h3>
              <ul className="mt-3 space-y-1.5 text-sm font-bold text-white/55">
                {routine.exercises.map((exercise) => (
                  <li key={exercise} className="border-l-[3px] border-white/20 pl-2">
                    {exercise}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-3 inline-flex min-h-10 items-center gap-2 border-[3px] border-white/15 px-3 py-2 text-xs font-black uppercase text-white/65 transition hover:border-orange-300 hover:text-orange-200"
              >
                <Video className="h-4 w-4" />
                {routine.video}
              </button>
            </div>
          ))}
        </div>
      </GamePanel>
    </div>
  );
}
