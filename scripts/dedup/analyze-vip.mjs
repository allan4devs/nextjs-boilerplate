/**
 * READ-ONLY: find the VIP population (Alberto's VIP-area clients) that is encoded
 * as a "VIP " name prefix, both in the live collection and in the docs we removed
 * during dedup (whose VIP twin was dropped in favor of the clean name).
 * Reports what to mark vipAccess=true, and whether name-stripping is safe.
 * Modifies nothing. Usage: node scripts/dedup/analyze-vip.mjs
 */
import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const t = line.trim(); if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("="); if (i < 0) continue;
      const k = t.slice(0, i).trim(); let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(".env.local"); loadEnv(".env");
const uri = process.env.MONGODB_URI?.trim();
if (!uri) { console.error("Missing MONGODB_URI"); process.exit(1); }

const digits = (v) => String(v || "").replace(/\D/g, "");
const normKey = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, " ");
const stripVip = (name) => normKey(name).replace(/^VIP\s+/, "").replace(/\s+VIP\b/, "").trim();
const isVipName = (name) => /\bVIP\b/.test(normKey(name));

const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB);
const members = db.collection("xtreme_gym_members");
const removed = db.collection("xtreme_gym_members_removed");

async function hasPin(name) {
  const key = normKey(name);
  const n = await db.collection("xtreme_gym_pins").countDocuments({ $or: [{ normalizedName: key }, { memberKey: key }] });
  return n > 0;
}

// 1) Live members still carrying a VIP name prefix (never had a clean twin)
const liveVip = await members.find({ $or: [{ normalizedName: /\bVIP\b/ }, { memberName: /\bVIP\b/i }] }).toArray();

// 2) Removed VIP twins → their surviving member (by mergedIntoId, fallback cedula)
const removedVip = await removed.find({ $or: [{ normalizedName: /\bVIP\b/ }, { memberName: /\bVIP\b/i }], "_removal.reason": "cedula_duplicate" }).toArray();

const survivorIds = new Set();
const survivorsFromRemoved = [];
for (const r of removedVip) {
  let survivor = null;
  if (r._removal?.mergedIntoId) survivor = await members.findOne({ _id: r._removal.mergedIntoId });
  if (!survivor && digits(r.cedula)) survivor = await members.findOne({ cedula: r.cedula });
  if (survivor) { survivorIds.add(String(survivor._id)); survivorsFromRemoved.push({ survivor, from: r.normalizedName }); }
}

console.log(`\n=============== VIP POPULATION (read-only) ===============`);
console.log(`Live members with a VIP name prefix: ${liveVip.length}`);
console.log(`Removed VIP twins mapped to a surviving member: ${survivorsFromRemoved.length}`);

console.log(`\n--- Live VIP-named members (candidate: strip prefix + vipAccess) ---`);
let liveWithPin = 0, collisions = 0;
for (const m of liveVip) {
  const key = normKey(m.normalizedName || m.memberName);
  const clean = stripVip(key);
  const pin = await hasPin(key);
  if (pin) liveWithPin += 1;
  // collision: would the stripped name equal an existing OTHER member?
  const clash = await members.findOne({ normalizedName: clean, _id: { $ne: m._id } });
  if (clash) collisions += 1;
  console.log(`  "${key}" ced=${m.cedula || "-"} pin=${pin ? "YES" : "no"} vipAccess=${m.adminProfile?.vipAccess === true} -> clean "${clean}"${clash ? "  ⚠ NAME COLLISION" : ""}`);
}

console.log(`\n--- Survivors of dropped VIP twins (candidate: vipAccess only, name already clean) ---`);
for (const s of survivorsFromRemoved) {
  console.log(`  "${s.survivor.normalizedName}" ced=${s.survivor.cedula || "-"} vipAccess=${s.survivor.adminProfile?.vipAccess === true}  (twin was "${s.from}")`);
}

const totalVip = new Set([...liveVip.map((m) => String(m._id)), ...survivorIds]);
console.log(`\n=============== SUMMARY ===============`);
console.log(`Distinct VIP members to flag vipAccess=true: ${totalVip.size}`);
console.log(`  live VIP-named: ${liveVip.length}  (with PIN, keep name: ${liveWithPin}; name collisions: ${collisions})`);
console.log(`  survivors from dropped twins: ${survivorIds.size}`);
console.log(`Already flagged vipAccess: ${[...liveVip, ...survivorsFromRemoved.map((s) => s.survivor)].filter((m) => m.adminProfile?.vipAccess === true).length}`);
console.log(`(nothing modified)`);

await client.close();
