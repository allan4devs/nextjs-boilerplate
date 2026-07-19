import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { sendReservationEmail } from "@/lib/helpers/email";
import {
  MEMBERS_COLLECTION,
  RESERVATIONS_COLLECTION,
  normalizeKey,
  todayIso,
} from "@/lib/xtreme/shared";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import { bookSession, cancelBooking, sessionSnapshot } from "@/lib/xtreme/inventory";
import { queuePushMemberEvent } from "@/lib/xtreme/member-push";
import { recordEvent } from "@/lib/xtreme/events";

export const dynamic = "force-dynamic";

function isoDate(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayIso();
}

/**
 * Strategy 2.0: reservations require a member session + active entitlement.
 * Capacity is claimed atomically on class_sessions.bookedCount.
 * isMine solo con cookie de sesión del socio (nunca por nombre suelto de query).
 */
export async function GET(req: NextRequest) {
  try {
    const trainingDate = isoDate(req.nextUrl.searchParams.get("date"));
    const session = await requireMemberSession(req);
    // Solo la sesión HttpOnly identifica al socio para isMine.
    // El query memberName no se usa: evitaba que un kiosco compartido
    // o un nombre residual marcaran "Reservada" de otra persona.
    const memberKey = isSession(session) ? normalizeKey(session.memberKey) : "";

    const db = await getDb();
    const reservations = await sessionSnapshot(db, trainingDate, memberKey);

    return NextResponse.json({
      date: trainingDate,
      reservations,
      auth: memberKey ? "session" : "anon",
      memberKey: memberKey || null,
    });
  } catch (err) {
    console.error("XTREME RESERVATIONS GET", err);
    return NextResponse.json({ error: "No se pudieron cargar las reservas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const trainingId = String(body.trainingId ?? "").trim();
    const trainingName = String(body.trainingName ?? "").trim();
    const trainingDate = isoDate(body.trainingDate);

    if (!trainingId || !trainingName) {
      return NextResponse.json({ error: "Faltan datos de la reserva." }, { status: 400 });
    }

    // Identity from session only (Strategy 2.0 §4.1).
    const sessionOrErr = await requireMemberSession(req);
    if (!isSession(sessionOrErr)) return sessionOrErr;

    const db = await getDb();
    // Identidad solo de la cookie: cada reserva queda ligada a un memberKey único.
    const memberKey = normalizeKey(sessionOrErr.memberKey);
    if (!memberKey) {
      return NextResponse.json({ error: "Sesión sin identidad de socio." }, { status: 401 });
    }
    const result = await bookSession(db, {
      memberKey,
      memberName: sessionOrErr.memberName || memberKey,
      trainingId,
      trainingName,
      date: trainingDate,
    });

    if (!result.ok) {
      await recordEvent(db, {
        type: "reservation_attempted",
        memberId: memberKey,
        source: "member_app",
        entity: { type: "class", id: `${trainingId}:${trainingDate}` },
        properties: {
          outcome: "failed",
          reason: result.code,
          trainingId,
          trainingDate,
        },
      });
      const status =
        result.code === "full"
          ? 409
          : result.code === "payment_required" || result.code === "expired" || result.code === "limit_reached"
            ? 402
            : result.code === "cutoff" || result.code === "wrong_class"
              ? 409
              : 400;
      const needsAccess =
        result.code === "payment_required" ||
        result.code === "expired" ||
        result.code === "limit_reached";
      return NextResponse.json(
        {
          error: result.message,
          code: result.code,
          paymentRequired: needsAccess,
          checkoutOptionId:
            result.code === "expired" || result.code === "limit_reached" ? "month" : "day-pass",
          trainingId,
          trainingDate,
          reservations: await sessionSnapshot(db, trainingDate, memberKey),
        },
        { status },
      );
    }

    // Legacy mirror for older readers of xtreme_gym_class_reservations
    try {
      await db.collection(RESERVATIONS_COLLECTION).updateOne(
        {
          normalizedName: memberKey,
          trainingId,
          trainingDate,
        },
        {
          $set: {
            memberName: sessionOrErr.memberName || memberKey,
            normalizedName: memberKey,
            trainingId,
            trainingName,
            trainingDate,
            status: "reserved",
            bookingId: result.booking.id,
            sessionId: result.session.id,
            entitlementId: result.entitlementId,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
    } catch (legacyErr) {
      console.error("LEGACY RESERVATION MIRROR", legacyErr);
    }

    const member = await db
      .collection<{ email?: string; emailVerified?: boolean; memberName?: string }>(MEMBERS_COLLECTION)
      .findOne(
        { normalizedName: memberKey },
        { projection: { email: 1, emailVerified: 1, memberName: 1 } },
      );
    // Solo correo verificado: el import del Excel trae muchos correos cruzados.
    if (member?.email && member.emailVerified === true) {
      await sendReservationEmail({
        to: member.email,
        memberName: member.memberName || sessionOrErr.memberName || memberKey,
        trainingName,
        trainingDate,
      });
    }
    if (!result.duplicate) {
      queuePushMemberEvent(db, memberKey, {
        type: "reservation_booked",
        trainingName,
        trainingDate,
      });
    }

    await recordEvent(db, {
      type: "reservation_created",
      memberId: memberKey,
      source: "member_app",
      entity: { type: "booking", id: result.booking.id },
      properties: {
        outcome: result.duplicate ? "duplicate" : "success",
        trainingId,
        trainingDate,
        entitlementId: result.entitlementId,
      },
    });

    return NextResponse.json({
      ok: true,
      bookingId: result.booking.id,
      sessionId: result.session.id,
      entitlementId: result.entitlementId,
      duplicate: Boolean(result.duplicate),
      reservations: await sessionSnapshot(db, trainingDate, memberKey),
    });
  } catch (err) {
    console.error("XTREME RESERVATIONS POST", err);
    return NextResponse.json({ error: "No se pudo reservar la clase." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const trainingId = String(body.trainingId ?? "").trim();
    const trainingDate = isoDate(body.trainingDate);

    if (!trainingId) {
      return NextResponse.json({ error: "Faltan datos para cancelar." }, { status: 400 });
    }

    const sessionOrErr = await requireMemberSession(req);
    if (!isSession(sessionOrErr)) return sessionOrErr;

    const memberKey = normalizeKey(sessionOrErr.memberKey);
    if (!memberKey) {
      return NextResponse.json({ error: "Sesión sin identidad de socio." }, { status: 401 });
    }

    const db = await getDb();
    await cancelBooking(db, {
      memberKey,
      trainingId,
      date: trainingDate,
    });

    // Legacy mirror — solo la fila de este socio
    await db.collection(RESERVATIONS_COLLECTION).updateOne(
      {
        normalizedName: memberKey,
        trainingId,
        trainingDate,
        status: "reserved",
      },
      { $set: { status: "cancelled", updatedAt: new Date() } },
    );

    const trainingName = String(body.trainingName ?? trainingId).trim() || trainingId;
    queuePushMemberEvent(db, memberKey, {
      type: "reservation_cancelled",
      trainingName,
      trainingDate,
    });

    await recordEvent(db, {
      type: "reservation_cancelled",
      memberId: memberKey,
      source: "member_app",
      entity: { type: "class", id: `${trainingId}:${trainingDate}` },
      properties: { trainingId, trainingDate },
    });

    return NextResponse.json({
      ok: true,
      reservations: await sessionSnapshot(db, trainingDate, memberKey),
    });
  } catch (err) {
    console.error("XTREME RESERVATIONS DELETE", err);
    return NextResponse.json({ error: "No se pudo cancelar la reserva." }, { status: 500 });
  }
}
