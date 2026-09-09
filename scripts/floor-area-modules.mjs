import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, imports = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, { exports, require: (id) => {
    assert.ok(Object.hasOwn(imports, id), `Unexpected import: ${id}`);
    return imports[id];
  } });
  return exports;
}
export const codes = load("lib/xtreme/equipment-area-codes.ts");
export const equipment = load("lib/xtreme/equipment.ts", { "./shared": {}, "./equipment-area-codes": codes });
export const model = load("app/maquinas/plano/plan-model.ts", { "@/lib/xtreme/equipment-area-codes": codes });
const { MACHINE_GUIDE } = load("app/components/member/catalog/machines.ts");
export function categorize(asset) {
  const guide = MACHINE_GUIDE.find((item) => item.id === asset.machineGuideId);
  return { ...equipment.normalizeEquipmentArea(asset), trainingCategory: guide?.zone, muscleGroup: guide?.muscles[0] };
}
