/**
 * READ-ONLY analysis of duplicates / garbage in xtreme_gym_members.
 * Does NOT modify anything. Usage: node scripts/dedup/analyze-members.mjs
 */
import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

function loadEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(".env.local");
loadEnv(".env");

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB?.trim() || undefined;
if (!uri) { console.error("Missing MONGODB_URI"); process.exit(1); }

const normKey = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, " ");
const digits = (v) => String(v || "").replace(/\D/g, "");

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const col = db.collection("xtreme_gym_members");

const total = await col.countDocuments();
console.log(`\n================ MEMBERS ANALYSIS (read-only) ================`);
console.log(`DB: ${db.databaseName}   collection: xtreme_gym_members`);
console.log(`TOTAL member docs: ${total}`);

// Field presence across the whole collection
const all = await col.find({}, {
  projection: {
    memberName: 1, normalizedName: 1, cedula: 1, email: 1, emailVerified: 1,
    phone: 1, createdAt: 1, updatedAt: 1, lastCheckinAt: 1, planLabel: 1,
    planEndsOn: 1, source: 1, xp: 1, level: 1, streak: 1,
  },
}).toArray();

const has = (v) => v !== undefined && v !== null && String(v).trim() !== "";
const nameKeyOf = (m) => normKey(m.normalizedName || m.memberName || "");

// ---- Group by name identity ----
const byName = new Map();
for (const m of all) {
  const k = nameKeyOf(m);
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(m);
}
const blankNameGroup = byName.get("") || [];
byName.delete("");

const dupNameGroups = [...byName.entries()].filter(([, docs]) => docs.length > 1);
const dupDocCount = dupNameGroups.reduce((s, [, d]) => s + d.length, 0);
const removableByName = dupNameGroups.reduce((s, [, d]) => s + (d.length - 1), 0);

console.log(`\n---- By NAME identity (normalizedName || memberName, uppercased) ----`);
console.log(`Distinct name identities: ${byName.size}`);
console.log(`Blank/no-name docs: ${blankNameGroup.length}`);
console.log(`Name groups with duplicates (>1 doc): ${dupNameGroups.length}`);
console.log(`Docs sitting inside duplicate groups: ${dupDocCount}`);
console.log(`Removable if we keep 1 per name: ${removableByName}`);
console.log(`=> collection would shrink from ${total} to ~${total - removableByName - blankNameGroup.length} (also dropping blanks)`);

// Biggest duplicate groups
const topDup = [...dupNameGroups].sort((a, b) => b[1].length - a[1].length).slice(0, 15);
console.log(`\nTop 15 largest name-duplicate groups:`);
for (const [k, docs] of topDup) {
  const ceds = new Set(docs.map((d) => digits(d.cedula)).filter(Boolean));
  const emails = new Set(docs.map((d) => String(d.email || "").toLowerCase().trim()).filter(Boolean));
  console.log(`  ${docs.length.toString().padStart(3)}x  "${k}"  | distinct cedulas: ${ceds.size} | distinct emails: ${emails.size}`);
}

// ---- Conflict check: within a same-name group, do docs disagree on cedula? ----
let groupsWithMultiCedula = 0;
for (const [, docs] of dupNameGroups) {
  const ceds = new Set(docs.map((d) => digits(d.cedula)).filter(Boolean));
  if (ceds.size > 1) groupsWithMultiCedula += 1;
}
console.log(`\nName-duplicate groups where docs have >1 DIFFERENT cedula (possible different people same name): ${groupsWithMultiCedula}`);

// ---- Group by cedula (strong identity) ----
const byCedula = new Map();
for (const m of all) {
  const c = digits(m.cedula);
  if (!c) continue;
  if (!byCedula.has(c)) byCedula.set(c, []);
  byCedula.get(c).push(m);
}
const dupCedGroups = [...byCedula.entries()].filter(([, d]) => d.length > 1);
const removableByCed = dupCedGroups.reduce((s, [, d]) => s + (d.length - 1), 0);
console.log(`\n---- By CEDULA ----`);
console.log(`Docs with a cedula: ${all.filter((m) => digits(m.cedula)).length} / ${total}`);
console.log(`Distinct cedulas: ${byCedula.size}`);
console.log(`Cedula groups with duplicates: ${dupCedGroups.length}  (removable: ${removableByCed})`);

// ---- Field completeness ----
console.log(`\n---- Field completeness across all ${total} docs ----`);
for (const f of ["cedula", "email", "phone", "planLabel", "createdAt", "lastCheckinAt"]) {
  const n = all.filter((m) => has(m[f])).length;
  console.log(`  ${f.padEnd(14)}: ${n} (${((n / total) * 100).toFixed(1)}%)`);
}
console.log(`  emailVerified=true: ${all.filter((m) => m.emailVerified === true).length}`);

// ---- Nonsense heuristics ----
const shortName = all.filter((m) => nameKeyOf(m) && nameKeyOf(m).replace(/[^A-Z]/g, "").length < 3);
const looksSeed = all.filter((m) => /(^|\b)(TEST|PRUEBA|SEED|DEMO|SOCIO ?\d|USER ?\d|ASDF|QWERTY)\b/.test(nameKeyOf(m)));
console.log(`\n---- Possible NONSENSE ----`);
console.log(`Blank-name docs: ${blankNameGroup.length}`);
console.log(`Name with <3 letters: ${shortName.length}`);
console.log(`Name matching seed/test patterns: ${looksSeed.length}`);
if (looksSeed.length) console.log(`  e.g. ${[...new Set(looksSeed.map((m) => nameKeyOf(m)))].slice(0, 20).join(" | ")}`);

// ---- Sample a couple of real duplicate groups (full-ish) ----
console.log(`\n---- Sample duplicate groups (up to 3) ----`);
for (const [k, docs] of topDup.slice(0, 3)) {
  console.log(`\n# "${k}" (${docs.length} docs):`);
  for (const d of docs.slice(0, 6)) {
    console.log(`   _id=${d._id} | ced=${d.cedula || "-"} | email=${d.email || "-"}(${d.emailVerified === true ? "✓" : "✗"}) | phone=${d.phone || "-"} | plan=${d.planLabel || "-"} | created=${d.createdAt || "-"} | lastCheckin=${d.lastCheckinAt || "-"} | xp=${d.xp ?? "-"}`);
  }
}

// ---- Full key list of one doc, to see everything we'd back up ----
const sampleFull = await col.findOne({});
console.log(`\n---- All fields present on a sample member doc ----`);
console.log(Object.keys(sampleFull || {}).sort().join(", "));

await client.close();
console.log(`\n================ END (nothing was modified) ================\n`);
