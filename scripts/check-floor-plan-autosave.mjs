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
const inventory = [{ id: "eq-001", area: "Cardio", kind: "machine", code: "A", name: "Test", location: "", status: "bueno" }];
const plan = model.createInitialPlan(inventory);
const moved = structuredClone(plan);
moved.placements["eq-001"].x += 50;
const response = (status, data) => ({ ok: status < 400, status, json: async () => data });

function harness(local, remote, put = async () => response(200, { revision: 2 })) {
  const storage = new Map(local ? [[model.PLAN_STORAGE_KEY, JSON.stringify({ plan: local })]] : []);
  const slots = [];
  let cursor = 0;
  const calls = [];
  const restored = [];
  const react = {
    useRef: (value) => { const i = cursor++; return slots[i] ??= { current: value }; },
    useState: (value) => { const i = cursor++; slots[i] ??= value; return [slots[i], (next) => { slots[i] = next; }]; },
    useCallback: (fn) => fn,
    useEffect: () => {},
  };
  const { usePlanAutosave: runHook } = load("app/maquinas/plano/usePlanAutosave.ts", { react, "./plan-model": model }, {
    AbortSignal, Date,
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    fetch: async (_url, options) => {
      if (options.method === "PUT") { calls.push(JSON.parse(options.body)); return put(options); }
      return response(200, remote);
    },
  });
  return {
    calls, storage, restored,
    render(value = local ?? plan) { cursor = 0; return runHook(value, true, inventory, (next) => restored.push(next)); },
  };
}

const fresh = harness(null, { plan: moved, revision: 3 });
await fresh.render().retry();
assert.equal(fresh.restored[0].placements["eq-001"].x, moved.placements["eq-001"].x, "New browser restores Mongo layout");
assert.equal(fresh.calls.length, 0, "Initial layout never overwrites existing Mongo layout");

const migrate = harness(moved, { plan: null, revision: 0 });
await migrate.render().retry();
assert.equal(migrate.calls.length, 1, "Legacy local arrangement is uploaded when Mongo is empty");
assert.equal(migrate.calls[0].plan.placements["eq-001"].x, moved.placements["eq-001"].x);

const conflict = harness(moved, { plan, revision: 4 });
await conflict.render().retry();
assert.equal(conflict.render().conflict, true);
assert.equal(conflict.calls.length, 0, "Divergent local layout cannot silently overwrite Mongo");
await conflict.render().restore();
assert.equal(conflict.restored.length, 1);
assert.ok(conflict.storage.has(`${model.PLAN_STORAGE_KEY}:recovery`), "Restore preserves a recovery copy");

let finish;
const queued = harness(plan, { plan: null, revision: 0 }, () => new Promise((resolve) => { finish = resolve; }));
const saving = queued.render().retry();
while (!finish) await new Promise((resolve) => setImmediate(resolve));
queued.render(moved);
finish(response(200, { revision: 1 }));
await saving;
assert.equal(queued.render(moved).status, "Cambios pendientes de guardar", "Edits during a write stay dirty");
const nextSave = queued.render(moved).retry();
finish(response(200, { revision: 2 }));
await nextSave;
assert.equal(queued.calls[1].revision, 1);
assert.equal(queued.calls[1].plan.placements["eq-001"].x, moved.placements["eq-001"].x);

const stale = harness(moved, { plan: null, revision: 0 }, async () => response(409, { error: "Conflict" }));
await stale.render().retry();
await stale.render().retry();
assert.equal(stale.calls.length, 1, "Conflict blocks automatic overwrite retries");

let authorized = true;
let saved = null;
const collection = {
  findOne: async () => saved,
  updateOne: async (filter, update, options) => {
    if (saved && saved.revision !== filter.revision) {
      if (options.upsert) throw { code: 11000 };
      return { matchedCount: 0, upsertedCount: 0 };
    }
    saved = { _id: "main", ...update.$set, revision: (saved?.revision ?? 0) + 1 };
    return { matchedCount: options.upsert ? 0 : 1, upsertedCount: options.upsert ? 1 : 0 };
  },
};
const route = load("app/api/xtreme/admin/floor-plan/route.ts", {
  "next/server": { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } },
  "@/lib/helpers/mongodb": { getDb: async () => ({ collection: () => collection }) },
  "@/lib/xtreme/staff-session": { resolveStaffSession: async () => authorized ? { role: "admin" } : null },
  "@/lib/xtreme/public-equipment": { getPublicEquipment: async () => ({ inventory, source: "shared" }) },
  "@/app/maquinas/plano/plan-model": model,
});
const request = (value) => ({ text: async () => JSON.stringify(value) });
authorized = false;
assert.equal((await route.PUT(request({ plan, revision: 0 }))).status, 401);
assert.equal(saved, null);
authorized = true;
assert.equal((await route.PUT(request({ plan: null, revision: 0 }))).status, 400);
assert.equal((await route.PUT(request({ plan, revision: 0 }))).status, 200);
assert.equal((await route.PUT(request({ plan: moved, revision: 0 }))).status, 409);
assert.equal((await route.PUT(request({ plan: moved, revision: 1 }))).status, 200);
assert.equal((await route.PUT(request({ plan, revision: 1 }))).status, 409);
assert.equal((await route.GET({})).data.plan.placements["eq-001"].x, moved.placements["eq-001"].x);
console.log("PASS: Mongo restore, local migration, recovery backup, queued edits, conflicts, authorization, validation and revision checks.");
