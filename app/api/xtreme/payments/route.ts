import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { requireMemberSession, isSession } from "@/lib/xtreme/session";
import { PAYMENTS_COLLECTION, ENTITLEMENTS_COLLECTION, type PaymentDoc } from "@/lib/xtreme/shared";
import type { EntitlementDoc } from "@/lib/xtreme/entitlements";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionOrResponse = await requireMemberSession(req);
    if (!isSession(sessionOrResponse)) return sessionOrResponse;
    const session = sessionOrResponse;
    const db = await getDb();

    const payments = await db
      .collection<PaymentDoc>(PAYMENTS_COLLECTION)
      .find({ normalizedName: session.memberKey })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const entitlements = await db
      .collection<EntitlementDoc>(ENTITLEMENTS_COLLECTION)
      .find({
        memberKey: session.memberKey,
        status: { $in: ["active", "exhausted"] },
      })
      .sort({ endsOn: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        optionLabel: p.optionLabel,
        category: p.category,
        amountCrc: p.amountCrc,
        amountUsd: p.amountUsd,
        method: p.method,
        status: p.status,
        date: p.date,
        note: p.note,
        paypalCaptureId: p.paypalCaptureId,
      })),
      entitlements: entitlements.map((e) => ({
        id: e.id,
        label: e.label,
        kind: e.kind,
        startsOn: e.startsOn,
        endsOn: e.endsOn,
        remainingBookings: e.remainingBookings,
        status: e.status,
      })),
    });
  } catch (err) {
    console.error("XTREME PAYMENTS GET", err);
    return NextResponse.json({ error: "No se pudo cargar el historial de pagos." }, { status: 500 });
  }
}
