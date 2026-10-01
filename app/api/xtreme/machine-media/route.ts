import { NextRequest, NextResponse } from "next/server";
import { findMachineGuide } from "@/app/lib/machines";
import { getDb } from "@/lib/helpers/mongodb";
import { getMachineMedia } from "@/lib/xtreme/machine-media";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = String(req.nextUrl.searchParams.get("id") ?? "").trim().slice(0, 80);
  const machine = findMachineGuide(id);
  if (!machine) return NextResponse.json({ error: "Máquina no encontrada." }, { status: 404 });

  const media = await getMachineMedia(await getDb(), machine.id);
  return NextResponse.json(
    {
      id: machine.id,
      videoUrl: media?.videoUrl || machine.videoUrl || "",
      videoLabel: media?.videoLabel || machine.videoLabel || "Video de técnica",
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
  );
}
