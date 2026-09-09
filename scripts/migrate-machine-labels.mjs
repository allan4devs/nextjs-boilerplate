import { MongoClient } from "mongodb";
import { names } from "./floor-area-modules.mjs";

const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const assets = db.collection("xtreme_gym_equipment_assets");
  const rows = await assets.find({ kind: "machine" }, { projection: { id: 1, name: 1 } }).toArray();
  const changes = rows.map((row) => ({ ...row, nextName: names.migrateMachineName(row.name) })).filter((row) => row.name !== row.nextName);
  const plans = db.collection("xtreme_gym_floor_plans");
  const planChanges = (await plans.find({}).toArray()).flatMap((saved) => {
    const nextPlan = structuredClone(saved.plan);
    for (const placement of Object.values(nextPlan.placements ?? {})) {
      if (typeof placement.label === "string") placement.label = names.migrateMachineName(placement.label);
    }
    return JSON.stringify(nextPlan) === JSON.stringify(saved.plan) ? [] : [{ saved, nextPlan }];
  });
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", machinesReviewed: rows.length, namesToUpdate: changes.length, plansToUpdate: planChanges.length }));
  if (apply && (changes.length || planChanges.length)) {
    const backup = await db.collection("xtreme_gym_machine_label_migrations").insertOne({
      migration: "recognizable-names-v1", createdAt: new Date(), names: changes, plans: planChanges.map(({ saved }) => saved),
    });
    for (const row of changes) {
      const result = await assets.updateOne({ _id: row._id, name: row.name }, { $set: { name: row.nextName } });
      if (result.matchedCount !== 1) throw new Error(`Concurrent name edit: ${row.id}; rerun migration`);
    }
    for (const { saved, nextPlan } of planChanges) {
      const result = await plans.updateOne({ _id: saved._id, revision: saved.revision }, { $set: { plan: nextPlan, savedAt: new Date().toISOString() }, $inc: { revision: 1 } });
      if (result.matchedCount !== 1) throw new Error("Concurrent floor edit; rerun migration");
    }
    console.log(JSON.stringify({ applied: true, recoveryId: backup.insertedId.toString() }));
  }
} finally { await client.close(); }
