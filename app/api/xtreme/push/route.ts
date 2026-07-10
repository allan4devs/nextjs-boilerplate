import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  PUSH_SUBSCRIPTIONS_COLLECTION,
  pushEnabled,
  type StoredPushSubscription,
} from "@/lib/helpers/push";
import { MEMBERS_COLLECTION, normalizeKey, normalizeName } from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: pushEnabled(), publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "" });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const memberKey = normalizeKey(normalizeName(body.memberName));
  const subscription = (body.subscription ?? {}) as Record<string, unknown>;
  const endpoint = String(subscription.endpoint ?? "").trim();
  const keys = (subscription.keys ?? {}) as Record<string, unknown>;
  const p256dh = String(keys.p256dh ?? "").trim();
  const auth = String(keys.auth ?? "").trim();
  if (!memberKey || !endpoint || !p256dh || !auth) {
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
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const endpoint = String(body.endpoint ?? "").trim();
  if (!endpoint) return NextResponse.json({ error: "Endpoint requerido." }, { status: 400 });
  const db = await getDb();
  await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).deleteOne({ endpoint });
  return NextResponse.json({ ok: true });
}
