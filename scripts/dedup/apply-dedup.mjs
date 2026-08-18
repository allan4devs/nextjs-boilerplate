/**
 * Apply member dedup. DRY-RUN by default; pass --apply to write.
 *
 * On --apply, in this order:
 *   1) Snapshot the whole members collection -> xtreme_gym_members_backup_<ts>
 *   2) Gap-fill each winner with SAFE fields from its losers (phone/email/bodyMetrics/
 *      goal/favoriteTraining) only when the winner's field is empty. Never touches
 *      name, normalizedName, cedula, membership, PIN — protects login + billing.
 *   3) Move every removed doc -> xtreme_gym_members_removed (full doc + _removal meta)
 *   4) Delete the removed docs from xtreme_gym_members
 *
 * Dedup key: VALID 9-digit non-zero cedula only. Placeholder/invalid cedulas are
 * never merged. Also removes 3 explicit test docs (TEST / PRUEBA *).
 *
 * Usage:
 *   node scripts/dedup/apply-dedup.mjs           # dry-run
 *   node scripts/dedup/apply-dedup.mjs --apply   # execute
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

const APPLY = process.argv.includes("--apply");
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB?.trim() || undefined;
if (!uri) { console.error("Missing MONGODB_URI"); process.exit(1); }

const digits = (v) => String(v || "").replace(/\D/g, "");
const normKey = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, " ");
const isValidCedula = (c) => /^\d{9}$/.test(c) && !/^0+$/.test(c);
const JUNK = /\b(VIP|NULO|EXCLUIDO|SOCIO XTREME|CLIENTE|SESI[ÓO]N DIARIA|COBRAR|PRUEBA|TEST|DEMO|SEED)\b/;
const nameIsJunk = (name) => JUNK.test(normKey(name));
const isTestDoc = (m) => /\b(TEST|PRUEBA|SEED|DEMO|ASDF|QWERTY)\b/.test(normKey(m.normalizedName || m.memberName));
const has = (v) => v !== undefined && v !== null && String(v).trim() !== "";

const LINKED = [
  { c: "xtreme_gym_pins", fields: ["normalizedName", "memberKey"], critical: true },
  { c: "xtreme_gym_checkins", fields: ["memberId", "memberKey", "normalizedName"], critical: true },
  { c: "xtreme_gym_entitlements", fields: ["memberKey", "normalizedName", "memberId"], critical: true },
  { c: "xtreme_gym_entitlement_ledger", fields: ["memberKey", "normalizedName", "memberId"], critical: true },
  { c: "xtreme_gym_class_reservations", fields: ["memberKey", "memberId", "normalizedName"], critical: true },
  { c: "xtreme_gym_bookings", fields: ["memberKey", "memberId", "normalizedName"], critical: true },
  { c: "xtreme_gym_payments", fields: ["memberKey", "memberId", "normalizedName"], critical: true },
  { c: "xtreme_gym_sessions", fields: ["memberKey", "normalizedName"], critical: false },
  { c: "xtreme_gym_face_templates", fields: ["normalizedName", "memberKey"], critical: false },
];

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const col = db.collection("xtreme_gym_members");

const all = await col.find({}).toArray();
console.log(`Mode: ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"}`);
console.log(`Total member docs: ${all.length}`);

async function linked(name) {
  const key = normKey(name);
  let critical = 0, hasPin = false;
  for (const { c, fields, critical: isCrit } of LINKED) {
    const or = fields.flatMap((f) => [{ [f]: key }, { [f]: name }]);
    let n = 0;
    try { n = await db.collection(c).countDocuments({ $or: or }); } catch {}
    if (c === "xtreme_gym_pins" && n) hasPin = true;
    if (isCrit) critical += n;
  }
  return { critical, hasPin };
}

function score(doc, lk) {
  let s = 0;
  if (lk.hasPin) s += 1_000_000;
  s += lk.critical * 1000;
  if (doc.emailVerified === true) s += 5000;
  const name = normKey(doc.normalizedName || doc.memberName);
  if (!nameIsJunk(name)) s += 3000;
  s += name.split(" ").filter(Boolean).length * 50;
  if (doc.membership && (doc.membership.plan || doc.membership.planLabel || doc.membership.endsOn)) s += 800;
  if (Array.isArray(doc.workouts)) s += doc.workouts.length * 20;
  if (doc.bodyMetrics && Object.keys(doc.bodyMetrics).length) s += 200;
  if (has(doc.email)) s += 100;
  if (has(doc.phone)) s += 20;
  const created = doc.createdAt ? new Date(doc.createdAt).getTime() : Infinity;
  s -= created / 1e15;
  return s;
}

// Build valid-cedula groups
const byCed = new Map();
for (const m of all) {
  const c = digits(m.cedula);
  if (!isValidCedula(c)) continue;
  if (!byCed.has(c)) byCed.set(c, []);
  byCed.get(c).push(m);
}
const dupGroups = [...byCed.entries()].filter(([, d]) => d.length > 1);

const removals = [];      // { doc, reason, mergedIntoId, mergedIntoName, cedula }
const winnerUpdates = []; // { winnerId, set, mergedFrom }
const planConflicts = [];
let abort = false;

// SAFE gap-fill fields (only when winner is empty)
const SAFE_FIELDS = ["phone", "goal", "favoriteTraining"];

for (const [ced, docs] of dupGroups) {
  const enriched = [];
  for (const d of docs) enriched.push({ d, lk: await linked(d.normalizedName || normKey(d.memberName)), });
  for (const e of enriched) e.s = score(e.d, e.lk);
  enriched.sort((a, b) => b.s - a.s);
  const winner = enriched[0];
  const losers = enriched.slice(1);

  // safety: a loser must not carry critical links (would orphan). If it does, skip group.
  const orphaning = losers.filter((l) => l.lk.hasPin || l.lk.critical > 0);
  if (orphaning.length) {
    console.log(`!! SKIP ced ${ced}: a loser carries linked records — needs manual reassignment.`);
    abort = true;
    continue;
  }

  const set = {};
  for (const f of SAFE_FIELDS) {
    if (!has(winner.d[f])) {
      const donor = losers.find((l) => has(l.d[f]));
      if (donor) set[f] = donor.d[f];
    }
  }
  if (!has(winner.d.email)) {
    const donor = losers.find((l) => has(l.d.email));
    if (donor) { set.email = donor.d.email; set.emailVerified = donor.d.emailVerified === true; }
  }
  if (!(winner.d.bodyMetrics && Object.keys(winner.d.bodyMetrics).length)) {
    const donor = losers.find((l) => l.d.bodyMetrics && Object.keys(l.d.bodyMetrics).length);
    if (donor) set.bodyMetrics = donor.d.bodyMetrics;
  }
  if (Object.keys(set).length) winnerUpdates.push({ winnerId: winner.d._id, set, mergedFrom: losers.map((l) => String(l.d._id)) });

  // flag membership/plan differences for Latinsoft reconciliation (never auto-changed)
  const wPlan = winner.d.membership?.planLabel || winner.d.membership?.plan || "-";
  for (const l of losers) {
    const lPlan = l.d.membership?.planLabel || l.d.membership?.plan || "-";
    if (lPlan !== "-" && lPlan !== wPlan) {
      planConflicts.push({ cedula: ced, keep: winner.d.normalizedName, keepPlan: wPlan, dropped: l.d.normalizedName, droppedPlan: lPlan });
    }
  }

  for (const l of losers) {
    removals.push({ doc: l.d, reason: "cedula_duplicate", mergedIntoId: winner.d._id, mergedIntoName: winner.d.normalizedName, cedula: ced });
  }
}

// Test docs (the 3): remove, but never one already queued as a duplicate loser
const removedIds = new Set(removals.map((r) => String(r.doc._id)));
for (const m of all) {
  if (!isTestDoc(m)) continue;
  if (removedIds.has(String(m._id))) continue;
  removals.push({ doc: m, reason: "test_doc", mergedIntoId: null, mergedIntoName: null, cedula: m.cedula || null });
  removedIds.add(String(m._id));
}

console.log(`\nPlan:`);
console.log(`  cedula-duplicate losers: ${removals.filter((r) => r.reason === "cedula_duplicate").length}`);
console.log(`  test docs: ${removals.filter((r) => r.reason === "test_doc").length}`);
console.log(`  TOTAL to remove: ${removals.length}`);
console.log(`  winners gap-filled: ${winnerUpdates.length}`);
console.log(`  membership/plan conflicts to reconcile (NOT auto-changed): ${planConflicts.length}`);
if (planConflicts.length) {
  for (const c of planConflicts) console.log(`     ced ${c.cedula}: keep "${c.keep}"[${c.keepPlan}] · dropped "${c.dropped}"[${c.droppedPlan}]`);
}

if (abort) {
  console.log(`\nABORT: at least one group needs manual reassignment. No writes performed.`);
  await client.close();
  process.exit(2);
}

if (!APPLY) {
  console.log(`\nDRY-RUN complete. Re-run with --apply to execute.`);
  console.log(`Sample of docs that would be removed:`);
  for (const r of removals.slice(0, 8)) console.log(`   [${r.reason}] "${r.doc.normalizedName || r.doc.memberName}" ced=${r.doc.cedula || "-"} -> keep "${r.mergedIntoName || "(none)"}"`);
  await client.close();
  process.exit(0);
}

// ---------------- APPLY ----------------
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupName = `xtreme_gym_members_backup_${ts}`;
console.log(`\n[1/4] Snapshot -> ${backupName} ...`);
await col.aggregate([{ $match: {} }, { $out: backupName }]).toArray();
const backupCount = await db.collection(backupName).countDocuments();
console.log(`      snapshot docs: ${backupCount}`);
if (backupCount !== all.length) { console.error("Snapshot count mismatch — ABORT before deleting."); await client.close(); process.exit(3); }

console.log(`[2/4] Gap-fill ${winnerUpdates.length} winners ...`);
let filled = 0;
for (const u of winnerUpdates) {
  const res = await col.updateOne({ _id: u.winnerId }, { $set: { ...u.set, updatedAt: new Date() } });
  filled += res.modifiedCount;
}
console.log(`      winners updated: ${filled}`);

console.log(`[3/4] Move ${removals.length} docs -> xtreme_gym_members_removed ...`);
const removedDocs = removals.map((r) => ({
  ...r.doc,
  _removal: { reason: r.reason, mergedIntoId: r.mergedIntoId, mergedIntoName: r.mergedIntoName, cedula: r.cedula, removedAt: new Date(), backup: backupName },
}));
if (removedDocs.length) {
  await db.collection("xtreme_gym_members_removed").insertMany(removedDocs, { ordered: false });
}
const removedColCount = await db.collection("xtreme_gym_members_removed").countDocuments();
console.log(`      xtreme_gym_members_removed now holds: ${removedColCount}`);

console.log(`[4/4] Delete from main ...`);
const ids = removals.map((r) => r.doc._id);
const del = await col.deleteMany({ _id: { $in: ids } });
console.log(`      deleted: ${del.deletedCount}`);

const finalCount = await col.countDocuments();
console.log(`\nDONE. members: ${all.length} -> ${finalCount}   (backup: ${backupName})`);
await client.close();
