const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");
const root = path.resolve(__dirname, "..");

// Execute the real route handlers without opening a server or writing to production Mongo.
function loadTs(relative, mocks = {}) {
  const file = path.resolve(root, relative);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) return loadTs(name.slice(2) + ".ts", mocks);
    if (name.startsWith(".")) {
      const resolved = path.resolve(path.dirname(file), name);
      return loadTs(path.relative(root, resolved.endsWith(".ts") ? resolved : resolved + ".ts"), mocks);
    }
    return require(name);
  };
  new Function("require", "module", "exports", code)(localRequire, module, module.exports);
  return module.exports;
}

function fixture() {
  const today = "2026-09-08";
  let session = { memberKey: "SOCIO A", memberName: "Socio A" };
  const members = [
    { normalizedName: "SOCIO A", memberName: "Socio A", goal: "Constancia", workouts: [], bodyMetrics: [] },
    { normalizedName: "SOCIO B", memberName: "Socio B", goal: "Otro objetivo", workouts: [], bodyMetrics: [] },
  ];
  const visits = [{ id: "visit-a", normalizedName: "SOCIO A", date: today }];
  const get = (obj, key) => key.split(".").reduce((value, part) => value?.[part], obj);
  const matches = (doc, query) => Object.entries(query).every(([key, expected]) => {
    let value = get(doc, key);
    if (key === "bodyMetrics.id") value = (doc.bodyMetrics ?? []).map((item) => item.id);
    if (expected && typeof expected === "object") {
      if ("$exists" in expected) return (value !== undefined) === expected.$exists;
      if ("$ne" in expected) return Array.isArray(value) ? !value.includes(expected.$ne) : value !== expected.$ne;
    }
    return expected === null ? value == null : value === expected;
  });
  const set = (doc, key, value) => { const keys = key.split("."); const last = keys.pop(); let target = doc; for (const part of keys) target = target[part] ??= {}; target[last] = structuredClone(value); };
  const collection = {
    findOne: async (query) => structuredClone(members.find((doc) => matches(doc, query)) ?? null),
    updateOne: async (query, mutation) => {
      const doc = members.find((item) => matches(item, query));
      if (!doc) return { matchedCount: 0, modifiedCount: 0 };
      for (const [key, value] of Object.entries(mutation.$set ?? {})) set(doc, key, value);
      for (const [key, value] of Object.entries(mutation.$push ?? {})) (doc[key] ??= []).push(structuredClone(value));
      for (const key of Object.keys(mutation.$unset ?? {})) delete doc[key];
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
  const db = { collection: (name) => name === "members" ? collection : { find: (query) => ({ toArray: async () => visits.filter((visit) => matches(visit, query)) }) } };
  const repository = {
    findByKey: async (key) => structuredClone(members.find((member) => member.normalizedName === key)),
    findCheckinOnDate: async (key, date) => visits.find((visit) => visit.normalizedName === key && visit.date === date),
    appendWorkoutOnce: async ({ memberKey, entry }) => {
      const member = members.find((item) => item.normalizedName === memberKey);
      if (member.workouts.some((workout) => workout.completedDate === entry.completedDate)) return "duplicate";
      member.workouts.push(structuredClone(entry));
      return "appended";
    },
  };
  const noop = () => {};
  const mocks = {
    "@/lib/helpers/mongodb": { getDb: async () => db },
    "@/lib/xtreme/session": { requireMemberSession: async () => session ?? NextResponse.json({ error: "Sesión requerida" }, { status: 401 }), isSession: (value) => Boolean(value?.memberKey) },
    "@/lib/xtreme/shared": { MEMBERS_COLLECTION: "members", CHECKINS_COLLECTION: "visits", sanitizeWorkoutExercises: loadTs("lib/xtreme/shared/sanitizers.ts", { "./dates": {} }).sanitizeWorkoutExercises },
    "@/lib/xtreme/business-date": { businessDate: () => today },
    "@/lib/xtreme/events": { recordEvent: async () => {} },
    "@/lib/xtreme/member-visit": { findActiveMemberVisit: async (_, key) => visits.find((visit) => visit.normalizedName === key) ?? null },
    "@/lib/xtreme/members/repository": { createMongoMemberRepository: () => repository },
    "./gamification-service": { syncMemberGamification: async () => [] },
    "@/lib/xtreme/members/gamification-service": { syncMemberGamification: async () => [] },
    "@/lib/helpers/email": {}, "@/lib/xtreme/auth-attempts": {}, "@/lib/xtreme/entitlements": {},
    "@/lib/xtreme/gamification": {}, "@/lib/xtreme/next-best-action": {},
    "@/lib/xtreme/members/normalizers": { normalizeIsoDate: (value) => value || today },
    "@/lib/xtreme/members/membership": {},
    "@/lib/xtreme/members/leaderboard": { getMemberLeaderboard: async () => [] },
    "@/lib/xtreme/members/presenter": { toPublicMember: (member) => member },
    "@/lib/xtreme/class-checkin": {}, "@/lib/xtreme/members/resolve-member": {},
    "@/lib/xtreme/member-push": { badgeNamesFromNewBadges: () => [], queuePushMemberEvent: noop },
  };
  const journey = loadTs("app/api/xtreme/journey/route.ts", mocks);
  const user = loadTs("app/api/xtreme/user/route.ts", mocks);
  const request = (body) => new NextRequest("http://example.test/api/xtreme/journey", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { members, visits, journey, user, request, unauthenticate: () => { session = null; } };
}
const exercise = { id: "exercise-a", machineId: "", machineName: "", exerciseName: "Remo", sets: 3, reps: 10, weightKg: 20, seconds: 0, notes: "", completed: true };

test("journey API requires a session and ignores forged member identity", async () => {
  const f = fixture();
  const response = await f.journey.PATCH(f.request({ action: "start", version: 0, memberKey: "SOCIO B", trainingName: "Espalda" }));
  assert.equal(response.status, 200);
  assert.equal(f.members[0].journey.workout.trainingName, "Espalda");
  assert.equal(f.members[1].journey, undefined);
  f.unauthenticate();
  assert.equal((await f.journey.GET(f.request({}))).status, 401);
  assert.equal((await f.journey.PATCH(f.request({ action: "cancel", version: 1 }))).status, 401);
});
test("free session resumes, rejects stale writes, saves exercises, finishes once and verifies a level", async () => {
  const f = fixture();
  assert.equal((await f.journey.PATCH(f.request({ action: "start", version: 0, trainingName: "Espalda" }))).status, 200);
  const loaded = await (await f.journey.GET(f.request({}))).json();
  assert.equal(loaded.workout.trainingName, "Espalda");
  assert.equal((await f.journey.PATCH(f.request({ action: "save", version: 0, exercises: [] }))).status, 409);
  assert.equal((await f.journey.PATCH(f.request({ action: "finish", version: 1, exercises: [{ ...exercise, completed: false }] }))).status, 400);
  assert.equal((await f.journey.PATCH(f.request({ action: "save", version: 1, exercises: [exercise] }))).status, 200);
  assert.equal((await (await f.journey.GET(f.request({}))).json()).workout.exercises[0].completed, true);
  assert.equal((await f.journey.PATCH(f.request({ action: "finish", version: 2, exercises: [exercise] }))).status, 200);
  assert.equal(f.members[0].workouts.length, 1);
  assert.equal((await f.journey.PATCH(f.request({ action: "finish", version: 2, exercises: [exercise] }))).status, 409);
  assert.equal(f.members[0].workouts.length, 1);
  const checked = await f.journey.PATCH(f.request({ action: "verify", version: 3, level: 99 }));
  assert.equal(checked.status, 200);
  assert.equal((await checked.json()).level, 1);
  assert.equal(f.members[0].journey.proofs[0].workoutIds.length, 1);
  assert.equal((await f.journey.PATCH(f.request({ action: "verify", version: 4 }))).status, 409);
});
test("no attendance or an existing assigned session prevents a second free session", async () => {
  const f = fixture();
  f.visits.length = 0;
  assert.equal((await f.journey.PATCH(f.request({ action: "start", version: 0, trainingName: "Pierna" }))).status, 409);
  f.visits.push({ id: "v", normalizedName: "SOCIO A", date: "2026-09-08" });
  f.members[0].activePlanWorkout = { id: "plan-a" };
  assert.equal((await f.journey.PATCH(f.request({ action: "start", version: 0, trainingName: "Pierna" }))).status, 409);
  assert.equal((await f.journey.PATCH(f.request({ action: "verify", version: 0 }))).status, 409);
});
test("body metric handler stores the complete report once, using authenticated identity", async () => {
  const f = fixture();
  const body = { action: "bodyMetric", requestId: "12345678-1234-1234-1234-123456789abc", memberName: "SOCIO B", completedDate: "2026-09-08", weightKg: 73.5, waistCm: "", inbody: { values: { skeletalMuscleKg: 30.1, bodyFatPct: 24 }, segments: { leftArm: { leanKg: 3 } }, additional: [] } };
  assert.equal((await f.user.PATCH(f.request(body))).status, 200);
  assert.equal((await f.user.PATCH(f.request(body))).status, 200);
  assert.equal(f.members[0].bodyMetrics.length, 1);
  assert.equal(f.members[0].bodyMetrics[0].inbody.values.skeletalMuscleKg, 30.1);
  assert.equal(f.members[1].bodyMetrics.length, 0);
  assert.equal((await f.user.PATCH(f.request({ ...body, requestId: undefined, completedDate: "2026-02-31" }))).status, 400);
  assert.equal((await f.user.PATCH(f.request({ ...body, requestId: undefined, completedDate: "2026-09-09" }))).status, 400);
  assert.equal((await f.user.PATCH(f.request({ ...body, requestId: undefined, weightKg: "" }))).status, 400);
  f.unauthenticate();
  assert.equal((await f.user.PATCH(f.request(body))).status, 401);
});
