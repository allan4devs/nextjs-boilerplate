import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { MongoClient } from "mongodb";
import { codes } from "./floor-area-modules.mjs";

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/xtreme/qr-groups.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const groups = exports.QR_GROUPS;
const apply = process.argv.includes("--apply");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const assets = db.collection("xtreme_gym_equipment_assets");
  const plans = db.collection("xtreme_gym_floor_plans");
  const labels = db.collection("xtreme_gym_qr_groups");
  const existing = await assets.find({}).toArray();
  const savedPlans = await plans.find({}).toArray();
  const savedGroups = await labels.find({}).toArray();
  const changes = existing.filter(row => row.id !== "eq-019" && codes.migrateEquipmentCode(row.id, row.code) !== row.code)
    .map(before => ({ before, code: codes.migrateEquipmentCode(before.id, before.code) }));
  const removed = existing.find(row => row.id === "eq-019");
  const planChanges = savedPlans.flatMap(before => {
    const plan = structuredClone(before.plan);
    if (!plan?.placements) return [];
    delete plan.placements["eq-019"];
    for (const [id, placement] of Object.entries(plan.placements)) {
      if (typeof placement.code === "string") placement.code = codes.migrateEquipmentCode(id, placement.code);
    }
    return JSON.stringify(plan) === JSON.stringify(before.plan) ? [] : [{ before, plan }];
  });
  const finalCodes = existing.filter(row => row.kind !== "plate" && row.id !== "eq-019").map(row => codes.migrateEquipmentCode(row.id, row.code));
  assert.equal(new Set(finalCodes).size, finalCodes.length, "Duplicate equipment codes");
  const groupChanges = groups.filter(group => {
    const saved = savedGroups.find(row => row.id === group.id);
    return !saved || !saved.code || saved.path !== exports.qrGroupPath(group.id) || !saved.printable;
  });
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", changes: changes.map(row => ({ id: row.before.id, from: row.before.code, to: row.code })), removed: removed?.id, plans: planChanges.map(row => row.before._id), groups: groupChanges.map(row => row.id) }, null, 2));
  if (apply && (changes.length || removed || planChanges.length || groupChanges.length)) {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection("xtreme_gym_floor_plan_migrations").insertOne({ migration: "standardize-qr-2026-09-10", createdAt: new Date(), assets: [...changes.map(row => row.before), ...(removed ? [removed] : [])], plans: planChanges.map(row => row.before), groups: savedGroups }, { session });
        for (const { before, code } of changes) {
          const result = await assets.updateOne({ _id: before._id, code: before.code }, { $set: { code, updatedAt: new Date() } }, { session });
          assert.equal(result.matchedCount, 1, `Concurrent edit: ${before.id}`);
        }
        if (removed) {
          const result = await assets.deleteOne({ _id: removed._id, name: removed.name, code: removed.code }, { session });
          assert.equal(result.deletedCount, 1);
        }
        for (const { before, plan } of planChanges) {
          const result = await plans.updateOne({ _id: before._id, revision: before.revision }, { $set: { plan, savedAt: new Date().toISOString() }, $inc: { revision: 1 } }, { session });
          assert.equal(result.matchedCount, 1, "Concurrent plan edit");
        }
        for (const group of groupChanges) {
          const saved = savedGroups.find(row => row.id === group.id);
          await labels.updateOne({ id: group.id }, { $set: { ...group, name: saved?.name || group.name, code: saved?.code || group.code, path: exports.qrGroupPath(group.id), printable: true, floor: 1, individualLabels: false, updatedAt: new Date() } }, { upsert: true, session });
        }
      });
    } finally { await session.endSession(); }
  }
} finally { await client.close(); }
