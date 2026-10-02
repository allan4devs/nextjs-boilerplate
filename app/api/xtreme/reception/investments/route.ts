import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { getProductInvestmentReport, investmentMonthRange } from "@/lib/xtreme/product-investments";

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception", true);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!investmentMonthRange(month)) {
    return NextResponse.json({ error: "Elegí un mes válido." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getProductInvestmentReport(await getDb(), month));
  } catch (error) {
    console.error("PRODUCT INVESTMENTS GET", error);
    return NextResponse.json({ error: "No se pudo cargar la comparación mensual." }, { status: 500 });
  }
}
