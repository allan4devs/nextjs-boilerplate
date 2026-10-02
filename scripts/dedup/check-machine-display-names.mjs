import assert from "node:assert/strict";
import { equipment, names } from "./floor-area-modules.mjs";

const machines = equipment.DEFAULT_EQUIPMENT_ASSETS.filter((asset) => asset.kind === "machine");
assert.equal(machines.length, 81);
for (const machine of machines) {
  assert.ok(machine.name.length <= 34, `${machine.id}: label too long`);
  assert.equal(names.migrateMachineName(machine.name), machine.name, "Migration must be idempotent");
}
assert.equal(names.migrateMachineName("Leg Extension"), "Extensión de piernas");
assert.equal(names.migrateMachineName("Leg Curl sentado"), "Curl femoral sentado");
assert.notEqual(names.migrateMachineName("Leg Curl sentado"), names.migrateMachineName("Leg Curl acostado (camilla)"));
assert.notEqual(names.migrateMachineName("Prensa inclinada"), names.migrateMachineName("Prensa horizontal"));
assert.notEqual(names.migrateMachineName("Caminadora tipo escalera/pasos (stepper)"), names.migrateMachineName("Máquina de gradas (stair climber)"));
assert.equal(names.migrateMachineName("Polea morada"), "Polea morada", "Preserve staff corrections");
assert.equal(names.migrateMachineName("Mi máquina personalizada"), "Mi máquina personalizada");
assert.match(names.migrateMachineName("Máquina pequeña, tubo con pesas en extremos"), /por identificar/);
console.log("PASS: 81 short labels, idempotency, distinct machine variants and custom-name preservation.");
