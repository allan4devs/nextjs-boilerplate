/**
 * Aplica el conteo físico de recepción del 2026-08-28 sobre el inventario de la
 * app (xtreme_gym_product_inventory). El conteo es UN solo número por sabor
 * (no separa vitrina/bodega), así que se colapsa a una sola cantidad:
 * quantity = cameraQuantity = conteo, warehouseQuantity = 0.
 *
 * - Actualiza los SKU por sabor que ya existen (Powerade, Redcon, Agua, Chicles).
 * - Crea "Piñas" (no existía).
 * - NO toca las barritas: el conteo dice "Barritas 40" agregado y no se puede
 *   repartir entre Barrita de fresa y Barrita de maní sin el detalle.
 * - Deja auditoría por producto (before/after) en xtreme_gym_audit.
 *
 * Uso: node --env-file=.env scripts/excel/apply-physical-count-2026-08-28.mjs [--apply]
 */
import { MongoClient } from "mongodb";

const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");
const VERSION = "physical-count-2026-08-28";
const now = new Date();

// id de SKU existente -> cantidad contada (una sola cantidad, sin ubicación)
const COUNTS = {
  "powerade-zero": 9,               // Power Azul (Mixed Berry)
  "powerade-zero-grape": 21,        // Power Morado (Grape)
  "powerade-zero-fruit-punch": 18,  // Power Rojo (Fruit Punch)
  "redcon1-energy-freedom-frost": 10, // Redcon Azul  (SUPUESTO de color)
  "redcon1-energy-vice-city": 13,     // Redcon Morado (SUPUESTO de color)
  "redcon1-energy-drink": 13,         // Redcon Negro  (SUPUESTO de color)
  "agua-1-litro": 6,
  "agua": 10,                        // Agua 600 ml
  "chicle-verde": 13,
  "chicle-gris": 4,
};
// precios a corregir si están en 0
const PRICE_FIX = { "chicle-gris": 400 };
// producto nuevo
const NEW_PRODUCTS = [
  { id: "pinas", name: "Piñas", category: "chicles", price: 750, quantity: 6 },
];

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
const Inv = db.collection("xtreme_gym_product_inventory");
const Audit = db.collection("xtreme_gym_audit");

try {
  const rows = [];
  for (const [id, count] of Object.entries(COUNTS)) {
    const before = await Inv.findOne({ id });
    if (!before) { rows.push({ id, status: "NOT FOUND" }); continue; }
    const newPrice = PRICE_FIX[id] && (!before.price || before.price === 0) ? PRICE_FIX[id] : before.price;
    rows.push({
      id, name: before.name,
      beforeQty: before.quantity, beforeCam: before.cameraQuantity ?? "-", beforeWh: before.warehouseQuantity ?? "-",
      afterQty: count, price: newPrice,
      delta: count - (before.quantity ?? 0),
      status: "update",
    });
    if (apply) {
      await Inv.updateOne({ id }, { $set: {
        quantity: count, cameraQuantity: count, warehouseQuantity: 0,
        price: newPrice, inventoryCountVersion: VERSION, updatedAt: now,
      }});
      await Audit.updateOne(
        { id: `aud-${VERSION}-${id}` },
        { $setOnInsert: {
            id: `aud-${VERSION}-${id}`, at: now, actorRole: "admin",
            action: "product_inventory_adjusted", targetType: "system", targetId: id,
            summary: `Conteo físico recepción ${VERSION}: ${before.name}`,
            meta: { productName: before.name, reason: "Conteo físico recepción 2026-08-28",
              before: { quantity: before.quantity, cameraQuantity: before.cameraQuantity ?? before.quantity, warehouseQuantity: before.warehouseQuantity ?? 0, price: before.price },
              after: { quantity: count, cameraQuantity: count, warehouseQuantity: 0, price: newPrice } },
          } },
        { upsert: true },
      );
    }
  }

  const created = [];
  for (const p of NEW_PRODUCTS) {
    const exists = await Inv.findOne({ id: p.id });
    if (exists) { created.push({ id: p.id, status: "already exists" }); continue; }
    created.push({ id: p.id, name: p.name, qty: p.quantity, price: p.price, status: apply ? "created" : "would create" });
    if (apply) {
      await Inv.insertOne({
        id: p.id, name: p.name, category: p.category, quantity: p.quantity,
        cameraQuantity: p.quantity, warehouseQuantity: 0, price: p.price,
        inventoryCountVersion: VERSION, active: true, createdAt: now, updatedAt: now,
      });
    }
  }

  console.log(`MODE: ${apply ? "APPLY" : "dry-run"}`);
  console.log("\nUpdates:");
  for (const r of rows) console.log(`  ${r.status.padEnd(9)} ${r.id} | ${r.name ?? ""} | ${r.beforeQty}(cam ${r.beforeCam}/wh ${r.beforeWh}) -> ${r.afterQty} | ₡${r.price ?? ""} | Δ${r.delta ?? ""}`);
  console.log("\nNew products:");
  for (const c of created) console.log(`  ${c.status} ${c.id} ${c.name ?? ""} qty=${c.qty ?? ""} ₡${c.price ?? ""}`);
  if (!apply) console.log("\nVista previa. Agregá --apply para escribir.");
} finally { await client.close(); }
