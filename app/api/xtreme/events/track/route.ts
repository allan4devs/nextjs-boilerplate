import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { recordEvent, type EventSource } from "@/lib/xtreme/events";
import { normalizeKey, normalizeName } from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

/** Allowlisted client-side funnel events (never trust client for money). */
const ALLOWED = new Set([
  "app_opened",
  "landing_viewed",
  "cta_clicked",
  "checkout_option_selected",
  "recommendation_shown",
  "recommendation_acted",
  "share_created",
]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const type = String(body.type ?? "").trim();
    if (!ALLOWED.has(type)) {
      return NextResponse.json({ error: "Evento no permitido." }, { status: 400 });
    }

    const memberId = normalizeKey(normalizeName(body.memberName || body.memberId || ""));
    const anonymousId = String(body.anonymousId ?? "").trim().slice(0, 64) || undefined;
    const source = (["site", "member_app"].includes(String(body.source))
      ? String(body.source)
      : "site") as EventSource;
    const propsRaw = (body.properties ?? {}) as Record<string, unknown>;
    const properties: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(propsRaw).slice(0, 20)) {
      if (typeof v === "string") properties[k] = v.slice(0, 120);
      else if (typeof v === "number" || typeof v === "boolean") properties[k] = v;
      else if (v == null) properties[k] = null;
    }

    const db = await getDb();
    await recordEvent(db, {
      type,
      memberId: memberId || undefined,
      anonymousId,
      source,
      properties,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("XTREME EVENT TRACK", error);
    return NextResponse.json({ error: "No se pudo registrar." }, { status: 500 });
  }
}
