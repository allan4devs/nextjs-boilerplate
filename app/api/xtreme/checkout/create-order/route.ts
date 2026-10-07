import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, message: "Los pagos en línea están deshabilitados. Contactá a Xtreme Gym por WhatsApp." },
    { status: 410 },
  );
}
