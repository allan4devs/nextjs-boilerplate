import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  PUSH_SUBSCRIPTIONS_COLLECTION,
  pushEnabled,
  type StoredPushSubscription,
} from "@/lib/helpers/push";
import { MEMBERS_COLLECTION } from "@/lib/xtreme/shared";
import { recordEvent } from "@/lib/xtreme/events";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: pushEnabled(), publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "" });
}

export async function POST(req: NextRequest) {
  const sessionOrErr = await requireMemberSession(req);
  if (!isSession(sessionOrErr)) return sessionOrErr;
  const memberKey = sessionOrErr.memberKey;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const subscription = (body.subscription ?? {}) as Record<string, unknown>;
  const endpoint = String(subscription.endpoint ?? "").trim();
  const keys = (subscription.keys ?? {}) as Record<string, unknown>;
  const p256dh = String(keys.p256dh ?? "").trim();
  const auth = String(keys.auth ?? "").trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  }

  const db = await getDb();
  const member = await db.collection(MEMBERS_COLLECTION).findOne({ normalizedName: memberKey }, { projection: { _id: 1 } });
  if (!member) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });

  const now = new Date();
  await db.collection<StoredPushSubscription>(PUSH_SUBSCRIPTIONS_COLLECTION).updateOne(
    { endpoint },
    { $set: { endpoint, keys: { p256dh, auth }, memberKey, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  await recordEvent(db, {
    type: "push_subscribed",
    memberId: memberKey,
    source: "member_app",
    entity: { type: "push_endpoint", id: endpoint.slice(-48) },
    properties: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sessionOrErr = await requireMemberSession(req);
  if (!isSession(sessionOrErr)) return sessionOrErr;
  const memberKey = sessionOrErr.memberKey;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const endpoint = String(body.endpoint ?? "").trim();
  if (!endpoint) return NextResponse.json({ error: "Endpoint requerido." }, { status: 400 });
  const db = await getDb();
  // Only remove own device subscription
  const removed = await db
    .collection<StoredPushSubscription>(PUSH_SUBSCRIPTIONS_COLLECTION)
    .findOneAndDelete({ endpoint, memberKey });
  if (removed?.memberKey) {
    await recordEvent(db, {
      type: "push_unsubscribed",
      memberId: removed.memberKey,
      source: "member_app",
      entity: { type: "push_endpoint", id: endpoint.slice(-48) },
      properties: {},
    });
  }
  return NextResponse.json({ ok: true });
}
