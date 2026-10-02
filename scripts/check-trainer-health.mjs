import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../lib/xtreme/trainer-health.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const api = {};
vm.runInNewContext(code, { exports: api });
const empty = api.sanitizeTrainerHealth(null);
assert.equal(api.parqSummary(empty).unanswered, 7, "unknown answers cannot imply No");
assert.equal(api.validateTrainerHealth(empty), null, "partial records are allowed");
const data = structuredClone(empty);
data.parq.answers.boneOrJoint = "yes";
assert.equal(api.parqSummary(data).affirmative, 1);
data.personal.birthDate = "2026-02-30";
assert.ok(api.validateTrainerHealth(data), "impossible dates are rejected");
data.personal.birthDate = "2000-02-29";
assert.equal(api.validateTrainerHealth(data), null);
data.parq.answers.boneOrJoint = false;
assert.ok(api.validateTrainerHealth(data), "booleans must not silently become an answer");
data.parq.answers.boneOrJoint = "yes";
data.personal.phone = "9".repeat(41);
assert.ok(api.validateTrainerHealth(data), "oversized fields must not be silently truncated");
assert.ok(api.validateTrainerHealth({ conditions: "incomplete payload" }), "malformed writes cannot erase the rest of a record");
// Exercise the actual route handlers with isolated sessions and an in-memory DB.
const memberId = "123456789012345678901234";
const records = new Map();
const audits = [];
let session = null;
let dbReads = 0;
class MongoServerError extends Error { constructor() { super("duplicate"); this.code = 11000; } }
class ObjectId { constructor(id) { this.id = id; } toHexString() { return this.id; } }
const db = { collection: (name) => name === "members" ? {
  findOne: async (filter) => filter._id.id === memberId ? { _id: new ObjectId(memberId), memberName: "Test member", phone: "12345678" } : null,
} : {
  findOne: async (filter) => records.get(filter._id) ?? null,
  insertOne: async (record) => {
    if (records.has(record._id)) throw new MongoServerError();
    records.set(record._id, structuredClone(record));
  },
  findOneAndUpdate: async (filter, update) => {
    const existing = records.get(filter._id);
    if (!existing || existing.version !== filter.version) return null;
    const next = { ...existing, data: structuredClone(update.$set.data), version: existing.version + update.$inc.version,
      history: [...existing.history, ...structuredClone(update.$push.history.$each)].slice(-20) };
    records.set(filter._id, next);
    return structuredClone(next);
  },
} };
const modules = {
  mongodb: { ObjectId, MongoServerError },
  "next/server": { NextResponse: { json: (body, options) => ({ body, ...options }) } },
  "@/lib/helpers/mongodb": { getDb: async () => { dbReads++; return db; } },
  "@/lib/xtreme/audit": { writeAudit: async (_db, entry) => audits.push(entry) },
  "@/lib/xtreme/staff-session": { resolveStaffSession: async () => session },
  "@/lib/xtreme/shared": { MEMBERS_COLLECTION: "members" },
  "@/lib/xtreme/trainer-health": api,
};
const routeSource = readFileSync(new URL("../app/api/xtreme/trainer/health/route.ts", import.meta.url), "utf8");
const routeCode = ts.transpileModule(routeSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const route = {};
vm.runInNewContext(routeCode, { exports: route, require: (name) => { assert.ok(modules[name], name); return modules[name]; }, console });
const getReq = { nextUrl: new URL(`http://test/health?memberId=${memberId}`) };
const saveReq = (version) => ({ json: async () => ({ memberId, version, data: api.sanitizeTrainerHealth(null) }) });
assert.equal((await route.GET(getReq)).status, 401);
assert.equal((await route.POST(saveReq(0))).status, 401);
assert.equal(dbReads, 0, "anonymous requests must never access the health DB");
session = { role: "reception", staffId: "reception", staffName: "Test" };
assert.equal((await route.GET(getReq)).status, 401, "reception sessions cannot read Trainer health data");
session = { role: "trainer", staffId: "trainer-test", staffName: "Test coach" };
const initial = await route.GET(getReq);
assert.equal(initial.body.data.personal.phone, "12345678", "new records prefill existing contact data");
assert.equal(initial.headers["Cache-Control"], "private, no-store");
const firstSaves = await Promise.all([route.POST(saveReq(0)), route.POST(saveReq(0))]);
assert.equal(firstSaves.filter((response) => response.status === 200).length, 1);
assert.equal(firstSaves.filter((response) => response.status === 409).length, 1, "simultaneous creation must conflict");
const edits = await Promise.all([route.POST(saveReq(1)), route.POST(saveReq(1))]);
assert.equal(edits.filter((response) => response.status === 200).length, 1);
assert.equal(edits.filter((response) => response.status === 409).length, 1, "stale edits cannot overwrite newer data");
for (let version = 2; version < 23; version++) assert.equal((await route.POST(saveReq(version))).status, 200);
const saved = (await route.GET(getReq)).body;
assert.equal(saved.version, 23);
assert.equal(saved.history.length, 20, "returned history must stay bounded");
assert.equal(saved.history.at(-1).savedBy, "Test coach");
assert.equal(saved.history.at(-1).staffId, "trainer-test");
assert.equal(JSON.stringify(audits).includes('"conditions"'), false, "general audit must not contain medical details");
console.log("PASS: partial records, input bounds, trainer-only access, private responses, concurrent writes and bounded history.");
