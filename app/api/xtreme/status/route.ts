import { NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { computeOccupancy } from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const status = await computeOccupancy(db);
    return NextResponse.json(status);
  } catch (err) {
    console.error("XTREME STATUS GET", err);
    return NextResponse.json({ error: "No se pudo cargar la ocupacion." }, { status: 500 });
  }
}
