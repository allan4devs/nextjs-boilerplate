import { NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";

export const dynamic = "force-dynamic";

const MEMBERS_COLLECTION = "xtreme_gym_members";
const RESERVATIONS_COLLECTION = "xtreme_gym_class_reservations";
const GYM_CAPACITY = 85;

type MemberDoc = {
  workouts?: Array<{ completedDate?: string }>;
};

type ReservationDoc = {
  trainingDate: string;
  status: "reserved" | "cancelled";
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function hourLoadBoost() {
  const hour = new Date().getHours();
  if ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 20)) return 22;
  if ((hour >= 8 && hour <= 10) || (hour >= 15 && hour <= 16)) return 12;
  return 5;
}

export async function GET() {
  try {
    const db = await getDb();
    const date = todayIso();
    const members = await db
      .collection<MemberDoc>(MEMBERS_COLLECTION)
      .find({}, { projection: { workouts: 1 } })
      .toArray();

    const checkinsToday = members.reduce(
      (sum, member) => sum + (member.workouts ?? []).filter((workout) => workout.completedDate === date).length,
      0,
    );
    const reservationsToday = await db
      .collection<ReservationDoc>(RESERVATIONS_COLLECTION)
      .countDocuments({ trainingDate: date, status: "reserved" });

    const currentPeople = Math.min(GYM_CAPACITY, checkinsToday + Math.ceil(reservationsToday * 0.35) + hourLoadBoost());
    const occupancyPct = Math.round((currentPeople / GYM_CAPACITY) * 100);
    const level = occupancyPct >= 78 ? "Lleno" : occupancyPct >= 48 ? "Medio" : "Tranquilo";

    return NextResponse.json({
      capacity: GYM_CAPACITY,
      currentPeople,
      occupancyPct,
      level,
      checkinsToday,
      reservationsToday,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("XTREME STATUS GET", err);
    return NextResponse.json({ error: "No se pudo cargar la ocupacion." }, { status: 500 });
  }
}
