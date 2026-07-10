import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { sendReservationEmail } from "@/lib/helpers/email";
import {
  MEMBERS_COLLECTION,
  RESERVATIONS_COLLECTION,
  normalizeKey,
  normalizeName,
  todayIso,
} from "@/lib/xtreme/shared";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import { bookSession, cancelBooking, sessionSnapshot } from "@/lib/xtreme/inventory";

export const dynamic = "force-dynamic";

function isoDate(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayIso();
}

/**
 * Strategy 2.0: reservations require a member session + active entitlement.
 * Capacity is claimed atomically on class_sessions.bookedCount.
 */
export async function GET(req: NextRequest) {
  try {
    const trainingDate = isoDate(req.nextUrl.searchParams.get("date"));
    const memberName = normalizeName(req.nextUrl.searchParams.get("memberName"));
    const session = await requireMemberSession(req);
    const memberKey = isSession(session)
      ? session.memberKey
      : memberName
        ? normalizeKey(memberName)
        : "";

    const db = await getDb();
    const reservations = await sessionSnapshot(db, trainingDate, memberKey);

    return NextResponse.json({
      date: trainingDate,
      reservations,
      auth: isSession(session) ? "session" : memberKey ? "name" : "anon",
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
    const result = await bookSession(db, {
      memberKey: sessionOrErr.memberKey,
      memberName: sessionOrErr.memberName,
      trainingId,
      trainingName,
      date: trainingDate,
    });

    if (!result.ok) {
      const status =
        result.code === "full"
          ? 409
          : result.code === "payment_required" || result.code === "expired" || result.code === "limit_reached"
            ? 402
            : 400;
      return NextResponse.json(
        {
          error: result.message,
          code: result.code,
          paymentRequired: result.code === "payment_required" || result.code === "expired",
          checkoutOptionId: "day-pass",
          trainingId,
          trainingDate,
          reservations: await sessionSnapshot(db, trainingDate, sessionOrErr.memberKey),
        },
        { status },
      );
    }

    // Legacy mirror for older readers of xtreme_gym_class_reservations
    try {
      await db.collection(RESERVATIONS_COLLECTION).updateOne(
        {
          normalizedName: sessionOrErr.memberKey,
          trainingId,
          trainingDate,
        },
        {
          $set: {
            memberName: sessionOrErr.memberName,
            normalizedName: sessionOrErr.memberKey,
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
      .collection<{ email?: string; memberName?: string }>(MEMBERS_COLLECTION)
      .findOne({ normalizedName: sessionOrErr.memberKey }, { projection: { email: 1, memberName: 1 } });
    if (member?.email) {
      await sendReservationEmail({
        to: member.email,
        memberName: member.memberName || sessionOrErr.memberName,
        trainingName,
        trainingDate,
      });
    }

    return NextResponse.json({
      ok: true,
      bookingId: result.booking.id,
      sessionId: result.session.id,
      entitlementId: result.entitlementId,
      duplicate: Boolean(result.duplicate),
      reservations: await sessionSnapshot(db, trainingDate, sessionOrErr.memberKey),
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

    const db = await getDb();
    await cancelBooking(db, {
      memberKey: sessionOrErr.memberKey,
      trainingId,
      date: trainingDate,
    });

    // Legacy mirror
    await db.collection(RESERVATIONS_COLLECTION).updateOne(
      {
        normalizedName: sessionOrErr.memberKey,
        trainingId,
        trainingDate,
        status: "reserved",
      },
      { $set: { status: "cancelled", updatedAt: new Date() } },
    );

    return NextResponse.json({
      ok: true,
      reservations: await sessionSnapshot(db, trainingDate, sessionOrErr.memberKey),
    });
  } catch (err) {
    console.error("XTREME RESERVATIONS DELETE", err);
    return NextResponse.json({ error: "No se pudo cancelar la reserva." }, { status: 500 });
  }
}
