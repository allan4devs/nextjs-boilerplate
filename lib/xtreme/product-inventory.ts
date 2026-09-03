import { randomUUID } from "crypto";
import type { Db } from "mongodb";
import {
  AUDIT_COLLECTION,
  PRODUCT_INVENTORY_COLLECTION,
  PRODUCT_SALES_COLLECTION,
  type AuditDoc,
} from "./shared";

export type ProductCategory = "bebidas" | "proteinas" | "creatinas" | "hidratantes" | "chicles";

export const PRODUCT_CATEGORIES: ProductCategory[] = ["bebidas", "proteinas", "creatinas", "hidratantes", "chicles"];

export type ProductInventoryDoc = {
  id: string;
  name: string;
  category: ProductCategory;
  image?: string;
  quantity: number;
  cameraQuantity?: number;
  warehouseQuantity?: number;
  price: number;
  unitsPerPackage?: number;
  inventoryCountVersion?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductSaleDoc = {
  id: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;
  total: number;
  paymentMethod: "cash" | "sinpe" | "mixed";
  cashAmount: number;
  sinpeAmount: number;
  soldBy: string;
  createdAt: Date;
};

const DEFAULT_PRODUCTS: Array<Pick<ProductInventoryDoc, "id" | "name" | "category" | "image"> & { defaultPrice?: number; unitsPerPackage?: number }> = [
  { id: "electrolytes-extra-strength", name: "Electrolytes Extra Strength", category: "hidratantes", image: "/xtreme/products/electrolytes-extra-strength.jpeg" },
  { id: "vega-all-in-one-chocolate", name: "Vega All-in-One Chocolate", category: "proteinas", image: "/xtreme/products/vega-all-in-one-chocolate.jpeg" },
  { id: "biosteel-plant-protein", name: "BioSteel Plant-Based Protein", category: "proteinas", image: "/xtreme/products/biosteel-plant-protein.jpeg" },
  { id: "ruthless-pre-workout", name: "Ruthless Pre-Workout", category: "hidratantes", image: "/xtreme/products/ruthless-pre-workout.jpeg" },
  { id: "c4-sport-fruit-punch", name: "C4 Sport Fruit Punch", category: "hidratantes", image: "/xtreme/products/c4-sport-fruit-punch.jpeg" },
  { id: "ans-keto-cocoa", name: "ANS Keto Cocoa", category: "proteinas", image: "/xtreme/products/ans-keto-cocoa.jpeg" },
  { id: "ghost-bcaa-sour-patch", name: "Ghost BCAA Sour Patch", category: "hidratantes", image: "/xtreme/products/ghost-bcaa-sour-patch.jpeg" },
  { id: "c4-sport-mango-nectar", name: "C4 Sport Mango Nectar", category: "hidratantes", image: "/xtreme/products/c4-sport-mango-nectar.jpeg" },
  { id: "freakmaker-gxs", name: "FreakMaker GXS Amino", category: "hidratantes", image: "/xtreme/products/freakmaker-gxs.jpeg" },
  { id: "re-lyte-hydration-mango", name: "Re-Lyte Hydration Mango", category: "hidratantes", image: "/xtreme/products/re-lyte-hydration-mango.jpeg" },
  { id: "on-amino-energy", name: "Optimum Nutrition Amino Energy", category: "hidratantes", image: "/xtreme/products/on-amino-energy.jpeg" },
  { id: "naka-creatine-3000", name: "Naka Creatine 3000 mg", category: "creatinas", image: "/xtreme/products/naka-creatine-3000.jpeg" },
  { id: "ryse-jet-puffed-protein", name: "Ryse Jet-Puffed Protein", category: "proteinas", image: "/xtreme/products/ryse-jet-puffed-protein.jpeg" },
  { id: "agua", name: "Agua Alpina 600 ml", category: "bebidas", image: "/xtreme/products/agua-alpina-600ml.jpeg" },
  { id: "agua-1-litro", name: "Agua Alpina 1 litro", category: "bebidas", image: "/xtreme/products/agua-alpina-1l.jpeg" },
  { id: "powerade-zero", name: "Powerade Zero Mixed Berry", category: "bebidas", image: "/xtreme/products/powerade-zero-mixed-berry.jpeg" },
  { id: "powerade-zero-grape", name: "Powerade Zero Grape", category: "bebidas", image: "/xtreme/products/powerade-zero-grape.jpeg" },
  { id: "powerade-zero-fruit-punch", name: "Powerade Zero Fruit Punch", category: "bebidas", image: "/xtreme/products/powerade-zero-fruit-punch.jpeg" },
  { id: "redcon1-energy-drink", name: "Redcon1 Energy Sour Gummy Blast", category: "bebidas", image: "/xtreme/products/redcon1-energy-sour-gummy-blast.jpeg" },
  { id: "redcon1-energy-freedom-frost", name: "Redcon1 Energy Freedom Frost", category: "bebidas", image: "/xtreme/products/redcon1-energy-freedom-frost.jpeg" },
  { id: "redcon1-energy-vice-city", name: "Redcon1 Energy Vice City", category: "bebidas", image: "/xtreme/products/redcon1-energy-vice-city.jpeg" },
  { id: "monster-white", name: "Monster Energy Ultra White", category: "bebidas", image: "/xtreme/products/monster-white.jpeg" },
  { id: "barrita-mani", name: "Barrita de maní", category: "proteinas", defaultPrice: 500 },
  { id: "barrita-fresa", name: "Barrita de fresa", category: "proteinas", defaultPrice: 500 },
  // Inventario "por unidad": los chicles se venden y cuentan individualmente,
  // no como paquete de 5. Sin unitsPerPackage => cada existencia es una unidad.
  { id: "chicle-verde", name: "Chicle verde", category: "chicles" },
  // Precio real ₡400 confirmado en el conteo físico del 28/08/2026 (antes solo
  // vivía en Mongo vía script suelto); se codifica acá para no perderlo si el
  // documento se recrea.
  { id: "chicle-gris", name: "Chicle gris", category: "chicles", defaultPrice: 400 },
  // Se vendía desde el 28/08/2026 (script suelto que la creó directo en Mongo,
  // sin quedar en este catálogo). Se agrega acá para que el seed la reconozca
  // y quede disponible aunque el documento se recree.
  { id: "pinas", name: "Piñas", category: "chicles", defaultPrice: 1200 },
];

const PHYSICAL_COUNT_VERSION = "physical-count-2026-08-04";
const PHYSICAL_COUNTS = [
  { id: "barrita-fresa", quantity: 23, cameraQuantity: 12, warehouseQuantity: 11 },
  { id: "barrita-mani", quantity: 12, cameraQuantity: 12, warehouseQuantity: 0 },
  { id: "chicle-verde", quantity: 31, cameraQuantity: 31, warehouseQuantity: 0 },
  { id: "chicle-gris", quantity: 9, cameraQuantity: 9, warehouseQuantity: 0 },
] as const;

export async function ensureDefaultProducts(db: Db) {
  const now = new Date();
  if (!DEFAULT_PRODUCTS.length) return;
  const collection = db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION);
  await collection.bulkWrite(
    DEFAULT_PRODUCTS.map((product) => ({
      updateOne: {
        filter: { id: product.id },
        update: {
          $set: {
            name: product.name,
            ...(product.image ? { image: product.image } : {}),
            // Todo producto del catálogo debe quedar disponible para la venta.
            // No hay UI para desactivar productos hoy, así que forzarlo acá
            // reactiva cualquiera que se haya desactivado por otra vía.
            active: true,
          },
          $setOnInsert: {
            id: product.id,
            category: product.category,
            quantity: 0,
            price: product.defaultPrice ?? 0,
            ...(product.unitsPerPackage ? { unitsPerPackage: product.unitsPerPackage } : {}),
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    })),
  );
  // Compatibilidad con el producto genérico creado antes de separar presentaciones.
  await collection.updateOne(
    { id: "agua", name: "Agua" },
    { $set: { name: "Agua 600 ml", updatedAt: now } },
  );
  await collection.updateOne(
    { id: "powerade-zero", name: "Powerade Zero" },
    { $set: { name: "Powerade Zero Mixed Berry", updatedAt: now } },
  );
  await collection.updateOne(
    { id: "redcon1-energy-drink", name: "Redcon1 Energy Drink" },
    { $set: { name: "Redcon1 Energy Sour Gummy Blast", updatedAt: now } },
  );

  // Conteo físico informado el 4 de agosto de 2026. La versión evita volver a
  // sobrescribir el inventario después de ventas o conteos posteriores.
  for (const count of PHYSICAL_COUNTS) {
    const before = await collection.findOne({
      id: count.id,
      inventoryCountVersion: { $ne: PHYSICAL_COUNT_VERSION },
    });
    if (!before) continue;
    const now = new Date();
    const result = await collection.updateOne(
      { id: count.id, inventoryCountVersion: { $ne: PHYSICAL_COUNT_VERSION } },
      {
        $set: {
          quantity: count.quantity,
          cameraQuantity: count.cameraQuantity,
          warehouseQuantity: count.warehouseQuantity,
          inventoryCountVersion: PHYSICAL_COUNT_VERSION,
          updatedAt: now,
        },
      },
    );
    if (!result.modifiedCount) continue;
    const audit: AuditDoc = {
      id: `aud-${PHYSICAL_COUNT_VERSION}-${count.id}`,
      at: now,
      actorRole: "admin",
      action: "product_inventory_adjusted",
      targetType: "system",
      targetId: count.id,
      summary: `Conteo físico inicial: ${before.name}`,
      meta: {
        productName: before.name,
        reason: "Conteo físico informado",
        before: {
          quantity: before.quantity,
          cameraQuantity: before.cameraQuantity ?? before.quantity,
          warehouseQuantity: before.warehouseQuantity ?? 0,
          price: before.price,
        },
        after: {
          quantity: count.quantity,
          cameraQuantity: count.cameraQuantity,
          warehouseQuantity: count.warehouseQuantity,
          price: before.price,
        },
        delta: {
          quantity: count.quantity - before.quantity,
          cameraQuantity: count.cameraQuantity - (before.cameraQuantity ?? before.quantity),
          warehouseQuantity: count.warehouseQuantity - (before.warehouseQuantity ?? 0),
          price: 0,
        },
      },
    };
    await db.collection<AuditDoc>(AUDIT_COLLECTION).updateOne(
      { id: audit.id },
      { $setOnInsert: audit },
      { upsert: true },
    );
  }
}

export async function listProducts(db: Db, opts: { includeInactive?: boolean } = {}) {
  await ensureDefaultProducts(db);
  const collection = db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION);
  const missingLocations = await collection
    .find({ $or: [{ cameraQuantity: { $exists: false } }, { warehouseQuantity: { $exists: false } }] })
    .toArray();
  if (missingLocations.length) {
    await collection.bulkWrite(
      missingLocations.map((product) => ({
        updateOne: {
          filter: { id: product.id },
          update: {
            $set: {
              cameraQuantity: product.cameraQuantity ?? product.quantity ?? 0,
              warehouseQuantity: product.warehouseQuantity ?? 0,
            },
          },
        },
      })),
    );
  }
  return collection
    .find(opts.includeInactive ? {} : { active: true })
    .sort({ category: 1, name: 1 })
    .toArray();
}

export async function updateProductInventory(
  db: Db,
  id: string,
  values: {
    quantity?: number;
    cameraQuantity?: number;
    warehouseQuantity?: number;
    price: number;
    name?: string;
    category?: ProductCategory;
    image?: string;
  },
) {
  const hasLocations = values.cameraQuantity !== undefined && values.warehouseQuantity !== undefined;
  const safeCameraQuantity = hasLocations
    ? Math.max(0, Math.floor(values.cameraQuantity ?? 0))
    : Math.max(0, Math.floor(values.quantity ?? 0));
  const safeWarehouseQuantity = hasLocations ? Math.max(0, Math.floor(values.warehouseQuantity ?? 0)) : 0;
  const safeQuantity = safeCameraQuantity + safeWarehouseQuantity;
  const safePrice = Math.max(0, Math.round(values.price));
  const name = values.name?.trim();
  const trimmedImage = values.image?.trim();
  const clearImage = values.image !== undefined && !trimmedImage;
  // Sin filtro por active: un producto inactivo también se puede editar (por
  // ejemplo corregir el precio antes de reactivarlo).
  return db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION).findOneAndUpdate(
    { id },
    {
      $set: {
        quantity: safeQuantity,
        cameraQuantity: safeCameraQuantity,
        warehouseQuantity: safeWarehouseQuantity,
        price: safePrice,
        updatedAt: new Date(),
        ...(name ? { name } : {}),
        ...(values.category ? { category: values.category } : {}),
        ...(trimmedImage ? { image: trimmedImage } : {}),
      },
      ...(clearImage ? { $unset: { image: "" as const } } : {}),
    },
    { returnDocument: "after" },
  );
}

// Activar/desactivar sin tocar existencias, precio ni nombre. Un producto
// desactivado no aparece en Ventas ni en el Inventario por defecto, pero
// sigue existiendo (y se puede reactivar) — no es un borrado.
export async function setProductActive(db: Db, id: string, active: boolean) {
  return db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION).findOneAndUpdate(
    { id },
    { $set: { active, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

// id legible y estable a partir del nombre: minúsculas, sin acentos, guiones.
function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createProduct(
  db: Db,
  input: {
    name: string;
    category: ProductCategory;
    price: number;
    quantity?: number;
    cameraQuantity?: number;
    warehouseQuantity?: number;
    image?: string;
  },
) {
  const name = input.name.trim();
  if (!name) throw new Error("product_name_required");
  if (!PRODUCT_CATEGORIES.includes(input.category)) throw new Error("product_category_required");

  const collection = db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION);
  const base = slugify(name) || "producto";
  let id = base;
  let attempt = 1;
  // Evita chocar con un id ya usado (incluye productos desactivados: el id
  // debe seguir siendo único aunque ya no estén a la venta).
  while (await collection.findOne({ id })) {
    attempt += 1;
    id = `${base}-${attempt}`;
  }

  const hasLocations = input.cameraQuantity !== undefined && input.warehouseQuantity !== undefined;
  const cameraQuantity = hasLocations
    ? Math.max(0, Math.floor(input.cameraQuantity ?? 0))
    : Math.max(0, Math.floor(input.quantity ?? 0));
  const warehouseQuantity = hasLocations ? Math.max(0, Math.floor(input.warehouseQuantity ?? 0)) : 0;
  const now = new Date();
  const doc: ProductInventoryDoc = {
    id,
    name,
    category: input.category,
    ...(input.image?.trim() ? { image: input.image.trim() } : {}),
    quantity: cameraQuantity + warehouseQuantity,
    cameraQuantity,
    warehouseQuantity,
    price: Math.max(0, Math.round(input.price)),
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(doc);
  return doc;
}

export async function recordProductSale(
  db: Db,
  requestedItems: Array<{ productId: string; quantity: number }>,
  soldBy: string,
  payment: { method: "cash" | "sinpe" | "mixed"; cashAmount: number; sinpeAmount: number },
) {
  const combined = new Map<string, number>();
  for (const item of requestedItems) {
    const quantity = Math.floor(Number(item.quantity));
    if (!item.productId || !Number.isFinite(quantity) || quantity <= 0) continue;
    combined.set(item.productId, (combined.get(item.productId) ?? 0) + quantity);
  }
  if (!combined.size) throw new Error("sale_items_required");

  const products = await db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION)
    .find({ id: { $in: [...combined.keys()] }, active: true })
    .toArray();
  if (products.length !== combined.size) throw new Error("product_not_found");

  const saleTotal = products.reduce(
    (sum, product) => sum + product.price * (combined.get(product.id) ?? 0),
    0,
  );
  const cashAmount = Math.max(0, Math.round(Number(payment.cashAmount)));
  const sinpeAmount = Math.max(0, Math.round(Number(payment.sinpeAmount)));
  if (!["cash", "sinpe", "mixed"].includes(payment.method)) throw new Error("payment_method_required");
  if (cashAmount + sinpeAmount !== saleTotal) throw new Error("payment_total_mismatch");
  if (payment.method === "cash" && (cashAmount !== saleTotal || sinpeAmount !== 0)) throw new Error("payment_total_mismatch");
  if (payment.method === "sinpe" && (sinpeAmount !== saleTotal || cashAmount !== 0)) throw new Error("payment_total_mismatch");
  if (payment.method === "mixed" && (!cashAmount || !sinpeAmount)) throw new Error("mixed_payment_required");

  const decremented: Array<{ id: string; quantity: number; cameraSold: number; warehouseSold: number }> = [];
  try {
    for (const product of products) {
      const quantity = combined.get(product.id) ?? 0;
      const cameraAvailable = product.cameraQuantity ?? product.quantity;
      const warehouseAvailable = product.warehouseQuantity ?? 0;
      const cameraSold = Math.min(cameraAvailable, quantity);
      const warehouseSold = quantity - cameraSold;
      if (warehouseSold > warehouseAvailable) throw new Error(`insufficient_stock:${product.name}`);
      const result = await db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION).updateOne(
        {
          id: product.id,
          active: true,
          quantity: { $gte: quantity },
          cameraQuantity: cameraAvailable,
          warehouseQuantity: warehouseAvailable,
        },
        {
          $inc: {
            quantity: -quantity,
            cameraQuantity: -cameraSold,
            warehouseQuantity: -warehouseSold,
          },
          $set: { updatedAt: new Date() },
        },
      );
      if (!result.modifiedCount) throw new Error(`insufficient_stock:${product.name}`);
      decremented.push({ id: product.id, quantity, cameraSold, warehouseSold });
    }

    const items = products.map((product) => ({
      productId: product.id,
      name: product.name,
      quantity: combined.get(product.id) ?? 0,
      unitPrice: product.price,
    }));
    const sale: ProductSaleDoc = {
      id: `sale-${randomUUID()}`,
      items,
      total: saleTotal,
      paymentMethod: payment.method,
      cashAmount,
      sinpeAmount,
      soldBy,
      createdAt: new Date(),
    };
    await db.collection<ProductSaleDoc>(PRODUCT_SALES_COLLECTION).insertOne(sale);
    return sale;
  } catch (error) {
    if (decremented.length) {
      await db.collection<ProductInventoryDoc>(PRODUCT_INVENTORY_COLLECTION).bulkWrite(
        decremented.map((item) => ({
          updateOne: {
            filter: { id: item.id },
            update: {
              $inc: {
                quantity: item.quantity,
                cameraQuantity: item.cameraSold,
                warehouseQuantity: item.warehouseSold,
              },
              $set: { updatedAt: new Date() },
            },
          },
        })),
      );
    }
    throw error;
  }
}
