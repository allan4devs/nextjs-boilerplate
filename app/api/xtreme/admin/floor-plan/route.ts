import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { getPublicEquipment } from "@/lib/xtreme/public-equipment";
import { parsePlanDocument, type PlanDocument } from "@/app/maquinas/plano/plan-model";
import { findMachineGuide } from "@/app/components/member/catalog/machines";

export const dynamic = "force-dynamic";
type SavedPlan = { _id: string; revision: number; plan: PlanDocument; savedAt: string };
async function authorized(req: NextRequest) {
  const session = await resolveStaffSession(req, "admin");
  return session?.role === "admin" || session?.role === "super";
}
function planId(req: NextRequest) {
  const floor = req.nextUrl?.searchParams.get("floor") ?? "1";
  return floor === "1" ? "main" : floor === "2" ? "floor-2" : null;
}
export async function GET(req: NextRequest) {
  try {
    const id = planId(req);
    if (!id) return NextResponse.json({ error: "Piso inválido." }, { status: 400 });
    if (!await authorized(req)) return NextResponse.json({ error: "Abrí Admin e iniciá sesión para guardar el plano en MongoDB." }, { status: 401 });
    const db = await getDb();
    const saved = await db.collection<SavedPlan>("xtreme_gym_floor_plans").findOne({ _id: id });
    return NextResponse.json(saved ?? { plan: null, revision: 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el plano de MongoDB. Reintentá." }, { status: 503 });
  }
}
export async function PUT(req: NextRequest) {
  try {
    const id = planId(req);
    if (!id) return NextResponse.json({ error: "Piso inválido." }, { status: 400 });
    if (!await authorized(req)) return NextResponse.json({ error: "Abrí Admin e iniciá sesión para guardar el plano en MongoDB." }, { status: 401 });
    const raw = await req.text();
    if (raw.length > 500_000) return NextResponse.json({ error: "El plano es demasiado grande." }, { status: 413 });
    let body;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
    if (!body || !Number.isSafeInteger(body.revision) || body.revision < 0) return NextResponse.json({ error: "Revisión inválida." }, { status: 400 });
    const { inventory: allInventory, source } = await getPublicEquipment();
    const inventory = allInventory.filter((asset) => (asset.floor ?? 1) === (id === "floor-2" ? 2 : 1));
    if (source === "fallback") throw new Error("Inventory unavailable");
    const plan = parsePlanDocument(body.plan, inventory);
    if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
    if (plan.customElements.some((element) => element.machineGuideId && !findMachineGuide(element.machineGuideId))) {
      return NextResponse.json({ error: "Una ficha vinculada no existe. Revisá el equipo manual." }, { status: 400 });
    }
    const db = await getDb();
    const collection = db.collection<SavedPlan>("xtreme_gym_floor_plans");
    const savedAt = new Date().toISOString();
    try {
      const result = await collection.updateOne({ _id: id, revision: body.revision }, {
        $set: { plan, savedAt }, $inc: { revision: 1 },
      }, { upsert: body.revision === 0 });
      if (!result.matchedCount && !result.upsertedCount) return NextResponse.json({ error: "El plano cambió en otra sesión. Elegí cuál conservar." }, { status: 409 });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === 11000) return NextResponse.json({ error: "El plano cambió en otra sesión. Elegí cuál conservar." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ revision: body.revision + 1, savedAt });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar en MongoDB. Tu copia local sigue disponible; reintentá." }, { status: 503 });
  }
}
