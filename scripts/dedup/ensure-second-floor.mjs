import { MongoClient } from "mongodb";
import { model } from "./floor-area-modules.mjs";

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const collection = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym").collection("xtreme_gym_floor_plans");
  const result = await collection.updateOne({ _id: "floor-2" }, { $setOnInsert: {
    plan: model.createSecondFloorPlan(), revision: 1, savedAt: new Date().toISOString(),
  } }, { upsert: true });
  const saved = await collection.findOne({ _id: "floor-2" });
  console.log(JSON.stringify({ created: result.upsertedCount === 1, floor: 2, blocks: saved.plan.customElements.map((block) => block.label), placements: Object.keys(saved.plan.placements).length }));
} finally { await client.close(); }
