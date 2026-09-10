import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { guides } from "./floor-area-modules.mjs";

// Explicit identifications from Josué's saved plan; never infer identity from a code.
const correctedGuides = {
  "eq-011": "leg-curl", "eq-014": "donkey-calf-raise",
  "eq-020": "standing-leg-curl", "eq-022": "hip-adductor",
  "eq-078": "chest-press", "eq-109": "elliptical", "eq-110": "seated-row",
  "eq-113": "pec-deck-rear-delt-dual", "eq-114": "incline-shoulder-press-dual",
  "eq-120": "incline-fly-machine", "eq-122": "press-station",
};
const manualGuides = {
  "0e1f5c67-5262-4a16-8e5f-b6bb420b8a67": "smith-machine",
  "c898335a-b969-44d0-88d1-0c8b7cad0598": "bicicleta-estatica",
  "2d525987-52f6-4090-a87f-59971dcee5de": "lateral-raise-machine",
  "3ef26ebf-64aa-45f1-92ff-e9611c8606e9": "leg-extension",
};
const apply = process.argv.includes("--apply");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const plans = db.collection("xtreme_gym_floor_plans");
  const assets = db.collection("xtreme_gym_equipment_assets");
  const saved = await plans.findOne({ _id: "main" });
  assert.ok(saved?.plan, "Saved main plan required");
  const existing = await assets.find({}).toArray();
  const changes = [];
  for (const [id, placement] of Object.entries(saved.plan.placements)) {
    const before = existing.find(row => row.id === id);
    if (!before || before.kind !== "machine" || placement.label?.trim().toLowerCase() === "xx") continue;
    const patch = {};
    for (const [key, value] of Object.entries({ name: placement.label, code: placement.code, machineGuideId: correctedGuides[id] })) {
      if (typeof value === "string" && value !== before[key]) patch[key] = value;
    }
    if (Object.keys(patch).length) changes.push({ before, patch });
  }
  const next = structuredClone(saved.plan);
  delete next.placements["eq-119"];
  for (const [id, code] of Object.entries({ "eq-008": "PI-25A", "eq-009": "PI-25B", "eq-010": "PI-26A", "eq-011": "PI-26B" })) {
    next.placements[id].code = code;
    const change = changes.find(row => row.before.id === id);
    if (change) change.patch.code = code;
    else if (existing.find(row => row.id === id)?.code !== code) changes.push({ before: existing.find(row => row.id === id), patch: { code } });
  }
  const removed = existing.find(row => row.id === "eq-119");
  const added = [];
  for (const element of saved.plan.customElements.filter(el => el.type === "equipment")) {
    const guide = manualGuides[element.id];
    assert.ok(guide, `Unreviewed manual machine: ${element.label}`);
    const id = `eq-plan-${element.id}`;
    assert.ok(!existing.some(row => row.id === id), `Asset already exists outside placements: ${id}`);
    const zone = guides.find(row => row.id === guide)?.zone;
    added.push({ id, floor: 1, kind: "machine", code: "", name: element.label,
      machineGuideId: guide, area: zone === "Cardio" ? "Cardio" : (zone === "Pierna" || guide === "smith-machine") ? "Piernas" : "Tren superior",
      location: "Planta baja · ubicación en plano", status: "sin_dato" });
    const { x, y, width, height, locked } = element;
    next.placements[id] = { x, y, width, height, locked, label: element.label, code: "" };
    next.customElements = next.customElements.filter(el => el.id !== element.id);
  }
  for (const row of [...added, ...changes.map(change => ({ ...change.before, ...change.patch }))]) {
    assert.ok(guides.some(guide => guide.id === row.machineGuideId), `Missing guide: ${row.machineGuideId}`);
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", revision: saved.revision,
    changes: changes.map(({ before, patch }) => ({ id: before.id, before: { name: before.name, code: before.code, machineGuideId: before.machineGuideId }, patch })), added,
    pending: ["eq-019: por identificar", "Códigos vacíos de cuatro unidades nuevas; duplicados conservados del plano"] }, null, 2));
  if (apply && (changes.length || added.length || removed)) {
    // One transaction prevents partial inventory/plan writes and rejects concurrent edits.
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection("xtreme_gym_floor_plan_migrations").insertOne({ migration: "josue-2026-09-10", createdAt: new Date(), plan: saved, assets: [...changes.map(c => c.before), ...(removed ? [removed] : [])], addedIds: added.map(a => a.id) }, { session });
        if (removed) {
          const result = await assets.deleteOne({ _id: removed._id, name: removed.name, code: removed.code }, { session });
          assert.equal(result.deletedCount, 1);
        }
        for (const { before, patch } of changes) {
          const result = await assets.updateOne({ _id: before._id, name: before.name, code: before.code, machineGuideId: before.machineGuideId }, { $set: { ...patch, updatedAt: new Date() } }, { session });
          assert.equal(result.matchedCount, 1, `Concurrent edit: ${before.id}`);
        }
        if (added.length) await assets.insertMany(added.map(row => ({ ...row, createdAt: new Date(), updatedAt: new Date() })), { session });
        const result = await plans.updateOne({ _id: saved._id, revision: saved.revision }, { $set: { plan: next, savedAt: new Date().toISOString() }, $inc: { revision: 1 } }, { session });
        assert.equal(result.matchedCount, 1, "Concurrent plan edit; transaction rolled back");
      });
    } finally { await session.endSession(); }
    console.log("Applied with transaction and recovery backup.");
  }
} finally { await client.close(); }
