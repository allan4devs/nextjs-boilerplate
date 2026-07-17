import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { businessDate } from "@/lib/xtreme/business-date";
import { MEMBER_LIFESTYLE_COLLECTION } from "@/lib/xtreme/shared";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

const HABITS = new Set(["water", "protein", "produce", "mobility", "walk", "sleep"]);
const CHALLENGES = new Set(["hydration-7", "mobility-7", "steps-5", "sleep-7"]);

type WellnessEntryDoc = {
  date: string;
  energy: number;
  mood: number;
  soreness: number;
  sleepHours: number;
  waterCups: number;
  steps: number;
  habits: Record<string, boolean>;
  note: string;
  updatedAt: Date;
};

type GoalDoc = {
  id: string;
  title: string;
  target: number;
  progress: number;
  unit: string;
  deadline: string;
  createdAt: Date;
};

type RecordDoc = {
  id: string;
  exercise: string;
  value: number;
  unit: string;
  achievedOn: string;
  createdAt: Date;
};

type FeedbackDoc = {
  id: string;
  rating: number;
  category: string;
  message: string;
  createdAt: Date;
};

type LifestyleDoc = {
  memberKey: string;
  wellness: WellnessEntryDoc[];
  goals: GoalDoc[];
  personalRecords: RecordDoc[];
  joinedChallenges: string[];
  feedback: FeedbackDoc[];
  createdAt: Date;
  updatedAt: Date;
};

function numberIn(value: unknown, min: number, max: number, fallback = min) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function isoDate(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : fallback;
}

function emptyDoc(memberKey: string): LifestyleDoc {
  const now = new Date();
  return {
    memberKey,
    wellness: [],
    goals: [],
    personalRecords: [],
    joinedChallenges: [],
    feedback: [],
    createdAt: now,
    updatedAt: now,
  };
}

function publicPayload(doc: LifestyleDoc, today: string) {
  const wellness = [...(doc.wellness ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
    .map((entry) => ({ ...entry, updatedAt: new Date(entry.updatedAt).toISOString() }));
  return {
    today: wellness.find((entry) => entry.date === today) ?? null,
    recent: wellness,
    goals: (doc.goals ?? []).map((goal) => ({
      ...goal,
      createdAt: new Date(goal.createdAt).toISOString(),
    })),
    personalRecords: (doc.personalRecords ?? []).map((record) => ({
      ...record,
      createdAt: new Date(record.createdAt).toISOString(),
    })),
    joinedChallenges: (doc.joinedChallenges ?? []).filter((id) => CHALLENGES.has(id)),
    feedback: (doc.feedback ?? []).slice(-10).reverse().map((entry) => ({
      ...entry,
      createdAt: new Date(entry.createdAt).toISOString(),
    })),
  };
}

async function authenticated(req: NextRequest) {
  const result = await requireMemberSession(req);
  return isSession(result) ? result : result;
}

export async function GET(req: NextRequest) {
  const session = await authenticated(req);
  if (!isSession(session)) return session;
  try {
    const db = await getDb();
    const doc =
      (await db.collection<LifestyleDoc>(MEMBER_LIFESTYLE_COLLECTION).findOne({
        memberKey: session.memberKey,
      })) ?? emptyDoc(session.memberKey);
    return NextResponse.json(publicPayload(doc, businessDate()));
  } catch (error) {
    console.error("XTREME LIFESTYLE GET", error);
    return NextResponse.json({ error: "No se pudo cargar Vida Xtreme." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await authenticated(req);
  if (!isSession(session)) return session;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = text(body.action, 40);
    const today = businessDate();
    const db = await getDb();
    const collection = db.collection<LifestyleDoc>(MEMBER_LIFESTYLE_COLLECTION);
    const current =
      (await collection.findOne({ memberKey: session.memberKey })) ?? emptyDoc(session.memberKey);
    current.wellness ??= [];
    current.goals ??= [];
    current.personalRecords ??= [];
    current.joinedChallenges ??= [];
    current.feedback ??= [];
    const now = new Date();
    const set: Partial<LifestyleDoc> = { updatedAt: now };

    if (action === "daily") {
      const previous = current.wellness.find((entry) => entry.date === today);
      const entry: WellnessEntryDoc = {
        date: today,
        energy: numberIn(body.energy, 1, 5, previous?.energy ?? 3),
        mood: numberIn(body.mood, 1, 5, previous?.mood ?? 3),
        soreness: numberIn(body.soreness, 1, 5, previous?.soreness ?? 2),
        sleepHours: numberIn(body.sleepHours, 0, 16, previous?.sleepHours ?? 0),
        waterCups: Math.round(numberIn(body.waterCups, 0, 30, previous?.waterCups ?? 0)),
        steps: Math.round(numberIn(body.steps, 0, 100000, previous?.steps ?? 0)),
        habits: previous?.habits ?? {},
        note: text(body.note, 280),
        updatedAt: now,
      };
      set.wellness = [entry, ...current.wellness.filter((item) => item.date !== today)]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 90);
    } else if (action === "habit") {
      const habit = text(body.habit, 30);
      if (!HABITS.has(habit)) {
        return NextResponse.json({ error: "Habito invalido." }, { status: 400 });
      }
      const previous = current.wellness.find((entry) => entry.date === today);
      const entry: WellnessEntryDoc = previous
        ? { ...previous, habits: { ...previous.habits, [habit]: !previous.habits?.[habit] }, updatedAt: now }
        : {
            date: today,
            energy: 3,
            mood: 3,
            soreness: 2,
            sleepHours: 0,
            waterCups: 0,
            steps: 0,
            habits: { [habit]: true },
            note: "",
            updatedAt: now,
          };
      set.wellness = [entry, ...current.wellness.filter((item) => item.date !== today)].slice(0, 90);
    } else if (action === "goalAdd") {
      const title = text(body.title, 80);
      const target = numberIn(body.target, 1, 1_000_000, 1);
      if (!title) return NextResponse.json({ error: "Escribi una meta." }, { status: 400 });
      const goal: GoalDoc = {
        id: crypto.randomUUID(),
        title,
        target,
        progress: 0,
        unit: text(body.unit, 24) || "veces",
        deadline: isoDate(body.deadline, ""),
        createdAt: now,
      };
      set.goals = [goal, ...(current.goals ?? [])].slice(0, 20);
    } else if (action === "goalProgress") {
      const id = text(body.id, 80);
      set.goals = (current.goals ?? []).map((goal) =>
        goal.id === id
          ? { ...goal, progress: numberIn(body.progress, 0, goal.target, goal.progress) }
          : goal,
      );
    } else if (action === "goalDelete") {
      const id = text(body.id, 80);
      set.goals = (current.goals ?? []).filter((goal) => goal.id !== id);
    } else if (action === "recordAdd") {
      const exercise = text(body.exercise, 80);
      const value = numberIn(body.value, 0.01, 1_000_000, 0);
      if (!exercise || value <= 0) {
        return NextResponse.json({ error: "Completa el ejercicio y la marca." }, { status: 400 });
      }
      const record: RecordDoc = {
        id: crypto.randomUUID(),
        exercise,
        value,
        unit: text(body.unit, 16) || "kg",
        achievedOn: isoDate(body.achievedOn, today),
        createdAt: now,
      };
      set.personalRecords = [record, ...(current.personalRecords ?? [])].slice(0, 50);
    } else if (action === "recordDelete") {
      const id = text(body.id, 80);
      set.personalRecords = (current.personalRecords ?? []).filter((record) => record.id !== id);
    } else if (action === "challengeToggle") {
      const id = text(body.id, 40);
      if (!CHALLENGES.has(id)) {
        return NextResponse.json({ error: "Reto invalido." }, { status: 400 });
      }
      const joined = new Set(current.joinedChallenges ?? []);
      if (joined.has(id)) joined.delete(id);
      else joined.add(id);
      set.joinedChallenges = [...joined].filter((entry) => CHALLENGES.has(entry));
    } else if (action === "feedback") {
      const message = text(body.message, 500);
      const feedback: FeedbackDoc = {
        id: crypto.randomUUID(),
        rating: Math.round(numberIn(body.rating, 1, 5, 5)),
        category: text(body.category, 40) || "general",
        message,
        createdAt: now,
      };
      set.feedback = [...(current.feedback ?? []), feedback].slice(-30);
    } else {
      return NextResponse.json({ error: "Accion no soportada." }, { status: 400 });
    }

    await collection.updateOne(
      { memberKey: session.memberKey },
      {
        $set: {
          wellness: current.wellness,
          goals: current.goals,
          personalRecords: current.personalRecords,
          joinedChallenges: current.joinedChallenges,
          feedback: current.feedback,
          ...set,
        },
        $setOnInsert: { memberKey: session.memberKey, createdAt: now },
      },
      { upsert: true },
    );
    const updated = (await collection.findOne({ memberKey: session.memberKey })) ?? {
      ...current,
      ...set,
    };
    return NextResponse.json(publicPayload(updated, today));
  } catch (error) {
    console.error("XTREME LIFESTYLE PATCH", error);
    return NextResponse.json({ error: "No se pudo guardar Vida Xtreme." }, { status: 500 });
  }
}
