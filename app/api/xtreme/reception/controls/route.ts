import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { RECEPTION_CONTROLS_COLLECTION } from "@/lib/xtreme/shared";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

const KINDS = ["vip", "seniors", "tanning", "electricity", "sales"] as const;
type ControlKind = (typeof KINDS)[number];

type ControlDoc = {
  id: string;
  kind: ControlKind;
  date: string;
  name: string;
  detail: string;
  quantity: number;
  amount: number;
  status: "pending" | "paid" | "completed";
  paymentMethod: string;
  note: string;
  createdAt: Date;
  createdBy: string;
};

function validKind(value: string): value is ControlKind {
  return KINDS.includes(value as ControlKind);
}

async function session(req: NextRequest) {
  return resolveStaffSession(req, "reception");
}

export async function GET(req: NextRequest) {
  if (!(await session(req))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const kind = String(req.nextUrl.searchParams.get("kind") ?? "");
  if (!validKind(kind)) return NextResponse.json({ error: "Panel inválido." }, { status: 400 });
  try {
    const db = await getDb();
    const records = await db.collection<ControlDoc>(RECEPTION_CONTROLS_COLLECTION)
      .find({ kind }).sort({ date: -1, createdAt: -1 }).limit(250).toArray();
    return NextResponse.json({ records: records.map(({ _id, ...record }) => record) });
  } catch (error) {
    console.error("XTREME RECEPTION CONTROLS GET", error);
    return NextResponse.json({ error: "No se pudo cargar el control." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const staff = await session(req);
  if (!staff) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const body = (await req.json()) as Partial<ControlDoc>;
    const kind = String(body.kind ?? "");
    if (!validKind(kind)) return NextResponse.json({ error: "Panel inválido." }, { status: 400 });
    const name = String(body.name ?? "").trim().slice(0, 120);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) ? String(body.date) : new Date().toISOString().slice(0, 10);
    if (!name) return NextResponse.json({ error: "Completá el nombre o concepto." }, { status: 400 });
    const record: ControlDoc = {
      id: `ctl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      date,
      name,
      detail: String(body.detail ?? "").trim().slice(0, 180),
      quantity: Math.max(0, Number(body.quantity) || 0),
      amount: Math.max(0, Number(body.amount) || 0),
      status: ["pending", "paid", "completed"].includes(String(body.status)) ? body.status as ControlDoc["status"] : "completed",
      paymentMethod: String(body.paymentMethod ?? "").trim().slice(0, 40),
      note: String(body.note ?? "").trim().slice(0, 300),
      createdAt: new Date(),
      createdBy: staff.role,
    };
    const db = await getDb();
    await db.collection<ControlDoc>(RECEPTION_CONTROLS_COLLECTION).insertOne(record);
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    console.error("XTREME RECEPTION CONTROLS POST", error);
    return NextResponse.json({ error: "No se pudo guardar el registro." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const staff = await session(req);
  if (!staff) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const body = (await req.json()) as { id?: string; status?: ControlDoc["status"] };
    if (!body.id || !["pending", "paid", "completed"].includes(String(body.status))) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    const db = await getDb();
    const result = await db.collection<ControlDoc>(RECEPTION_CONTROLS_COLLECTION).updateOne({ id: body.id }, { $set: { status: body.status, updatedAt: new Date(), updatedBy: staff.role } });
    if (!result.matchedCount) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("XTREME RECEPTION CONTROLS PATCH", error);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
}
