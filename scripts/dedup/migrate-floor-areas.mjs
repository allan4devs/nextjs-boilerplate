import { MongoClient } from "mongodb";
import { equipment, model, categorize } from "./floor-area-modules.mjs";

// Dry-run by default. --apply uses compare-and-swap and keeps a Mongo recovery snapshot.
const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const assets = db.collection("xtreme_gym_equipment_assets");
  const rows = await assets.find({}, { projection: { id: 1, area: 1, code: 1, name: 1, kind: 1, location: 1, status: 1, machineGuideId: 1, updatedAt: 1 } }).toArray();
  const changes = rows.map((before) => ({ before, after: equipment.normalizeEquipmentArea(before) }))
    .filter(({ before, after }) => before.area !== after.area || before.code !== after.code);
  const merged = new Map(equipment.DEFAULT_EQUIPMENT_ASSETS.map((row) => [row.id, row]));
  for (const row of rows) merged.set(row.id, row);
  const inventory = [...merged.values()].map(categorize);
  const plans = db.collection("xtreme_gym_floor_plans");
  const saved = await plans.findOne({ _id: "main" });
  const parsed = saved ? model.parsePlanDocument(saved.plan, inventory) : null;
  if (saved && !parsed) throw new Error("Saved plano is invalid; migration stopped");
  const next = parsed ? model.migratePlanAreas(parsed, inventory) : null;
  const planChanged = Boolean(parsed && next !== parsed);
  if (next && (next.canvas.width > 5000 || next.canvas.height > 5000)) throw new Error("Migrated layout exceeds supported canvas; no writes made");
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", equipmentChanges: changes.length, savedPlanExists: Boolean(saved), planChanged, savedRevision: saved?.revision ?? null, placedAssets: next ? Object.keys(next.placements).length : 0 }));
  if (apply && (changes.length || planChanged)) {
    const backup = await db.collection("xtreme_gym_floor_plan_migrations").insertOne({
      migration: "areas-v2", createdAt: new Date(),
      equipment: changes.map(({ before }) => ({ _id: before._id, id: before.id, area: before.area, code: before.code, updatedAt: before.updatedAt })),
      savedPlan: saved,
    });
    for (const { before, after } of changes) {
      const result = await assets.updateOne({ _id: before._id, area: before.area, code: before.code }, {
        $set: { area: after.area, code: after.code },
      });
      if (result.matchedCount !== 1) throw new Error(`Concurrent equipment edit for ${before.id}; rerun migration`);
    }
    if (planChanged) {
      const result = await plans.updateOne({ _id: "main", revision: saved.revision }, {
        $set: { plan: next, savedAt: new Date().toISOString() }, $inc: { revision: 1 },
      });
      if (result.matchedCount !== 1) throw new Error("Concurrent plano edit; rerun migration");
    }
    console.log(JSON.stringify({ applied: true, recoveryId: backup.insertedId.toString() }));
  }
} finally {
  await client.close();
}
