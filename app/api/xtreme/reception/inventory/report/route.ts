import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { buildMonthlySalesReportPdf } from "@/lib/xtreme/product-sales-report-pdf";
import { getProductSalesReport } from "@/lib/xtreme/product-sales-report";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function monthBounds(month: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const from = new Date(Date.UTC(year, monthIndex, 1, 6));
  const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1, 6));
  const to = new Date(nextMonth.getTime() - 1);
  return { from, to };
}

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception", true);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month") ?? "";
  const bounds = monthBounds(month);
  if (!bounds) return NextResponse.json({ error: "Mes inválido. Usá el formato AAAA-MM." }, { status: 400 });

  const report = await getProductSalesReport(await getDb(), bounds.from, bounds.to);
  const monthLabel = new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Costa_Rica",
  }).format(bounds.from);
  const bytes = await buildMonthlySalesReportPdf(report, { monthLabel });

  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-ventas-xtreme-${month}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
