import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  MEMBERS_COLLECTION,
  PAYMENTS_COLLECTION,
  membershipStatus,
  todayIso,
  type MemberDoc,
  type PaymentDoc,
} from "@/lib/xtreme/shared";
import { nextBillingDateFromPayment } from "@/lib/xtreme/membership-billing";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

const BILLING_ITEMS = {
  enrollment: { label: "Matrícula", category: "Otro" as const, price: 5_000, days: 0 },
  "day-pass": { label: "Pase del día", category: "Clase" as const, price: 3_000, days: 0 },
  week: { label: "Plan semanal", category: "Plan" as const, price: 8_000, days: 7 },
  fortnight: { label: "Plan quincenal", category: "Plan" as const, price: 13_500, days: 15 },
  month: { label: "Plan mensual", category: "Plan" as const, price: 23_000, days: 30 },
  senior: { label: "Adultos mayores", category: "Clase" as const, price: 16_000, days: 30 },
} as const;

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const memberKey = String(req.nextUrl.searchParams.get("memberKey") ?? "").trim();
  if (!memberKey) return NextResponse.json({ lastAmounts: {} });
  const db = await getDb();
  const payments = await db.collection<PaymentDoc>(PAYMENTS_COLLECTION)
    .find({ normalizedName: memberKey, status: "completed" })
    .sort({ createdAt: -1 }).limit(40).toArray();
  const lastAmounts: Record<string, number> = {};
  for (const payment of payments) {
    if (!(payment.optionId in lastAmounts)) lastAmounts[payment.optionId] = payment.amountCrc;
  }
  return NextResponse.json({ lastAmounts });
}

export async function POST(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    memberKey?: string; itemId?: string; amountCrc?: number;
    payment?: { cash?: number; sinpe?: number; card?: number };
    note?: string;
  };
  const itemId = String(body.itemId ?? "") as keyof typeof BILLING_ITEMS;
  const item = BILLING_ITEMS[itemId];
  if (!item) return NextResponse.json({ error: "Seleccioná un producto o plan válido." }, { status: 400 });
  const amountCrc = Math.round(Number(body.amountCrc) || 0);
  if (amountCrc <= 0) return NextResponse.json({ error: "El monto debe ser mayor a cero." }, { status: 400 });
  const breakdown = {
    cash: Math.max(0, Math.round(Number(body.payment?.cash) || 0)),
    sinpe: Math.max(0, Math.round(Number(body.payment?.sinpe) || 0)),
    card: Math.max(0, Math.round(Number(body.payment?.card) || 0)),
  };
  if (breakdown.cash + breakdown.sinpe + breakdown.card !== amountCrc) {
    return NextResponse.json({ error: "La suma de efectivo, SINPE y tarjeta debe coincidir con el total." }, { status: 400 });
  }

  const db = await getDb();
  const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName: String(body.memberKey ?? "").trim() });
  if (!member?.memberName || !member.normalizedName) return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
  const used = Object.entries(breakdown).filter(([, value]) => value > 0).map(([key]) => key);
  const method = (used.length > 1 ? "mixed" : used[0] || "other") as PaymentDoc["method"];
  const now = new Date();
  const payment: PaymentDoc = {
    id: `pay-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    memberName: member.memberName,
    normalizedName: member.normalizedName,
    customerName: member.memberName,
    phone: String(member.phone ?? "").slice(0, 40),
    email: String(member.email ?? "").slice(0, 80),
    optionId: itemId,
    optionLabel: item.label,
    category: item.category,
    amountCrc,
    amountUsd: Math.round((amountCrc / 500) * 100) / 100,
    currency: "CRC",
    method,
    paymentBreakdown: breakdown,
    status: "completed",
    paypalOrderId: null,
    paypalCaptureId: null,
    note: String(body.note ?? "").trim().slice(0, 200),
    date: todayIso(),
    createdAt: now,
    recordedBy: "reception",
    recordedByStaffId: session.staffId,
    recordedByStaffName: session.staffName,
  };
  await db.collection<PaymentDoc>(PAYMENTS_COLLECTION).insertOne(payment);

  let nextBillingDate: string | null = null;
  if (item.category === "Plan" && item.days > 0) {
    nextBillingDate = nextBillingDateFromPayment(payment.date, {
      optionId: itemId,
      planLabel: item.label,
      fallbackDays: item.days,
    });
    const startedAt = member.membership?.startedAt || payment.date;
    await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne({ normalizedName: member.normalizedName }, { $set: {
      "membership.plan": item.label,
      "membership.lastPaidAt": payment.date,
      "membership.nextBillingDate": nextBillingDate,
      "membership.status": membershipStatus({
        plan: item.label,
        lastPaidAt: payment.date,
        nextBillingDate,
        startedAt,
      }).status,
      "membership.startedAt": startedAt,
      updatedAt: now,
    } });
  }

  return NextResponse.json({ ok: true, receipt: {
    id: payment.id, date: payment.date, createdAt: now.toISOString(), customerName: payment.customerName,
    itemLabel: item.label, amountCrc, breakdown, method, nextBillingDate,
    staffName: session.staffName || "Recepción",
  } });
}
