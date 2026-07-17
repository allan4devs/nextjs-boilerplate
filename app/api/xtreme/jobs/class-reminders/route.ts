import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { businessDate } from "@/lib/xtreme/business-date";
import { processClassReminders } from "@/lib/xtreme/class-reminders";
import { pushEnabled } from "@/lib/helpers/push";
import { processVisitCheckoutReminders } from "@/lib/xtreme/visit-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

/**
 * Cron frecuente (~cada 15 min): recuerda clases próximas y visitas sin salida.
 * Auth: Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    const now = new Date();
    const [summary, visitReminders] = await Promise.all([
      processClassReminders(db, now),
      processVisitCheckoutReminders(db, now),
    ]);
    return NextResponse.json({
      ok: true,
      date: businessDate(now),
      pushConfigured: pushEnabled(),
      window: "45-75 min before class",
      ...summary,
      visitReminders,
    });
  } catch (error) {
    console.error("XTREME CLASS REMINDERS JOB", error);
    return NextResponse.json(
      { error: "No se pudieron procesar los recordatorios de clase." },
      { status: 500 },
    );
  }
}
