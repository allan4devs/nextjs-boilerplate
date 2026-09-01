import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { businessDate } from "@/lib/xtreme/business-date";
import {
  PAYMENTS_COLLECTION,
  PRODUCT_SALES_COLLECTION,
  type PaymentDoc,
} from "@/lib/xtreme/shared";
import type { ProductSaleDoc } from "@/lib/xtreme/product-inventory";

export const dynamic = "force-dynamic";

/**
 * Cierre de caja del día: totales de lo recaudado en recepción por método
 * (efectivo, SINPE, tarjeta), separando ventas de productos de pases/planes.
 * Costa Rica es UTC-6 fijo (sin horario de verano), así que el día de negocio
 * YYYY-MM-DD abarca [dateT06:00Z, +24h). Los pagos por PayPal/online no entran
 * al cierre de caja físico.
 */
function crDayRange(date: string) {
  const from = new Date(`${date}T06:00:00.000Z`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });

  const rawDate = req.nextUrl.searchParams.get("date");
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : businessDate();
  const { from, to } = crDayRange(date);
  const db = await getDb();

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

  return NextResponse.json({
    date,
    range: { from: from.toISOString(), to: to.toISOString() },
    productSales,
    memberPayments,
    totals,
    generatedAt: new Date().toISOString(),
    staffName: session.staffName || "Recepción",
  });
}
