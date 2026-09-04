/**
 * Seed del catálogo de productos del punto de venta (xtreme_gym_product_inventory).
 *
 * Crea los productos que falten y, sobre todo, fuerza `active: true` en TODOS
 * los del catálogo (incluidos los que ya existían) para que queden
 * disponibles para la venta aunque se hubieran desactivado por otra vía. No
 * toca existencias (quantity/cameraQuantity/warehouseQuantity) ni precio de
 * productos que ya existen: eso solo se fija al crearlos por primera vez, para
 * no pisar un conteo real hecho en recepción.
 *
 * Mantener sincronizado con DEFAULT_PRODUCTS en lib/xtreme/product-inventory.ts
 * (fuente de verdad del catálogo; este script es la vía para aplicarlo directo
 * en Mongo, sin depender de que alguien abra /recepcion/ventas primero).
 *
 * Uso:
 *   node --env-file=.env scripts/seed-products.mjs           (vista previa)
 *   node --env-file=.env scripts/seed-products.mjs --apply   (escribe)
 */
import { MongoClient } from "mongodb";

const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");

// Mismo catálogo que DEFAULT_PRODUCTS en lib/xtreme/product-inventory.ts.
const PRODUCTS = [
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
  { id: "chicle-verde", name: "Chicle verde", category: "chicles" },
  { id: "chicle-gris", name: "Chicle gris", category: "chicles", defaultPrice: 400 },
  { id: "pinas", name: "Piñas", category: "chicles", defaultPrice: 1200 },
];

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
const Inv = db.collection("xtreme_gym_product_inventory");

try {
  const now = new Date();
  const existing = await Inv.find({ id: { $in: PRODUCTS.map((p) => p.id) } }).toArray();
  const byId = new Map(existing.map((p) => [p.id, p]));

  const rows = PRODUCTS.map((p) => {
    const before = byId.get(p.id);
    if (!before) return { id: p.id, name: p.name, status: "crear", price: p.defaultPrice ?? 0 };
    if (!before.active) return { id: p.id, name: p.name, status: "reactivar", price: before.price };
    return { id: p.id, name: p.name, status: "ya activo", price: before.price };
  });

  console.log(`MODE: ${apply ? "APPLY" : "dry-run"}`);
  for (const r of rows) console.log(`  ${r.status.padEnd(10)} ${r.id.padEnd(32)} ${r.name.padEnd(34)} ₡${r.price}`);
  const toCreate = rows.filter((r) => r.status === "crear").length;
  const toReactivate = rows.filter((r) => r.status === "reactivar").length;
  console.log(`\nCrear: ${toCreate} · Reactivar: ${toReactivate} · Ya activos: ${rows.length - toCreate - toReactivate} · Total catálogo: ${rows.length}`);

  if (!apply) {
    console.log("\nVista previa. Agregá --apply para escribir en MongoDB.");
  } else {
    const result = await Inv.bulkWrite(
      PRODUCTS.map((product) => ({
        updateOne: {
          filter: { id: product.id },
          update: {
            $set: {
              name: product.name,
              ...(product.image ? { image: product.image } : {}),
              active: true,
            },
            $setOnInsert: {
              id: product.id,
              category: product.category,
              quantity: 0,
              cameraQuantity: 0,
              warehouseQuantity: 0,
              price: product.defaultPrice ?? 0,
              createdAt: now,
              updatedAt: now,
            },
          },
          upsert: true,
        },
      })),
    );
    console.log(`\n=== APLICADO ===`);
    console.log(`  Creados: ${result.upsertedCount} · Actualizados: ${result.modifiedCount}`);
  }
} finally {
  await client.close();
}
