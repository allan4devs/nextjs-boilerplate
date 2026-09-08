import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, imports = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (id) => {
    assert.ok(Object.hasOwn(imports, id), `Unexpected import: ${id}`);
    return imports[id];
  }, ...globals });
  return exports;
}

const model = load("app/maquinas/plano/plan-model.ts");
const { DEFAULT_EQUIPMENT_ASSETS } = load("lib/xtreme/equipment.ts", { "./shared": {} });
const inventory = DEFAULT_EQUIPMENT_ASSETS.filter((asset) => asset.kind === "machine");
const first = inventory[0].id;
const second = inventory[1].id;
const plan = model.createInitialPlan(inventory);
plan.placements[first].label = "Nombre corregido en plano";
const legacyQr = { version: 1, order: [second, first], drafts: {
  [first]: { name: "Borrador viejo QR" }, [second]: { name: "Corrección solo en etiqueta" },
} };
const storage = new Map([
  [model.PLAN_STORAGE_KEY, JSON.stringify({ plan })],
  ["xtreme:machine-qr-editor:v1", JSON.stringify(legacyQr)],
]);
let writesBlocked = false;
const events = [];
function tab() {
  return load("app/maquinas/_components/machine-label-store.ts", { "../plano/plan-model": model }, {
    Event: class { constructor(type) { this.type = type; } },
    window: {
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => { if (writesBlocked) throw new Error("quota"); storage.set(key, value); },
      },
      dispatchEvent: (event) => events.push(event.type),
    },
  });
}
const qr = tab();
const plano = tab();
assert.equal(qr.readMachineTexts()[first].name, "Nombre corregido en plano", "Migrate plano corrections first");
assert.equal(qr.readMachineTexts()[second].name, "Corrección solo en etiqueta", "Preserve QR-only corrections");
const originalGeometry = JSON.stringify(plan);
for (const [index, asset] of inventory.entries()) {
  qr.writeMachineTexts({ [asset.id]: { name: `Nombre etiqueta ${index}`, code: `COD-${index}` } });
  assert.equal(plano.applyMachineTexts(plan, plano.readMachineTexts()).placements[asset.id].label, `Nombre etiqueta ${index}`);
  plano.writeMachineTexts({ [asset.id]: { name: `Nombre plano ${index}` } });
  assert.equal(qr.readMachineTexts()[asset.id].name, `Nombre plano ${index}`);
  assert.equal(qr.readMachineTexts()[asset.id].code, `COD-${index}`, "Name edits preserve the code");
}
assert.equal(JSON.stringify(plan), originalGeometry, "Renaming never mutates geometry, locks, custom elements or identity");
assert.equal(storage.get("xtreme:machine-qr-editor:v1"), JSON.stringify(legacyQr), "Migration preserves the previous copy and order");
assert.equal(tab().readMachineTexts()[first].name, "Nombre plano 0", "Reload must not revive legacy names");

delete plan.placements[first];
qr.writeMachineTexts({ [first]: { name: "Unidad sin ubicar" } });
assert.equal(plano.readMachineTexts()[first].name, "Unidad sin ubicar", "Unplaced units share the same text");
assert.equal(plano.applyMachineTexts(plan, plano.readMachineTexts()).placements[first], undefined, "Renaming must not place a unit");
qr.writeMachineTexts({ [first]: { name: "", code: "" } });
assert.equal(plano.readMachineTexts()[first].name, "", "Empty drafts must not silently restore a different name");
assert.equal(plano.readMachineTexts()[first].code, "");
const beforeFailure = storage.get(qr.MACHINE_LABELS_KEY);
writesBlocked = true;
assert.throws(() => qr.writeMachineTexts({ [first]: { name: "Not saved" } }), /quota/);
assert.equal(storage.get(qr.MACHINE_LABELS_KEY), beforeFailure, "Failed writes preserve the shared copy");
assert.ok(events.includes(qr.MACHINE_LABELS_EVENT), "Notify subscribers in the editing tab");
console.log(`${inventory.length} machines: bidirectional names/codes, migration, reload, unplaced units, geometry preservation and storage failures passed.`);
