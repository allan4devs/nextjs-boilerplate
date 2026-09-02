import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import {
  listProducts,
  recordProductSale,
  updateProductInventory,
} from "@/lib/xtreme/product-inventory";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import {
  AUDIT_COLLECTION,
  PRODUCT_INVENTORY_COLLECTION,
  PRODUCT_SALES_COLLECTION,
  type AuditDoc,
} from "@/lib/xtreme/shared";
import type { ProductInventoryDoc, ProductSaleDoc } from "@/lib/xtreme/product-inventory";

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
  const products = await listProducts(db);
  return NextResponse.json({ products });
}

export async function PATCH(req: NextRequest) {
  const session = await receptionSession(req);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });
  const body = (await req.json()) as { id?: string; quantity?: number; cameraQuantity?: number; warehouseQuantity?: number; price?: number };
  const hasTotal = Number.isFinite(Number(body.quantity));
  const hasLocations = Number.isFinite(Number(body.cameraQuantity)) && Number.isFinite(Number(body.warehouseQuantity));
  if (!body.id || (!hasTotal && !hasLocations) || !Number.isFinite(Number(body.price))) {
    return NextResponse.json({ error: "Producto, existencias y precio son requeridos." }, { status: 400 });
  }
  const db = await getDb();
  const before = await db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION).findOne({ id: body.id, active: true });
  const product = await updateProductInventory(db, body.id, {
    ...(hasTotal ? { quantity: Number(body.quantity) } : {}),
    ...(hasLocations ? { cameraQuantity: Number(body.cameraQuantity), warehouseQuantity: Number(body.warehouseQuantity) } : {}),
    price: Number(body.price),
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  if (before) {
    const quantityChanged = before.quantity !== product.quantity;
    const cameraChanged = (before.cameraQuantity ?? before.quantity) !== (product.cameraQuantity ?? product.quantity);
    const warehouseChanged = (before.warehouseQuantity ?? 0) !== (product.warehouseQuantity ?? 0);
    const priceChanged = before.price !== product.price;
    if (quantityChanged || cameraChanged || warehouseChanged || priceChanged) {
      await writeAudit(db, {
        actorRole: session.role,
        action: "product_inventory_adjusted",
        targetType: "system",
        targetId: product.id,
        summary: `Inventario reajustado: ${product.name}`,
        meta: {
          productName: product.name,
          before: {
            quantity: before.quantity,
            cameraQuantity: before.cameraQuantity ?? before.quantity,
            warehouseQuantity: before.warehouseQuantity ?? 0,
            price: before.price,
          },
          after: {
            quantity: product.quantity,
            cameraQuantity: product.cameraQuantity ?? product.quantity,
            warehouseQuantity: product.warehouseQuantity ?? 0,
            price: product.price,
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
