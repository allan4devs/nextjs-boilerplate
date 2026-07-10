import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { recordEvent } from "@/lib/xtreme/events";
import { verifyNotificationClickToken } from "@/lib/xtreme/notification-token";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const memberKey = String(body.memberKey ?? "").trim();
  const deliveryKey = String(body.deliveryKey ?? "").trim();
  const token = String(body.token ?? "").trim();
  if (!verifyNotificationClickToken(memberKey, deliveryKey, token)) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  const db = await getDb();
  await recordEvent(db, {
    type: "notification_clicked",
    memberId: memberKey,
    source: "member_app",
    entity: { type: "lifecycle_delivery", id: deliveryKey },
    properties: {},
  });
  return NextResponse.json({ ok: true });
}
