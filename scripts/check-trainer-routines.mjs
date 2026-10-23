import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";

function load(relativePath, modules = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const api = {};
  vm.runInNewContext(code, { exports: api, require: (name) => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`);
    return modules[name];
  } });
  return api;
}

const model = load("../lib/xtreme/trainer-group-a-model.ts");
const exercise = { id: "source-exercise", name: "Press", muscle: "Pecho", equipment: "Mancuernas", sourceMachine: "", sets: 3, reps: 12, time: "", sourcePage: 1 };
const base = { id: "base", objective: "Base", days: [{ id: "base-day", label: "Original", focus: "Pecho", exercises: [exercise] }] };
const saved = [];
let session = null;
const route = load("../app/api/xtreme/trainer/group-a/route.ts", {
  "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
  crypto: { randomUUID }, mongodb: { ObjectId: class {} },
  "@/lib/helpers/mongodb": { getDb: async () => ({}) },
  "@/lib/xtreme/staff-session": { resolveStaffSession: async () => session },
  "@/lib/xtreme/shared": { MEMBERS_COLLECTION: "members" },
  "@/lib/xtreme/business-date": {},
  "@/lib/xtreme/trainer-group-a-model": model,
  "@/lib/xtreme/trainer-group-a": {
    getGroupDashboard: async () => ({ routines: [base] }),
    saveGroupRecord: async (_db, id, revision, record) => { saved.push({ id, revision, record }); return true; },
  },
});
const request = (body) => ({ json: async () => body });
const payload = { action: "create_routine", objective: "New routine", startDate: "2026-10-23", endDate: "2026-11-23", dayLabel: "Lower body", focus: "Legs", moduleCount: 3, revision: 0 };
assert.equal((await route.POST(request(payload))).status, 401, "creation requires a trainer session");
assert.equal(saved.length, 0);
session = { role: "trainer", staffName: "Test coach" };
const created = await route.POST(request(payload));
assert.equal(created.status, 200);
const clean = saved[0].record.routine;
assert.equal(created.body.routineId, clean.id);
assert.equal(clean.days.length, 3);
assert.ok(clean.days.every((day) => day.exercises.length === 0), "a new routine must start empty");
assert.equal(clean.days[0].label, "Lower body", "preserve the first day name");
assert.equal(clean.coach, "Test coach");
assert.equal(new Set(clean.days.map((day) => day.id)).size, 3);

assert.equal((await route.POST(request({ ...payload, templateRoutineId: "base", templateDayId: "base-day" }))).status, 200);
const copied = saved[1].record.routine;
assert.equal(copied.days[0].exercises.length, 1);
assert.notEqual(copied.days[0].exercises[0].id, exercise.id, "copied exercises get independent identities");
assert.ok(copied.days.slice(1).every((day) => day.exercises.length === 0));
copied.days[0].exercises[0].name = "Changed";
assert.equal(exercise.name, "Press", "editing a copy must not mutate its source");
for (const invalid of [{ moduleCount: 0 }, { moduleCount: 8 }, { endDate: "2026-10-22" }, { startDate: "2026-02-30" }, { templateRoutineId: "missing", templateDayId: "missing" }]) {
  assert.equal((await route.POST(request({ ...payload, ...invalid }))).status, 400);
}
assert.equal(saved.length, 2, "invalid input must not create routines");

// Exercise the real creator's event handlers with a small hook harness.
const states = [];
let cursor = 0;
const creator = load("../app/components/trainer/ui/TrainerRoutineCreator.tsx", {
  "react/jsx-runtime": jsx,
  react: { useId: () => "routine-form", useState: (initial) => {
    const index = cursor++;
    if (!(index in states)) states[index] = initial;
    return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
  } },
  "lucide-react": { Plus: "icon", Loader2: "icon" },
  "@/app/components/GameOS": { GameButton: "game-button", GameLabel: "game-label" },
});
let submitted;
let openedId;
const render = () => { cursor = 0; return creator.TrainerRoutineCreator({
  data: { date: "2026-10-23", routines: [base] }, busy: false,
  mutate: async (body, _message, onSuccess) => { submitted = body; onSuccess({ ok: true, routineId: "new-id" }); return true; },
  onCreated: (id) => { openedId = id; },
}); };
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !node.props) return [];
  return [node, ...elements(node.props.children)];
}
let tree = elements(render());
assert.ok(!tree.some((node) => node.type === "form"));
tree.find((node) => node.type === "button").props.onClick();
tree = elements(render());
const selects = tree.filter((node) => node.type === "select");
assert.equal(selects[1].props.value, "", "UI must default to an empty routine even when templates exist");
tree.find((node) => node.type === "input" && node.props.placeholder).props.onChange({ target: { value: "Fresh plan" } });
tree.filter((node) => node.type === "input" && node.props.type === "date")[1].props.onChange({ target: { value: "2026-11-23" } });
tree = elements(render());
tree.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
assert.equal(submitted.objective, "Fresh plan");
assert.ok(!("templateRoutineId" in submitted), "clean creation must not send a template");
assert.equal(openedId, "new-id", "successful creation opens the new routine");
assert.ok(!elements(render()).some((node) => node.type === "form"), "successful creation closes the form");
console.log("Trainer routine checks passed: authorization, empty creation, optional copy, validation, and creator UI flow.");
