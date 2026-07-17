/**
 * Reglas de check-in a clase grupal:
 * - solo con reserva activa (reserved)
 * - solo dentro de la ventana horaria (inicio - early … fin + grace)
 * Al completar, la reserva pasa a attended.
 */
import type { Db } from "mongodb";
import {
  classCheckInWindow,
  isScheduledClass,
} from "@/lib/xtreme/class-schedule";
import {
  type BookingDoc,
  markAttendance,
  newSessionId,
} from "@/lib/xtreme/inventory";
import {
  ClassCheckInEndedError,
  ClassCheckInNotTodayError,
  ClassCheckInTooEarlyError,
  ClassReservationRequiredError,
} from "@/lib/xtreme/members/errors";
import { BOOKINGS_COLLECTION } from "@/lib/xtreme/shared";

export type ClassCheckInGate =
  | { kind: "skip" }
  | { kind: "ok"; booking: BookingDoc };

/**
 * Valida reserva + horario para clases del catálogo.
 * Plan coach / entrenos sin horario fijo: skip.
 */
export async function assertClassCheckInAllowed(
  db: Db,
  args: {
    memberKey: string;
    trainingId: string;
    date: string;
    now?: Date;
  },
): Promise<ClassCheckInGate> {
  if (!isScheduledClass(args.trainingId)) {
    return { kind: "skip" };
  }

  const now = args.now ?? new Date();
  const window = classCheckInWindow(args.trainingId, args.date, now);

  if (window.status === "not_today" || window.status === "not_a_class") {
    throw new ClassCheckInNotTodayError();
  }
  if (window.status === "too_early") {
    throw new ClassCheckInTooEarlyError();
  }
  if (window.status === "ended") {
    throw new ClassCheckInEndedError();
  }

  const sessionId = newSessionId(args.trainingId, args.date);
  const booking =
    (await db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne({
      sessionId,
      memberKey: args.memberKey,
      status: { $in: ["reserved", "attended"] },
    })) ??
    (await db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne({
      memberKey: args.memberKey,
      trainingId: args.trainingId,
      trainingDate: args.date,
      status: { $in: ["reserved", "attended"] },
    }));

  if (!booking) {
    throw new ClassReservationRequiredError();
  }

  return { kind: "ok", booking };
}

/** Marca la reserva como attended (idempotente si ya lo era). */
export async function markClassBookingAttended(db: Db, booking: BookingDoc) {
  if (booking.status === "attended") return;
  await markAttendance(db, { bookingId: booking.id, status: "attended" });
}
