import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { computeUsageBitacora } from "@/lib/xtreme/session-analytics";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "admin", true);
  if (session?.role !== "admin" && session?.role !== "super") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    const usage = await computeUsageBitacora(db, 14);
    return NextResponse.json(
      { usage },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("XTREME ADMIN ANALYTICS", error);
    return NextResponse.json(
      { error: "No se pudo cargar la bitácora." },
      { status: 500 },
    );
  }
}
