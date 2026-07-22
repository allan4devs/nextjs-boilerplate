"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  UserRound,
  UserX,
  Users,
  Power,
} from "lucide-react";
import { GameLabel } from "@/app/components/GameOS";
import type { TrainerOs } from "../hooks/useTrainerOs";
import type { TrainerTodayClass } from "../types";

function getCostaRicaIsoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(d);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: "America/Costa_Rica",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function dateLabel(value: string) {
  if (!value) return "Hoy";
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: "America/Costa_Rica",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00-06:00`));
}

function classPhase(classItem: TrainerTodayClass, now: number) {
  if (classItem.status === "cancelled") {
    return { label: "Deshabilitada", tone: "border-red-400/45 bg-red-500/10 text-red-200" };
  }
  if (classItem.status === "completed" || now >= new Date(classItem.endAt).getTime()) {
    return { label: "Finalizada", tone: "border-white/15 bg-white/[.04] text-white/45" };
  }
  if (now >= new Date(classItem.startAt).getTime()) {
    return { label: "En curso", tone: "border-[#d8ff3e] bg-[#d8ff3e] text-black" };
  }
  return { label: "Habilitada", tone: "border-cyan-300/45 bg-cyan-300/10 text-cyan-200" };
}

export function TrainerTodayClasses({ os }: { os: TrainerOs }) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const todayIso = useMemo(() => getCostaRicaIsoDate(0), []);
  const tomorrowIso = useMemo(() => getCostaRicaIsoDate(1), []);
  const selectedDate = os.agendaDate || todayIso;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (os.todayClasses.some((classItem) => classItem.id === selectedClassId)) return;
    const liveOrNext =
      os.todayClasses.find(
        (classItem) =>
          classItem.status === "scheduled" &&
          new Date(classItem.endAt).getTime() > Date.now(),
      ) ?? os.todayClasses[0];
    setSelectedClassId(liveOrNext?.id ?? "");
  }, [os.todayClasses, selectedClassId]);

  const selected =
    os.todayClasses.find((classItem) => classItem.id === selectedClassId) ??
    os.todayClasses[0] ??
    null;
  const totalAttendees = useMemo(
    () => os.todayClasses.reduce((sum, classItem) => sum + classItem.attendees.length, 0),
    [os.todayClasses],
  );

  return (
    <section className="mb-4 overflow-hidden border-[3px] border-cyan-300/35 bg-[#0c0c0c] shadow-[5px_5px_0_rgba(34,211,238,.1)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-cyan-300/20 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center bg-cyan-300 text-black">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <GameLabel tone="cyan">Agenda operativa</GameLabel>
            <h2 className="mt-1 text-xl font-black uppercase">Gestión de Clases</h2>
            <p className="mt-0.5 text-xs font-bold capitalize text-white/40">
              {dateLabel(os.agendaDate)}
            </p>
          </div>
        </div>

        {/* Date Selector: Hoy vs Mañana */}
        <div className="flex items-center gap-2">
          <div className="flex border-2 border-white/15 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => os.changeAgendaDate(todayIso)}
              className={`px-3 py-1.5 text-xs font-black uppercase transition ${
                selectedDate === todayIso
                  ? "bg-cyan-300 text-black shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => os.changeAgendaDate(tomorrowIso)}
              className={`px-3 py-1.5 text-xs font-black uppercase transition ${
                selectedDate === tomorrowIso
                  ? "bg-cyan-300 text-black shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Mañana
            </button>
          </div>

          <div className="flex gap-2">
            <span className="border-2 border-white/10 bg-black/30 px-3 py-2 text-center">
              <strong className="block text-xl font-black text-cyan-300">{os.todayClasses.length}</strong>
              <small className="text-[8px] font-black uppercase tracking-[.14em] text-white/35">clases</small>
            </span>
            <span className="border-2 border-white/10 bg-black/30 px-3 py-2 text-center">
              <strong className="block text-xl font-black text-[#d8ff3e]">{totalAttendees}</strong>
              <small className="text-[8px] font-black uppercase tracking-[.14em] text-white/35">inscritos</small>
            </span>
          </div>
        </div>
      </header>

      {!os.todayClasses.length ? (
        <div className="p-8 text-center">
          <Dumbbell className="mx-auto h-9 w-9 text-white/20" />
          <p className="mt-3 font-black uppercase text-white/50">No hay clases registradas para este día</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
          <nav className="border-b-[3px] border-white/10 p-2 lg:border-b-0 lg:border-r-[3px]">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block lg:space-y-2">
              {os.todayClasses.map((classItem) => {
                const active = selected?.id === classItem.id;
                const phase = classPhase(classItem, now);
                return (
                  <button
                    key={classItem.id}
                    type="button"
                    onClick={() => setSelectedClassId(classItem.id)}
                    className={`min-w-[230px] border-[3px] p-3 text-left transition lg:w-full ${
                      active
                        ? "border-cyan-300 bg-cyan-300 text-black"
                        : "border-white/10 bg-black/20 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-[.15em] ${active ? "text-black/55" : "text-cyan-300"}`}>
                          {timeLabel(classItem.startAt)}
                        </p>
                        <p className="mt-1 font-black uppercase">{classItem.trainingName}</p>
                      </div>
                      <span className={`shrink-0 border px-1.5 py-1 text-[8px] font-black uppercase ${active ? "border-black/20 bg-black/10" : phase.tone}`}>
                        {phase.label}
                      </span>
                    </div>
                    <p className={`mt-3 flex items-center gap-1.5 text-[10px] font-bold ${active ? "text-black/55" : "text-white/35"}`}>
                      <Users className="h-3.5 w-3.5" />
                      {classItem.attendees.length}/{classItem.capacity} personas
                    </p>
                  </button>
                );
              })}
            </div>
          </nav>

          {selected && (
            <div className="min-w-0 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-white/10 pb-3">
                <div>
                  <GameLabel tone="lime">Control de clase</GameLabel>
                  <h3 className="mt-1 text-xl font-black uppercase sm:text-2xl flex items-center gap-2">
                    {selected.trainingName}
                    <span className={`text-xs px-2 py-0.5 border font-bold ${
                      selected.status === "scheduled"
                        ? "border-[#d8ff3e] text-[#d8ff3e] bg-[#d8ff3e]/10"
                        : "border-red-400 text-red-300 bg-red-500/10"
                    }`}>
                      {selected.status === "scheduled" ? "Habilitada para socios" : "Deshabilitada / Cancelada"}
                    </span>
                  </h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-white/40">
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {timeLabel(selected.startAt)}-{timeLabel(selected.endAt)}</span>
                    <span>{selected.coach}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Enable / Disable toggle button */}
                  <button
                    type="button"
                    onClick={() => os.toggleClass(selected.trainingId, selected.status === "scheduled" ? "cancelled" : "scheduled")}
                    className={`inline-flex items-center gap-2 border-[3px] px-3.5 py-2 text-xs font-black uppercase transition ${
                      selected.status === "scheduled"
                        ? "border-red-400 bg-red-500/15 text-red-200 hover:bg-red-500/30"
                        : "border-[#d8ff3e] bg-[#d8ff3e] text-black hover:bg-[#c4eb2d]"
                    }`}
                  >
                    <Power className="h-4 w-4" />
                    {selected.status === "scheduled" ? "Deshabilitar clase" : "Habilitar para socios"}
                  </button>

                  <span className="border-[3px] border-[#d8ff3e]/35 bg-[#d8ff3e]/10 px-3 py-2 text-sm font-black text-[#eaff93]">
                    {selected.attendees.length}/{selected.capacity} cupos
                  </span>
                </div>
              </div>

              {selected.attendees.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {selected.attendees.map((attendee, index) => (
                    <div
                      key={attendee.bookingId}
                      className="group flex flex-col justify-between border-[3px] border-white/10 bg-black/25 p-3 transition hover:border-cyan-300/60"
                    >
                      <div
                        onClick={() => os.chooseMember(attendee.memberKey)}
                        className="cursor-pointer flex items-center gap-3"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border-2 border-white/10 bg-white/[.04]">
                          {attendee.photoUrl ? (
                            <img src={attendee.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <UserRound className="h-5 w-5 text-white/35" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black uppercase">
                            {index + 1}. {attendee.memberName}
                          </span>
                          <span className="mt-1 block truncate text-[10px] font-bold text-white/35">
                            {attendee.goal || "Sin meta registrada"}
                          </span>
                          <span className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase ${
                            attendee.membershipStatus === "expired"
                              ? "bg-red-400 text-black"
                              : attendee.membershipStatus === "warning"
                                ? "bg-orange-300 text-black"
                                : "bg-[#d8ff3e] text-black"
                          }`}>
                            {attendee.bookingStatus === "attended" && <CheckCircle2 className="h-3 w-3" />}
                            {attendee.bookingStatus === "attended" ? "Presente" : attendee.membershipStatus}
                          </span>
                        </span>
                      </div>

                      {/* Expel / Ban from class button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          os.expelAttendee(attendee.bookingId);
                        }}
                        className="mt-3 flex items-center justify-center gap-1.5 border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[10px] font-black uppercase text-red-300 transition hover:bg-red-500/30 hover:border-red-400"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Expulsar de la clase
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 border-[3px] border-dashed border-white/15 p-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-white/20" />
                  <p className="mt-2 font-black uppercase text-white/45">Todavía no hay inscritos</p>
                  <p className="mt-1 text-xs font-bold text-white/30">
                    {selected.status === "scheduled"
                      ? "Los socios se podrán inscribir desde el Member OS."
                      : "La clase está deshabilitada. Habilitala arriba para que los socios reserven."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
