/**
 * Registra los montos del mensaje de Xtremegym, imputados a setiembre.
 * node --env-file=.env scripts/excel/record-september-2026-investments.mjs [--apply]
 * IDs estables + $setOnInsert: repetir no duplica ni sobrescribe correcciones.
 * No modifica existencias, ventas ni pagos; las fechas de compra son desconocidas.
 */
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const source = JSON.parse(await readFile(new URL("../../data/product-investments-september-2026.json", import.meta.url), "utf8"));
const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 12000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const collection = db.collection("xtreme_gym_product_investments");
  const existing = await collection.find({ accountingMonth: source.accountingMonth }, { projection: { _id: 0, id: 1, concept: 1, amountCrc: 1 } }).toArray();
  const from = new Date("2026-09-01T00:00:00-06:00");
  const to = new Date("2026-10-01T00:00:00-06:00");
  const sales = await db.collection("xtreme_gym_product_sales").aggregate([
    { $match: { createdAt: { $gte: from, $lt: to } } },
    { $group: { _id: null, totalIncome: { $sum: "$total" }, saleCount: { $sum: 1 } } },
  ]).next();
  console.log(JSON.stringify({ mode: apply ? "apply" : "preview", existing, entries: source.entries, sales }, null, 2));
  if (apply) {
    // Check before creating IDs if another operator has already registered these purchases.
    const newIds = new Set(source.entries.map((entry) => entry.id));
    if (existing.some((entry) => !newIds.has(entry.id))) {
      throw new Error("Ya hay otras inversiones de setiembre. Revisarlas para evitar duplicados antes de importar.");
    }
    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ accountingMonth: 1 });
    const result = await collection.bulkWrite(source.entries.map((entry) => ({
      updateOne: {
        filter: { id: entry.id },
        update: { $setOnInsert: {
          ...entry, accountingMonth: source.accountingMonth, purchaseDate: null,
          source: source.source, reportedAt: new Date(source.reportedAt), createdAt: new Date(),
        } }, upsert: true,
      },
    })));
    const records = await collection.find({ accountingMonth: source.accountingMonth }).toArray();
    console.log(JSON.stringify({ inserted: result.upsertedCount, records: records.length,
      totalReported: records.reduce((total, entry) => total + (entry.amountCrc ?? 0), 0),
      pendingAmounts: records.filter((entry) => entry.amountCrc === null).length,
    }, null, 2));
  }
} finally {
  await client.close();
}
