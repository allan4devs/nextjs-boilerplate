/**
 * READ-ONLY deep analysis of same-cedula duplicate groups.
 * For each group: list docs, score a proposed winner, and count linked records
 * (pins/checkins/sessions/entitlements/reservations/payments/face) per name so we
 * know what would need reassignment before deleting a loser. Modifies nothing.
 * Writes a machine plan to scripts/dedup/cedula-plan.json for the apply step.
 * Usage: node scripts/dedup/analyze-cedula-groups.mjs
 */
import { readFileSync, writeFileSync } from "fs";
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

const digits = (v) => String(v || "").replace(/\D/g, "");
const normKey = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, " ");
// A real Costa Rican cédula is 9 digits and not all zeros. Placeholders like
// "0", "00000000", or malformed 12-digit values are NOT identities and must not
// be used to merge different people.
const isValidCedula = (c) => /^\d{9}$/.test(c) && !/^0+$/.test(c);
const JUNK = /\b(VIP|NULO|EXCLUIDO|SOCIO XTREME|CLIENTE|SESI[ÓO]N DIARIA|COBRAR|PRUEBA|TEST|DEMO|SEED)\b/;
const nameIsJunk = (name) => JUNK.test(normKey(name));

// Linked collections + the fields that can hold a member's normalizedName/memberKey.
const LINKED = [
  { c: "xtreme_gym_pins", fields: ["normalizedName", "memberKey"] },
  { c: "xtreme_gym_checkins", fields: ["memberId", "memberKey", "normalizedName"] },
  { c: "xtreme_gym_sessions", fields: ["memberKey", "normalizedName"] },
  { c: "xtreme_gym_entitlements", fields: ["memberKey", "normalizedName", "memberId"] },
  { c: "xtreme_gym_entitlement_ledger", fields: ["memberKey", "normalizedName", "memberId"] },
  { c: "xtreme_gym_class_reservations", fields: ["memberKey", "memberId", "normalizedName"] },
  { c: "xtreme_gym_bookings", fields: ["memberKey", "memberId", "normalizedName"] },
  { c: "xtreme_gym_payments", fields: ["memberKey", "memberId", "normalizedName"] },
  { c: "xtreme_gym_face_templates", fields: ["normalizedName", "memberKey"] },
  { c: "xtreme_gym_audit", fields: ["targetId", "memberId"] },
];

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const col = db.collection("xtreme_gym_members");

const all = await col.find({}).toArray();

// group by cedula digits — VALID cedulas only
const byCed = new Map();
const invalidCedDupes = new Map(); // placeholder cedulas shared by >1 doc (NOT merged)
for (const m of all) {
  const c = digits(m.cedula);
  if (!c) continue;
  const bucket = isValidCedula(c) ? byCed : invalidCedDupes;
  if (!bucket.has(c)) bucket.set(c, []);
  bucket.get(c).push(m);
}
const dupGroups = [...byCed.entries()].filter(([, d]) => d.length > 1);
const invalidGroups = [...invalidCedDupes.entries()].filter(([, d]) => d.length > 1);

// explicit garbage: test/seed docs by name
const garbage = all.filter((m) => /\b(TEST|PRUEBA|SEED|DEMO|ASDF|QWERTY)\b/.test(normKey(m.normalizedName || m.memberName)));

async function linkedCounts(name) {
  const key = normKey(name);
  const out = {};
  let totalCritical = 0; // pins/checkins/entitlements/reservations/payments
  for (const { c, fields } of LINKED) {
    const or = fields.flatMap((f) => [{ [f]: key }, { [f]: name }]);
    let n = 0;
    try { n = await db.collection(c).countDocuments({ $or: or }); } catch {}
    if (n) out[c] = n;
    if (n && c !== "xtreme_gym_audit" && c !== "xtreme_gym_sessions") totalCritical += n;
  }
  return { out, totalCritical, hasPin: Boolean(out["xtreme_gym_pins"]) };
}

function score(doc, linked) {
  let s = 0;
  if (linked.hasPin) s += 1_000_000;               // can log in — never orphan the account
  s += linked.totalCritical * 1000;                // real history (checkins/entitlements/…)
  if (doc.emailVerified === true) s += 5000;
  // Prefer the cleanest human name when neither doc has app usage.
  const name = normKey(doc.normalizedName || doc.memberName);
  if (!nameIsJunk(name)) s += 3000;                // penalize VIP/NULO/EXCLUIDO/SOCIO/TEST…
  s += name.split(" ").filter(Boolean).length * 50; // fuller name (more surnames) wins
  if (doc.membership && (doc.membership.plan || doc.membership.planLabel || doc.membership.endsOn)) s += 800;
  if (Array.isArray(doc.workouts)) s += doc.workouts.length * 20;
  if (doc.bodyMetrics && Object.keys(doc.bodyMetrics).length) s += 200;
  if (String(doc.email || "").trim()) s += 100;
  if (String(doc.phone || "").trim()) s += 20;
  const created = doc.createdAt ? new Date(doc.createdAt).getTime() : Infinity;
  s -= created / 1e15;                             // tiny: prefer the original (oldest) doc
  return s;
}

const plan = { generatedAt: new Date().toISOString(), groups: [] };
const winnersWithJunkName = [];
let totalLosers = 0;
let losersWithLinks = 0;

console.log(`\n=========== CEDULA DUPLICATE GROUPS: ${dupGroups.length} ===========\n`);

for (const [ced, docs] of dupGroups) {
  const enriched = [];
  for (const d of docs) {
    const name = d.normalizedName || normKey(d.memberName);
    const linked = await linkedCounts(name);
    enriched.push({ d, name, linked, score: score(d, linked) });
  }
  enriched.sort((a, b) => b.score - a.score);
  const winner = enriched[0];
  const losers = enriched.slice(1);
  totalLosers += losers.length;

  const nameMismatch = new Set(enriched.map((e) => e.name)).size > 1;
  const reassign = [];
  for (const l of losers) {
    if (l.linked.totalCritical > 0 || l.linked.hasPin) {
      losersWithLinks += 1;
      if (l.name !== winner.name) reassign.push({ from: l.name, to: winner.name, linked: l.linked.out });
    }
  }

  const winnerJunkName = nameIsJunk(winner.name);
  if (winnerJunkName) winnersWithJunkName.push({ cedula: ced, winnerName: winner.name, cleanCandidate: losers.map((l) => l.name).find((n) => !nameIsJunk(n)) || null });

  plan.groups.push({
    cedula: ced,
    winnerId: String(winner.d._id),
    winnerName: winner.name,
    winnerHasLinks: winner.linked.hasPin || winner.linked.totalCritical > 0,
    winnerJunkName,
    loserIds: losers.map((l) => String(l.d._id)),
    loserNames: losers.map((l) => l.name),
    nameMismatch,
    reassign,
  });

  console.log(`CED ${ced}  (${docs.length} docs)${nameMismatch ? "  ⚠ name differs" : ""}`);
  for (const e of enriched) {
    const tag = e === winner ? "KEEP " : "drop ";
    const links = Object.entries(e.linked.out).map(([k, v]) => `${k.replace("xtreme_gym_", "")}=${v}`).join(",") || "no-links";
    console.log(`   ${tag} "${e.name}" ced=${e.d.cedula} email=${e.d.email || "-"}(${e.d.emailVerified === true ? "✓" : "✗"}) plan=${e.d.membership?.planLabel || e.d.membership?.plan || "-"} wk=${Array.isArray(e.d.workouts) ? e.d.workouts.length : 0} | ${links}`);
  }
  if (reassign.length) console.log(`   ↪ REASSIGN needed: ${JSON.stringify(reassign)}`);
  console.log("");
}

plan.excludedInvalidCedulaGroups = invalidGroups.map(([c, docs]) => ({
  cedula: c,
  names: docs.map((d) => d.normalizedName || normKey(d.memberName)),
}));
plan.garbageDocs = garbage.map((d) => ({ id: String(d._id), name: d.normalizedName || normKey(d.memberName), cedula: d.cedula || null }));
writeFileSync("scripts/dedup/cedula-plan.json", JSON.stringify(plan, null, 2));

console.log(`\n=========== EXCLUDED: invalid/placeholder cedulas (DIFFERENT people, NOT merged) ===========`);
for (const [c, docs] of invalidGroups) {
  console.log(`  ced="${c}" (${docs.length}): ${docs.map((d) => `"${d.normalizedName || normKey(d.memberName)}"`).join(" | ")}`);
}

console.log(`\n=========== GARBAGE (test/seed names) ===========`);
for (const d of garbage) console.log(`  "${d.normalizedName || normKey(d.memberName)}"  ced=${d.cedula || "-"}`);

console.log(`\n=========== APP ACCOUNTS KEPT BUT WITH A JUNK NAME (manual rename later) ===========`);
for (const w of winnersWithJunkName) console.log(`  ced ${w.cedula}: keep "${w.winnerName}" → real name likely "${w.cleanCandidate || "?"}"`);

console.log(`\n=========== SUMMARY ===========`);
console.log(`VALID-cedula duplicate groups (safe to dedup): ${dupGroups.length}`);
console.log(`Docs to remove (losers): ${totalLosers}`);
console.log(`Losers carrying linked records (need reassignment): ${losersWithLinks}`);
console.log(`Excluded invalid-cedula groups (left untouched): ${invalidGroups.length}`);
console.log(`Garbage/test docs: ${garbage.length}`);
console.log(`App accounts kept with junk name (flag for manual rename): ${winnersWithJunkName.length}`);
console.log(`Plan written to scripts/dedup/cedula-plan.json  (nothing modified)`);

await client.close();
