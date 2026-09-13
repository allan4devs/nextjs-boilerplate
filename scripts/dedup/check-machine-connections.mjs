import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

// Run the pure TypeScript data/model modules without starting Next or connecting to Mongo.
function readModule(filename, imports = {}) {
  const source = fs.readFileSync(path.resolve(filename), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (id) => {
    assert.ok(Object.hasOwn(imports, id), `Unexpected runtime dependency: ${id}`);
    return imports[id];
  }, URL, process });
  return exports;
}

const { DEFAULT_EQUIPMENT_ASSETS: inventory } = readModule("lib/xtreme/equipment.ts", { "./shared": {}, "./machine-display-names": readModule("lib/xtreme/machine-display-names.ts"), "./equipment-area-codes": readModule("lib/xtreme/equipment-area-codes.ts") });
const { MACHINE_GUIDE: guides } = readModule("app/components/member/catalog/machines.ts");
const { createInitialPlan, parsePlanDocument } = readModule("app/maquinas/plano/plan-model.ts", { "@/lib/xtreme/equipment-area-codes": readModule("lib/xtreme/equipment-area-codes.ts") });
const { physicalMachineQrValue } = readModule("app/lib/physical-machine-links.ts", { "@/lib/constants/app-url": { absoluteAppUrl: (pathname) => `https://example.test${pathname}` } });

const machines = inventory.filter((asset) => asset.kind === "machine");
const guideIds = new Set(guides.map((guide) => guide.id));
assert.equal(new Set(inventory.map((asset) => asset.id)).size, inventory.length, "Physical IDs must be unique");
assert.equal(new Set(machines.map((asset) => asset.code.trim().toLowerCase())).size, machines.length, "Review duplicate physical codes");
for (const asset of machines) assert.ok(guideIds.has(asset.machineGuideId), `${asset.id}: missing guide`);
assert.equal(new Set(machines.map((asset) => physicalMachineQrValue(asset.id))).size, machines.length, "Every physical unit needs its own QR");

const plan = createInitialPlan(inventory);
const asset = machines[0];
plan.placements[asset.id].label = "Nombre corregido en plano";
plan.placements[asset.id].code = "CUSTOM-01";
const restored = parsePlanDocument(JSON.parse(JSON.stringify(plan)), inventory);
assert.equal(restored.placements[asset.id].label, "Nombre corregido en plano");
assert.equal(restored.placements[asset.id].code, "CUSTOM-01");
assert.equal(physicalMachineQrValue(asset.id), physicalMachineQrValue({ ...asset, name: "Otro nombre", code: "NEW-02" }.id));
delete plan.placements[asset.id].code;
assert.equal(parsePlanDocument(plan, inventory).placements[asset.id].code, undefined, "Old plans keep inventory code fallback");
assert.equal(parsePlanDocument({ version: 9 }, inventory), null, "Reject unsupported plans");

const linked = new Set(machines.map((asset) => asset.machineGuideId));
console.log(`${machines.length} machines, ${linked.size}/${guides.length} guides linked; identity, QR uniqueness and plan round-trip passed.`);
console.log(`Guides needing physical identification: ${guides.filter((guide) => !linked.has(guide.id)).map((guide) => guide.id).join(", ")}`);
