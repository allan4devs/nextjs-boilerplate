import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { businessDate } from "@/lib/xtreme/business-date";
import {
  getOrCreateHabitLog,
  setHabitHour,
  type HabitCategory,
  type HabitLogDoc,
} from "@/lib/xtreme/habit-tracker";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

const HABIT_CATEGORIES = new Set<HabitCategory>([
  "sleep",
  "water",
  "food",
  "exercise",
  "focus",
]);

function requestedDate(req: NextRequest): string | null {
  const raw = req.nextUrl.searchParams.get("date")?.trim();
  if (!raw) return businessDate();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function publicHabitLog(doc: HabitLogDoc) {
  return {
    memberKey: doc.memberKey,
    date: doc.date,
    hours: doc.hours,
    updatedAt: doc.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const sessionOrResponse = await requireMemberSession(req);
    if (!isSession(sessionOrResponse)) return sessionOrResponse;

    const date = requestedDate(req);
    if (!date) {
      return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
    }

    const db = await getDb();
    const doc = await getOrCreateHabitLog(db, sessionOrResponse.memberKey, date);

    return NextResponse.json({ date: doc.date, hours: doc.hours });
  } catch (err) {
    console.error("XTREME HABITS GET", err);
    return NextResponse.json({ error: "No se pudieron cargar los hábitos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionOrResponse = await requireMemberSession(req);
    if (!isSession(sessionOrResponse)) return sessionOrResponse;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const hour = body?.hour;
    const category = body?.category;

    if (typeof hour !== "number" || !Number.isInteger(hour) || hour < 0 || hour > 23) {
      return NextResponse.json({ error: "La hora debe estar entre 0 y 23." }, { status: 400 });
    }
    if (category !== null && !HABIT_CATEGORIES.has(category as HabitCategory)) {
      return NextResponse.json({ error: "Categoría de hábito inválida." }, { status: 400 });
    }

    const db = await getDb();
    const doc = await setHabitHour(
      db,
      sessionOrResponse.memberKey,
      businessDate(),
      hour,
      category as HabitCategory | null,
    );

    return NextResponse.json(publicHabitLog(doc));
  } catch (err) {
    console.error("XTREME HABITS POST", err);
    return NextResponse.json({ error: "No se pudo guardar el hábito." }, { status: 500 });
  }
}
