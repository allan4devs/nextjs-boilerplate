import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  PUSH_SUBSCRIPTIONS_COLLECTION,
  missingVapidKeys,
  pushEnabled,
  sendMemberPush,
  type StoredPushSubscription,
} from "@/lib/helpers/push";
import { MEMBERS_COLLECTION } from "@/lib/xtreme/shared";
import { recordEvent } from "@/lib/xtreme/events";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Público: el cliente necesita la VAPID public key antes de suscribirse.
  // deviceCount solo si hay sesión de socio.
  let deviceCount = 0;
  const sessionOrErr = await requireMemberSession(req);
  if (isSession(sessionOrErr)) {
    try {
      const db = await getDb();
      deviceCount = await db
        .collection(PUSH_SUBSCRIPTIONS_COLLECTION)
        .countDocuments({ memberKey: sessionOrErr.memberKey });
    } catch {
      deviceCount = 0;
    }
  }

  const missing = missingVapidKeys();
  return NextResponse.json({
    configured: missing.length === 0,
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "",
    deviceCount,
    // Solo nombres de env, nunca secretos - para depurar en el cliente/UI.
    missingKeys: missing,
  });
}

export async function POST(req: NextRequest) {
  const sessionOrErr = await requireMemberSession(req);
  if (!isSession(sessionOrErr)) return sessionOrErr;
  const memberKey = sessionOrErr.memberKey;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "subscribe").trim();

  // Aviso de prueba al dispositivo (o a todos los del socio).
  if (action === "test") {
    if (!pushEnabled()) {
      return NextResponse.json(
        { error: "Push no está configurado en el servidor (VAPID)." },
        { status: 503 },
      );
    }
    const db = await getDb();
    const result = await sendMemberPush(db, memberKey, {
      title: "Xtreme Gym · prueba",
      body: "Si ves esto, los avisos push ya te llegan. ¡Pura vida!",
      url: "/app",
      memberKey,
    });
    if (result.skipped) {
      return NextResponse.json(
        { error: "Push no está configurado en el servidor (VAPID)." },
        { status: 503 },
      );
    }
    if (result.attempted === 0) {
      return NextResponse.json(
        {
          error:
            "No hay dispositivos registrados. Activá las notificaciones en este celular primero.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      attempted: result.attempted,
      failed: result.failed,
      message:
        result.sent > 0
          ? `Aviso de prueba enviado a ${result.sent} dispositivo${result.sent === 1 ? "" : "s"}.`
          : "No se pudo entregar el aviso. Revisá el permiso del navegador.",
    });
  }

  if (!pushEnabled()) {
    return NextResponse.json(
      { error: "Push no está configurado en el servidor (VAPID)." },
      { status: 503 },
    );
  }

  const subscription = (body.subscription ?? {}) as Record<string, unknown>;
  const endpoint = String(subscription.endpoint ?? "").trim();
  const keys = (subscription.keys ?? {}) as Record<string, unknown>;
  const p256dh = String(keys.p256dh ?? "").trim();
  const auth = String(keys.auth ?? "").trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  }

  const db = await getDb();
  const member = await db
    .collection(MEMBERS_COLLECTION)
    .findOne({ normalizedName: memberKey }, { projection: { _id: 1 } });
  if (!member) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });

  const now = new Date();
  const userAgent = req.headers.get("user-agent")?.slice(0, 240) || "";
  await db.collection<StoredPushSubscription>(PUSH_SUBSCRIPTIONS_COLLECTION).updateOne(
    { endpoint },
    {
      $set: {
        endpoint,
        keys: { p256dh, auth },
        memberKey,
        updatedAt: now,
        userAgent,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  await recordEvent(db, {
    type: "push_subscribed",
    memberId: memberKey,
    source: "member_app",
    entity: { type: "push_endpoint", id: endpoint.slice(-48) },
    properties: { userAgent: userAgent.slice(0, 80) },
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
  // Solo quitar la suscripción de este socio.
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
