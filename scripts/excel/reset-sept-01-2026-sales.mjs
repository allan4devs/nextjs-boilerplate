/**
 * Reinicia las ventas de setiembre 2026 (día 1) de Xtreme Gym.
 *
 * Qué hace (idempotente):
 *  1) Borra las 5 ventas de prueba del 1/9/2026 (soldBy="super", sin source).
 *  2) Pasa los chicles a "por unidad": renombra y elimina unitsPerPackage.
 *  3) Inserta las 6 ventas reales del 1/9/2026 y descuenta inventario
 *     (mostrador primero). Cada venta es de un solo producto, cantidad 1.
 *
 * Uso:
 *   node --env-file=.env scripts/excel/reset-sept-01-2026-sales.mjs           (vista previa)
 *   node --env-file=.env scripts/excel/reset-sept-01-2026-sales.mjs --apply   (escribe)
 */
import { MongoClient } from "mongodb";

const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");

const SEPT_FROM = new Date("2026-09-01T00:00:00.000Z");
const SEPT_TO = new Date("2026-10-01T00:00:00.000Z");
const SOURCE = "manual:reception:2026-09-01";

// Las 6 ventas reales, ya mapeadas a SKU del catálogo (confirmado con el usuario).
// method: cash | sinpe. Cada línea es 1 unidad.
const REAL_SALES = [
  { idx: 1, productId: "redcon1-energy-vice-city", name: "Redcon1 Energy Vice City", code: "RedCon01", method: "sinpe", unitPrice: 2000 },
  { idx: 2, productId: "chicle-verde", name: "Chicle verde", code: "Chicles01", method: "cash", unitPrice: 400 },
  { idx: 3, productId: "barrita-mani", name: "Barrita de maní", code: "Bar02", method: "cash", unitPrice: 500 },
  { idx: 4, productId: "barrita-mani", name: "Barrita de maní", code: "Bar02", method: "cash", unitPrice: 500 },
  { idx: 5, productId: "powerade-zero-grape", name: "Powerade Zero Grape", code: "Coca2", method: "sinpe", unitPrice: 1200 },
  { idx: 6, productId: "powerade-zero-grape", name: "Powerade Zero Grape", code: "Coca2", method: "sinpe", unitPrice: 1200 },
];

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 20000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
const SalesCol = db.collection("xtreme_gym_product_sales");
const Products = db.collection("xtreme_gym_product_inventory");

const log = (...a) => console.log(...a);

try {
  // ---- 1) ventas de prueba a borrar ----
  const testFilter = { createdAt: { $gte: SEPT_FROM, $lt: SEPT_TO }, soldBy: "super" };
  const toDelete = await SalesCol.find(testFilter).toArray();
  log(`\n[1] Ventas de prueba a borrar (${toDelete.length}):`);
  for (const s of toDelete) {
    log(`    - ${s.id} | ${s.createdAt.toISOString()} | ₡${s.total} | ${s.paymentMethod}`);
  }

  // ---- 2) chicles por unidad ----
  const chicleIds = ["chicle-verde", "chicle-gris"];
  const chicles = await Products.find({ id: { $in: chicleIds } }).toArray();
  log(`\n[2] Chicles a convertir en unidad:`);
  for (const c of chicles) {
    log(`    - ${c.id} | "${c.name}" | unitsPerPackage=${c.unitsPerPackage ?? "-"} -> quita paquete`);
  }

  // ---- 3) ventas reales + descuento ----
  // Precheck de existencias e integridad de precio.
  const need = new Map(); // productId -> unidades
  for (const r of REAL_SALES) need.set(r.productId, (need.get(r.productId) ?? 0) + 1);
  const prodDocs = await Products.find({ id: { $in: [...need.keys()] }, active: true }).toArray();
  const byId = new Map(prodDocs.map((p) => [p.id, p]));

  log(`\n[3] Ventas reales a insertar (${REAL_SALES.length}) y descuento de inventario:`);
  const errors = [];
  for (const [pid, qty] of need) {
    const p = byId.get(pid);
    if (!p) { errors.push(`Producto no encontrado o inactivo: ${pid}`); continue; }
    const cam = p.cameraQuantity ?? p.quantity;
    if (p.quantity < qty) errors.push(`Existencia insuficiente ${pid}: hay ${p.quantity}, se venden ${qty}`);
    const price = REAL_SALES.find((r) => r.productId === pid).unitPrice;
    if (p.price !== price) errors.push(`Precio distinto ${pid}: catálogo ₡${p.price} vs venta ₡${price}`);
    log(`    - ${pid.padEnd(28)} | vende ${qty} | qty ${p.quantity}->${p.quantity - qty} | cam ${cam}->${Math.max(0, cam - qty)} | ₡${p.price}`);
  }
  if (errors.length) {
    log(`\n  ⚠ PROBLEMAS:\n    ${errors.join("\n    ")}`);
    if (apply) throw new Error("Abortado: revisá los problemas antes de aplicar.");
  }

  const total = REAL_SALES.reduce((s, r) => s + r.unitPrice, 0);
  log(`\n  Total de las 6 ventas: ₡${total}`);

  if (!apply) {
    log(`\nVista previa. Agregá --apply para escribir en MongoDB.`);
  } else {
    // 1) borrar pruebas
    const del = await SalesCol.deleteMany(testFilter);

    // 2) chicles por unidad
    const rn1 = await Products.updateOne({ id: "chicle-verde" }, { $set: { name: "Chicle verde", updatedAt: new Date() }, $unset: { unitsPerPackage: "" } });
    const rn2 = await Products.updateOne({ id: "chicle-gris" }, { $set: { name: "Chicle gris", updatedAt: new Date() }, $unset: { unitsPerPackage: "" } });

    // 3) insertar ventas + descontar (mostrador primero, condicional para no bajar de 0)
    let inserted = 0;
    let skipped = 0;
    for (const r of REAL_SALES) {
      const saleId = `sale-${SOURCE}-${r.idx}`;
      // Idempotencia: si esta venta ya se insertó antes, no volver a descontar.
      const already = await SalesCol.findOne({ id: saleId });
      if (already) { skipped += 1; continue; }
      const p = await Products.findOne({ id: r.productId, active: true });
      const cam = p.cameraQuantity ?? p.quantity;
      const camSold = Math.min(cam, 1);
      const bodSold = 1 - camSold;
      const dec = await Products.updateOne(
        { id: r.productId, active: true, quantity: { $gte: 1 } },
        { $inc: { quantity: -1, cameraQuantity: -camSold, warehouseQuantity: -bodSold }, $set: { updatedAt: new Date() } },
      );
      if (!dec.modifiedCount) throw new Error(`No se pudo descontar ${r.productId}`);
      const createdAt = new Date(`2026-09-01T${String(15 + Math.floor((r.idx - 1) / 6)).padStart(2, "0")}:${String((r.idx - 1) * 5).padStart(2, "0")}:00.000Z`);
      const doc = {
        id: saleId,
        items: [{ productId: r.productId, name: r.name, quantity: 1, unitPrice: r.unitPrice }],
        total: r.unitPrice,
        paymentMethod: r.method,
        cashAmount: r.method === "cash" ? r.unitPrice : 0,
        sinpeAmount: r.method === "sinpe" ? r.unitPrice : 0,
        soldBy: "recepcion",
        source: SOURCE,
        sourceCode: r.code,
        createdAt,
        importedAt: new Date(),
      };
      await SalesCol.insertOne(doc);
      inserted += 1;
    }

    log(`\n=== APLICADO ===`);
    log(`  Ventas de prueba borradas: ${del.deletedCount}`);
    log(`  Chicles renombrados/unidad: verde=${rn1.modifiedCount} gris=${rn2.modifiedCount}`);
    log(`  Ventas reales insertadas: ${inserted}${skipped ? ` (omitidas ${skipped} ya existentes)` : ""}`);
  }
} finally {
  await client.close();
}
