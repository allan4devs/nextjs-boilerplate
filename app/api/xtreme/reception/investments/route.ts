import { randomUUID, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import { authenticateStaffCode, resolveStaffSession } from "@/lib/xtreme/staff-session";
import {
  getProductInvestmentReport, listProductInvestors, PRODUCT_INVESTMENTS_COLLECTION, PRODUCT_INVESTORS_COLLECTION,
  type ProductInvestmentDoc, type ProductInvestorDoc,
} from "@/lib/xtreme/product-investments";
import { investmentMonthRange, validateInvestment, validateInvestor, investorNameKey } from "@/lib/xtreme/product-investment-model";

export const dynamic = "force-dynamic";
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const privateHeaders = { "Cache-Control": "private, no-store" };
const versionFilter = (revision: number) => revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision };
const validVersion = (body: Record<string, unknown>) => typeof body.id === "string" && body.id.length > 0 && body.id.length <= 80 && Number.isInteger(body.revision) && Number(body.revision) >= 0;

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception", true);
  if (!session) return fail("Sesión de recepción requerida.", 401);
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!investmentMonthRange(month)) return fail("Elegí un mes válido.");
  try {
    return NextResponse.json(await getProductInvestmentReport(await getDb(), month), { headers: privateHeaders });
  } catch (error) {
    console.error("PRODUCT INVESTMENTS GET", error);
    return fail("No se pudo cargar la comparación mensual.", 503);
  }
}

async function save(req: NextRequest, editing: boolean) {
  const session = await resolveStaffSession(req, "reception", true);
  if (!session) return fail("Sesión de recepción requerida.", 401);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !["investment", "investor"].includes(String(body.entity)) || (editing && !validVersion(body))) return fail("Registro o versión inválidos.");
  const id = editing ? String(body.id) : `${body.entity}-${randomUUID()}`;
  const revision = editing ? Number(body.revision) : 0;
  let values;
  try { values = body.entity === "investor" ? validateInvestor(body) : validateInvestment(body); }
  catch (error) { return fail(error instanceof Error ? error.message : "Datos inválidos."); }
  try {
    const db = await getDb();
    const now = new Date();
    const updatedBy = session.staffName || session.staffId || "Recepción";
    if (body.entity === "investor") {
      const investorValues = values as ReturnType<typeof validateInvestor>;
      const investors = await listProductInvestors(db);
      if (editing && !investors.some((row) => row.id === id)) return fail("Inversionista no encontrado.", 404);
      const nameKey = investorNameKey(investorValues.name);
      if (investors.some((row) => row.id !== id && investorNameKey(row.name) === nameKey)) return fail("Ya existe un inversionista con ese nombre.", 409);
      const collection = db.collection<ProductInvestorDoc>(PRODUCT_INVESTORS_COLLECTION);
      await collection.createIndex({ nameKey: 1 }, { unique: true });
      const stored = editing ? await collection.findOne({ _id: id }) : null;
      if (!stored) {
        if (revision !== 0) return fail("El inversionista cambió. Actualizá antes de guardar.", 409);
        await collection.insertOne({ _id: id, id, ...investorValues, nameKey, revision: 1, updatedAt: now, updatedBy });
      } else {
        const result = await collection.updateOne({ _id: id, revision }, { $set: { ...investorValues, nameKey, updatedAt: now, updatedBy }, $inc: { revision: 1 } });
        if (!result.matchedCount) return fail("Otra persona editó el inversionista. Actualizá antes de guardar.", 409);
      }
    } else {
      const investment = values as ReturnType<typeof validateInvestment>;
      const collection = db.collection<ProductInvestmentDoc>(PRODUCT_INVESTMENTS_COLLECTION);
      const existing = editing ? await collection.findOne({ id, deletedAt: { $exists: false } }) : null;
      if (editing && !existing) return fail("La inversión ya no existe.", 404);
      const investor = (await listProductInvestors(db)).find((row) => row.id === investment.investorId);
      if (!investor || (!investor.active && existing?.investorId !== investor.id)) return fail("Elegí un inversionista activo.");
      await collection.createIndex({ id: 1 }, { unique: true });
      if (editing) {
        const result = await collection.updateOne({ id, deletedAt: { $exists: false }, ...versionFilter(revision) }, {
          $set: { ...investment, updatedAt: now, updatedBy, updatedById: session.staffId ?? "" }, $inc: { revision: 1 },
        });
        if (!result.matchedCount) return fail("Otra persona editó esta inversión. Actualizá antes de guardar.", 409);
      } else {
        await collection.insertOne({ id, ...investment, revision: 1, source: "Registro de recepción", reportedAt: now, createdAt: now, updatedAt: now, updatedBy, updatedById: session.staffId ?? "" });
      }
    }
    await writeAudit(db, {
      actorRole: session.role, actorId: session.staffId, actorName: session.staffName,
      action: `product_${body.entity}_${editing ? "edited" : "created"}`, targetType: "system", targetId: id,
      summary: `${editing ? "Actualización" : "Registro"} de ${body.entity === "investor" ? "inversionista" : "inversión"}`,
      meta: { ...values, revision: revision + 1 },
    });
    return NextResponse.json({ ok: true, id, revision: revision + 1 }, { headers: privateHeaders, status: editing ? 200 : 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return fail("El registro ya existe o cambió. Actualizá antes de guardar.", 409);
    console.error("PRODUCT INVESTMENTS SAVE", error);
    return fail("No se pudo guardar. Tus datos siguen en el formulario.", 503);
  }
}
export async function POST(req: NextRequest) { return save(req, false); }
export async function PATCH(req: NextRequest) { return save(req, true); }

export async function DELETE(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception", true);
  if (!session) return fail("Sesión de recepción requerida.", 401);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !validVersion(body) || typeof body.code !== "string") return fail("Registro, versión y código admin requeridos.");
  try {
    const db = await getDb();
    const now = new Date();
    const window = Math.floor(now.getTime() / 900_000);
    const key = createHash("sha256").update(`${req.headers.get("x-forwarded-for") || "unknown"}|${window}`).digest("hex");
    const attempt = await db.collection<{ _id: string; count: number; expiresAt: Date }>("xtreme_gym_inventory_delete_attempts").findOneAndUpdate(
      { _id: key }, { $inc: { count: 1 }, $set: { expiresAt: new Date(now.getTime() + 900_000) } }, { upsert: true, returnDocument: "after" },
    );
    if ((attempt?.count ?? 0) > 5) return fail("Demasiados intentos. Esperá 15 minutos.", 429);
    if (!authenticateStaffCode(body.code, "admin")) return fail("Código admin incorrecto.", 403);
    const result = await db.collection<ProductInvestmentDoc>(PRODUCT_INVESTMENTS_COLLECTION).updateOne(
      { id: String(body.id), deletedAt: { $exists: false }, ...versionFilter(Number(body.revision)) },
      { $set: { deletedAt: now, updatedBy: session.staffName || session.staffId || "Recepción" }, $inc: { revision: 1 } },
    );
    if (!result.matchedCount) return fail("La inversión cambió o ya fue eliminada. Actualizá el mes.", 409);
    await writeAudit(db, { actorRole: session.role, actorId: session.staffId, actorName: session.staffName, action: "product_investment_deleted", targetType: "system", targetId: String(body.id), summary: "Inversión retirada del reporte mensual" });
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    console.error("PRODUCT INVESTMENTS DELETE", error);
    return fail("No se pudo eliminar la inversión.", 503);
  }
}
