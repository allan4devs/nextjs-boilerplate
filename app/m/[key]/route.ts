import { NextResponse } from "next/server";
import { findMachineGuide } from "@/app/components/member/catalog/machines";
import { getMachineGuideIdFromShortKey } from "@/app/lib/machine-short-links";

type Params = { params: Promise<{ key: string }> };

/** Respaldo legible de las etiquetas: sólo permite destinos del catálogo. */
export async function GET(request: Request, { params }: Params) {
  const { key } = await params;
  const guideId = getMachineGuideIdFromShortKey(key);
  const machine = guideId ? findMachineGuide(guideId) : undefined;

  if (!machine) {
    return NextResponse.json({ error: "Máquina no encontrada." }, { status: 404 });
  }

  return NextResponse.redirect(new URL(`/maquinas/${machine.id}`, request.url), 308);
}
