import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { equipment, model } from "./floor-area-modules.mjs";

const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const collection = db.collection("xtreme_gym_floor_plans");
  const saved = await collection.findOne({ _id: "main" });
  assert.ok(saved?.plan, "A saved first-floor layout is required");
  const originals = equipment.DEFAULT_EQUIPMENT_ASSETS.filter((asset) => /^eq-\d{3}$/.test(asset.id));
  assert.equal(originals.length, 131);
  const missing = originals.filter((asset) => !saved.plan.placements[asset.id]);
  const zones = saved.plan.customElements.filter((element) => /^ZONA [ABC]$/i.test(element.label));
  assert.equal(zones.length, 3, "Preserve the three existing leg zones; stop if they cannot be found");
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", originalAssets: originals.length, missing: missing.length, missingByKind: missing.reduce((counts, asset) => ({ ...counts, [asset.kind]: (counts[asset.kind] ?? 0) + 1 }), {}), legZones: zones.map((zone) => zone.label) }));
  if (missing.length) {
    const next = structuredClone(saved.plan);
    const top = Math.max(next.canvas.height, ...Object.values(next.placements).map((item) => item.y + item.height), ...next.customElements.map((item) => item.y + item.height)) + 40;
    const width = Math.min(760, next.canvas.width - 80);
    let x = 60, y = top + 60, rowHeight = 0;
    for (const asset of missing.sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }) || a.id.localeCompare(b.id))) {
      const size = asset.kind === "plate" ? { width: 54, height: 44 } : model.defaultSizeForKind(asset.kind);
      if (x + size.width > 40 + width - 20) { x = 60; y += rowHeight + 16; rowHeight = 0; }
      next.placements[asset.id] = { x, y, ...size, locked: false };
      x += size.width + 16;
      rowHeight = Math.max(rowHeight, size.height);
    }
    const height = y + rowHeight + 24 - top;
    next.customElements.push({ id: "restored-original-inventory-v1", type: "area", label: "Pesos recuperados · inventario original", x: 40, y: top, width, height, color: "#fb923c", locked: false });
    next.canvas.height = top + height + 40;
    assert.ok(next.canvas.height <= 5000, "Restored items exceed the supported canvas");
    for (const [id, placement] of Object.entries(saved.plan.placements)) assert.deepEqual(next.placements[id], placement, `Moved existing asset ${id}`);
    assert.deepEqual(next.customElements.slice(0, saved.plan.customElements.length), saved.plan.customElements, "Changed existing areas or manual equipment");
    assert.ok(originals.every((asset) => next.placements[asset.id]), "Not all original assets are placed");
    if (apply) {
      const backup = await db.collection("xtreme_gym_floor_plan_migrations").insertOne({ migration: "restore-original-inventory-v1", createdAt: new Date(), savedPlan: saved });
      const result = await collection.updateOne({ _id: "main", revision: saved.revision }, { $set: { plan: next, savedAt: new Date().toISOString() }, $inc: { revision: 1 } });
      assert.equal(result.matchedCount, 1, "Concurrent edit: no overwrite; rerun to use the newest layout");
      const verified = await collection.findOne({ _id: "main" });
      assert.ok(originals.every((asset) => verified.plan.placements[asset.id]));
      assert.deepEqual(verified.plan.customElements.filter((element) => /^ZONA [ABC]$/i.test(element.label)), zones);
      console.log(JSON.stringify({ restored: missing.length, originalAssetsPlaced: 131, legZonesUnchanged: true, recoveryId: backup.insertedId.toString() }));
    }
  }
} finally { await client.close(); }
