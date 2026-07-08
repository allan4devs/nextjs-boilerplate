import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";

export const dynamic = "force-dynamic";

const MEMBERS_COLLECTION = "xtreme_gym_members";

type WorkoutEntry = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: Date;
};

type Membership = {
  plan: string;
  status: "active" | "warning" | "expired";
  nextBillingDate: string;
  startedAt: string;
};

type BodyMetric = {
  id: string;
  date: string;
  weightKg: number;
  waistCm: number;
  note: string;
  createdAt: Date;
};

type XtremeMemberDoc = {
  normalizedName: string;
  memberName: string;
  goal: string;
  favoriteTraining: string;
  workouts: WorkoutEntry[];
  membership?: Membership;
  bodyMetrics?: BodyMetric[];
  createdAt: Date;
  updatedAt: Date;
};

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}

function isoDate(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function computeStreak(workouts: WorkoutEntry[]) {
  const dates = new Set(workouts.map((workout) => workout.completedDate).filter(Boolean));
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

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function defaultMembership() {
  const now = new Date();
  return {
    plan: "Xtreme Mensual",
    status: "active" as const,
    startedAt: now.toISOString().slice(0, 10),
    nextBillingDate: addMonths(now, 1).toISOString().slice(0, 10),
  };
}

function membershipWithStatus(membership?: Membership) {
  const current = membership ?? defaultMembership();
  const today = toUtcDate(new Date().toISOString().slice(0, 10));
  const nextBilling = toUtcDate(current.nextBillingDate);
  const daysRemaining = Math.ceil((nextBilling.getTime() - today.getTime()) / 86_400_000);
  const status: Membership["status"] =
    daysRemaining < 0 ? "expired" : daysRemaining <= 5 ? "warning" : "active";

  return {
    ...current,
    status,
    daysRemaining,
  };
}

function publicMember(doc: XtremeMemberDoc | null) {
  const workouts = doc?.workouts ?? [];
  const bodyMetrics = [...(doc?.bodyMetrics ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const totalMinutes = workouts.reduce((sum, workout) => sum + (workout.minutes || 0), 0);
  const favoriteTraining = doc?.favoriteTraining || workouts.at(-1)?.trainingName || "";

  return {
    memberName: doc?.memberName ?? "",
    normalizedName: doc?.normalizedName ?? "",
    goal: doc?.goal ?? "",
    favoriteTraining,
    workouts,
    streak: computeStreak(workouts),
    totalWorkouts: workouts.length,
    totalMinutes,
    lastWorkoutDate: workouts.at(-1)?.completedDate ?? null,
    membership: membershipWithStatus(doc?.membership),
    bodyMetrics,
    latestBodyMetric: bodyMetrics.at(-1) ?? null,
  };
}

async function leaderboard() {
  const db = await getDb();
  const docs = await db
    .collection<XtremeMemberDoc>(MEMBERS_COLLECTION)
    .find({}, { projection: { memberName: 1, normalizedName: 1, workouts: 1, favoriteTraining: 1, goal: 1 } })
    .toArray();

  return docs
    .map(publicMember)
    .sort(
      (a, b) =>
        b.streak - a.streak ||
        b.totalWorkouts - a.totalWorkouts ||
        b.totalMinutes - a.totalMinutes ||
        a.memberName.localeCompare(b.memberName),
    )
    .slice(0, 12);
}

export async function GET(req: NextRequest) {
  const memberName = normalizeName(req.nextUrl.searchParams.get("memberName"));
  if (!memberName) {
    return NextResponse.json({ member: null, leaderboard: await leaderboard() });
  }

  try {
    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });

    return NextResponse.json({
      member: publicMember(doc),
      leaderboard: await leaderboard(),
    });
  } catch (err) {
    console.error("XTREME USER GET", err);
    return NextResponse.json({ error: "No se pudo cargar Xtreme Gym." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const memberName = normalizeName(body.memberName);
    const goal = String(body.goal ?? "").trim().slice(0, 80);
    const favoriteTraining = String(body.favoriteTraining ?? "").trim().slice(0, 80);
    const plan = String(body.plan ?? "Xtreme Mensual").trim().slice(0, 80);
    const nextBillingDate = isoDate(body.nextBillingDate);

    if (!memberName) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }

    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    const now = new Date();
    await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
      { normalizedName },
      {
        $set: {
          normalizedName,
          memberName,
          goal,
          favoriteTraining,
          membership: {
            plan,
            nextBillingDate,
            startedAt: new Date().toISOString().slice(0, 10),
            status: "active",
          },
          updatedAt: now,
        },
        $setOnInsert: {
          workouts: [],
          bodyMetrics: [],
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
    return NextResponse.json({ member: publicMember(doc), leaderboard: await leaderboard() });
  } catch (err) {
    console.error("XTREME USER POST", err);
    return NextResponse.json({ error: "No se pudo guardar el usuario." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const memberName = normalizeName(body.memberName);
    const action = String(body.action ?? "workout");
    const trainingId = String(body.trainingId ?? "").trim();
    const trainingName = String(body.trainingName ?? "").trim();
    const intensity = String(body.intensity ?? "").trim();
    const minutes = Math.max(1, Math.min(240, Number(body.minutes) || 45));
    const completedDate = isoDate(body.completedDate);

    if (action === "bodyMetric") {
      const weightKg = Math.max(1, Math.min(400, Number(body.weightKg) || 0));
      const waistCm = Math.max(1, Math.min(300, Number(body.waistCm) || 0));
      const note = String(body.note ?? "").trim().slice(0, 120);

      if (!memberName || !weightKg || !waistCm) {
        return NextResponse.json({ error: "Faltan medidas." }, { status: 400 });
      }

      const db = await getDb();
      const normalizedName = normalizeKey(memberName);
      const now = new Date();
      const metric: BodyMetric = {
        id: `metric-${completedDate}-${now.getTime()}`,
        date: completedDate,
        weightKg,
        waistCm,
        note,
        createdAt: now,
      };

      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $set: {
            normalizedName,
            memberName,
            updatedAt: now,
          },
          $setOnInsert: {
            goal: "",
            favoriteTraining: "",
            workouts: [],
            membership: defaultMembership(),
            createdAt: now,
          },
          $push: { bodyMetrics: metric },
        },
        { upsert: true },
      );

      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: publicMember(doc), leaderboard: await leaderboard() });
    }

    if (!memberName || !trainingId || !trainingName) {
      return NextResponse.json({ error: "Faltan datos del entreno." }, { status: 400 });
    }

    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    const now = new Date();
    const entry: WorkoutEntry = {
      id: `${trainingId}-${completedDate}-${now.getTime()}`,
      trainingId,
      trainingName,
      intensity,
      minutes,
      completedDate,
      completedAt: now,
    };

    await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
      { normalizedName },
      {
        $set: {
          normalizedName,
          memberName,
          favoriteTraining: trainingName,
          updatedAt: now,
        },
        $setOnInsert: {
          goal: "",
          membership: defaultMembership(),
          bodyMetrics: [],
          createdAt: now,
        },
        $push: { workouts: entry },
      },
      { upsert: true },
    );

    const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
    return NextResponse.json({ member: publicMember(doc), leaderboard: await leaderboard() });
  } catch (err) {
    console.error("XTREME USER PATCH", err);
    return NextResponse.json({ error: "No se pudo registrar el entreno." }, { status: 500 });
  }
}
