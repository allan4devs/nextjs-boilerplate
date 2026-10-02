import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("lib/xtreme/exercise-preferences.ts", "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const runtime = {};
vm.runInNewContext(code, {
  exports: runtime,
  require(id) {
    if (id === "./shared/types") return {};
    throw new Error(`Unexpected import ${id}`);
  },
}, { filename: "lib/xtreme/exercise-preferences.ts" });

const generic = runtime.saveFavoriteExercisePreference({
  machineId: "leg-press",
  favoriteWeightKg: 80,
  favoriteSeconds: 60,
  now: new Date("2026-09-22T12:00:00Z"),
});
assert.equal(runtime.resolveExercisePreference(generic, { machineId: "leg-press" }).favoriteWeightKg, 80);

const physical = runtime.saveFavoriteExercisePreference({
  preferences: generic,
  assetId: "eq-119",
  machineId: "leg-press",
  favoriteWeightKg: 90,
  now: new Date("2026-09-22T12:01:00Z"),
});
assert.equal(runtime.resolveExercisePreference(physical, { assetId: "eq-119", machineId: "leg-press" }).favoriteWeightKg, 90);
assert.equal(runtime.resolveExercisePreference(physical, { assetId: "eq-other", machineId: "leg-press" }).favoriteWeightKg, 80);

const merged = runtime.mergeLastExercisePreferences(physical, [
  { id: "done", assetId: "eq-119", machineId: "leg-press", weightKg: 92.5, seconds: 48, completed: true },
  { id: "pending", machineId: "chest-press", weightKg: 40, seconds: 30, completed: false },
]);
const exact = runtime.resolveExercisePreference(merged, { assetId: "eq-119", machineId: "leg-press" });
assert.equal(exact.favoriteWeightKg, 90);
assert.equal(exact.lastWeightKg, 92.5);
assert.equal(exact.lastSeconds, 48);
assert.equal(runtime.resolveExercisePreference(merged, { machineId: "chest-press" }), undefined);

console.log("Workout preferences OK: favorite, last-used and physical-machine precedence.");
