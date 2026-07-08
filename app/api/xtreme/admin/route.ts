import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";

export const dynamic = "force-dynamic";

const MEMBERS_COLLECTION = "xtreme_gym_members";
const RESERVATIONS_COLLECTION = "xtreme_gym_class_reservations";
const PINS_COLLECTION = "xtreme_gym_pins";
const ADMIN_CODE = process.env.XTREME_ADMIN_CODE || "xtreme-admin";
const GYM_CAPACITY = 85;

const TRAININGS = [
  { id: "fuerza-total", name: "Fuerza Total", capacity: 8 },
  { id: "hiit-quemador", name: "HIIT Quemador", capacity: 12 },
  { id: "glute-lab", name: "Glute Lab", capacity: 10 },
  { id: "xtreme-core", name: "Xtreme Core", capacity: 15 },
];

type WorkoutEntry = { minutes?: number; completedDate?: string };
type Membership = { plan?: string; nextBillingDate?: string; startedAt?: string };
type BodyMetric = { date: string; weightKg: number; waistCm: number };
type MemberDoc = {
  normalizedName?: string;
  memberName?: string;
  goal?: string;
  favoriteTraining?: string;
  workouts?: WorkoutEntry[];
  membership?: Membership;
  bodyMetrics?: BodyMetric[];
  seeded?: boolean;
  createdAt?: Date;
};

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}
function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}
function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function computeStreak(workouts: WorkoutEntry[]) {
  const dates = new Set(workouts.map((w) => w.completedDate).filter(Boolean) as string[]);
  if (!dates.size) return 0;
  const latest = [...dates].sort().at(-1)!;
  let cursor = toUtcDate(latest);
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function membershipStatus(membership?: Membership) {
  const plan = membership?.plan ?? "—";
  const nextBillingDate = membership?.nextBillingDate ?? todayIso();
  const today = toUtcDate(todayIso());
  const daysRemaining = Math.ceil((toUtcDate(nextBillingDate).getTime() - today.getTime()) / 86_400_000);
  const status = daysRemaining < 0 ? "expired" : daysRemaining <= 5 ? "warning" : "active";
  return { plan, nextBillingDate, daysRemaining, status };
}

function hourLoadBoost() {
  const hour = new Date().getHours();
  if ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 20)) return 22;
  if ((hour >= 8 && hour <= 10) || (hour >= 15 && hour <= 16)) return 12;
  return 5;
}

function toAdminMember(doc: MemberDoc) {
  const workouts = doc.workouts ?? [];
  const metrics = [...(doc.bodyMetrics ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const membership = membershipStatus(doc.membership);
  return {
    memberName: doc.memberName ?? "",
    normalizedName: doc.normalizedName ?? "",
    goal: doc.goal ?? "",
    favoriteTraining: doc.favoriteTraining || workouts.at(-1)?.completedDate || "",
    streak: computeStreak(workouts),
    totalWorkouts: workouts.length,
    totalMinutes: workouts.reduce((sum, w) => sum + (w.minutes || 0), 0),
    lastWorkoutDate: workouts.map((w) => w.completedDate).filter(Boolean).sort().at(-1) ?? null,
    plan: membership.plan,
    membershipStatus: membership.status,
    daysRemaining: membership.daysRemaining,
    nextBillingDate: membership.nextBillingDate,
    latestWeight: metrics.at(-1)?.weightKg ?? null,
    seeded: Boolean(doc.seeded),
    createdAt: doc.createdAt ?? null,
  };
}

function unauthorized(req: NextRequest) {
  return (req.headers.get("x-xtreme-admin") ?? "") !== ADMIN_CODE;
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    const date = todayIso();

    const docs = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray();
    const members = docs
      .map(toAdminMember)
      .sort(
        (a, b) =>
          b.streak - a.streak ||
          b.totalWorkouts - a.totalWorkouts ||
          b.totalMinutes - a.totalMinutes ||
          a.memberName.localeCompare(b.memberName),
      );

    const activeToday = members.filter((m) => m.lastWorkoutDate === date).length;
    const totalWorkouts = members.reduce((s, m) => s + m.totalWorkouts, 0);
    const totalMinutes = members.reduce((s, m) => s + m.totalMinutes, 0);
    const avgStreak = members.length
      ? Math.round((members.reduce((s, m) => s + m.streak, 0) / members.length) * 10) / 10
      : 0;

    const reservationDocs = await db
      .collection<{ trainingId: string }>(RESERVATIONS_COLLECTION)
      .find({ trainingDate: date, status: "reserved" })
      .toArray();

    const classes = TRAININGS.map((t) => ({
      trainingId: t.id,
      trainingName: t.name,
      capacity: t.capacity,
      reserved: reservationDocs.filter((r) => r.trainingId === t.id).length,
    }));

    const reservationsToday = reservationDocs.length;
    const checkinsToday = members.reduce(
      (sum, m) => sum + (m.lastWorkoutDate === date ? 1 : 0),
      0,
    );
    const currentPeople = Math.min(
      GYM_CAPACITY,
      checkinsToday + Math.ceil(reservationsToday * 0.35) + hourLoadBoost(),
    );
    const occupancyPct = Math.round((currentPeople / GYM_CAPACITY) * 100);
    const level = occupancyPct >= 78 ? "Lleno" : occupancyPct >= 48 ? "Medio" : "Tranquilo";

    return NextResponse.json({
      members,
      totals: {
        memberCount: members.length,
        seededCount: members.filter((m) => m.seeded).length,
        activeToday,
        totalWorkouts,
        totalMinutes,
        avgStreak,
      },
      today: {
        date,
        capacity: GYM_CAPACITY,
        currentPeople,
        occupancyPct,
        level,
        checkinsToday,
        reservationsToday,
        classes,
      },
    });
  } catch (err) {
    console.error("XTREME ADMIN GET", err);
    return NextResponse.json({ error: "No se pudo cargar el panel." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { memberName?: string };
    const memberName = normalizeName(body.memberName);
    if (!memberName) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }

    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    await Promise.all([
      db.collection(MEMBERS_COLLECTION).deleteOne({ normalizedName }),
      db.collection(PINS_COLLECTION).deleteOne({ normalizedName }),
      db.collection(RESERVATIONS_COLLECTION).deleteMany({ normalizedName }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("XTREME ADMIN DELETE", err);
    return NextResponse.json({ error: "No se pudo eliminar el socio." }, { status: 500 });
  }
}
