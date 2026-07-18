import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import type { EventSource } from "@/lib/xtreme/events";
import {
  ingestSessionBatch,
  type ClientSessionEvent,
} from "@/lib/xtreme/session-analytics";

export const dynamic = "force-dynamic";

const ALLOWED_SOURCES = new Set(["site", "member_app", "admin", "reception", "kiosk"]);

/**
 * Batch de analytics de sesión (bitácora de uso).
 * Fire-and-forget desde el cliente; no confiar en esto para dinero.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const sessionId = String(body.sessionId ?? "").trim();
    const sourceRaw = String(body.source ?? "site").trim();
    const source = (ALLOWED_SOURCES.has(sourceRaw) ? sourceRaw : "site") as EventSource;
    const memberName = body.memberName != null ? String(body.memberName) : undefined;
    const anonymousId = body.anonymousId != null ? String(body.anonymousId) : undefined;
    const events = (Array.isArray(body.events) ? body.events : []) as ClientSessionEvent[];
    const clientRaw = (body.client ?? {}) as Record<string, unknown>;

    const db = await getDb();
    const result = await ingestSessionBatch(db, {
      sessionId,
      source,
      memberName,
      anonymousId,
      events,
      client: {
        userAgent:
          (typeof clientRaw.userAgent === "string" ? clientRaw.userAgent : undefined) ||
          req.headers.get("user-agent") ||
          undefined,
        language: typeof clientRaw.language === "string" ? clientRaw.language : undefined,
        viewport: typeof clientRaw.viewport === "string" ? clientRaw.viewport : undefined,
        referrer: typeof clientRaw.referrer === "string" ? clientRaw.referrer : undefined,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error("XTREME SESSION ANALYTICS", error);
    // Soft-fail: no spamear 500 a clientes de analytics
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
