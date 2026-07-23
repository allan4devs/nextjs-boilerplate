/**
 * One-off: export all gym emails to a Resend Contacts CSV.
 * Usage: node scripts/export-resend-contacts.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
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
    // missing file is fine
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

function normEmail(v) {
  const e = String(v ?? "")
    .trim()
    .toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

function isPlaceholder(emailValue) {
  const email = normEmail(emailValue);
  if (!email) return true;
  const [local = "", domain = ""] = email.split("@");
  return (
    /^(sin|no|nulo|nada|ningun|ninguno|prueba|test|noindica|noaplica)([._-]?(correo|email|mail|tiene|aplica))?\d*$/i.test(
      local,
    ) ||
    /sin(correo|email|mail)/i.test(local) ||
    /^(cliente|clientes|cleinte|cleintes|clinete|clinetes)[._-]?sin/i.test(local) ||
    /clientes?in/i.test(local) ||
    /^(correo|email|mail|sincorreo|nada)\.(com|net)$/i.test(domain) ||
    /^(a|x)@(a|x)\./i.test(email) ||
    local.length < 2
  );
}

function splitName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

const [contacts, members, suppressions] = await Promise.all([
  db
    .collection("xtreme_gym_email_contacts")
    .find({ status: { $ne: "unsubscribed" } })
    .project({ email: 1, name: 1, status: 1 })
    .toArray(),
  db
    .collection("xtreme_gym_members")
    .find({})
    .project({ email: 1, memberName: 1, emailVerified: 1, emailQuarantine: 1 })
    .toArray(),
  db.collection("xtreme_gym_email_suppressions").distinct("email"),
]);

const blocked = new Set(suppressions.map(normEmail).filter(Boolean));
/** @type {Map<string, { email: string; name: string; source: string }>} */
const byEmail = new Map();

function upsert(emailRaw, nameRaw, source) {
  const email = normEmail(emailRaw);
  if (!email || isPlaceholder(email) || blocked.has(email)) return;
  const prev = byEmail.get(email);
  const name = String(nameRaw || "").trim();
  if (!prev) {
    byEmail.set(email, { email, name, source });
    return;
  }
  if (!prev.name && name) prev.name = name;
  if (source && !prev.source.includes(source)) {
    prev.source = `${prev.source}|${source}`;
  }
}

for (const c of contacts) upsert(c.email, c.name, "contact");
for (const m of members) {
  upsert(m.email, m.memberName, m.emailVerified ? "member_verified" : "member");
  if (m.emailQuarantine?.previousEmail) {
    upsert(m.emailQuarantine.previousEmail, m.memberName, "quarantine_prev");
  }
}

const rows = [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
const lines = ["email,first_name,last_name,unsubscribed"];
for (const r of rows) {
  const { first, last } = splitName(r.name);
  lines.push(
    [csvEscape(r.email), csvEscape(first), csvEscape(last), "false"].join(","),
  );
}

mkdirSync("exports", { recursive: true });
const out = "exports/resend-contacts.csv";
writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
writeFileSync(
  "exports/resend-contacts-email-only.csv",
  `email\n${rows.map((r) => r.email).join("\n")}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      total: rows.length,
      contactsDocs: contacts.length,
      membersDocs: members.length,
      suppressedExcluded: blocked.size,
      file: out,
      emailOnly: "exports/resend-contacts-email-only.csv",
    },
    null,
    2,
  ),
);

await client.close();
