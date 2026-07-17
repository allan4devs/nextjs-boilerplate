/**
 * Audita y limpia correos basura / compartidos / poco confiables en xtreme_gym_members.
 *
 * Uso:
 *   node --env-file=.env scripts/sanitize-member-emails.mjs           # dry-run
 *   node --env-file=.env scripts/sanitize-member-emails.mjs --apply   # escribe
 *   node --env-file=.env scripts/sanitize-member-emails.mjs --aggressive --apply
 *
 * Reglas (nunca toca emailVerified === true):
 *  1. Placeholders (sincorreo, noaplica, typos de "clientesincorreo", etc.)
 *  2. Correo compartido por 2+ socios distintos
 *  3. --aggressive: import legacy sin match nombre↔correo (heurística)
 */
import { writeFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const apply = process.argv.includes("--apply");
const aggressive = process.argv.includes("--aggressive");
const reportPath =
  process.argv.includes("--report")
    ? process.argv[process.argv.indexOf("--report") + 1]
    : `scripts/email-sanitize-report-${new Date().toISOString().slice(0, 10)}.json`;

if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");

const PLACEHOLDER_RE =
  /clientesin\w*|cleintesin\w*|clinetesin\w*|sincorreo|sin\.correo|noaplica|noindica|notiene|sinmail|noemail|noreply|no-reply|prueba\d*|test@|ejemplo@|example\.com|latinsoft|soporte@latinsoft|nulo@|null@|na@na|asdf@|xxx@|correo@correo|email@email|usuario@|cliente@gmail\.com$|cliente@hotmail\.com$/i;

function clean(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  const email = clean(value).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email.slice(0, 80);
}

function nameTokens(name) {
  return clean(name)
    .toLocaleUpperCase("es-CR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 3 && t !== "NULO" && t !== "NULL");
}

/** 0..1 cuánto se parece el local-part del correo al nombre. null si no se puede evaluar. */
function emailNameScore(name, email) {
  if (!email || !name) return null;
  const local = email
    .split("@")[0]
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  const toks = nameTokens(name).map((t) => t.toLowerCase());
  if (!toks.length || local.length < 3) return null;
  let hits = 0;
  for (const t of toks) {
    if (local.includes(t) || t.includes(local.slice(0, Math.min(6, local.length)))) hits += 1;
  }
  return hits / toks.length;
}

function isPlaceholder(email) {
  if (!email) return true;
  if (PLACEHOLDER_RE.test(email)) return true;
  const local = email.split("@")[0];
  // locales basura muy cortos o solo dígitos
  if (/^\d{1,6}$/.test(local)) return true;
  return false;
}

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
const col = db.collection("xtreme_gym_members");

const members = await col
  .find(
    {},
    {
      projection: {
        memberName: 1,
        normalizedName: 1,
        email: 1,
        emailVerified: 1,
        cedula: 1,
        phone: 1,
        legacyImport: 1,
      },
    },
  )
  .toArray();

const byEmail = new Map();
for (const m of members) {
  const email = normalizeEmail(m.email);
  if (!email) continue;
  const list = byEmail.get(email) ?? [];
  list.push(m);
  byEmail.set(email, list);
}

const sharedEmails = new Set(
  [...byEmail.entries()].filter(([, list]) => list.length > 1).map(([email]) => email),
);

const decisions = [];
const counts = {
  totalMembers: members.length,
  withEmail: 0,
  verifiedKept: 0,
  clearPlaceholder: 0,
  clearShared: 0,
  clearAggressiveMismatch: 0,
  keepUnique: 0,
  alreadyEmpty: 0,
};

for (const m of members) {
  const email = normalizeEmail(m.email);
  const name = m.memberName || m.normalizedName || "";
  if (!email) {
    counts.alreadyEmpty += 1;
    continue;
  }
  counts.withEmail += 1;

  // Nunca tocar correos verificados (magic link, recepción, pago).
  if (m.emailVerified === true) {
    counts.verifiedKept += 1;
    decisions.push({
      action: "keep",
      reason: "verified",
      normalizedName: m.normalizedName,
      memberName: name,
      email,
    });
    continue;
  }

  if (isPlaceholder(email)) {
    counts.clearPlaceholder += 1;
    decisions.push({
      action: "clear",
      reason: "placeholder",
      normalizedName: m.normalizedName,
      memberName: name,
      email,
    });
    continue;
  }

  if (sharedEmails.has(email)) {
    counts.clearShared += 1;
    decisions.push({
      action: "clear",
      reason: "shared_across_members",
      sharedWith: byEmail
        .get(email)
        .map((x) => x.memberName || x.normalizedName)
        .filter((n) => n && n !== name)
        .slice(0, 8),
      normalizedName: m.normalizedName,
      memberName: name,
      email,
    });
    continue;
  }

  if (aggressive && m.legacyImport) {
    const score = emailNameScore(name, email);
    if (score !== null && score < 0.12) {
      counts.clearAggressiveMismatch += 1;
      decisions.push({
        action: "clear",
        reason: "aggressive_name_mismatch",
        score,
        normalizedName: m.normalizedName,
        memberName: name,
        email,
      });
      continue;
    }
  }

  counts.keepUnique += 1;
  decisions.push({
    action: "keep",
    reason: "unique_unverified",
    score: emailNameScore(name, email),
    normalizedName: m.normalizedName,
    memberName: name,
    email,
  });
}

const toClear = decisions.filter((d) => d.action === "clear");
const summary = {
  mode: apply ? "apply" : "dry-run",
  aggressive,
  generatedAt: new Date().toISOString(),
  counts: {
    ...counts,
    willClear: toClear.length,
    willKeep: decisions.filter((d) => d.action === "keep").length,
  },
  reasonBreakdown: {
    placeholder: toClear.filter((d) => d.reason === "placeholder").length,
    shared_across_members: toClear.filter((d) => d.reason === "shared_across_members").length,
    aggressive_name_mismatch: toClear.filter((d) => d.reason === "aggressive_name_mismatch").length,
  },
  samples: {
    placeholder: toClear.filter((d) => d.reason === "placeholder").slice(0, 12),
    shared: toClear.filter((d) => d.reason === "shared_across_members").slice(0, 12),
    aggressive: toClear.filter((d) => d.reason === "aggressive_name_mismatch").slice(0, 12),
  },
};

await writeFile(
  reportPath,
  JSON.stringify({ summary, decisions }, null, 2),
  "utf8",
);

console.log(JSON.stringify(summary, null, 2));
console.log(`Reporte completo: ${reportPath}`);

if (!apply) {
  console.log("Vista previa solamente. Re-ejecutá con --apply para borrar correos marcados clear.");
  await client.close();
  process.exit(0);
}

const now = new Date();
const ops = toClear
  .filter((d) => d.normalizedName)
  .map((d) => ({
    updateOne: {
      filter: {
        normalizedName: d.normalizedName,
        // Doble candado: no pisar si alguien verificó el correo entre dry-run y apply.
        emailVerified: { $ne: true },
      },
      update: {
        $unset: { email: "" },
        $set: {
          emailVerified: false,
          emailQuarantine: {
            previousEmail: d.email,
            reason: d.reason,
            at: now,
            source: "scripts/sanitize-member-emails.mjs",
          },
          updatedAt: now,
        },
      },
    },
  }));

if (!ops.length) {
  console.log("Nada que limpiar.");
  await client.close();
  process.exit(0);
}

const result = await col.bulkWrite(ops, { ordered: false });
console.log(
  JSON.stringify(
    {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      cleared: toClear.length,
    },
    null,
    2,
  ),
);

await client.close();
