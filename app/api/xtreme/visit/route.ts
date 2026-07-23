import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { recordEvent } from "@/lib/xtreme/events";
import {
  findActiveMemberVisit,
  presentActiveMemberVisit,
} from "@/lib/xtreme/member-visit";
import {
  CHECKINS_COLLECTION,
  computeOccupancy,
  type CheckinDoc,
} from "@/lib/xtreme/shared";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

const VISIT_HISTORY_LIMIT = 60;

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function presentVisitHistoryItem(doc: CheckinDoc) {
  const checkedInAt = toIso(doc.checkedInAt);
  const checkedOutAt = toIso(doc.checkedOutAt ?? null);
  const open = !doc.checkedOutAt;
  let durationMinutes: number | null = null;
  if (checkedInAt && checkedOutAt) {
    durationMinutes = Math.max(
      0,
      Math.round(
        (new Date(checkedOutAt).getTime() - new Date(checkedInAt).getTime()) / 60_000,
      ),
    );
  } else if (checkedInAt && open) {
    durationMinutes = Math.max(
      0,
      Math.round((Date.now() - new Date(checkedInAt).getTime()) / 60_000),
    );
  }

  return {
    id: doc.id,
    date: doc.date,
    checkedInAt,
    checkedOutAt,
    durationMinutes,
    open,
    method: doc.method,
    by: doc.by,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireMemberSession(req);
    if (!isSession(session)) return session;

    const db = await getDb();
    const now = new Date();
    const visit = await findActiveMemberVisit(db, session.memberKey, now);

    const [visitDocs, totalVisits] = await Promise.all([
      db
        .collection<CheckinDoc>(CHECKINS_COLLECTION)
        .find({ normalizedName: session.memberKey })
        .sort({ checkedInAt: -1 })
        .limit(VISIT_HISTORY_LIMIT)
        .toArray(),
      db.collection<CheckinDoc>(CHECKINS_COLLECTION).countDocuments({
        normalizedName: session.memberKey,
      }),
    ]);

    return NextResponse.json({
      activeVisit: presentActiveMemberVisit(visit, now),
      visits: visitDocs.map(presentVisitHistoryItem),
      totalVisits,
    });
  } catch (error) {
    console.error("XTREME MEMBER VISIT GET", error);
    return NextResponse.json(
      { error: "No se pudo consultar tu visita activa." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireMemberSession(req);
    if (!isSession(session)) return session;

    const db = await getDb();
    const now = new Date();
    const openVisit = await findActiveMemberVisit(db, session.memberKey, now);
    if (!openVisit) {
      return NextResponse.json(
        { error: "No encontramos un ingreso abierto para registrar la salida." },
        { status: 404 },
      );
    }

    const updated = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).updateOne(
      {
        id: openVisit.id,
        normalizedName: session.memberKey,
        checkedOutAt: null,
      },
      { $set: { checkedOutAt: now, checkedOutBy: "member" } },
    );
    if (!updated.modifiedCount) {
      return NextResponse.json(
        { error: "La salida ya había sido registrada." },
        { status: 409 },
      );
    }

    const durationMinutes = Math.max(
      0,
      Math.round(
        (now.getTime() - new Date(openVisit.checkedInAt).getTime()) / 60_000,
      ),
    );
    await recordEvent(db, {
      type: "checkout_completed",
      memberId: session.memberKey,
      source: "member_app",
      entity: { type: "checkin", id: openVisit.id },
      properties: {
        checkedInAt: new Date(openVisit.checkedInAt).toISOString(),
        checkedOutAt: now.toISOString(),
        durationMinutes,
        selfService: true,
      },
    });

    return NextResponse.json({
      ok: true,
      checkedOutAt: now.toISOString(),
      durationMinutes,
      activeVisit: null,
      status: await computeOccupancy(db),
    });
  } catch (error) {
    console.error("XTREME MEMBER VISIT POST", error);
    return NextResponse.json(
      { error: "No se pudo registrar tu salida." },
      { status: 500 },
    );
  }
}
