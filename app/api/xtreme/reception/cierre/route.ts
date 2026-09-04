import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import { getDb } from "@/lib/helpers/mongodb";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { businessDate } from "@/lib/xtreme/business-date";
import { writeAudit } from "@/lib/xtreme/audit";
import {
  CASH_CLOSEOUTS_COLLECTION,
  PAYMENTS_COLLECTION,
  PRODUCT_SALES_COLLECTION,
  type PaymentDoc,
} from "@/lib/xtreme/shared";
import type { ProductSaleDoc } from "@/lib/xtreme/product-inventory";

export const dynamic = "force-dynamic";

/**
 * Cierre de caja de recepción, por turno.
 *
 * Cada cierre es un documento persistido que cubre exactamente [from, to):
 * `from` es el fin del cierre anterior (o el inicio del día de negocio si es el
 * primero) y `to` es el momento en que se cerró. Así el siguiente cierre arranca
 * un turno nuevo y nunca se repiten las mismas ventas en dos comprobantes.
 *
 * Costa Rica es UTC-6 fijo, así que el día de negocio YYYY-MM-DD abarca
 * [dateT06:00Z, +24h). Los cobros por PayPal/online no entran a la caja física.
 */
type CloseoutTotals = {
  productSales: { count: number; units: number; cash: number; sinpe: number; card: number; total: number };
  memberPayments: { count: number; cash: number; sinpe: number; card: number; other: number; total: number };
  totals: { efectivo: number; sinpe: number; tarjeta: number; otros: number; total: number };
};

type CashCloseoutDoc = CloseoutTotals & {
  id: string;
  businessDate: string;
  seq: number;
  from: Date;
  to: Date;
  staffName: string;
  staffId: string | null;
  actorRole: string;
  createdAt: Date;
};

function crDayStart(date: string) {
  return new Date(`${date}T06:00:00.000Z`);
}

async function computeCloseoutTotals(db: Db, from: Date, to: Date): Promise<CloseoutTotals> {
  const [sales, payments] = await Promise.all([
    db.collection<ProductSaleDoc>(PRODUCT_SALES_COLLECTION)
      .find({ createdAt: { $gte: from, $lt: to } })
      .toArray(),
    db.collection<PaymentDoc>(PAYMENTS_COLLECTION)
      .find({ status: "completed", createdAt: { $gte: from, $lt: to } })
      .toArray(),
  ]);

  // Ventas de productos: el POS solo cobra efectivo/SINPE (mixto se reparte
  // entre esos dos), nunca tarjeta.
  const productSales = { count: 0, units: 0, cash: 0, sinpe: 0, card: 0, total: 0 };
  for (const s of sales) {
    productSales.count += 1;
    productSales.units += (s.items ?? []).reduce((n, i) => n + (Number(i.quantity) || 0), 0);
    productSales.cash += Number(s.cashAmount) || 0;
    productSales.sinpe += Number(s.sinpeAmount) || 0;
    productSales.total += Number(s.total) || 0;
  }

  // Pases del día y planes: guardan desglose efectivo/SINPE/tarjeta.
  const memberPayments = { count: 0, cash: 0, sinpe: 0, card: 0, other: 0, total: 0 };
  for (const p of payments) {
    if (p.method === "paypal" || p.recordedBy === "paypal") continue; // online, no es caja física
    const amount = Number(p.amountCrc) || 0;
    memberPayments.count += 1;
    memberPayments.total += amount;
    if (p.paymentBreakdown) {
      memberPayments.cash += Number(p.paymentBreakdown.cash) || 0;
      memberPayments.sinpe += Number(p.paymentBreakdown.sinpe) || 0;
      memberPayments.card += Number(p.paymentBreakdown.card) || 0;
    } else if (p.method === "cash") {
      memberPayments.cash += amount;
    } else if (p.method === "sinpe" || p.method === "transfer") {
      memberPayments.sinpe += amount;
    } else if (p.method === "card") {
      memberPayments.card += amount;
    } else {
      memberPayments.other += amount;
    }
  }

  const totals = {
    efectivo: productSales.cash + memberPayments.cash,
    sinpe: productSales.sinpe + memberPayments.sinpe,
    tarjeta: productSales.card + memberPayments.card,
    otros: memberPayments.other,
    total: 0,
  };
  totals.total = totals.efectivo + totals.sinpe + totals.tarjeta + totals.otros;

  return { productSales, memberPayments, totals };
}

function serializeCloseout(doc: CashCloseoutDoc) {
  return {
    id: doc.id,
    businessDate: doc.businessDate,
    seq: doc.seq,
    from: doc.from.toISOString(),
    to: doc.to.toISOString(),
    staffName: doc.staffName,
    productSales: doc.productSales,
    memberPayments: doc.memberPayments,
    totals: doc.totals,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });

  const db = await getDb();
  const today = businessDate();
  const rawDate = req.nextUrl.searchParams.get("date");
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;
  const closeoutsCol = db.collection<CashCloseoutDoc>(CASH_CLOSEOUTS_COLLECTION);
  const history = (await closeoutsCol.find({ businessDate: date }).sort({ seq: 1 }).toArray()).map(serializeCloseout);

  // Días pasados: solo lectura. Se listan los cierres guardados y, si quedó algo
  // sin cerrar después del último, se muestra como remanente para no ocultarlo.
  if (date < today) {
    const dayStart = crDayStart(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const lastTo = history.length ? new Date(history[history.length - 1].to) : dayStart;
    const rest = await computeCloseoutTotals(db, lastTo, dayEnd);
    return NextResponse.json({
      open: false,
      date,
      staffName: session.staffName || "Recepción",
      history,
      remainder: rest.totals.total > 0 ? { from: lastTo.toISOString(), to: dayEnd.toISOString(), ...rest } : null,
    });
  }

  // Turno abierto: desde el fin del último cierre (global) o el inicio del día.
  const lastClose = await closeoutsCol.find({}).sort({ to: -1 }).limit(1).next();
  const dayStart = crDayStart(today);
  const shiftFrom = lastClose && lastClose.to > dayStart ? lastClose.to : dayStart;
  const now = new Date();
  const { productSales, memberPayments, totals } = await computeCloseoutTotals(db, shiftFrom, now);

  return NextResponse.json({
    open: true,
    date: today,
    seq: history.length + 1,
    range: { from: shiftFrom.toISOString(), to: now.toISOString() },
    productSales,
    memberPayments,
    totals,
    generatedAt: now.toISOString(),
    staffName: session.staffName || "Recepción",
    history,
  });
}

export async function POST(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception", true);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });

  const db = await getDb();
  const now = new Date();
  const bizDate = businessDate(now);
  const dayStart = crDayStart(bizDate);
  const closeoutsCol = db.collection<CashCloseoutDoc>(CASH_CLOSEOUTS_COLLECTION);

  const lastClose = await closeoutsCol.find({}).sort({ to: -1 }).limit(1).next();
  const shiftFrom = lastClose && lastClose.to > dayStart ? lastClose.to : dayStart;

  // Guarda contra doble clic / doble submit: un turno real dura minutos.
  if (now.getTime() - shiftFrom.getTime() < 2000) {
    return NextResponse.json(
      { error: "Ya se hizo un cierre hace un momento. Esperá a que entren nuevas ventas antes de cerrar otro turno." },
      { status: 409 },
    );
  }

  const { productSales, memberPayments, totals } = await computeCloseoutTotals(db, shiftFrom, now);
  const seq = (await closeoutsCol.countDocuments({ businessDate: bizDate })) + 1;

  const doc: CashCloseoutDoc = {
    id: `cc-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    businessDate: bizDate,
    seq,
    from: shiftFrom,
    to: now,
    staffName: session.staffName || "Recepción",
    staffId: session.staffId ?? null,
    actorRole: session.role,
    productSales,
    memberPayments,
    totals,
    createdAt: now,
  };
  await closeoutsCol.insertOne(doc);

  await writeAudit(db, {
    actorRole: session.role,
    actorId: session.staffId,
    actorName: session.staffName,
    action: "cash_closeout",
    targetType: "system",
    targetId: doc.id,
    summary: `Cierre de caja #${seq} (${bizDate}) · ${session.staffName || "Recepción"} · ₡${totals.total}`,
    meta: {
      seq,
      from: shiftFrom.toISOString(),
      to: now.toISOString(),
      total: totals.total,
      efectivo: totals.efectivo,
      sinpe: totals.sinpe,
      tarjeta: totals.tarjeta,
      otros: totals.otros,
    },
  });

  return NextResponse.json({ closeout: serializeCloseout(doc) });
}
