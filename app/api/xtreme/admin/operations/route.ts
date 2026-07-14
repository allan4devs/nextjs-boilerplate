import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  BOOKINGS_COLLECTION,
  normalizeKey,
  normalizeName,
  todayIso,
  type AdminRole,
} from "@/lib/xtreme/shared";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { writeAudit } from "@/lib/xtreme/audit";
import {
  grantEntitlement,
  listMemberEntitlements,
  newEntitlementId,
  revokeEntitlement,
  type EntitlementDoc,
} from "@/lib/xtreme/entitlements";
import {
  listSessionsForDate,
  markAttendance,
  upsertClassSession,
  type BookingDoc,
} from "@/lib/xtreme/inventory";

export const dynamic = "force-dynamic";

async function roleFromReq(req: NextRequest): Promise<AdminRole | null> {
  const session = await resolveStaffSession(req, "admin");
  return session?.role === "admin" || session?.role === "super" ? session.role : null;
}

/**
 * Admin operations for Strategy 2.0 inventory + entitlements.
 * GET ?date=YYYY-MM-DD&memberName=optional
 * POST actions: upsertSession | grantEntitlement | revokeEntitlement | attendance
 */
export async function GET(req: NextRequest) {
  const role = await roleFromReq(req);
  if (!role) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const db = await getDb();
    const date = String(req.nextUrl.searchParams.get("date") ?? todayIso()).slice(0, 10);
    const memberName = normalizeName(req.nextUrl.searchParams.get("memberName"));
    const sessions = await listSessionsForDate(db, date);
    const bookings = await db
      .collection<BookingDoc>(BOOKINGS_COLLECTION)
      .find({ trainingDate: date, status: { $in: ["reserved", "attended", "no_show", "late_cancel"] } })
      .toArray();

    let entitlements: EntitlementDoc[] = [];
    if (memberName) {
      entitlements = await listMemberEntitlements(db, normalizeKey(memberName));
    }

    const counts = {
      reserved: bookings.filter((b) => b.status === "reserved").length,
      attended: bookings.filter((b) => b.status === "attended").length,
      noShow: bookings.filter((b) => b.status === "no_show").length,
      cancelled: bookings.filter((b) => b.status === "cancelled" || b.status === "late_cancel").length,
    };

    return NextResponse.json({
      role,
      date,
      sessions,
      bookings: bookings.map((b) => ({
        id: b.id,
        sessionId: b.sessionId,
        memberName: b.memberName,
        memberKey: b.memberKey,
        trainingName: b.trainingName,
        status: b.status,
        entitlementId: b.entitlementId,
      })),
      counts,
      entitlements: entitlements.map((e) => ({
        id: e.id,
        kind: e.kind,
        label: e.label,
        offerId: e.offerId,
        startsOn: e.startsOn,
        endsOn: e.endsOn,
        remainingBookings: e.remainingBookings,
        status: e.status,
        source: e.source,
      })),
    });
  } catch (err) {
    console.error("ADMIN OPERATIONS GET", err);
    return NextResponse.json({ error: "No se pudo cargar operaciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const role = await roleFromReq(req);
  if (!role) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const db = await getDb();

    if (action === "upsertSession") {
      const trainingId = String(body.trainingId ?? "").trim();
      const trainingName = String(body.trainingName ?? "").trim();
      const date = String(body.date ?? todayIso()).slice(0, 10);
      if (!trainingId || !trainingName) {
        return NextResponse.json({ error: "Clase requerida." }, { status: 400 });
      }
      const session = await upsertClassSession(db, {
        trainingId,
        trainingName,
        date,
        capacity: body.capacity !== undefined ? Number(body.capacity) : undefined,
        coach: body.coach !== undefined ? String(body.coach) : undefined,
        startHourUtc: body.startHourUtc !== undefined ? Number(body.startHourUtc) : undefined,
        status: body.status as "scheduled" | "cancelled" | "completed" | undefined,
      });
      await writeAudit(db, {
        actorRole: role,
        action: "session.upsert",
        targetType: "system",
        targetId: session?.id ?? trainingId,
        summary: `Sesion ${trainingName} ${date}`,
      });
      return NextResponse.json({ ok: true, session });
    }

    if (action === "grantEntitlement") {
      const memberName = normalizeName(body.memberName);
      if (!memberName) return NextResponse.json({ error: "Socio requerido." }, { status: 400 });
      const memberKey = normalizeKey(memberName);
      const days = Math.max(1, Math.min(365, Number(body.days) || 30));
      const startsOn = String(body.startsOn ?? todayIso()).slice(0, 10);
      const endsOn = String(body.endsOn ?? "").slice(0, 10) || undefined;
      const kind = (["plan", "day_pass", "class_credit", "admin_grant"].includes(String(body.kind))
        ? String(body.kind)
        : "admin_grant") as EntitlementDoc["kind"];

      const ent = await grantEntitlement(db, {
        id: newEntitlementId("admin"),
        memberKey,
        kind,
        offerId: String(body.offerId ?? "admin-grant"),
        label: String(body.label ?? "Cortesia admin").slice(0, 80),
        startsOn,
        endsOn: endsOn || (() => {
          const d = new Date(`${startsOn}T00:00:00.000Z`);
          d.setUTCDate(d.getUTCDate() + days);
          return d.toISOString().slice(0, 10);
        })(),
        remainingBookings:
          body.remainingBookings === null || body.remainingBookings === undefined
            ? kind === "day_pass"
              ? 1
              : null
            : Math.max(0, Number(body.remainingBookings)),
        source: { type: "admin", id: `admin-${role}` },
      });

      await writeAudit(db, {
        actorRole: role,
        action: "entitlement.grant",
        targetType: "member",
        targetId: memberKey,
        summary: `Entitlement ${ent.kind} → ${memberName} hasta ${ent.endsOn}`,
        meta: { entitlementId: ent.id },
      });
      return NextResponse.json({ ok: true, entitlement: ent });
    }

    if (action === "revokeEntitlement") {
      const entitlementId = String(body.entitlementId ?? "").trim();
      if (!entitlementId) return NextResponse.json({ error: "Entitlement id requerido." }, { status: 400 });
      const reason = String(body.reason ?? "admin_revoke").slice(0, 160);
      const rev = await revokeEntitlement(db, entitlementId, reason, {
        type: "admin",
        id: `admin-${role}`,
      });
      await writeAudit(db, {
        actorRole: role,
        action: "entitlement.revoke",
        targetType: "member",
        targetId: rev?.memberKey ?? entitlementId,
        summary: `Revocado ${entitlementId}: ${reason}`,
      });
      return NextResponse.json({ ok: true, entitlement: rev });
    }

    if (action === "attendance") {
      const bookingId = String(body.bookingId ?? "").trim();
      const status = String(body.status ?? "attended");
      if (!bookingId || !["attended", "no_show", "late_cancel"].includes(status)) {
        return NextResponse.json({ error: "bookingId y status validos requeridos." }, { status: 400 });
      }
      await markAttendance(db, {
        bookingId,
        status: status as "attended" | "no_show" | "late_cancel",
      });
      await writeAudit(db, {
        actorRole: role,
        action: "booking.attendance",
        targetType: "system",
        targetId: bookingId,
        summary: `Asistencia ${status} en ${bookingId}`,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Accion invalida." }, { status: 400 });
  } catch (err) {
    console.error("ADMIN OPERATIONS POST", err);
    return NextResponse.json({ error: "No se pudo procesar." }, { status: 500 });
  }
}
