/**
 * Inspect session logs / events for Allan Rojas (and related anon IDs).
 * Usage: node scripts/find-allan-analytics.mjs
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
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // ok
  }
}
loadEnv(".env.local");
loadEnv(".env");

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB?.trim() || undefined;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

const members = await db
  .collection("xtreme_gym_members")
  .find({
    $or: [
      { memberName: /allan/i },
      { normalizedName: /ALLAN/i },
      { email: /allan|aroja|allan4devs/i },
    ],
  })
  .project({
    memberName: 1,
    normalizedName: 1,
    email: 1,
    emailVerified: 1,
    cedula: 1,
    phone: 1,
  })
  .toArray();

console.log("\n=== MEMBERS matching Allan ===");
console.log(JSON.stringify(members, null, 2));

const keys = [
  ...new Set(
    members
      .map((m) => m.normalizedName || normalizeKey(m.memberName))
      .filter(Boolean),
  ),
];
const names = members.map((m) => m.memberName).filter(Boolean);
const emails = members.map((m) => String(m.email || "").toLowerCase()).filter(Boolean);

const sessionQuery = {
  $or: [
    ...(keys.length ? [{ memberId: { $in: keys } }] : []),
    ...(names.length
      ? [{ memberName: { $regex: "allan", $options: "i" } }]
      : [{ memberName: { $regex: "allan", $options: "i" } }]),
  ],
};

const sessions = await db
  .collection("xtreme_gym_session_logs")
  .find(sessionQuery)
  .project({
    id: 1,
    memberId: 1,
    memberName: 1,
    anonymousId: 1,
    source: 1,
    entryPath: 1,
    exitPath: 1,
    pageViews: 1,
    lastSeenAt: 1,
    userAgent: 1,
  })
  .sort({ lastSeenAt: -1 })
  .limit(50)
  .toArray();

console.log("\n=== SESSION LOGS (Allan-linked) ===");
console.log("count sample:", sessions.length);
const anonFromAllan = new Set(
  sessions.map((s) => s.anonymousId).filter(Boolean),
);
console.log("anonymousIds seen with Allan:", [...anonFromAllan]);

// Sessions that share those anonymousIds (even if later anon)
let relatedAnonSessions = [];
if (anonFromAllan.size) {
  relatedAnonSessions = await db
    .collection("xtreme_gym_session_logs")
    .find({ anonymousId: { $in: [...anonFromAllan] } })
    .project({
      id: 1,
      memberId: 1,
      memberName: 1,
      anonymousId: 1,
      source: 1,
      entryPath: 1,
      lastSeenAt: 1,
    })
    .sort({ lastSeenAt: -1 })
    .limit(80)
    .toArray();
}
console.log("\n=== SESSIONS sharing Allan anonymousIds ===");
console.log(
  JSON.stringify(
    relatedAnonSessions.map((s) => ({
      id: s.id,
      memberId: s.memberId || null,
      memberName: s.memberName || null,
      anonymousId: s.anonymousId,
      source: s.source,
      entryPath: s.entryPath,
      lastSeenAt: s.lastSeenAt,
    })),
    null,
    2,
  ),
);

// Heavy anon sessions on admin/member paths without member (likely you testing)
const heavyAnon = await db
  .collection("xtreme_gym_session_logs")
  .find({
    memberId: { $in: [null, ""] },
    $or: [{ memberId: { $exists: false } }],
    lastSeenAt: { $gte: new Date(Date.now() - 30 * 864e5) },
    pageViews: { $gte: 5 },
  })
  .project({
    id: 1,
    anonymousId: 1,
    source: 1,
    entryPath: 1,
    exitPath: 1,
    pageViews: 1,
    durationMs: 1,
    lastSeenAt: 1,
    paths: 1,
  })
  .sort({ pageViews: -1 })
  .limit(25)
  .toArray();

// Mongo query fix: memberId missing or null
const heavyAnon2 = await db
  .collection("xtreme_gym_session_logs")
  .find({
    $and: [
      {
        $or: [{ memberId: { $exists: false } }, { memberId: null }, { memberId: "" }],
      },
      { lastSeenAt: { $gte: new Date(Date.now() - 30 * 864e5) } },
      { pageViews: { $gte: 8 } },
    ],
  })
  .project({
    id: 1,
    anonymousId: 1,
    source: 1,
    entryPath: 1,
    exitPath: 1,
    pageViews: 1,
    durationMs: 1,
    lastSeenAt: 1,
    paths: 1,
  })
  .sort({ pageViews: -1 })
  .limit(25)
  .toArray();

console.log("\n=== HEAVY ANON SESSIONS (30d, pageViews>=8) ===");
for (const s of heavyAnon2) {
  const pathKeys = Object.keys(s.paths || {}).slice(0, 8);
  console.log(
    JSON.stringify({
      id: s.id,
      anonymousId: s.anonymousId,
      source: s.source,
      pageViews: s.pageViews,
      entryPath: s.entryPath,
      paths: pathKeys,
      lastSeenAt: s.lastSeenAt,
    }),
  );
}

const events = await db
  .collection("xtreme_gym_events")
  .find({
    $or: [
      ...(keys.length ? [{ memberId: { $in: keys } }] : []),
      { memberId: { $regex: "ALLAN", $options: "i" } },
    ],
  })
  .project({ type: 1, memberId: 1, anonymousId: 1, source: 1, occurredAt: 1 })
  .sort({ occurredAt: -1 })
  .limit(40)
  .toArray();

console.log("\n=== EVENTS linked to Allan memberId ===");
console.log(JSON.stringify(events.slice(0, 20), null, 2));

const anonEvents = anonFromAllan.size
  ? await db
      .collection("xtreme_gym_events")
      .find({ anonymousId: { $in: [...anonFromAllan] } })
      .project({ type: 1, memberId: 1, anonymousId: 1, source: 1, occurredAt: 1 })
      .sort({ occurredAt: -1 })
      .limit(30)
      .toArray()
  : [];
console.log("\n=== EVENTS with Allan anonymousIds ===");
console.log(JSON.stringify(anonEvents.slice(0, 15), null, 2));

// Top anonymousIds overall (to spot yours)
const topAnon = await db
  .collection("xtreme_gym_session_logs")
  .aggregate([
    {
      $match: {
        anonymousId: { $type: "string", $ne: "" },
        lastSeenAt: { $gte: new Date(Date.now() - 60 * 864e5) },
      },
    },
    {
      $group: {
        _id: "$anonymousId",
        sessions: { $sum: 1 },
        pageViews: { $sum: "$pageViews" },
        withMember: {
          $sum: { $cond: [{ $ifNull: ["$memberId", false] }, 1, 0] },
        },
        names: { $addToSet: "$memberName" },
        memberIds: { $addToSet: "$memberId" },
        sources: { $addToSet: "$source" },
        lastSeenAt: { $max: "$lastSeenAt" },
      },
    },
    { $sort: { pageViews: -1 } },
    { $limit: 15 },
  ])
  .toArray();

console.log("\n=== TOP ANONYMOUS IDs by pageViews (60d) ===");
console.log(JSON.stringify(topAnon, null, 2));

await client.close();
