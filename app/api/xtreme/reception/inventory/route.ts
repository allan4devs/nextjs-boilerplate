import { randomUUID, createHash } from "crypto";
import { getMongoClient } from "@/lib/helpers/mongodb";
import { authenticateStaffCode } from "@/lib/xtreme/staff-session";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import {
  createProduct,
  listProducts,
  PRODUCT_CATEGORIES,
  recordProductSale,
  setProductActive,
  updateProductInventory,
} from "@/lib/xtreme/product-inventory";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import {
  AUDIT_COLLECTION,
  PRODUCT_INVENTORY_COLLECTION,
  PRODUCT_SALES_COLLECTION,
  type AuditDoc,
} from "@/lib/xtreme/shared";
import type { ProductCategory, ProductInventoryDoc, ProductSaleDoc } from "@/lib/xtreme/product-inventory";

async function receptionSession(req: NextRequest) {
  return resolveStaffSession(req, "reception", true);
}

export async function GET(req: NextRequest) {
  const session = await receptionSession(req);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });
  const db = await getDb();
  if (req.nextUrl.searchParams.get("dashboard") === "1") {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setHours(0, 0, 0, 0);
    const rawFrom = req.nextUrl.searchParams.get("from");
    const rawTo = req.nextUrl.searchParams.get("to");
    const parsedFrom = rawFrom ? new Date(rawFrom) : defaultFrom;
    const parsedTo = rawTo ? new Date(rawTo) : now;
    const from = Number.isNaN(parsedFrom.getTime()) ? defaultFrom : parsedFrom;
    const to = Number.isNaN(parsedTo.getTime()) ? now : parsedTo;
    const safeFrom = from <= to ? from : to;
    const safeTo = from <= to ? to : from;

    const [sales, totals, adjustments] = await Promise.all([
      db.collection<ProductSaleDoc>(PRODUCT_SALES_COLLECTION)
        .find({ createdAt: { $gte: safeFrom, $lte: safeTo } })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      db.collection<ProductSaleDoc>(PRODUCT_SALES_COLLECTION)
        .aggregate<{ totalIncome: number; saleCount: number; unitsSold: number }>([
          { $match: { createdAt: { $gte: safeFrom, $lte: safeTo } } },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: "$total" },
              saleCount: { $sum: 1 },
              unitsSold: {
                $sum: {
                  $reduce: {
                    input: "$items",
                    initialValue: 0,
                    in: { $add: ["$$value", "$$this.quantity"] },
                  },
                },
              },
            },
          },
        ])
        .next(),
      db.collection<AuditDoc>(AUDIT_COLLECTION)
        .find({ action: "product_inventory_adjusted", at: { $gte: safeFrom, $lte: safeTo } })
        .sort({ at: -1 })
        .limit(100)
        .toArray(),
    ]);
    const totalIncome = totals?.totalIncome ?? 0;
    const saleCount = totals?.saleCount ?? 0;
    const unitsSold = totals?.unitsSold ?? 0;
    return NextResponse.json({
      range: { from: safeFrom, to: safeTo },
      summary: {
        totalIncome,
        saleCount,
        unitsSold,
        averageTicket: saleCount ? Math.round(totalIncome / saleCount) : 0,
        adjustmentCount: adjustments.length,
      },
      sales,
      adjustments: adjustments.map((entry) => ({
        id: entry.id,
        at: entry.at,
        actorRole: entry.actorRole,
        summary: entry.summary,
        productId: entry.targetId,
        meta: entry.meta ?? {},
      })),
    });
  }
  const includeInactive = req.nextUrl.searchParams.get("status") === "all";
  const products = await listProducts(db, { includeInactive });
  return NextResponse.json({ products });
}

export async function PATCH(req: NextRequest) {
  const session = await receptionSession(req);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });
  const body = (await req.json()) as {
    action?: "set_active";
    id?: string;
    active?: boolean;
    quantity?: number;
    cameraQuantity?: number;
    warehouseQuantity?: number;
    price?: number;
    name?: string;
    category?: ProductCategory;
    image?: string;
  };
  if (!body.id) return NextResponse.json({ error: "Producto requerido." }, { status: 400 });

  // Activar/desactivar: no toca existencias ni precio, así que no exige esos
  // campos. Es lo único que permite reactivar un producto ya desactivado.
  if (body.action === "set_active") {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    const db = await getDb();
    const before = await db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION).findOne({ id: body.id });
    if (!before) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    const product = await setProductActive(db, body.id, body.active);
    if (!product) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    if (before.active !== product.active) {
      await writeAudit(db, {
        actorRole: session.role,
        action: "product_inventory_adjusted",
        targetType: "system",
        targetId: product.id,
        summary: product.active ? `Producto activado: ${product.name}` : `Producto desactivado: ${product.name}`,
        meta: { productName: product.name, before: { active: before.active !== false }, after: { active: product.active } },
      });
    }
    return NextResponse.json({ product });
  }

  const hasTotal = Number.isFinite(Number(body.quantity));
  const hasLocations = Number.isFinite(Number(body.cameraQuantity)) && Number.isFinite(Number(body.warehouseQuantity));
  if ((!hasTotal && !hasLocations) || !Number.isFinite(Number(body.price))) {
    return NextResponse.json({ error: "Existencias y precio son requeridos." }, { status: 400 });
  }
  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "El nombre del producto no puede quedar vacío." }, { status: 400 });
  }
  if (body.category !== undefined && !PRODUCT_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
  }
  const db = await getDb();
  // Sin filtro por active: también se puede editar (y ver el "antes" para
  // auditoría) un producto que esté desactivado.
  const before = await db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION).findOne({ id: body.id });
  const product = await updateProductInventory(db, body.id, {
    ...(hasTotal ? { quantity: Number(body.quantity) } : {}),
    ...(hasLocations ? { cameraQuantity: Number(body.cameraQuantity), warehouseQuantity: Number(body.warehouseQuantity) } : {}),
    price: Number(body.price),
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
    ...(body.image !== undefined ? { image: body.image } : {}),
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  if (before) {
    const quantityChanged = before.quantity !== product.quantity;
    const cameraChanged = (before.cameraQuantity ?? before.quantity) !== (product.cameraQuantity ?? product.quantity);
    const warehouseChanged = (before.warehouseQuantity ?? 0) !== (product.warehouseQuantity ?? 0);
    const priceChanged = before.price !== product.price;
    const nameChanged = before.name !== product.name;
    const categoryChanged = before.category !== product.category;
    const imageChanged = (before.image ?? "") !== (product.image ?? "");
    if (quantityChanged || cameraChanged || warehouseChanged || priceChanged || nameChanged || categoryChanged || imageChanged) {
      await writeAudit(db, {
        actorRole: session.role,
        action: "product_inventory_adjusted",
        targetType: "system",
        targetId: product.id,
        summary: nameChanged ? `Producto editado: ${before.name} → ${product.name}` : `Inventario reajustado: ${product.name}`,
        meta: {
          productName: product.name,
          before: {
            quantity: before.quantity,
            cameraQuantity: before.cameraQuantity ?? before.quantity,
            warehouseQuantity: before.warehouseQuantity ?? 0,
            price: before.price,
            ...(nameChanged ? { name: before.name } : {}),
            ...(categoryChanged ? { category: before.category } : {}),
          },
          after: {
            quantity: product.quantity,
            cameraQuantity: product.cameraQuantity ?? product.quantity,
            warehouseQuantity: product.warehouseQuantity ?? 0,
            price: product.price,
            ...(nameChanged ? { name: product.name } : {}),
            ...(categoryChanged ? { category: product.category } : {}),
          },
          delta: {
            quantity: product.quantity - before.quantity,
            cameraQuantity: (product.cameraQuantity ?? product.quantity) - (before.cameraQuantity ?? before.quantity),
            warehouseQuantity: (product.warehouseQuantity ?? 0) - (before.warehouseQuantity ?? 0),
            price: product.price - before.price,
          },
        },
      });
    }
  }
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest) {
  const session = await receptionSession(req);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });
  const body = (await req.json()) as {
    name?: string;
    category?: ProductCategory;
    price?: number;
    cameraQuantity?: number;
    warehouseQuantity?: number;
    image?: string;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "El nombre del producto es requerido." }, { status: 400 });
  }
  if (!body.category || !PRODUCT_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Elegí una categoría válida." }, { status: 400 });
  }
  if (!Number.isFinite(Number(body.price))) {
    return NextResponse.json({ error: "El precio es requerido." }, { status: 400 });
  }
  try {
    const db = await getDb();
    const product = await createProduct(db, {
      name: body.name,
      category: body.category,
      price: Number(body.price),
      cameraQuantity: Number(body.cameraQuantity) || 0,
      warehouseQuantity: Number(body.warehouseQuantity) || 0,
      image: body.image,
    });
    await writeAudit(db, {
      actorRole: session.role,
      action: "product_inventory_adjusted",
      targetType: "system",
      targetId: product.id,
      summary: `Producto creado: ${product.name}`,
      meta: {
        productName: product.name,
        after: {
          quantity: product.quantity,
          cameraQuantity: product.cameraQuantity ?? product.quantity,
          warehouseQuantity: product.warehouseQuantity ?? 0,
          price: product.price,
        },
      },
    });
    return NextResponse.json({ product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    if (message === "product_name_required") {
      return NextResponse.json({ error: "El nombre del producto es requerido." }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo crear el producto." }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const session = await receptionSession(req);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });
  const body = (await req.json()) as {
    items?: Array<{ productId: string; quantity: number }>;
    payment?: { method: "cash" | "sinpe" | "mixed"; cashAmount: number; sinpeAmount: number };
  };
  try {
    if (!body.payment) return NextResponse.json({ error: "Seleccioná cómo se pagó la venta." }, { status: 400 });
    const sale = await recordProductSale(await getDb(), body.items ?? [], session.staffName || session.role, body.payment);
    const products = await listProducts(await getDb());
    return NextResponse.json({ sale, products, staffName: session.staffName || "Recepción" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sale_failed";
    if (message.startsWith("insufficient_stock:")) {
      return NextResponse.json({ error: `No hay suficiente inventario de ${message.split(":").slice(1).join(":")}.` }, { status: 409 });
    }
    if (message === "payment_total_mismatch" || message === "mixed_payment_required" || message === "payment_method_required") {
      return NextResponse.json({ error: "El efectivo y el SINPE deben completar exactamente el total de la venta." }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo registrar la venta." }, { status: 400 });
  }
}


export async function DELETE(req: NextRequest) {
  const operator = await receptionSession(req);
  if (!operator) return NextResponse.json({ error: "Sesi?n de recepci?n requerida." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !body.id || !["sale", "purchase"].includes(body.kind) || typeof body.code !== "string") {
    return NextResponse.json({ error: "Registro y c?digo admin requeridos." }, { status: 400 });
  }
  const db = await getDb();
  // Atomic fixed-window limit, independent of whether the credential is correct.
  const window = Math.floor(Date.now() / 900_000);
  const key = createHash("sha256").update(`${req.headers.get("x-forwarded-for") || "unknown"}|${window}`).digest("hex");
  const attempt = await db.collection<{ _id: string; count: number; expiresAt: Date }>("xtreme_gym_inventory_delete_attempts").findOneAndUpdate(
    { _id: key }, { $inc: { count: 1 }, $set: { expiresAt: new Date(Date.now() + 900_000) } },
    { upsert: true, returnDocument: "after" },
  );
  if ((attempt?.count ?? 0) > 5) return NextResponse.json({ error: "Demasiados intentos. Esper? 15 minutos." }, { status: 429 });
  const admin = authenticateStaffCode(body.code, "admin");
  if (!admin) return NextResponse.json({ error: "C?digo admin incorrecto." }, { status: 403 });
  const transaction = (await getMongoClient()).startSession();
  try {
    await transaction.withTransaction(async () => {
      const options = { session: transaction };
      const stock = db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION);
      const audit = db.collection<AuditDoc>(AUDIT_COLLECTION);
      const now = new Date();
      let original: unknown;
      if (body.kind === "sale") {
        const sales = db.collection<ProductSaleDoc>(PRODUCT_SALES_COLLECTION);
        const sale = await sales.findOne({ id: body.id }, options);
        if (!sale) throw new Error("El registro ya fue eliminado o no existe.");
        original = sale;
        for (const item of sale.items) {
          const camera = item.cameraSold ?? item.quantity;
          const warehouse = item.warehouseSold ?? 0;
          if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(camera) || camera < 0 || !Number.isSafeInteger(warehouse) || warehouse < 0 || camera + warehouse !== item.quantity) {
            throw new Error("La venta tiene cantidades inv?lidas y requiere revisi?n.");
          }
          const result = await stock.updateOne({ id: item.productId }, [
            { $set: {
              cameraQuantity: { $add: [{ $ifNull: ["$cameraQuantity", "$quantity"] }, camera] },
              warehouseQuantity: { $add: [{ $ifNull: ["$warehouseQuantity", 0] }, warehouse] },
              quantity: { $add: ["$quantity", item.quantity] }, updatedAt: now,
            } },
          ], options);
          if (!result.matchedCount) throw new Error("No se encontr? un producto de la venta. Revis? el inventario.");
        }
        await sales.deleteOne({ _id: sale._id }, options);
      } else {
        const entry = await audit.findOne({ id: body.id, action: "product_inventory_adjusted" }, options);
        if (!entry) throw new Error("El registro ya fue eliminado o no existe.");
        const delta = entry.meta?.delta as { quantity?: number; cameraQuantity?: number; warehouseQuantity?: number } | undefined;
        const quantity = delta?.quantity;
        const camera = delta?.cameraQuantity;
        const warehouse = delta?.warehouseQuantity;
        if (typeof quantity !== "number" || typeof camera !== "number" || typeof warehouse !== "number" || !Number.isSafeInteger(quantity) || !Number.isSafeInteger(camera) || !Number.isSafeInteger(warehouse) || quantity <= 0 || camera < 0 || warehouse < 0 || camera + warehouse !== quantity) {
          throw new Error("Este movimiento no es una entrada de mercader?a reversible.");
        }
        original = entry;
        const result = await stock.updateOne({ id: entry.targetId, quantity: { $gte: quantity }, cameraQuantity: { $gte: camera }, warehouseQuantity: { $gte: warehouse } }, {
          $inc: { quantity: -quantity, cameraQuantity: -camera, warehouseQuantity: -warehouse }, $set: { updatedAt: now },
        }, options);
        if (!result.matchedCount) throw new Error("No hay existencias suficientes en c?mara o bodega para revertir esta entrada.");
        await audit.updateOne({ _id: entry._id }, { $set: { action: "product_inventory_entry_deleted" } }, options);
      }
      await audit.insertOne({
        id: `aud-${randomUUID()}`, at: now, actorRole: admin.role,
        ...(admin.id ? { actorId: admin.id } : {}), ...(admin.name ? { actorName: admin.name } : {}),
        action: body.kind === "sale" ? "product_sale_deleted" : "product_purchase_deleted",
        targetType: "system", targetId: body.id,
        summary: body.kind === "sale" ? "Venta eliminada y existencias devueltas" : "Entrada de mercader?a eliminada y existencias descontadas",
        meta: { original, requestedBy: operator.staffName || operator.role },
      }, options);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const expected = /^(El registro|La venta|No se encontr?|Este movimiento|No hay existencias)/.test(message);
    if (!expected) console.error("INVENTORY DELETE", error);
    return NextResponse.json({ error: expected ? message : "No se pudo eliminar el registro. No se aplicaron cambios; intent? de nuevo." }, { status: expected ? 409 : 500 });
  } finally {
    await transaction.endSession();
  }
}
