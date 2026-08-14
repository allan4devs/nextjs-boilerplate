/**
 * Bitácora de hábitos del socio.
 *
 * GET  ?date=YYYY-MM-DD → las 24 horas de ese día (hoy si no se indica).
 * POST { hour, category } → marca una hora del día de hoy.
 *
 * Solo con sesión de socio, y siempre sobre su propia bitácora: el memberKey
 * sale de la sesión, nunca del cuerpo del request.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { businessDate } from "@/lib/xtreme/business-date";
import {
  getOrCreateHabitLog,
  isHabitCategory,
  isHabitHour,
  setHabitHour,
  HABIT_HOURS_PER_DAY,
  type HabitLogDoc,
} from "@/lib/xtreme/habit-tracker";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Fecha pedida, o `null` si no es un día real del calendario. */
function requestedDate(req: NextRequest): string | null {
  const raw = req.nextUrl.searchParams.get("date")?.trim();
  if (!raw) return businessDate();

  const parts = ISO_DATE.exec(raw);
  if (!parts) return null;
  // `2026-02-31` pasa el regex pero no existe: el round-trip por Date lo delata.
  const [, year, month, day] = parts;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const sameDay =
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() + 1 === Number(month) &&
    parsed.getUTCDate() === Number(day);
  return sameDay ? raw : null;
}

/** Forma única de la bitácora hacia el cliente; GET y POST devuelven lo mismo. */
function publicHabitLog(doc: HabitLogDoc) {
  return {
    date: doc.date,
    hours: doc.hours,
    updatedAt: doc.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireMemberSession(req);
    if (!isSession(session)) return session;

    const date = requestedDate(req);
    if (!date) {
      return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
    }

    const db = await getDb();
    return NextResponse.json(
      publicHabitLog(await getOrCreateHabitLog(db, session.memberKey, date)),
    );
  } catch (err) {
    console.error("XTREME HABITS GET", err);
    return NextResponse.json({ error: "No se pudieron cargar los hábitos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireMemberSession(req);
    if (!isSession(session)) return session;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const { hour, category } = body ?? {};

    if (!isHabitHour(hour)) {
      return NextResponse.json(
        { error: `La hora debe estar entre 0 y ${HABIT_HOURS_PER_DAY - 1}.` },
        { status: 400 },
      );
    }
    if (!isHabitCategory(category)) {
      return NextResponse.json({ error: "Categoría de hábito inválida." }, { status: 400 });
    }

    const db = await getDb();
    // Solo se marca el día en curso: el pasado se consulta, no se reescribe.
    const doc = await setHabitHour(db, session.memberKey, businessDate(), hour, category);

    return NextResponse.json(publicHabitLog(doc));
  } catch (err) {
    console.error("XTREME HABITS POST", err);
    return NextResponse.json({ error: "No se pudo guardar el hábito." }, { status: 500 });
  }
}
