import type { Db } from "mongodb";
import { businessDate } from "@/lib/xtreme/business-date";
import { classStartAt } from "@/lib/xtreme/class-schedule";
import {
  ensureClassSession,
  type BookingDoc,
} from "@/lib/xtreme/inventory";
import {
  BOOKINGS_COLLECTION,
  MEMBERS_COLLECTION,
  RESERVATIONS_COLLECTION,
  TRAININGS,
  membershipStatus,
  normalizeKey,
  type MemberDoc,
} from "@/lib/xtreme/shared";

type LegacyReservation = {
  bookingId?: string;
  memberName?: string;
  normalizedName?: string;
  trainingId?: string;
  trainingName?: string;
  trainingDate?: string;
  status?: string;
};

export type TrainerClassAttendee = {
  bookingId: string;
  memberKey: string;
  memberName: string;
  photoUrl: string;
  goal: string;
  membershipStatus: "active" | "warning" | "expired";
  bookingStatus: "reserved" | "attended";
};

export type TrainerTodayClass = {
  id: string;
  trainingId: string;
  trainingName: string;
  startAt: string;
  endAt: string;
  coach: string;
  capacity: number;
  status: "scheduled" | "cancelled" | "completed";
  attendees: TrainerClassAttendee[];
};

/** Agenda operativa para Trainer OS. Fusiona reservas 2.0 y el espejo legacy. */
export async function getTrainerClassesForDate(
  db: Db,
  date = businessDate(),
): Promise<TrainerTodayClass[]> {
  const scheduledTrainings = TRAININGS.filter((training) =>
    Boolean(classStartAt(training.id, date)),
  );
  const sessions = await Promise.all(
    scheduledTrainings.map((training) =>
      ensureClassSession(db, {
        trainingId: training.id,
        trainingName: training.name,
        date,
        capacity: training.capacity,
      }),
    ),
  );
  const trainingIds = scheduledTrainings.map((training) => training.id);
  if (!trainingIds.length) return [];

  const [bookings, legacyReservations] = await Promise.all([
    db
      .collection<BookingDoc>(BOOKINGS_COLLECTION)
      .find({
        trainingDate: date,
        trainingId: { $in: trainingIds },
        status: { $in: ["reserved", "attended"] },
      })
      .toArray(),
    db
      .collection<LegacyReservation>(RESERVATIONS_COLLECTION)
      .find({
        trainingDate: date,
        trainingId: { $in: trainingIds },
        status: "reserved",
      })
      .toArray(),
  ]);

  const rosterEntries = new Map<
    string,
    {
      bookingId: string;
      memberKey: string;
      memberName: string;
      trainingId: string;
      status: "reserved" | "attended";
    }
  >();
  for (const booking of bookings) {
    const memberKey = booking.memberKey || normalizeKey(booking.memberName);
    rosterEntries.set(`${booking.trainingId}:${memberKey}`, {
      bookingId: booking.id,
      memberKey,
      memberName: booking.memberName,
      trainingId: booking.trainingId,
      status: booking.status === "attended" ? "attended" : "reserved",
    });
  }
  for (const reservation of legacyReservations) {
    const trainingId = String(reservation.trainingId || "");
    const memberName = String(reservation.memberName || "");
    const memberKey = String(reservation.normalizedName || normalizeKey(memberName));
    const key = `${trainingId}:${memberKey}`;
    if (!trainingId || !memberKey || rosterEntries.has(key)) continue;
    rosterEntries.set(key, {
      bookingId: String(reservation.bookingId || `legacy:${trainingId}:${memberKey}`),
      memberKey,
      memberName,
      trainingId,
      status: "reserved",
    });
  }

  const entries = [...rosterEntries.values()];
  const memberKeys = [...new Set(entries.map((entry) => entry.memberKey))];
  const memberDocs = memberKeys.length
    ? await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find(
          { normalizedName: { $in: memberKeys } },
          {
            projection: {
              memberName: 1,
              normalizedName: 1,
              photoUrl: 1,
              goal: 1,
              membership: 1,
            },
          },
        )
        .toArray()
    : [];
  const membersByKey = new Map(
    memberDocs.map((member) => [
      member.normalizedName || normalizeKey(member.memberName || ""),
      member,
    ]),
  );

  return sessions
    .map((session) => {
      const attendees = entries
        .filter((entry) => entry.trainingId === session.trainingId)
        .map((entry) => {
          const member = membersByKey.get(entry.memberKey);
          return {
            bookingId: entry.bookingId,
            memberKey: entry.memberKey,
            memberName: member?.memberName || entry.memberName,
            photoUrl: member?.photoUrl || "",
            goal: member?.goal || "",
            membershipStatus: membershipStatus(member?.membership).status,
            bookingStatus: entry.status,
          } satisfies TrainerClassAttendee;
        })
        .sort((a, b) => a.memberName.localeCompare(b.memberName, "es"));
      return {
        id: session.id,
        trainingId: session.trainingId,
        trainingName: session.trainingName,
        startAt: new Date(session.startAt).toISOString(),
        endAt: new Date(session.endAt).toISOString(),
        coach: session.coach || "Entrenadora Xtreme",
        capacity: session.capacity,
        status: session.status,
        attendees,
      } satisfies TrainerTodayClass;
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}
