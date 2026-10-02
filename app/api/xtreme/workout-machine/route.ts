import { NextRequest, NextResponse } from "next/server";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import { getPublicEquipment } from "@/lib/xtreme/public-equipment";

export async function GET(req: NextRequest) {
  const session = await requireMemberSession(req);
  if (!isSession(session)) return session;
  const { inventory, source } = await getPublicEquipment();
  if (source !== "shared") return NextResponse.json({ error: "No pudimos consultar las máquinas. Reintentá." }, { status: 503 });
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const matches = inventory.filter((item) => item.id === query || item.code.toLowerCase() === query.toLowerCase());
  if (matches.length !== 1) return NextResponse.json({ error: "Máquina no encontrada o código ambiguo. Escaneá el QR individual." }, { status: 404 });
  const asset = matches[0];
  if (asset.status === "fuera_de_servicio") return NextResponse.json({ error: "Esta máquina está fuera de servicio. Elegí otra." }, { status: 409 });
  return NextResponse.json({ asset: { id: asset.id, name: asset.name, code: asset.code, machineGuideId: asset.machineGuideId ?? "" } });
}
