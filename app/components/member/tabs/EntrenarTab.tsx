"use client";

/**
 * Tab Entrenar - hub dinámico: plan, clases, meta y rutinas.
 * Cada bloque se abre con un cuadro grande; las clases se expanden
 * al tocar para reservar / check-in sin saturar la pantalla.
 */

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Loader2,
  LogOut,
  Radio,
  Sparkles,
  Target,
  Video,
} from "lucide-react";
import { classCheckInWindow } from "@/lib/xtreme/class-schedule";
import { GameButton, GameCallout, GameLabel } from "../../GameOS";
import { GOALS, ROUTINES, TRAININGS } from "../constants";
import { isOneDayPlanLabel, membershipAllowsClassBooking } from "../helpers/membership";
import { todayIso } from "../utils";
import type { MemberOs } from "../useMemberOs";
import type { Training } from "../domain/training";
import PanelHub, { type HubPanel } from "../PanelHub";
import PlanTrainingPanel from "../PlanTrainingPanel";

function classCheckInHint(
  trainingId: string,
  date: string,
  isMine: boolean,
  done: boolean,
): { canCheckIn: boolean; canReserve: boolean; label: string; hint: string; ended: boolean } {
  if (done) {
    return {
      canCheckIn: false,
      canReserve: false,
      label: "Hecho",
      hint: "",
      ended: false,
    };
  }
  const window = classCheckInWindow(trainingId, date);
  if (window.status === "not_today" || window.status === "not_a_class") {
    return {
      canCheckIn: false,
      canReserve: false,
      label: "No hoy",
      hint: "Esta clase no se imparte hoy.",
      ended: false,
    };
  }
  if (window.status === "ended") {
    return {
      canCheckIn: false,
      canReserve: false,
      label: "Ya pasó",
      hint: "La clase ya terminó. No se puede hacer check-in.",
      ended: true,
    };
  }
  // Reserva solo antes del inicio (el server cierra al start).
  const canReserve = Date.now() < window.startAt.getTime();
  if (!isMine) {
    return {
      canCheckIn: false,
      canReserve,
      label: "Check-in",
      hint: canReserve
        ? "Reservá la clase primero para poder hacer check-in."
        : "La clase ya inició. Solo quien reservó puede hacer check-in.",
      ended: false,
    };
  }
  if (window.status === "too_early") {
    return {
      canCheckIn: false,
      canReserve: true,
      label: "Pronto",
      hint: "El check-in se abre 30 min antes de la clase.",
      ended: false,
    };
  }
  return {
    canCheckIn: true,
    canReserve,
    label: "Check-in",
    hint: "Confirmá tu asistencia a la clase.",
    ended: false,
  };
}

function TrainingCard({
  training,
  unlocked,
  done,
  reservation,
  reservingTrainingId,
  savingTrainingId,
  date,
  expanded,
  onToggle,
  onReserve,
  onComplete,
  needsAccess = false,
  isOneDayPass = false,
}: {
  training: Training;
  unlocked: boolean;
  done: boolean;
  reservation: { reserved: number; capacity: number; remaining: number; isMine: boolean };
  reservingTrainingId: string;
  savingTrainingId: string;
  date: string;
  expanded: boolean;
  onToggle: () => void;
  onReserve: () => void;
  onComplete: () => void;
  /** Sin plan/pase vigente: Reservar abre checkout en vez de crear cupo. */
  needsAccess?: boolean;
  /** Pase de 1 día (día gratis, day-pass): no permite reservar clases grupales. */
  isOneDayPass?: boolean;
}) {
  const Icon = training.icon;
  const isFull = reservation.remaining <= 0 && !reservation.isMine;
  const fillPct = Math.min(
    100,
    Math.round((reservation.reserved / reservation.capacity) * 100),
  );
  const checkIn = classCheckInHint(training.id, date, reservation.isMine, done);
  // Socios con pase de 1 día no pueden reservar clases grupales (solo planes semanales/mensuales).
  const reserveDisabled =
    !unlocked ||
    Boolean(reservingTrainingId) ||
    (reservation.isMine ? false : isOneDayPass || isFull || !checkIn.canReserve);
  const checkInDisabled =
    !unlocked || Boolean(savingTrainingId) || done || !checkIn.canCheckIn;

  return (
    <div
      className={`overflow-hidden border-[3px] bg-[#0c0c0c] shadow-[4px_4px_0_rgba(0,0,0,.45)] transition ${
        expanded ? "border-[#d8ff3e]/55" : "border-white/20"
      } ${done ? "ring-2 ring-[#d8ff3e]/30" : ""}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-white/[0.03] sm:p-4"
        aria-expanded={expanded}
      >
        <span
          className={`grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br ${training.color} text-black shadow-[2px_2px_0_rgba(0,0,0,.35)] sm:h-16 sm:w-16`}
        >
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black uppercase leading-tight sm:text-lg">
              {training.name}
            </span>
            {done && (
              <span className="border border-[#d8ff3e]/50 bg-[#d8ff3e]/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#eaff93]">
                Hecho
              </span>
            )}
            {reservation.isMine && !done && (
              <span className="border border-orange-300/50 bg-orange-300/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-orange-200">
                Reservado
              </span>
            )}
            {!done && checkIn.ended && (
              <span className="border border-white/20 bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/45">
                Ya pasó
              </span>
            )}
          </span>
          <span className="mt-1 block text-xs font-semibold text-white/50 sm:text-sm">
            {training.time} · {training.minutes} min
          </span>
          <span className="mt-1 block text-[11px] font-bold text-white/35">
            Cupos {reservation.remaining}/{reservation.capacity}
          </span>
          <span className="mt-2 block h-1.5 border border-white/10 bg-black/35">
            <span
              className="block h-full bg-[#d8ff3e] transition-all"
              style={{ width: `${fillPct}%` }}
            />
          </span>
        </span>
        <ChevronRight
          className={`mt-1 h-5 w-5 shrink-0 text-white/35 transition ${
            expanded ? "rotate-90 text-[#d8ff3e]" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t-[3px] border-white/10 p-3 sm:p-4">
          <p className="text-sm text-white/64">
            {training.focus} · {training.intensity} · Coach {training.coach}
          </p>
          {checkIn.hint && !done && (
            <p className="text-xs font-semibold text-white/40">{checkIn.hint}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onReserve}
              disabled={reserveDisabled}
              className={`inline-flex min-h-12 items-center justify-center gap-2 px-3 py-3 text-xs font-black uppercase transition sm:text-sm ${
                reservation.isMine
                  ? "border-[3px] border-[#d8ff3e] bg-[#d8ff3e]/10 text-[#eaff93] hover:bg-[#d8ff3e] hover:text-black"
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
              {reservation.isMine
                ? "Cancelar"
                : isFull
                  ? "Lleno"
                  : isOneDayPass
                    ? "Solo plan"
                    : needsAccess
                      ? "Activar acceso"
                      : "Reservar"}
            </button>
            <button
              type="button"
              onClick={onComplete}
              disabled={checkInDisabled}
              className={`inline-flex min-h-12 items-center justify-center gap-2 px-3 py-3 text-xs font-black uppercase transition sm:text-sm ${
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
              {checkIn.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EntrenarTab({ os }: { os: MemberOs }) {
  const {
    unlocked,
    currentMember,
    goal,
    setGoal,
    saveProfile,
    completedToday,
    reservations,
    reservingTrainingId,
    savingTrainingId,
    completeTraining,
    reserveTraining,
    cancelReservation,
    setOsModal,
    activeVisit,
    isRegisteringCheckout,
    trainedToday,
  } = os;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTrainingId, setOpenTrainingId] = useState<string | null>(null);

  const doneCount = TRAININGS.filter((t) => completedToday.has(t.id)).length;
  const hasPlan = Boolean(currentMember.trainingPlan);
  const activeWorkout = Boolean(currentMember.activePlanWorkout);

  useEffect(() => {
    if (activeWorkout) setActiveId("plan");
  }, [activeWorkout]);
  const today = todayIso();
  const membership = currentMember.membership;
  const isOneDayPass = isOneDayPlanLabel(membership.plan) && membership.daysRemaining >= 0 && membership.status !== "expired";
  const needsAccess = unlocked && !membershipAllowsClassBooking(membership) && !isOneDayPass;

  const clasesContent = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">
          Hoy · {today}
        </p>
        <p className="text-xs font-bold text-white/40">
          {doneCount}/{TRAININGS.length} hechos
        </p>
      </div>

      {needsAccess && (
        <GameCallout tone="orange" icon={CreditCard}>
          <div className="space-y-2">
            <p className="text-sm font-bold leading-snug text-white/85">
              Para reservar clases necesitás un plan semanal o mensual activo.
            </p>
            <p className="text-xs font-semibold text-white/50">
              Podés activar un plan acá y después tocar Reservar. (Entrenos libres no requieren plan.)
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <GameButton
                onClick={() => setOsModal({ kind: "checkout", planId: "week" })}
              >
                Plan semanal
              </GameButton>
              <GameButton
                variant="ghost"
                onClick={() => setOsModal({ kind: "checkout", planId: "month" })}
              >
                Plan mensual
              </GameButton>
            </div>
          </div>
        </GameCallout>
      )}

      {isOneDayPass && unlocked && (
        <GameCallout tone="lime" icon={Dumbbell}>
          <div className="space-y-1.5">
            <p className="text-sm font-bold leading-snug text-white/90">
              {membership.plan} activo · Queda 1 día
            </p>
            <p className="text-xs font-semibold text-white/60">
              Podés ingresar al gimnasio y consultar tus entrenamientos asignados en la pestaña <strong className="text-white/80">Plan coach</strong>. La reserva de clases grupales requiere un plan semanal o mensual.
            </p>
          </div>
        </GameCallout>
      )}

      {!needsAccess && !isOneDayPass && unlocked && (
        <p className="text-xs font-semibold leading-5 text-white/40">
          Tocá una clase → <strong className="text-white/60">Reservar</strong> antes de que
          inicie. Después hacé check-in 30 min antes.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        {TRAININGS.map((training) => {
          const reservation = reservations[training.id] ?? {
            reserved: 0,
            capacity: training.slots,
            remaining: training.slots,
            isMine: false,
          };
          return (
            <TrainingCard
              key={training.id}
              training={training}
              unlocked={unlocked}
              done={completedToday.has(training.id)}
              reservation={reservation}
              reservingTrainingId={reservingTrainingId}
              savingTrainingId={savingTrainingId}
              date={today}
              expanded={openTrainingId === training.id}
              needsAccess={needsAccess}
              isOneDayPass={isOneDayPass}
              onToggle={() =>
                setOpenTrainingId((id) => (id === training.id ? null : training.id))
              }
              onReserve={() =>
                reservation.isMine
                  ? cancelReservation(training)
                  : reserveTraining(training)
              }
              onComplete={() => completeTraining(training)}
            />
          );
        })}
      </div>
    </div>
  );

  const metaContent = (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-white/50">
        Favorito: {currentMember.favoriteTraining || "todavía en blanco"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {GOALS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setGoal(option)}
            disabled={!unlocked}
            className={`flex min-h-12 items-center justify-between border-[3px] px-4 py-3 text-left text-sm font-bold transition ${
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
        className="min-h-12 w-full bg-white px-4 py-3 font-black uppercase text-black transition hover:bg-[#d8ff3e] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Guardar meta
      </button>
    </div>
  );

  const rutinasContent = (
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
      {ROUTINES.map((routine) => (
        <div
          key={routine.name}
          className="border-[3px] border-white/15 bg-black/30 p-3.5 shadow-[3px_3px_0_rgba(0,0,0,.4)]"
        >
          <GameLabel tone="orange">{routine.level}</GameLabel>
          <h3 className="mt-2 text-base font-black uppercase">{routine.name}</h3>
          <ul className="mt-3 space-y-1.5 text-sm font-bold text-white/55">
            {routine.exercises.map((exercise) => (
              <li key={exercise} className="border-l-[3px] border-white/20 pl-2">
                {exercise}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 border-[3px] border-white/15 px-3 py-2 text-xs font-black uppercase text-white/65 transition hover:border-orange-300 hover:text-orange-200"
          >
            <Video className="h-4 w-4" />
            {routine.video}
          </button>
        </div>
      ))}
    </div>
  );

  const panels: HubPanel[] = [
    {
      id: "plan",
      label: "Plan coach",
      hint: activeWorkout ? "En curso" : hasPlan ? "Listo para arrancar" : "Sin plan aún",
      icon: ClipboardList,
      tone: activeWorkout ? "lime" : hasPlan ? "orange" : "white",
      badge: activeWorkout ? "LIVE" : hasPlan ? "OK" : undefined,
      content: <PlanTrainingPanel os={os} />,
    },
    {
      id: "clases",
      label: "Clases hoy",
      hint: `${doneCount} hechas · ${TRAININGS.length} disponibles`,
      icon: Dumbbell,
      tone: "orange",
      badge: doneCount > 0 ? `${doneCount}` : undefined,
      tourId: "tour-clases",
      content: clasesContent,
    },
    {
      id: "meta",
      label: "Mi meta",
      hint: goal || "Elegí tu foco",
      icon: Target,
      tone: "lime",
      content: metaContent,
    },
    {
      id: "rutinas",
      label: "Rutinas",
      hint: `${ROUTINES.length} guiadas`,
      icon: Video,
      tone: "cyan",
      content: rutinasContent,
    },
  ];

  return (
    <div className="xg-tab-in">
      <PanelHub
        panels={panels}
        activeId={activeId}
        onActiveChange={(id) => {
          setActiveId(id);
          if (id !== "clases") setOpenTrainingId(null);
        }}
        title="Entrenar"
        subtitle="Tocá un cuadro grande. El detalle se abre y se cierra sin perder la pantalla."
        header={
          <div className="space-y-2.5">
            {activeWorkout && (
              <button
                type="button"
                onClick={() => setActiveId("plan")}
                className="flex min-h-[3.75rem] w-full items-center gap-3 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-4 py-3 text-left text-black shadow-[5px_5px_0_rgba(216,255,62,.2)] transition hover:bg-white"
              >
                <span className="relative grid h-11 w-11 shrink-0 place-items-center bg-black text-[#d8ff3e]">
                  <Radio className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-orange-400" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[.18em]">Entreno en curso</span>
                  <span className="block truncate text-base font-black uppercase">
                    {currentMember.activePlanWorkout?.trainingName || "Continuar entreno"}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-black uppercase">Abrir →</span>
              </button>
            )}

            {activeVisit && (
              <div className="flex min-h-[3.75rem] items-center gap-3 border-[3px] border-orange-300 bg-gradient-to-r from-orange-300/15 to-transparent px-3 py-2.5 sm:px-4">
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.16em] text-orange-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-orange-300" />
                  Sesión activa
                </span>
                <p className="ml-1 min-w-0 flex-1 truncate text-sm font-black uppercase">
                  {activeVisit.elapsedMinutes} min entrenando
                </p>
                <button
                  type="button"
                  disabled={isRegisteringCheckout}
                  onClick={() => setOsModal({ kind: "gym-session", initialStep: "exit" })}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 bg-orange-300 px-3.5 text-[11px] font-black uppercase text-black transition hover:bg-white disabled:opacity-50"
                >
                  {isRegisteringCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {isRegisteringCheckout ? "..." : "Salida"}
                </button>
              </div>
            )}


            {/* CTA principal — Marcar entreno */}
            <button
              type="button"
              onClick={() => setOsModal({ kind: "gym-session" })}
              className="group relative flex min-h-[4.5rem] w-full items-center gap-4 overflow-hidden border-[3px] border-[#d8ff3e] bg-[#060a01] px-4 text-left transition hover:bg-[#d8ff3e]/5"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-[#d8ff3e]/10 to-transparent transition-transform duration-500 group-hover:translate-x-0"
              />
              <span className="relative grid h-12 w-12 shrink-0 place-items-center bg-[#d8ff3e] text-black transition group-hover:scale-105">
                <Sparkles className="h-6 w-6" />
              </span>
              <div className="relative min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#d8ff3e]">Registrar sesión</p>
                <p className="truncate text-lg font-black uppercase">
                  {trainedToday ? "Hoy ya está · ver racha" : "¿Cuánto entrenaste hoy?"}
                </p>
              </div>
              <span className="relative text-[#d8ff3e] transition group-hover:translate-x-1">
                <ChevronRight className="h-6 w-6" />
              </span>
            </button>

            {/* Acción secundaria */}
            <button
              type="button"
              onClick={() => setActiveId("clases")}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 border-[2px] border-orange-300/30 bg-orange-300/6 px-3 text-xs font-black uppercase text-orange-200/80 transition hover:border-orange-300/60 hover:text-orange-100"
            >
              <Dumbbell className="h-4 w-4" />
              Ver clases de hoy
            </button>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[
              {
                label: "Hoy",
                value: `${doneCount}/${TRAININGS.length}`,
                icon: Check,
                tone: "text-[#d8ff3e]",
              },
              {
                label: "Meta",
                value: goal.split(" ")[0] || "-",
                icon: Sparkles,
                tone: "text-orange-300",
              },
              {
                label: "Plan",
                value: activeWorkout ? "LIVE" : hasPlan ? "Listo" : "-",
                icon: ClipboardList,
                tone: "text-cyan-300",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="border-[3px] border-white/15 bg-[#0c0c0c] p-2.5 text-center shadow-[3px_3px_0_rgba(0,0,0,.4)] sm:p-3"
                >
                  <Icon className={`mx-auto h-5 w-5 ${stat.tone}`} />
                  <p className="mt-1.5 truncate text-sm font-black uppercase sm:text-base">
                    {stat.value}
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-wide text-white/35">
                    {stat.label}
                  </p>
                </div>
              );
            })}
            </div>
          </div>
        }
      />
    </div>
  );
}
