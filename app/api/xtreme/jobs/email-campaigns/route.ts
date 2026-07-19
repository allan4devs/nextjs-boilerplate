import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { emailEnabled } from "@/lib/helpers/email";
import { processQueuedEmailCampaigns } from "@/lib/xtreme/email-campaigns";

export const dynamic = "force-dynamic";
/** Lotes de campaña con magic links: necesita margen de tiempo. */
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

/**
 * Cron dedicado a campañas de correo en cola (~cada 5 min).
 * Auth: Authorization: Bearer $CRON_SECRET
 *
 * Antes las campañas solo se drenaban al final de class-reminders (20/15 min),
 * y si ese job fallaba o se quedaba sin tiempo, la cola no avanzaba nunca.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    // ~55 s de presupuesto: lotes de 30, varias rondas (≈1000 envíos en ~20–30 min con cron */5).
    const emailCampaigns = await processQueuedEmailCampaigns(db, 30, {
      maxRounds: 10,
      deadlineMs: 55_000,
    });
    return NextResponse.json({
      ok: true,
      emailConfigured: emailEnabled(),
      emailCampaigns,
    });
  } catch (error) {
    console.error("XTREME EMAIL CAMPAIGNS JOB", error);
    return NextResponse.json(
      { error: "No se pudieron procesar las campañas de correo." },
      { status: 500 },
    );
  }
}
