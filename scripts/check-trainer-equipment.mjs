import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";

function load(file, modules = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const api = {};
  vm.runInNewContext(code, { exports: api, require: (name) => { assert.ok(name in modules, `Unexpected dependency: ${name}`); return modules[name]; } });
  return api;
}
const model = load("../lib/xtreme/trainer-group-a-model.ts");
const search = load("../lib/xtreme/trainer-equipment-search.ts", { "./trainer-group-a-model": model });
const inventory = [
  { id: "treadmill-24", code: "CA-24", name: "Caminadora", machineGuideId: "treadmill", status: "operativo", location: "Cardio" },
  { id: "press-24", code: "PI-24", name: "Prensa de piernas", machineGuideId: "leg-press-incline", status: "operativo" },
  { id: "bike-124", code: "CA-124", name: "Bicicleta", machineGuideId: "bicicleta-estatica", status: "operativo", location: "Piso 24" },
  { id: "elliptical-7", code: "CA-07", name: "Elíptica", machineGuideId: "elliptical", status: "pendiente" },
  { id: "treadmill-8", code: "CA-08", name: "Caminadora", machineGuideId: "treadmill", status: "fuera_de_servicio" },
  { id: "unknown-31", code: "EQ-31", name: "Equipo especial", status: "operativo" },
];
const ids = (query, family) => Array.from(search.searchTrainerEquipment(inventory, query, family), (asset) => asset.id);
for (const query of ["24", "#24", "00024", "Máquina #24"]) assert.deepEqual(ids(query), ["treadmill-24", "press-24"]);
assert.deepEqual(ids("PI24"), ["press-24"]);
assert.deepEqual(ids("PI-24"), ["press-24"]);
assert.deepEqual(ids("eliptica"), ["elliptical-7"]);
assert.deepEqual(ids("24", "legs"), ["press-24"]);
assert.ok(!ids("24").includes("bike-124"), "a number never matches a substring or floor");
assert.deepEqual(ids("no existe"), []);
assert.deepEqual(Array.from(search.searchTrainerEquipment([], "24")), []);

const original = { id: "exercise-1", name: "Press", muscle: "Pecho", equipment: "Máquina", sourceMachine: "24", sets: 3, reps: 12, time: "", sourcePage: 0 };
const oldMapping = { exerciseId: original.id, assetId: "press-24", machineGuideId: "leg-press-incline", revision: 1, updatedBy: "Test" };
const chosen = model.alignGroupExercise({ ...original, assetId: "treadmill-24" }, inventory, oldMapping);
assert.equal(chosen.asset.id, "treadmill-24", "explicit stable identity overrides an old mapping and duplicate numbers");
assert.equal(chosen.status, "linked");
assert.equal(model.alignGroupExercise({ ...original, assetId: "unknown-31" }, inventory).asset.id, "unknown-31", "uncategorized real units remain selectable");
assert.equal(model.alignGroupExercise({ ...original, assetId: "removed-unit" }, inventory, oldMapping).asset, null, "removed units cannot silently fall back to another machine");
assert.equal(model.alignGroupExercise({ ...original, assetId: "treadmill-8" }, inventory).status, "review");
assert.equal(model.alignGroupExercise({ ...original, assetId: "", equipment: "Mancuernas", sourceMachine: "" }, inventory, oldMapping).asset, null);

// Exercise the real write handlers using in-memory records, never live gym data.
const records = new Map();
const db = { collection: () => ({ findOne: async ({ _id, revision }) => {
  const row = records.get(_id); return row && (revision === undefined || row.revision === revision) ? row : null;
} }) };
const route = load("../app/api/xtreme/trainer/group-a/route.ts", {
  "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
  crypto: { randomUUID }, mongodb: { ObjectId: class {} },
  "@/lib/helpers/mongodb": { getDb: async () => db },
  "@/lib/xtreme/staff-session": { resolveStaffSession: async () => ({ role: "trainer", staffName: "Test" }) },
  "@/lib/xtreme/shared": {}, "@/lib/xtreme/business-date": {},
  "@/lib/xtreme/trainer-group-a-model": model,
  "@/lib/xtreme/trainer-group-a": {
    getGroupDashboard: async () => ({ inventory, routines: [{ id: "routine-1", days: [{ id: "day-1", exercises: [original] }] }] }),
    saveGroupRecord: async (_db, id, revision, record) => {
      if ((records.get(id)?.revision ?? 0) !== revision) return false;
      records.set(id, { _id: id, ...record, revision: revision + 1 }); return true;
    },
  },
});
const send = (body) => route.POST({ json: async () => body });
assert.equal((await send({ action: "add_exercise", routineId: "routine-1", dayId: "day-1", revision: 0, patch: { name: "Cardio", assetId: "treadmill-24", equipment: "Wrong label", sourceMachine: "999" } })).status, 200);
let row = [...records.values()][0];
assert.equal(row.exercise.assetId, "treadmill-24");
assert.equal(row.exercise.sourceMachine, "CA-24", "the server uses the actual inventory code");
assert.equal(row.exercise.equipment, "Caminadora");
for (const assetId of ["missing", "elliptical-7", "treadmill-8", 24, null, "x".repeat(161)]) {
  assert.equal((await send({ action: "exercise", exerciseId: original.id, revision: 0, patch: { assetId } })).status, 400);
}
assert.equal(records.size, 1, "invalid selections must not save");
assert.equal((await send({ action: "exercise", exerciseId: original.id, revision: 0, patch: { assetId: "press-24" } })).status, 200);
row = records.get(`exercise:${original.id}`);
assert.equal(row.exercisePatch.assetId, "press-24");
assert.equal(row.exercisePatch.sourceMachine, "PI-24");
assert.equal((await send({ action: "exercise", exerciseId: original.id, revision: 1, patch: { sets: 4 } })).status, 200);
assert.equal(records.get(`exercise:${original.id}`).exercisePatch.assetId, "press-24", "unrelated edits retain the chosen unit");
assert.equal((await send({ action: "exercise", exerciseId: original.id, revision: 1, patch: { assetId: "treadmill-24" } })).status, 409, "stale edits cannot replace a newer selection");

let memberLog;
const memberRoute = load("../app/api/xtreme/member/group-a/route.ts", {
  "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
  "@/lib/helpers/mongodb": { getDb: async () => ({ collection: (name) => name === "members" ? {
    findOne: async () => ({ _id: { toString: () => "member-1" } }),
  } : { find: () => ({ toArray: async () => [oldMapping] }) } }) },
  "@/lib/xtreme/business-date": { businessDate: () => "2026-10-23" },
  "@/lib/xtreme/session": { requireMemberSession: async () => ({ memberKey: "EXAMPLE" }), isSession: () => true },
  "@/lib/xtreme/shared": { MEMBERS_COLLECTION: "members" },
  "@/lib/xtreme/trainer-group-a-model": model,
  "@/lib/xtreme/trainer-group-a": {
    GROUP_A_COLLECTION: "group-a",
    getGroupDashboard: async () => ({ profiles: [{ id: "profile-1", memberId: "member-1", routineId: "routine-1" }], logs: [], routines: [{ id: "routine-1", days: [{ id: "day-1", exercises: [{ ...original, assetId: "treadmill-24" }] }] }] }),
    groupInventory: async () => inventory,
    saveGroupRecord: async (_db, _id, _revision, record) => { memberLog = record.log; return true; },
    getGroupAMemberView: async () => ({}),
  },
});
assert.equal((await memberRoute.POST({ json: async () => ({ action: "log", revision: 0, dayId: "day-1", date: "2026-10-23", completedIds: [original.id] }) })).status, 200);
assert.equal(memberLog.executions[0].assetId, "treadmill-24", "Member OS logs the trainer's actual selection despite older mapping records");
assert.equal(memberLog.executions[0].machineCode, "CA-24");

// Verify keyboard selection and duplicate handling in the real picker.
const states = []; let cursor = 0; let value = ""; let selections = 0;
const picker = load("../app/components/trainer/ui/TrainerEquipmentPicker.tsx", {
  "react/jsx-runtime": jsx,
  react: { useId: () => "picker", useState: (initial) => {
    const i = cursor++; if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial;
    return [states[i], (next) => { states[i] = typeof next === "function" ? next(states[i]) : next; }];
  } },
  "lucide-react": { Check: "icon", Hash: "icon", Search: "icon", X: "icon" },
  "@/lib/xtreme/trainer-group-a-model": model,
  "@/lib/xtreme/trainer-equipment-search": search,
  "./EquipmentGlyph": { EquipmentGlyph: "equipment-glyph" },
});
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  return node && typeof node === "object" && node.props ? [node, ...elements(node.props.children)] : [];
}
const render = () => { cursor = 0; return elements(picker.TrainerEquipmentPicker({ inventory, value, onChange: (asset) => { value = asset?.id ?? ""; selections++; } })); };
const input = () => render().find((node) => node.type === "input");
input().props.onChange({ target: { value: "#24" } });
let prevented = false;
input().props.onKeyDown({ key: "Enter", preventDefault: () => { prevented = true; } });
assert.ok(prevented, "Enter in search must not submit the routine form");
assert.equal(selections, 0, "ambiguous numbers require a card selection");
input().props.onChange({ target: { value: "PI-24" } });
input().props.onKeyDown({ key: "Enter", preventDefault() {} });
assert.equal(value, "press-24");
assert.ok(!render().some((node) => node.type === "input"), "selection collapses the results");
render().find((node) => node.type === "button" && node.props["aria-expanded"] !== undefined).props.onClick();
input().props.onChange({ target: { value: "7" } });
input().props.onKeyDown({ key: "Enter", preventDefault() {} });
assert.equal(selections, 1, "unavailable units cannot be chosen by Enter");
assert.ok(render().some((node) => node.type === "button" && node.props["aria-pressed"] === false && node.props.disabled));
console.log("Trainer equipment checks passed: numeric search, duplicates, keyboard selection, availability, stable identity, and guarded API writes.");
