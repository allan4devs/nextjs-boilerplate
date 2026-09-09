import assert from "node:assert/strict";
import { equipment, model, codes, categorize } from "./floor-area-modules.mjs";

const inventory = equipment.DEFAULT_EQUIPMENT_ASSETS.map(categorize);
const plan = model.createInitialPlan(inventory);
assert.equal(inventory.length, 131);
assert.equal(new Set(inventory.map((item) => item.code)).size, 131);
assert.equal(Object.keys(plan.placements).length, 131);
assert.ok(!inventory.some((item) => /Recepción|Zona Central/.test(item.area)));
for (const area of ["Tren superior", "Piernas", "Abs", "Cardio", "Pesas - Bancos", "Pesas - Discos", "Poleas adicionales"]) {
  assert.ok(plan.customElements.some((item) => item.label.endsWith(area)), `${area}: missing quadrant`);
}
for (const category of ["Espalda", "Pecho", "Hombro", "Brazo", "Abdominales y core"]) {
  assert.ok(plan.customElements.some((item) => item.label === category), `${category}: missing category`);
}
for (const [id, placement] of Object.entries(plan.placements)) {
  assert.ok(placement.x >= 0 && placement.y >= 0 && placement.x + placement.width <= plan.canvas.width && placement.y + placement.height <= plan.canvas.height, `${id} exceeds canvas`);
  assert.ok(plan.customElements.some((item) => item.id.startsWith("seed-category-") && placement.x >= item.x && placement.y >= item.y && placement.x + placement.width <= item.x + item.width && placement.y + placement.height <= item.y + item.height), `${id} outside its quadrant`);
  for (const [otherId, other] of Object.entries(plan.placements)) {
    if (otherId === id) continue;
    assert.ok(placement.x + placement.width <= other.x || other.x + other.width <= placement.x || placement.y + placement.height <= other.y || other.y + other.height <= placement.y, `${id} overlaps ${otherId}`);
  }
}
assert.ok(plan.canvas.width <= 5000 && plan.canvas.height <= 5000);
assert.equal(model.migratePlanAreas(plan, inventory), plan, "Manual arrangements after migration must remain unchanged");
const legacy = JSON.parse(JSON.stringify(plan));
delete legacy.areaLayoutRevision;
delete legacy.placements["eq-002"];
legacy.placements["eq-101"] = { ...legacy.placements["eq-101"], label: "Nombre real", code: "RI-01", width: 150, locked: true };
legacy.placements["eq-113"].code = "PERSONAL";
legacy.customElements.push({ id: "my-door", type: "access", label: "Puerta real", x: 0, y: 0, width: 80, height: 50, locked: true, color: "#ffffff" });
const migrated = model.migratePlanAreas(legacy, inventory);
assert.equal(migrated.placements["eq-101"].code, "TS-01");
assert.equal(migrated.placements["eq-101"].label, "Nombre real");
assert.equal(migrated.placements["eq-101"].width, 150);
assert.equal(migrated.placements["eq-101"].locked, true);
assert.equal(migrated.placements["eq-113"].code, "PERSONAL");
assert.equal(migrated.placements["eq-002"], undefined, "Unplaced assets stay unplaced");
assert.ok(migrated.customElements.some((item) => item.id === "my-door"));
assert.equal(model.parsePlanDocument(migrated, inventory).areaLayoutRevision, 2);
const child = plan.customElements.find((item) => item.id.startsWith("seed-category-tren-superior-"));
assert.ok(!model.getAreaChildrenTargets(plan, child.id, inventory).some((target) => target.id === "seed-area-tren-superior"), "Moving a category must not move its parent");
const repacked = model.reorganizeAreaChildren(plan, "seed-area-tren-superior", inventory).plan;
const movedChild = repacked.customElements.find((item) => item.id === child.id);
for (const target of model.getAreaChildrenTargets(plan, child.id, inventory)) {
  const before = model.getTargetGeometry(plan, target);
  const after = model.getTargetGeometry(repacked, target);
  assert.equal(after.x - movedChild.x, before.x - child.x, "Repacking preserves horizontal position within a nested quadrant");
  assert.equal(after.y - movedChild.y, before.y - child.y, "Repacking preserves vertical position within a nested quadrant");
}
assert.equal(codes.migrateEquipmentCode("eq-116", "RD-04"), "AB-01");
assert.equal(codes.migrateEquipmentCode("eq-108", "RI-08"), "CA-24");
assert.equal(codes.migrateEquipmentCode("eq-101", "TS-01"), "TS-01");
console.log("PASS: 131 unique codes, category quadrants, no overlaps, bounds, one-time migration, custom edits, nested dragging and JSON round-trip.");
console.log(JSON.stringify({ areas: Object.fromEntries([...new Set(inventory.map((item) => item.area))].map((area) => [area, inventory.filter((item) => item.area === area).length])), canvas: plan.canvas }));
