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
type PlanItem = {
  id: string;
  day: string;
  focus: string;
  exercises: string;
  targetMinutes: number;
  done: boolean;
  doneDate: string | null;
};
type TrainingPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
  createdAt?: Date;
  updatedAt?: Date;
};
type MemberDoc = {
  normalizedName?: string;
  memberName?: string;
  goal?: string;
  favoriteTraining?: string;
  workouts?: WorkoutEntry[];
  membership?: Membership;
  bodyMetrics?: BodyMetric[];
  trainingPlan?: TrainingPlan;
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

function toAdminPlan(plan?: TrainingPlan) {
  if (!plan) return null;
  const items = plan.items ?? [];
  const doneItems = items.filter((i) => i.done).length;
  const totalItems = items.length;
  return {
    title: plan.title ?? "",
    objective: plan.objective ?? "",
    coachNote: plan.coachNote ?? "",
    startDate: plan.startDate ?? "",
    endDate: plan.endDate ?? "",
    weeklySessions: plan.weeklySessions ?? 0,
    items,
    doneItems,
    totalItems,
    progressPct: totalItems ? Math.round((doneItems / totalItems) * 100) : 0,
    updatedAt: plan.updatedAt ?? null,
  };
}

function toAdminMember(doc: MemberDoc) {
  const workouts = doc.workouts ?? [];
  const metrics = [...(doc.bodyMetrics ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const membership = membershipStatus(doc.membership);
  return {
    trainingPlan: toAdminPlan(doc.trainingPlan),
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

function isoDateOrEmpty(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function sanitizePlan(input: unknown): TrainingPlan {
  const raw = (input ?? {}) as Record<string, unknown>;
  const now = new Date();
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items: PlanItem[] = rawItems.slice(0, 30).map((entry, index) => {
    const it = (entry ?? {}) as Record<string, unknown>;
    return {
      id: String(it.id ?? "").trim() || `plan-${now.getTime()}-${index}`,
      day: String(it.day ?? "").trim().slice(0, 40),
      focus: String(it.focus ?? "").trim().slice(0, 80),
      exercises: String(it.exercises ?? "").trim().slice(0, 500),
      targetMinutes: Math.max(0, Math.min(240, Number(it.targetMinutes) || 0)),
      done: Boolean(it.done),
      doneDate: isoDateOrEmpty(it.doneDate) || null,
    };
  });
  return {
    title: String(raw.title ?? "").trim().slice(0, 80),
    objective: String(raw.objective ?? "").trim().slice(0, 160),
    coachNote: String(raw.coachNote ?? "").trim().slice(0, 500),
    startDate: isoDateOrEmpty(raw.startDate),
    endDate: isoDateOrEmpty(raw.endDate),
    weeklySessions: Math.max(0, Math.min(14, Number(raw.weeklySessions) || 0)),
    items,
    updatedAt: now,
  };
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

// Crear o reemplazar el plan de entrenamiento personalizado de un socio.
export async function POST(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { memberName?: string; plan?: unknown };
    const memberName = normalizeName(body.memberName);
    if (!memberName) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }

    const plan = sanitizePlan(body.plan);
    if (!plan.title) {
      return NextResponse.json({ error: "El plan necesita un titulo." }, { status: 400 });
    }

    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    const now = new Date();
    const result = await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
      { normalizedName },
      {
        $set: {
          normalizedName,
          memberName,
          trainingPlan: { ...plan, createdAt: now },
          updatedAt: now,
        },
        $setOnInsert: { workouts: [], bodyMetrics: [], createdAt: now },
      },
      { upsert: true },
    );

    if (!result.matchedCount && !result.upsertedCount) {
      return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("XTREME ADMIN POST", err);
    return NextResponse.json({ error: "No se pudo guardar el plan." }, { status: 500 });
  }
}

// Marcar/desmarcar una sesion del plan (monitoreo de avance).
export async function PATCH(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      memberName?: string;
      itemId?: string;
      done?: boolean;
    };
    const memberName = normalizeName(body.memberName);
    const itemId = String(body.itemId ?? "").trim();
    if (!memberName || !itemId) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }

    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    const done = Boolean(body.done);
    const result = await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
      { normalizedName },
      {
        $set: {
          "trainingPlan.items.$[el].done": done,
          "trainingPlan.items.$[el].doneDate": done ? todayIso() : null,
          "trainingPlan.updatedAt": new Date(),
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "el.id": itemId }] },
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Sesion no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("XTREME ADMIN PATCH", err);
    return NextResponse.json({ error: "No se pudo actualizar el avance." }, { status: 500 });
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
