import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import ts from "typescript";

function load(path, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Date, console, require: (name) => {
    assert.ok(modules[name], `Unexpected dependency: ${name}`); return modules[name];
  } });
  return exports;
}
const model = load("lib/xtreme/product-investment-model.ts");
const input = { accountingMonth: "2026-09", investorId: "alberto", concept: "Compra de prueba",
  amountCrc: null, quantity: null, purchaseDate: null, status: "reported", needsVerification: true,
  invoiceReference: "", note: "" };
assert.equal(model.validateInvestment(input).amountCrc, null, "unknown amounts are not zero");
for (const changes of [{ amountCrc: -1 }, { quantity: 1.5 }, { purchaseDate: "2026-02-30" },
  { accountingMonth: "2026-13" }, { status: { toString: () => "reported" } }, { investorId: "" }]) {
  assert.throws(() => model.validateInvestment({ ...input, ...changes }));
}
assert.equal(model.investmentMonthRange("2026-09").from.toISOString(), "2026-09-01T06:00:00.000Z");
assert.equal(model.investmentMonthRange("2026-12").to.toISOString(), "2027-01-01T06:00:00.000Z");
assert.equal(model.summarizeInvestments([], model.DEFAULT_PRODUCT_INVESTORS, 0, 0).summary.reportedInvestment, 0);

const data = new Map();
const audits = [];
let session = null;
let dbReads = 0;
let uuid = 0;
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some((branch) => matches(row, branch));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("$exists" in value) return Object.hasOwn(row, key) === value.$exists;
      return (!value.$gte || row[key] >= value.$gte) && (!value.$lt || row[key] < value.$lt);
    }
    return row[key] === value;
  });
}
const duplicate = () => Object.assign(new Error("Duplicate key"), { code: 11000 });
const db = { collection(name) {
  if (!data.has(name)) data.set(name, []);
  const rows = data.get(name);
  const update = (row, change) => {
    Object.assign(row, structuredClone(change.$set ?? {}));
    for (const [key, value] of Object.entries(change.$inc ?? {})) row[key] = (row[key] ?? 0) + value;
  };
  return {
    createIndex: async () => {},
    find(filter) { const cursor = { sort: () => cursor, toArray: async () => structuredClone(rows.filter((row) => matches(row, filter))) }; return cursor; },
    findOne: async (filter) => structuredClone(rows.find((row) => matches(row, filter)) ?? null),
    async insertOne(row) {
      if (rows.some((existing) => existing.id === row.id || (row._id && existing._id === row._id) || (row.nameKey && existing.nameKey === row.nameKey))) throw duplicate();
      rows.push(structuredClone(row));
    },
    async updateOne(filter, change) {
      const row = rows.find((row) => matches(row, filter));
      if (!row) return { matchedCount: 0 };
      if (change.$set?.nameKey && rows.some((other) => other !== row && other.nameKey === change.$set.nameKey)) throw duplicate();
      update(row, change); return { matchedCount: 1 };
    },
    async findOneAndUpdate(filter, change) {
      let row = rows.find((row) => matches(row, filter));
      if (!row) { row = { ...filter }; rows.push(row); }
      update(row, change); return structuredClone(row);
    },
    aggregate(pipeline) { return { next: async () => {
      const sales = rows.filter((row) => matches(row, pipeline[0].$match));
      return { totalIncome: sales.reduce((total, row) => total + row.total, 0), saleCount: sales.length };
    } }; },
  };
} };
const investments = load("lib/xtreme/product-investments.ts", {
  "./shared/config": { PRODUCT_SALES_COLLECTION: "sales" }, "./product-investment-model": model,
});
const route = load("app/api/xtreme/reception/investments/route.ts", {
  "node:crypto": { createHash, randomUUID: () => `test-${++uuid}` },
  "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers }) } },
  "@/lib/helpers/mongodb": { getDb: async () => { dbReads++; return db; } },
  "@/lib/xtreme/audit": { writeAudit: async (_db, entry) => audits.push(entry) },
  "@/lib/xtreme/staff-session": { resolveStaffSession: async () => session, authenticateStaffCode: (code, role) => code === "test-admin" && role === "admin" },
  "@/lib/xtreme/product-investments": investments, "@/lib/xtreme/product-investment-model": model,
});
const req = (body) => ({ json: async () => body, headers: { get: () => "test-ip" } });
const monthReq = (month) => ({ nextUrl: new URL(`http://test/investments?month=${month}`) });
for (const method of ["POST", "PATCH", "DELETE"]) assert.equal((await route[method](req(input))).status, 401);
assert.equal((await route.GET(monthReq("2026-09"))).status, 401);
assert.equal(dbReads, 0, "anonymous requests never touch the database");
session = { role: "reception", staffId: "test-reception", staffName: "Operadora de prueba" };
assert.equal((await route.GET(monthReq("2026-13"))).status, 400);
const investmentRows = data.set(investments.PRODUCT_INVESTMENTS_COLLECTION, []).get(investments.PRODUCT_INVESTMENTS_COLLECTION);
investmentRows.push({ ...input, investorId: undefined, id: "legacy-september", amountCrc: 117720,
  createdAt: new Date("2026-09-30"), source: "Importación anterior" });
data.set("sales", [
  { createdAt: new Date("2026-09-01T05:59:59.999Z"), total: 999 },
  ...Array.from({ length: 125 }, () => ({ createdAt: new Date("2026-09-30T23:00:00Z"), total: 10 })),
  { createdAt: new Date("2026-10-01T06:00:00Z"), total: 88 },
]);
const september = await route.GET(monthReq("2026-09"));
assert.equal(september.body.summary.totalIncome, 1250, "totals include more than 100 sales and respect CR month boundaries");
assert.equal(september.body.entries[0].revision, 0);
assert.equal(september.body.summary.unassignedCount, 1, "legacy records do not guess an investor");
assert.equal(september.headers["Cache-Control"], "private, no-store");
assert.equal((await route.GET(monthReq("2026-10"))).body.entries.length, 0, "September never leaks into October");
const edit = { ...input, entity: "investment", id: "legacy-september", revision: 0, amountCrc: 117720 };
const concurrent = await Promise.all([route.PATCH(req(edit)), route.PATCH(req({ ...edit, amountCrc: 1 }))]);
assert.equal(concurrent.filter((result) => result.status === 200).length, 1);
assert.equal(concurrent.filter((result) => result.status === 409).length, 1, "stale edits cannot overwrite the latest investment");
assert.equal(investmentRows.length, 1, "editing a legacy record never duplicates it");
assert.equal(investmentRows[0].source, "Importación anterior");
assert.equal(investmentRows[0].updatedBy, session.staffName);
assert.equal(investmentRows[0].updatedById, session.staffId);
assert.equal((await route.PATCH(req({ ...edit, revision: 1, accountingMonth: "2026-08" }))).status, 200);
assert.equal((await route.GET(monthReq("2026-09"))).body.entries.length, 0);
assert.equal((await route.GET(monthReq("2026-08"))).body.entries.length, 1, "a corrected accounting month moves the same record");
const investor = await route.POST(req({ entity: "investor", name: "Nueva Persona", description: "Prueba", active: true }));
assert.equal(investor.status, 201);
assert.equal((await route.POST(req({ entity: "investor", name: " nueva   pérsona ", description: "", active: true }))).status, 409);
const created = await route.POST(req({ ...input, entity: "investment", investorId: investor.body.id }));
assert.equal(created.status, 201);
assert.equal((await route.GET(monthReq("2026-09"))).body.summary.pendingAmounts, 1);
assert.equal((await route.PATCH(req({ entity: "investor", id: investor.body.id, revision: 1, name: "Nueva Persona", description: "", active: false }))).status, 200);
assert.equal((await route.POST(req({ ...input, entity: "investment", investorId: investor.body.id }))).status, 400);
assert.equal((await route.PATCH(req({ ...input, entity: "investment", investorId: investor.body.id, id: created.body.id, revision: 1, amountCrc: 200 }))).status, 200, "inactive investors keep editable history");
const fallback = { entity: "investor", id: "david", revision: 0, name: "David Mendoza", description: "Actualizado", active: true };
const fallbackWrites = await Promise.all([route.PATCH(req(fallback)), route.PATCH(req(fallback))]);
assert.equal(fallbackWrites.filter((result) => result.status === 200).length, 1);
assert.equal(fallbackWrites.filter((result) => result.status === 409).length, 1);
const deletion = { id: created.body.id, revision: 2, code: "wrong" };
assert.equal((await route.DELETE(req(deletion))).status, 403);
assert.equal((await route.DELETE(req({ ...deletion, code: "test-admin" }))).status, 200);
assert.equal((await route.GET(monthReq("2026-09"))).body.entries.length, 0);
assert.ok(investmentRows.find((row) => row.id === created.body.id).deletedAt, "deletion preserves the original record");
for (let attempt = 0; attempt < 3; attempt++) await route.DELETE(req(deletion));
assert.equal((await route.DELETE(req(deletion))).status, 429);
assert.ok(audits.some((row) => row.actorName === session.staffName && row.action === "product_investment_edited"));
console.log("PASS: CR monthly separation, full sales totals, legacy preservation, investor CRUD, revision conflicts, operator audit and guarded deletion.");
