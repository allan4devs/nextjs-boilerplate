import type { Db } from "mongodb";
import {
  BOOKINGS_COLLECTION,
  CHECKINS_COLLECTION,
  GYM_CAPACITY,
  RESERVATIONS_COLLECTION,
} from "./config";
import { todayIso } from "./dates";
import { isCheckinOpen } from "./member-rules";
import type { CheckinDoc } from "./types";

export type OccupancySnapshot = {
  date: string;
  capacity: number;
  currentPeople: number;
  occupancyPct: number;
  level: "Tranquilo" | "Medio" | "Lleno";
  checkinsToday: number;
  uniqueCheckins: number;
  reservationsToday: number;
  updatedAt: string;
  recent: Array<{
    id: string;
    memberName: string;
    accessCode: string;
    membershipStatus: string;
    checkedInAt: Date;
    method: string;
  }>;
};

export async function computeOccupancy(db: Db): Promise<OccupancySnapshot> {
  const date = todayIso();
  const [checkinDocs, bookingsToday, legacyReservationsToday] = await Promise.all([
    db.collection<CheckinDoc>(CHECKINS_COLLECTION).find({ date }).sort({ checkedInAt: -1 }).toArray(),
    // Reservas individuales (una fila por socio/clase), no contador compartido.
    db.collection(BOOKINGS_COLLECTION).countDocuments({
      trainingDate: date,
      status: "reserved",
      memberKey: { $exists: true, $type: "string", $ne: "" },
    }),
    db.collection(RESERVATIONS_COLLECTION).countDocuments({ trainingDate: date, status: "reserved" }),
  ]);
  // Preferir bookings 2.0; legacy solo si aún no hay filas nuevas.
  const reservationsToday = bookingsToday > 0 ? bookingsToday : legacyReservationsToday;

  const latestByMember = new Map<string, CheckinDoc>();
  for (const checkin of checkinDocs) {
    if (!latestByMember.has(checkin.normalizedName)) latestByMember.set(checkin.normalizedName, checkin);
  }
  const activeNow = [...latestByMember.values()].filter((checkin) => isCheckinOpen(checkin)).length;
  const currentPeople = Math.min(GYM_CAPACITY, activeNow);
  const occupancyPct = Math.round((currentPeople / GYM_CAPACITY) * 100);
  const level = occupancyPct >= 78 ? "Lleno" : occupancyPct >= 48 ? "Medio" : "Tranquilo";

  return {
    date,
    capacity: GYM_CAPACITY,
    currentPeople,
    occupancyPct,
    level,
    checkinsToday: checkinDocs.length,
    uniqueCheckins: new Set(checkinDocs.map((checkin) => checkin.normalizedName)).size,
    reservationsToday,
    updatedAt: new Date().toISOString(),
    recent: checkinDocs.slice(0, 12).map((checkin) => ({
      id: checkin.id,
      memberName: checkin.memberName,
      accessCode: checkin.accessCode,
      membershipStatus: checkin.membershipStatus,
      checkedInAt: checkin.checkedInAt,
      method: checkin.method,
    })),
  };
}
