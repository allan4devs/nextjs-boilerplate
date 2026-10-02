import { MongoClient } from "mongodb";
import { equipment, guides, model } from "./floor-area-modules.mjs";

const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const assets = db.collection("xtreme_gym_equipment_assets");
  const existing = await assets.find({}, { projection: { id: 1, machineGuideId: 1, kind: 1 } }).toArray();
  const newRows = equipment.SECOND_FLOOR_EQUIPMENT.filter((asset) => !existing.some((row) => row.id === asset.id));
  const guideIds = new Set(guides.map((guide) => guide.id));
  const missing = existing.filter((row) => row.kind === "machine" && !guideIds.has(row.machineGuideId));
  const plans = db.collection("xtreme_gym_floor_plans");
  const changes = [];
  for (const saved of await plans.find({}).toArray()) {
    let next = model.linkKnownPlanMachines(saved.plan, guides);
    if (saved._id === "floor-2") next = model.completeSecondFloorPlan(next, equipment.SECOND_FLOOR_EQUIPMENT);
    if (next !== saved.plan) changes.push({ saved, next });
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", newMachines: newRows.length, planUpdates: changes.length, unresolvedMachineIds: missing.map((row) => row.id), manualLinks: changes.flatMap(({ next }) => next.customElements.filter((element) => element.type === "equipment").map((element) => ({ label: element.label, guide: element.machineGuideId ?? null }))) }));
  if (apply && (newRows.length || changes.length)) {
    const backup = await db.collection("xtreme_gym_floor_plan_migrations").insertOne({ migration: "second-floor-machines-v1", createdAt: new Date(), newAssetIds: newRows.map((row) => row.id), plans: changes.map(({ saved }) => saved) });
    for (const asset of newRows) {
      await assets.updateOne({ id: asset.id }, { $setOnInsert: { ...asset, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
    }
    for (const { saved, next } of changes) {
      const result = await plans.updateOne({ _id: saved._id, revision: saved.revision }, { $set: { plan: next, savedAt: new Date().toISOString() }, $inc: { revision: 1 } });
      if (result.matchedCount !== 1) throw new Error(`Concurrent edit on ${saved._id}; rerun to preserve latest positions`);
    }
    console.log(JSON.stringify({ applied: true, recoveryId: backup.insertedId.toString() }));
  }
} finally { await client.close(); }
