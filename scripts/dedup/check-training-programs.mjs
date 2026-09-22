import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadTypeScriptModule(path, mocks = {}) {
  const source = fs.readFileSync(path, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(id) {
      if (id in mocks) return mocks[id];
      throw new Error(`Unexpected import ${id} in ${path}`);
    },
  }, { filename: path });
  return exports;
}

const catalog = loadTypeScriptModule("lib/xtreme/training-program-catalog.ts");
const equipment = loadTypeScriptModule("lib/xtreme/equipment.ts", {
  "./shared": { EQUIPMENT_ASSETS_COLLECTION: "test" },
  "./equipment-area-codes": { migrateEquipmentCode: (_id, code) => code },
  "./machine-display-names": { migrateMachineName: (name) => name },
});

const programs = catalog.DEFAULT_TRAINING_PROGRAMS;
const assets = equipment.DEFAULT_EQUIPMENT_ASSETS;
const runtime = loadTypeScriptModule("lib/xtreme/training-programs.ts", {
  "./business-date": { businessDate: () => "2026-09-22" },
  "./equipment": { listEquipmentAssets: async () => assets },
  "./shared/config": { MEMBERS_COLLECTION: "members", TRAINING_PROGRAMS_COLLECTION: "programs" },
  "./training-program-catalog": catalog,
});
const programDocs = programs.map((program) => ({ ...program, revision: 1, active: true, defaultPool: true }));
assert.equal(programs.length, 4, "Expected four default training groups");
assert.equal(new Set(programs.map((program) => program.id)).size, programs.length, "Program ids must be unique");

for (const program of programs) {
  assert.ok(program.sessions.length >= 3, `${program.id} needs at least three sessions`);
  assert.ok(program.weeklySessions >= 1 && program.weeklySessions <= 7, `${program.id} weekly sessions out of range`);
  assert.ok(program.durationWeeks >= 4, `${program.id} duration is too short`);
  assert.equal(new Set(program.sessions.map((session) => session.id)).size, program.sessions.length, `${program.id} session ids must be unique`);

  for (const session of program.sessions) {
    assert.ok(session.machines.length >= 2, `${program.id}/${session.id} needs machine guidance`);
    assert.equal(new Set(session.machines.map((machine) => machine.id)).size, session.machines.length, `${program.id}/${session.id} exercise ids must be unique`);
    for (const exercise of session.machines) {
      const matches = assets.filter((asset) => asset.machineGuideId === exercise.machineId && asset.status !== "fuera_de_servicio");
      assert.ok(matches.length, `${program.id}/${session.id}/${exercise.id} has no available physical machine for ${exercise.machineId}`);
      assert.ok(exercise.sets > 0, `${program.id}/${session.id}/${exercise.id} needs sets`);
      assert.ok(exercise.reps > 0 || exercise.targetSeconds > 0, `${program.id}/${session.id}/${exercise.id} needs reps or time`);
    }
  }
}

const strength = runtime.chooseTrainingProgram(programDocs, { normalizedName: "SOCIO FUERZA", goal: "Quiero ganar fuerza" });
assert.equal(strength.id, "strength", "Strength goal must select the strength group");
const firstChoice = runtime.chooseTrainingProgram(programDocs, { normalizedName: "SOCIO SIN META", goal: "" });
const repeatedChoice = runtime.chooseTrainingProgram(programDocs, { normalizedName: "SOCIO SIN META", goal: "" });
assert.equal(firstChoice.id, repeatedChoice.id, "Default randomization must be stable for the same member");
const variedPrograms = new Set(Array.from({ length: 20 }, (_, index) => runtime.chooseTrainingProgram(programDocs, { normalizedName: `SOCIO ${index}`, goal: "" }).id));
assert.ok(variedPrograms.size > 1, "Members without a goal should be distributed across programs");

const conditioning = programDocs.find((program) => program.id === "conditioning");
const physicalVariants = new Set(Array.from({ length: 30 }, (_, index) => {
  const plan = runtime.materializeTrainingPlan({
    program: conditioning,
    equipment: assets,
    memberKey: `SOCIO ${index}`,
    today: "2026-09-22",
    cycle: 0,
  });
  assert.ok(plan.items.every((item) => item.prescribedExercises.every((exercise) => exercise.assetId)), "Every generated exercise must have a physical asset");
  return plan.items.flatMap((item) => item.prescribedExercises.map((exercise) => exercise.assetId)).join("|");
}));
assert.ok(physicalVariants.size > 1, "Duplicate physical units should be distributed between members");

console.log(`Training programs OK: ${programs.length} groups, ${programs.reduce((sum, program) => sum + program.sessions.length, 0)} sessions, stable group selection and randomized physical units.`);
