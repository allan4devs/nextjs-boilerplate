import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { buildMonthlySalesReportPdf } from "@/lib/xtreme/product-sales-report-pdf";
import { getProductSalesReport } from "@/lib/xtreme/product-sales-report";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { getProductInvestmentReport } from "@/lib/xtreme/product-investments";
import { investmentMonthRange, summarizeInvestments } from "@/lib/xtreme/product-investment-model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception", true);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month") ?? "";
  const bounds = investmentMonthRange(month);
  if (!bounds) return NextResponse.json({ error: "Mes inválido. Usá el formato AAAA-MM." }, { status: 400 });

  const db = await getDb();
  const [report, investments] = await Promise.all([
    getProductSalesReport(db, bounds.from, new Date(bounds.to.getTime() - 1)),
    getProductInvestmentReport(db, month),
  ]);
  const comparison = { ...investments, ...summarizeInvestments(investments.entries, investments.investors, report.summary.totalIncome, report.summary.saleCount) };
  const monthLabel = new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Costa_Rica",
  }).format(bounds.from);
  const bytes = await buildMonthlySalesReportPdf({ ...report, investments: comparison }, { monthLabel });

  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-ventas-xtreme-${month}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
