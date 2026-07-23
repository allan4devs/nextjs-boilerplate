/**
 * Alinea correos + cédulas del estado.xlsx con las fichas de Mongo.
 *
 * Objetivo: que nombre, cédula y correo de cada ficha no verificada queden
 * lo más coherentes posible con el Excel (por si hubo intercambios de cédula).
 *
 * - No toca correos ya verificados por el socio.
 * - No toca cédulas de perfiles verificados (salvo si están vacías).
 * - Match por nombre (exacto/fuzzy) y por cédula del Excel.
 * - Resuelve cédulas duplicadas (p. ej. ficha real + NULO*) dejando la
 *   cédula en el perfil cuyo nombre/email mejor coincide con el Excel.
 *
 * Uso:
 *   node --env-file=.env scripts/recover-member-emails.mjs --input … --report …
 *   node --env-file=.env scripts/recover-member-emails.mjs --input … --report … --apply
 */
import { readFile, writeFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const args = process.argv.slice(2);
const argValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
};
const inputPath = argValue("--input");
const reportPath = argValue("--report");
const apply = args.includes("--apply");
if (!inputPath) throw new Error("Falta --input con el JSON convertido desde estado.xlsx.");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");

const rows = JSON.parse(await readFile(inputPath, "utf8"));
const now = new Date();
const SAFE_NAME_SCORE = 0.72;
const UNIQUE_OWNER_SCORE = 0.62;

const clean = (value) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
const fold = (value) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CR");
const nameKey = (value) =>
  fold(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .toUpperCase();
const nameTokens = (value) =>
  fold(value)
    .split(/[^a-z0-9]+/)
    .filter(
      (token) =>
        token.length >= 2 &&
        !["nulo", "de", "del", "la", "los", "las", "y"].includes(token),
    );
const digits = (value, max = 20) => clean(value).replace(/\D/g, "").slice(0, max);
const isJunkName = (value) => {
  const key = nameKey(value);
  return !key || /^NULO(?:\s|$)/i.test(key) || /^PRUEBA(?:\s+\d+)?$/i.test(key);
};
const isWeakCedula = (value) => {
  const d = digits(value);
  // "0", carnets cortos inventados, etc.
  return !d || d.length < 6 || /^0+$/.test(d);
};

/** Proveedores frecuentes en CR (para pegar @ si falta o corregir typos). */
const PROVIDERS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.es",
  "outlook.com",
  "outlook.es",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "yahoo.com",
  "yahoo.es",
  "ymail.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "aol.com",
];

const KNOWN_DOMAIN_FIXES = new Map([
  ["gmaill.com", "gmail.com"],
  ["gamil.com", "gmail.com"],
  ["gmial.com", "gmail.com"],
  ["gmal.com", "gmail.com"],
  ["gmai.com", "gmail.com"],
  ["gmaul.com", "gmail.com"],
  ["gmeil.com", "gmail.com"],
  ["gnail.com", "gmail.com"],
  ["gemail.com", "gmail.com"],
  ["gmil.com", "gmail.com"],
  ["gmsil.com", "gmail.com"],
  ["gmaiil.com", "gmail.com"],
  ["gmaik.com", "gmail.com"],
  ["gmaial.com", "gmail.com"],
  ["ggmail.com", "gmail.com"],
  ["tgmail.com", "gmail.com"],
  ["g-mail.com", "gmail.com"],
  ["gmailc.com", "gmail.com"],
  ["gmail.co", "gmail.com"],
  ["gmail.con", "gmail.com"],
  ["gmail.cm", "gmail.com"],
  ["gmail.cpm", "gmail.com"],
  ["gmail.copm", "gmail.com"],
  ["gmail.comm", "gmail.com"],
  ["gmail.coml", "gmail.com"],
  ["gmail.comn", "gmail.com"],
  ["gmail.com.cr", "gmail.com"],
  ["gotmail.com", "hotmail.com"],
  ["htomail.com", "hotmail.com"],
  ["hotmal.com", "hotmail.com"],
  ["hotmai.com", "hotmail.com"],
  ["homail.com", "hotmail.com"],
  ["hamail.com", "hotmail.com"],
  ["hitmail.com", "hotmail.com"],
  ["hotamil.com", "hotmail.com"],
  ["hotmaill.com", "hotmail.com"],
  ["hotmial.com", "hotmail.com"],
  ["hotnail.com", "hotmail.com"],
  ["hoymail.com", "hotmail.com"],
  ["hormail.com", "hotmail.com"],
  ["hotmil.com", "hotmail.com"],
  ["hotmail.con", "hotmail.com"],
  ["hotmail.co", "hotmail.com"],
  ["hotmail.cm", "hotmail.com"],
  ["hotmail.cpm", "hotmail.com"],
  ["outlok.com", "outlook.com"],
  ["outllok.com", "outlook.com"],
  ["outloock.com", "outlook.com"],
  ["outlokk.com", "outlook.com"],
  ["outlool.com", "outlook.com"],
  ["outlook.con", "outlook.com"],
  ["!cloud.com", "icloud.com"],
  ["iclod.com", "icloud.com"],
  ["icoud.com", "icloud.com"],
  ["iclould.com", "icloud.com"],
  ["icloud.con", "icloud.com"],
  ["yahooo.com", "yahoo.com"],
  ["yaho.com", "yahoo.com"],
  ["yahho.com", "yahoo.com"],
  ["yhoo.com", "yahoo.com"],
  ["yahoo.con", "yahoo.com"],
  // typos de IDN raros vistos en el Excel
  ["xn--gmai-jqa.com", "gmail.com"],
  ["xn--gmail-rta.com", "gmail.com"],
]);

function fuzzyFixDomain(domainRaw) {
  let domain = String(domainRaw || "")
    .toLowerCase()
    .replace(/[.,;:]+$/g, "")
    .replace(/[^a-z0-9.-]/g, "");
  if (!domain) return { domain: "", changed: false, from: domainRaw };
  if (KNOWN_DOMAIN_FIXES.has(domain)) {
    return { domain: KNOWN_DOMAIN_FIXES.get(domain), changed: true, from: domainRaw };
  }
  const tldFixed = domain
    .replace(/\.con$/i, ".com")
    .replace(/\.cpm$/i, ".com")
    .replace(/\.copm$/i, ".com")
    .replace(/\.comm$/i, ".com")
    .replace(/\.coom$/i, ".com")
    .replace(/\.com\.com$/i, ".com")
    .replace(/\.coml$/i, ".com")
    .replace(/\.comn$/i, ".com");
  if (tldFixed !== domain) {
    domain = tldFixed;
    if (KNOWN_DOMAIN_FIXES.has(domain)) {
      return { domain: KNOWN_DOMAIN_FIXES.get(domain), changed: true, from: domainRaw };
    }
  }
  // proveedor sin punto: gmailcom
  for (const p of PROVIDERS) {
    if (domain === p.replace(/\./g, "")) {
      return { domain: p, changed: true, from: domainRaw };
    }
  }
  // proveedor sin TLD: gmail / hotmail
  if (/^(gmail|hotmail|outlook|yahoo|icloud|live|msn|proton|ymail|gmx|aol)$/i.test(domain)) {
    return { domain: `${domain.toLowerCase()}.com`, changed: true, from: domainRaw };
  }
  // edit distance a proveedores conocidos
  let best = null;
  let bestDist = 99;
  for (const p of PROVIDERS) {
    const d = levenshtein(domain, p);
    if (d < bestDist && d <= 2 && Math.abs(domain.length - p.length) <= 2) {
      bestDist = d;
      best = p;
    }
  }
  if (best && bestDist > 0) {
    return { domain: best, changed: true, from: domainRaw };
  }
  return { domain, changed: domain !== String(domainRaw || "").toLowerCase(), from: domainRaw };
}

/**
 * Normaliza / repara agresivamente valores del Excel que "no parecen correo".
 * Prioridad: maximizar alcance (pueden rebotar). No inventa a partir de basura total.
 */
function normalizeCandidateEmail(value) {
  const original = clean(value);
  if (!original) return null;

  let raw = fold(original)
    .replace(/^mailto\s*:/, "")
    .replace(/[<>"'`]/g, "")
    .replace(/\[at\]|\(at\)|\sat\s|\{at\}/gi, "@")
    .replace(/\[dot\]|\(dot\)|\sdot\s|\{dot\}/gi, ".")
    .replace(/,/g, ".")
    .replace(/;+/g, "")
    .replace(/\s+/g, "");

  if (!raw) return null;
  // varios valores pegados
  if (raw.includes("/") || raw.includes("|")) raw = raw.split(/[/|]/)[0];

  let repairFlags = {
    repairedDomain: false,
    assumedGmail: false,
    insertedAt: false,
    fromDomain: "",
    toDomain: "",
  };

  // ? o ¿ como @ (y patrones tipo local?4gmail.com → local4@gmail.com / local@gmail.com)
  if (!raw.includes("@")) {
    if (/[?\u00bf]/.test(raw) && /gmail\.com|hotmail|outlook|yahoo|icloud/i.test(raw)) {
      // nuriasalazar52?4gmail.com → nuriasalazar524@gmail.com
      raw = raw.replace(/[?\u00bf](\d*)(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|icloud\.com)/i, "$1@$2");
      repairFlags.insertedAt = true;
    } else {
      raw = raw.replace(/[?\u00bf]/, "@");
      if (raw.includes("@")) repairFlags.insertedAt = true;
    }
  }

  // local + proveedor pegado sin @: namegmail.com / namegmailcom
  if (!raw.includes("@")) {
    for (const p of PROVIDERS) {
      const glued = p.replace(/\./g, "");
      if (raw.endsWith(glued) && raw.length > glued.length + 2) {
        raw = `${raw.slice(0, -glued.length)}@${p}`;
        repairFlags.insertedAt = true;
        break;
      }
      if (raw.endsWith(p) && raw.length > p.length + 2) {
        raw = `${raw.slice(0, -p.length)}@${p}`;
        repairFlags.insertedAt = true;
        break;
      }
    }
  }

  // "javiergonzalezmonge.com" sin @ → local@gmail.com (muy frecuente en el Excel)
  if (!raw.includes("@") && /^[a-z0-9._%+-]+\.(com|es|net|org)$/i.test(raw)) {
    const localOnly = raw.replace(/\.(com|es|net|org)$/i, "");
    // exige longitud o dígitos para no inventar a partir de "solis.com"
    if (localOnly.length >= 8 || (localOnly.length >= 5 && /\d/.test(localOnly))) {
      raw = `${localOnly}@gmail.com`;
      repairFlags.assumedGmail = true;
      repairFlags.insertedAt = true;
    }
  }

  // solo local (sin dominio): maximizar alcance asumiendo gmail
  // evita basura tipo "Solis", "nulo", "test" o apellidos sueltos cortos
  if (!raw.includes("@") && /^[a-z0-9._%+-]{3,40}$/i.test(raw)) {
    const looksLikeHandle = /\d/.test(raw) || raw.length >= 8 || raw.includes(".") || raw.includes("_");
    if (looksLikeHandle && !/^(solis|nulo|nada|test|noindica|noaplica|correo|email)$/i.test(raw)) {
      raw = `${raw}@gmail.com`;
      repairFlags.assumedGmail = true;
      repairFlags.insertedAt = true;
    }
  }

  if (!raw.includes("@")) return null;

  let [localRaw, domainRaw = ""] = raw.split("@");
  let local = String(localRaw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.!#$%&'*+/=?^_`{|}~-]/gi, "")
    .replace(/^\.+|\.+$/g, "");
  if (!local || local.length < 2) return null;
  if (/^x{3,}$/i.test(local) || local === ".") return null;

  if (!domainRaw) {
    domainRaw = "gmail.com";
    repairFlags.assumedGmail = true;
  }

  const fixed = fuzzyFixDomain(domainRaw);
  repairFlags.repairedDomain = fixed.changed;
  repairFlags.fromDomain = String(fixed.from || domainRaw);
  repairFlags.toDomain = fixed.domain;

  if (!fixed.domain || !fixed.domain.includes(".")) return null;
  const tld = fixed.domain.split(".").pop() || "";
  if (tld.length < 2) return null;

  const email = `${local}@${fixed.domain}`.toLowerCase().slice(0, 120);
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) return null;

  return {
    email,
    repairedDomain: repairFlags.repairedDomain || repairFlags.assumedGmail || repairFlags.insertedAt,
    fromDomain: repairFlags.fromDomain,
    toDomain: repairFlags.toDomain,
    assumedGmail: repairFlags.assumedGmail,
    insertedAt: repairFlags.insertedAt,
    rawOriginal: original,
  };
}

function isPlaceholder(email) {
  const [local, domain = ""] = String(email || "").toLowerCase().split("@");
  return (
    /^(sin|no|nulo|nada|ningun|ninguno|prueba|test|noindica|noaplica)([._-]?(correo|email|mail|tiene|aplica))?\d*$/i.test(
      local,
    ) ||
    /sin(correo|email|mail)/i.test(local) ||
    // basura clásica del software de gym
    /^(cliente|clientes|cleinte|cleintes|clinete|clinetes)[._-]?sin/i.test(local) ||
    /clientes?in/i.test(local) ||
    /^(correo|email|mail|sincorreo|nada)\.(com|net)$/i.test(domain) ||
    /^(a|x)@(a|x)\./i.test(String(email || ""))
  );
}

function levenshtein(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return row[right.length];
}

function nameVariants(tokens) {
  if (!tokens.length) return [];
  const first = tokens[0] || "";
  const last = tokens[tokens.length - 1] || "";
  const set = new Set([
    ...tokens,
    tokens.join(""),
    `${first}${last}`,
    `${last}${first}`,
    tokens.slice(0, 2).join(""),
    tokens.slice(-2).join(""),
    first && last ? `${first[0]}${last}` : "",
    first && last ? `${first}${last[0]}` : "",
    tokens.map((t) => t[0]).join(""),
  ]);
  return [...set].filter((v) => v && v.length >= 2);
}

/** Score local del correo vs nombre (misma idea que lib/xtreme/email-identity.ts). */
function localNameScore(email, memberName) {
  const local = fold(String(email).split("@")[0]).replace(/[^a-z0-9]/g, "");
  const localAlpha = local.replace(/[0-9]+/g, "");
  const tokens = nameTokens(memberName);
  if (!localAlpha || !tokens.length) return 0;
  if (/^(sin|no|nulo|nada|prueba|test|correo|email|mail)/i.test(localAlpha)) return 0;

  let best = 0;
  for (const variant of nameVariants(tokens)) {
    const ratio =
      Math.min(localAlpha.length, variant.length) / Math.max(localAlpha.length, variant.length);
    if (localAlpha.includes(variant) || variant.includes(localAlpha)) {
      best = Math.max(best, Math.min(1, ratio + 0.08));
    }
    best = Math.max(
      best,
      1 - levenshtein(localAlpha, variant) / Math.max(localAlpha.length, variant.length),
    );
  }
  const hits = tokens.filter((token) => token.length >= 3 && localAlpha.includes(token));
  if (hits.length >= 2) best = Math.max(best, 0.97);
  else if (hits.length === 1) best = Math.max(best, hits[0].length >= 5 ? 0.86 : 0.72);

  const first = tokens[0] || "";
  const last = tokens[tokens.length - 1] || "";
  if (first && last.length >= 4) {
    const pattern = `${first[0]}${last}`;
    if (localAlpha.startsWith(pattern) || localAlpha.includes(pattern)) best = Math.max(best, 0.9);
    if (localAlpha.includes(last) && localAlpha[0] === first[0]) best = Math.max(best, 0.88);
  }
  if (last.length >= 4 && (localAlpha.startsWith(last) || localAlpha.includes(last))) {
    best = Math.max(best, first && localAlpha.includes(first.slice(0, 3)) ? 0.9 : 0.74);
  }
  return Math.round(Math.min(1, best) * 100) / 100;
}

/** Similaridad nombre Excel ↔ ficha Mongo (0–1). */
function nameSimilarity(leftName, rightName) {
  const left = nameTokens(leftName);
  const right = nameTokens(rightName);
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  const hits = left.filter((t) => rightSet.has(t)).length;
  const union = new Set([...left, ...right]).size;
  const jaccard = hits / union;
  const leftKey = nameKey(leftName);
  const rightKey = nameKey(rightName);
  if (leftKey === rightKey) return 1;
  const keyScore =
    1 - levenshtein(leftKey, rightKey) / Math.max(leftKey.length, rightKey.length || 1);
  return Math.round(Math.max(jaccard, keyScore * 0.95) * 100) / 100;
}

function nameKeyVariants(memberName) {
  const tokens = nameTokens(memberName);
  if (!tokens.length) return [];
  const keys = new Set([nameKey(memberName)]);
  if (tokens.length >= 2) {
    keys.add(nameKey(`${tokens.slice(1).join(" ")} ${tokens[0]}`));
    keys.add(nameKey(`${tokens[0]} ${tokens[tokens.length - 1]}`));
    keys.add(nameKey(`${tokens[tokens.length - 1]} ${tokens[0]}`));
    if (tokens.length >= 3) {
      keys.add(nameKey(`${tokens[0]} ${tokens.slice(-2).join(" ")}`));
      keys.add(nameKey(`${tokens.slice(-2).join(" ")} ${tokens[0]}`));
    }
  }
  return [...keys].filter(Boolean);
}

// --- Excel index ---
const excelByName = new Map();
const excelByCedula = new Map();
const excelRowsByEmail = new Map();
const invalidRows = [];
const placeholderEmailRows = [];
/** Correos reparados desde basura de formato (sin @, dominio mal escrito, etc.). */
const formatRepairs = [];
/** Todos los correos únicos recuperables del Excel (para invitación masiva). */
const allRecoverableEmails = new Map(); // email -> { name, row, repaired, raw }

for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const memberName = clean(`${clean(row.Nombre)} ${clean(row.Apellidos)}`);
  if (!memberName || isJunkName(memberName)) continue;

  const rawEmail = clean(row.Correo);
  const cedula = digits(row.Cedula);
  const candidate = rawEmail ? normalizeCandidateEmail(rawEmail) : null;
  if (rawEmail && !candidate) {
    invalidRows.push({ row: index + 3, memberName, value: rawEmail.slice(0, 120) });
  }
  if (candidate && isPlaceholder(candidate.email)) {
    placeholderEmailRows.push({ row: index + 3, memberName, email: candidate.email });
  }

  if (candidate && !isPlaceholder(candidate.email)) {
    const prev = allRecoverableEmails.get(candidate.email);
    if (!prev || (candidate.repairedDomain && !prev.repaired)) {
      allRecoverableEmails.set(candidate.email, {
        name: memberName,
        row: index + 3,
        repaired: Boolean(candidate.repairedDomain),
        assumedGmail: Boolean(candidate.assumedGmail),
        insertedAt: Boolean(candidate.insertedAt),
        raw: candidate.rawOriginal || rawEmail,
        fromDomain: candidate.fromDomain || "",
        toDomain: candidate.toDomain || "",
      });
    }
    if (candidate.repairedDomain) {
      formatRepairs.push({
        row: index + 3,
        memberName,
        raw: candidate.rawOriginal || rawEmail,
        email: candidate.email,
        assumedGmail: Boolean(candidate.assumedGmail),
        insertedAt: Boolean(candidate.insertedAt),
        fromDomain: candidate.fromDomain || "",
        toDomain: candidate.toDomain || "",
      });
    }
  }

  const entry = {
    row: index + 3,
    memberName,
    cedula: isWeakCedula(cedula) ? "" : cedula,
    sourceStatus: clean(row.Estado),
    expiresSerial: Number(row["Fecha vence"]) || 0,
    email: candidate && !isPlaceholder(candidate.email) ? candidate.email : "",
    repairedDomain: candidate?.repairedDomain || false,
    fromDomain: candidate?.fromDomain || "",
    toDomain: candidate?.toDomain || "",
    assumedGmail: candidate?.assumedGmail || false,
    insertedAt: candidate?.insertedAt || false,
  };

  for (const key of nameKeyVariants(memberName)) {
    const list = excelByName.get(key) ?? [];
    list.push(entry);
    excelByName.set(key, list);
  }
  if (entry.cedula) {
    const list = excelByCedula.get(entry.cedula) ?? [];
    list.push(entry);
    excelByCedula.set(entry.cedula, list);
  }
  if (entry.email) {
    const byEmail = excelRowsByEmail.get(entry.email) ?? [];
    byEmail.push(entry);
    excelRowsByEmail.set(entry.email, byEmail);
  }
}

/** Elige la fila Excel más “canónica” de un grupo (activo + vence más tarde). */
function chooseCanonicalExcel(group) {
  return [...group].sort((left, right) => {
    const expiry = (right.expiresSerial || 0) - (left.expiresSerial || 0);
    if (expiry) return expiry;
    const active =
      Number(/activo|recuperado/i.test(right.sourceStatus)) -
      Number(/activo|recuperado/i.test(left.sourceStatus));
    return active || right.row - left.row;
  })[0];
}

const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 15_000,
});

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const membersCol = db.collection("xtreme_gym_members");
  const contactsCol = db.collection("xtreme_gym_email_contacts");
  const auditCol = db.collection("xtreme_gym_audit");
  const members = await membersCol
    .find(
      {},
      {
        projection: {
          memberName: 1,
          normalizedName: 1,
          cedula: 1,
          email: 1,
          emailVerified: 1,
          emailQuarantine: 1,
          emailRecovery: 1,
          membership: 1,
        },
      },
    )
    .toArray();

  const memberByName = new Map();
  const memberByCedula = new Map();
  const membersByLast = new Map();
  for (const member of members) {
    const display = member.memberName || member.normalizedName || "";
    for (const key of new Set(
      [
        ...nameKeyVariants(member.normalizedName),
        ...nameKeyVariants(member.memberName),
      ].filter(Boolean),
    )) {
      const list = memberByName.get(key) ?? [];
      if (!list.some((item) => String(item._id) === String(member._id))) list.push(member);
      memberByName.set(key, list);
    }
    const ced = digits(member.cedula);
    if (ced && !isWeakCedula(ced)) {
      const list = memberByCedula.get(ced) ?? [];
      if (!list.some((item) => String(item._id) === String(member._id))) list.push(member);
      memberByCedula.set(ced, list);
    }
    const tokens = nameTokens(display);
    const last = tokens[tokens.length - 1] || "";
    if (last.length >= 4) {
      const list = membersByLast.get(last) ?? [];
      list.push(member);
      membersByLast.set(last, list);
    }
  }

  const placeholderEmails = new Set(
    members
      .filter((member) => member.emailQuarantine?.reason === "placeholder")
      .map((member) => normalizeCandidateEmail(member.emailQuarantine?.previousEmail)?.email)
      .filter(Boolean),
  );

  function resolveMemberForExcelRow(source) {
    // 1) Cédula única en Mongo + nombre razonable
    if (source.cedula) {
      const byCed = memberByCedula.get(source.cedula) ?? [];
      const realHits = byCed.filter((m) => !isJunkName(m.memberName || m.normalizedName));
      if (realHits.length === 1) {
        const sim = nameSimilarity(source.memberName, realHits[0].memberName || realHits[0].normalizedName);
        if (sim >= 0.45 || isJunkName(realHits[0].memberName)) {
          return { member: realHits[0], method: "exact_cedula", nameSim: sim };
        }
      }
      if (realHits.length > 1) {
        const ranked = realHits
          .map((member) => ({
            member,
            nameSim: nameSimilarity(source.memberName, member.memberName || member.normalizedName),
          }))
          .sort((a, b) => b.nameSim - a.nameSim);
        if (ranked[0].nameSim >= 0.7 && ranked[0].nameSim - (ranked[1]?.nameSim ?? 0) >= 0.12) {
          return {
            member: ranked[0].member,
            method: "cedula_name_margin",
            nameSim: ranked[0].nameSim,
          };
        }
      }
    }

    // 2) Nombre exacto (keys)
    for (const key of nameKeyVariants(source.memberName)) {
      const matches = (memberByName.get(key) ?? []).filter(
        (m) => !isJunkName(m.memberName || m.normalizedName),
      );
      if (matches.length === 1) {
        return {
          member: matches[0],
          method: "exact_name_key",
          nameSim: nameSimilarity(source.memberName, matches[0].memberName || matches[0].normalizedName),
        };
      }
      if (matches.length > 1) {
        // Desempatar con cédula Excel si alguna ficha la tiene
        if (source.cedula) {
          const withCed = matches.filter((m) => digits(m.cedula) === source.cedula);
          if (withCed.length === 1) {
            return { member: withCed[0], method: "name_key_plus_cedula", nameSim: 1 };
          }
        }
        // Desempatar con email score si hay correo
        if (source.email) {
          const ranked = matches
            .map((member) => ({
              member,
              score: localNameScore(source.email, member.memberName || member.normalizedName),
              nameSim: nameSimilarity(source.memberName, member.memberName || member.normalizedName),
            }))
            .sort((a, b) => b.score - a.score || b.nameSim - a.nameSim);
          if (
            ranked[0].score >= SAFE_NAME_SCORE &&
            ranked[0].score - (ranked[1]?.score ?? 0) >= 0.1
          ) {
            return {
              member: ranked[0].member,
              method: "name_key_email_margin",
              nameSim: ranked[0].nameSim,
            };
          }
        }
        return { member: null, method: "ambiguous", count: matches.length };
      }
    }

    // 3) Fuzzy apellido + nombre
    const tokens = nameTokens(source.memberName);
    if (tokens.length < 2) return { member: null, method: "unmatched" };
    const last = tokens[tokens.length - 1];
    const first = tokens[0];
    const pool = (membersByLast.get(last) || []).filter(
      (m) => !isJunkName(m.memberName || m.normalizedName),
    );
    if (!pool.length) return { member: null, method: "unmatched" };
    const ranked = pool
      .map((member) => {
        const mt = nameTokens(member.memberName || member.normalizedName);
        const mLast = mt[mt.length - 1] || "";
        const mFirst = mt[0] || "";
        let nameScore = 0;
        if (mLast === last) {
          if (mFirst === first) nameScore = 1;
          else if (mFirst[0] === first[0]) nameScore = 0.85;
          else if (mt.some((t) => t === first)) nameScore = 0.9;
          else nameScore = 0.4;
        }
        const cedulaBonus =
          source.cedula && digits(member.cedula) === source.cedula ? 0.2 : 0;
        return {
          member,
          nameScore: nameScore + cedulaBonus,
          nameSim: nameSimilarity(source.memberName, member.memberName || member.normalizedName),
        };
      })
      .filter((row) => row.nameScore >= 0.85)
      .sort((a, b) => b.nameScore - a.nameScore || b.nameSim - a.nameSim);
    if (ranked.length === 1) {
      return { member: ranked[0].member, method: "fuzzy_lastname_firstname", nameSim: ranked[0].nameSim };
    }
    if (ranked.length > 1 && ranked[0].nameScore - (ranked[1]?.nameScore ?? 0) >= 0.15) {
      return {
        member: ranked[0].member,
        method: "fuzzy_lastname_firstname_margin",
        nameSim: ranked[0].nameSim,
      };
    }
    return { member: null, method: ranked.length ? "fuzzy_ambiguous" : "unmatched" };
  }

  // Agrupar filas Excel por ficha Mongo
  const candidatesByMember = new Map();
  const ownersByEmail = new Map();
  const unmatchedNames = [];
  const ambiguousNames = [];
  const seenExcelKeys = new Set();

  for (const [, sourceRows] of excelByName) {
    for (const source of sourceRows) {
      const dedupe = `${source.row}:${source.email || "_"}:${source.cedula || "_"}`;
      if (seenExcelKeys.has(dedupe)) continue;
      seenExcelKeys.add(dedupe);

      const resolved = resolveMemberForExcelRow(source);
      if (!resolved.member) {
        if (resolved.method === "ambiguous" || resolved.method === "fuzzy_ambiguous") {
          ambiguousNames.push({
            memberName: source.memberName,
            matches: resolved.count || 2,
            row: source.row,
            cedula: source.cedula,
          });
        } else {
          unmatchedNames.push({
            memberName: source.memberName,
            row: source.row,
            cedula: source.cedula,
          });
        }
        continue;
      }
      if (source.email && (placeholderEmails.has(source.email) || isPlaceholder(source.email))) {
        // Aún usamos la fila para cédula aunque el correo sea basura.
      }

      const memberId = String(resolved.member._id);
      const bucket = candidatesByMember.get(memberId) ?? {
        member: resolved.member,
        choices: new Map(),
        matchMethod: resolved.method,
        nameSim: resolved.nameSim || 0,
      };
      // Preferir matchMethod más fuerte si re-encontramos la ficha.
      const methodRank = {
        exact_cedula: 5,
        name_key_plus_cedula: 5,
        cedula_name_margin: 4,
        exact_name_key: 4,
        name_key_email_margin: 3,
        fuzzy_lastname_firstname: 2,
        fuzzy_lastname_firstname_margin: 2,
      };
      if ((methodRank[resolved.method] || 0) >= (methodRank[bucket.matchMethod] || 0)) {
        bucket.matchMethod = resolved.method;
        bucket.nameSim = Math.max(bucket.nameSim || 0, resolved.nameSim || 0);
      }

      const choiceKey = source.email || `cedula:${source.cedula || source.row}`;
      const prev = bucket.choices.get(choiceKey);
      if (!prev || source.row > prev.row) bucket.choices.set(choiceKey, source);
      candidatesByMember.set(memberId, bucket);

      if (source.email && !isPlaceholder(source.email)) {
        const owners = ownersByEmail.get(source.email) ?? new Map();
        owners.set(memberId, {
          member: resolved.member,
          source,
          matchMethod: resolved.method,
          nameSim: resolved.nameSim || 0,
        });
        ownersByEmail.set(source.email, owners);
      }
    }
  }

  // Cuarentena: previousEmail como candidato
  for (const member of members) {
    const prev = normalizeCandidateEmail(member.emailQuarantine?.previousEmail)?.email;
    if (!prev || isPlaceholder(prev) || placeholderEmails.has(prev)) continue;
    if (member.emailVerified === true) continue;
    const memberId = String(member._id);
    const bucket = candidatesByMember.get(memberId) ?? {
      member,
      choices: new Map(),
      matchMethod: "quarantine_previous",
      nameSim: 0,
    };
    if (![...bucket.choices.values()].some((c) => c.email === prev)) {
      const excelHit = (excelRowsByEmail.get(prev) || [])[0];
      bucket.choices.set(prev, {
        row: excelHit?.row || member.emailQuarantine?.sourceRow || 0,
        memberName: excelHit?.memberName || member.memberName,
        cedula: excelHit?.cedula || "",
        sourceStatus: excelHit?.sourceStatus || "",
        expiresSerial: excelHit?.expiresSerial || 0,
        email: prev,
        repairedDomain: false,
        fromDomain: prev.split("@")[1],
        toDomain: prev.split("@")[1],
        fromQuarantine: true,
      });
    }
    candidatesByMember.set(memberId, bucket);
    const owners = ownersByEmail.get(prev) ?? new Map();
    if (!owners.has(memberId)) {
      owners.set(memberId, {
        member,
        source: [...bucket.choices.values()].find((c) => c.email === prev),
        matchMethod: "quarantine_previous",
        nameSim: 0,
      });
      ownersByEmail.set(prev, owners);
    }
  }

  // --- Dueño global de cada correo ---
  const selectedOwner = new Map();
  const sharedConflicts = [];
  const identityMismatches = [];

  for (const [email, ownerMap] of ownersByEmail) {
    const owners = [...ownerMap.values()];
    if (owners.length === 1) {
      const owner = owners[0];
      const score = localNameScore(email, owner.member.memberName || owner.member.normalizedName);
      const verifiedOwner =
        owner.member.emailVerified === true &&
        normalizeCandidateEmail(owner.member.email)?.email === email;
      const threshold =
        owner.matchMethod?.startsWith("fuzzy") || owner.matchMethod === "quarantine_previous"
          ? SAFE_NAME_SCORE
          : UNIQUE_OWNER_SCORE;
      // Bonus: cédula del Excel coincide con la ficha
      const cedulaBoost =
        owner.source?.cedula && digits(owner.member.cedula) === owner.source.cedula ? 0.08 : 0;
      const effective = Math.min(1, score + cedulaBoost);
      if (verifiedOwner || effective >= threshold) {
        selectedOwner.set(email, {
          ...owner,
          method: verifiedOwner
            ? "verified_current_owner"
            : owner.source?.fromQuarantine
              ? "quarantine_realign"
              : owner.matchMethod?.includes("cedula")
                ? "unique_cedula_name_match"
                : owner.matchMethod?.startsWith("fuzzy")
                  ? "fuzzy_unique_name_match"
                  : "unique_clear_name_match",
          score: effective,
        });
      } else {
        identityMismatches.push({
          email,
          memberName: owner.member.memberName,
          sourceRow: owner.source?.row,
          score: effective,
          reason: "name_email_mismatch",
          matchMethod: owner.matchMethod,
          excelCedula: owner.source?.cedula || "",
          memberCedula: digits(owner.member.cedula),
        });
      }
      continue;
    }

    const verifiedOwners = owners.filter(
      (owner) =>
        owner.member.emailVerified === true &&
        normalizeCandidateEmail(owner.member.email)?.email === email,
    );
    if (verifiedOwners.length === 1) {
      selectedOwner.set(email, {
        ...verifiedOwners[0],
        method: "verified_current_owner",
        score: 1,
      });
      continue;
    }

    const ranked = owners
      .map((owner) => {
        const score = localNameScore(email, owner.member.memberName || owner.member.normalizedName);
        const nameSim =
          owner.nameSim ||
          nameSimilarity(owner.source?.memberName, owner.member.memberName || owner.member.normalizedName);
        const cedulaBoost =
          owner.source?.cedula && digits(owner.member.cedula) === owner.source.cedula ? 0.12 : 0;
        const junkPenalty = isJunkName(owner.member.memberName) ? 0.5 : 0;
        return {
          ...owner,
          score: Math.min(1, score + cedulaBoost + nameSim * 0.05 - junkPenalty),
          nameSim,
        };
      })
      .sort((left, right) => right.score - left.score || right.nameSim - left.nameSim);
    const margin = ranked[0].score - (ranked[1]?.score ?? 0);
    if (ranked[0].score >= SAFE_NAME_SCORE && margin >= 0.1) {
      selectedOwner.set(email, {
        ...ranked[0],
        method: "shared_clear_name_match",
        margin,
      });
    } else {
      sharedConflicts.push({
        email,
        ownerCount: owners.length,
        bestScore: ranked[0]?.score ?? 0,
        margin,
        names: ranked.map((owner) => owner.member.memberName),
        cedulas: ranked.map((owner) => digits(owner.member.cedula)),
      });
    }
  }

  const currentOwnerByEmail = new Map();
  for (const member of members) {
    const current = normalizeCandidateEmail(member.email)?.email;
    if (current) currentOwnerByEmail.set(current, String(member._id));
  }

  // Aislar solo recuperaciones previas claramente basura (score muy bajo).
  // No re-aislar matches por cédula/excel con score decente: la invitación masiva
  // prefiere maximizar alcance y esos correos ya vienen del Excel.
  const unsafeExistingAssignments = members.flatMap((member) => {
    const email = normalizeCandidateEmail(member.email)?.email;
    if (!email || member.emailVerified === true || !member.emailRecovery) return [];
    const score = localNameScore(email, member.memberName || member.normalizedName);
    const method = String(member.emailRecovery?.method || "");
    const stored = Number(member.emailRecovery?.score);
    const effective = Number.isFinite(stored) ? Math.max(stored, score) : score;
    // Umbral laxo: solo basura clara (< 0.45) o sin señal de cédula/excel y < UNIQUE
    if (effective >= UNIQUE_OWNER_SCORE) return [];
    if (method.includes("cedula") && effective >= 0.5) return [];
    if (effective >= 0.45 && (method.includes("unique") || method.includes("shared"))) return [];
    if (effective >= 0.45) return [];
    return [
      {
        _id: member._id,
        memberName: member.memberName,
        email,
        score: effective,
        sourceRow: member.emailRecovery?.sourceRow ?? null,
        recoveryMethod: method,
        reason: "aggressive_name_mismatch",
      },
    ];
  });

  /** Mejor fila Excel para una ficha (correo + cédula). */
  function bestExcelIdentity(member, choices) {
    const memberId = String(member._id);
    const display = member.memberName || member.normalizedName || "";
    return [...choices.values()]
      .map((choice) => {
        const ownership = choice.email ? selectedOwner.get(choice.email) : null;
        const emailScore = choice.email
          ? ownership?.score ?? localNameScore(choice.email, display)
          : 0;
        const nameSim = nameSimilarity(choice.memberName, display);
        const cedulaMatch =
          choice.cedula && digits(member.cedula) === choice.cedula
            ? 1
            : choice.cedula && !digits(member.cedula)
              ? 0.4
              : 0;
        const ownsEmail =
          !choice.email ||
          (ownership && String(ownership.member._id) === memberId) ||
          (!ownership && emailScore >= SAFE_NAME_SCORE);
        const total =
          (choice.email ? emailScore * 0.55 : 0) +
          nameSim * 0.3 +
          cedulaMatch * 0.15 +
          (choice.expiresSerial ? Math.min(0.05, choice.expiresSerial / 1e8) : 0);
        return { choice, ownership, emailScore, nameSim, cedulaMatch, ownsEmail, total };
      })
      .filter((row) => row.ownsEmail || row.choice.cedula)
      .sort(
        (a, b) =>
          b.total - a.total ||
          b.emailScore - a.emailScore ||
          (b.choice.expiresSerial || 0) - (a.choice.expiresSerial || 0),
      );
  }

  const recoveries = [];
  const cedulaOnlyFixes = [];
  const skipped = [];
  const quarantineRealigns = [];

  for (const [memberId, { member, choices, matchMethod }] of candidatesByMember) {
    const currentEmail = normalizeCandidateEmail(member.email)?.email ?? "";
    const verified = member.emailVerified === true;
    const currentCedula = digits(member.cedula);
    const display = member.memberName || member.normalizedName || "";

    if (verified) {
      // Solo rellenar cédula vacía en verificados si Excel es claro y no choca.
      const ranked = bestExcelIdentity(member, choices);
      const top = ranked[0];
      if (top?.choice.cedula && isWeakCedula(currentCedula)) {
        const occupied = (memberByCedula.get(top.choice.cedula) || []).filter(
          (m) => String(m._id) !== memberId && m.emailVerified === true,
        );
        if (!occupied.length && top.nameSim >= 0.7) {
          cedulaOnlyFixes.push({
            _id: member._id,
            memberName: member.memberName,
            cedula: top.choice.cedula,
            previousCedula: currentCedula || null,
            sourceRow: top.choice.row,
            method: "verified_fill_empty_cedula",
            nameSim: top.nameSim,
          });
        }
      }
      skipped.push({ memberName: member.memberName, reason: "correo_actual_verificado" });
      continue;
    }

    const ranked = bestExcelIdentity(member, choices);
    const top = ranked[0];
    if (!top) {
      skipped.push({ memberName: member.memberName, reason: "sin_candidato_claro" });
      continue;
    }

    const currentScore = currentEmail
      ? localNameScore(currentEmail, display)
      : 0;
    const wantEmail =
      top.choice.email &&
      top.ownsEmail &&
      top.emailScore >= UNIQUE_OWNER_SCORE &&
      (!currentEmail ||
        currentScore < SAFE_NAME_SCORE ||
        (top.emailScore >= currentScore + 0.12 && top.choice.email !== currentEmail));

    // Cédula: Excel gana si nombre alinea bien y no hay dueño verificado con esa cédula.
    let wantCedula = "";
    if (top.choice.cedula && top.nameSim >= 0.55) {
      const others = (memberByCedula.get(top.choice.cedula) || []).filter(
        (m) => String(m._id) !== memberId,
      );
      const verifiedHolders = others.filter((m) => m.emailVerified === true);
      const realOthers = others.filter((m) => !isJunkName(m.memberName || m.normalizedName));
      if (!verifiedHolders.length) {
        if (currentCedula !== top.choice.cedula) {
          // Si otro no-basura ya tiene esa cédula, solo tomamos si nuestro nombre encaja mejor.
          if (!realOthers.length) {
            wantCedula = top.choice.cedula;
          } else {
            const theirBest = Math.max(
              ...realOthers.map((m) =>
                nameSimilarity(top.choice.memberName, m.memberName || m.normalizedName),
              ),
            );
            if (top.nameSim >= theirBest + 0.08 || top.nameSim >= 0.9) {
              wantCedula = top.choice.cedula;
            }
          }
        }
      }
    }

    if (wantEmail) {
      const occupiedBy = currentOwnerByEmail.get(top.choice.email);
      if (occupiedBy && occupiedBy !== memberId) {
        const occupant = members.find((m) => String(m._id) === occupiedBy);
        if (occupant?.emailVerified === true) {
          skipped.push({
            memberName: member.memberName,
            reason: "correo_ya_asignado_verificado",
            email: top.choice.email,
          });
          // Aun así podemos fijar cédula
          if (wantCedula) {
            cedulaOnlyFixes.push({
              _id: member._id,
              memberName: member.memberName,
              cedula: wantCedula,
              previousCedula: currentCedula || null,
              sourceRow: top.choice.row,
              method: "cedula_with_blocked_email",
              nameSim: top.nameSim,
            });
          }
          continue;
        }
        const occupantScore = localNameScore(
          top.choice.email,
          occupant?.memberName || occupant?.normalizedName,
        );
        if (occupantScore >= top.emailScore - 0.05) {
          if (wantCedula) {
            cedulaOnlyFixes.push({
              _id: member._id,
              memberName: member.memberName,
              cedula: wantCedula,
              previousCedula: currentCedula || null,
              sourceRow: top.choice.row,
              method: "cedula_email_contested",
              nameSim: top.nameSim,
            });
          }
          skipped.push({
            memberName: member.memberName,
            reason: "correo_ya_asignado",
            email: top.choice.email,
          });
          continue;
        }
      }

      if (currentEmail === top.choice.email && !member.emailQuarantine && !wantCedula) {
        continue;
      }

      const quarantine =
        normalizeCandidateEmail(member.emailQuarantine?.previousEmail)?.email ?? "";
      const item = {
        _id: member._id,
        memberName: member.memberName,
        email: top.choice.email,
        previousEmail: currentEmail || quarantine || null,
        cedula: wantCedula || undefined,
        previousCedula: wantCedula ? currentCedula || null : undefined,
        sourceRow: top.choice.row,
        repairedDomain: top.choice.repairedDomain,
        domainChange: top.choice.repairedDomain
          ? `${top.choice.fromDomain} -> ${top.choice.toDomain}`
          : null,
        method:
          top.ownership?.method ||
          (top.choice.fromQuarantine
            ? "quarantine_realign"
            : matchMethod || "unique_clear_name_match"),
        score: top.emailScore,
        nameSim: top.nameSim,
        matchMethod: matchMethod || top.ownership?.matchMethod || "",
        fromQuarantine: Boolean(member.emailQuarantine || top.choice.fromQuarantine),
        excelName: top.choice.memberName,
        excelCedula: top.choice.cedula || "",
      };
      recoveries.push(item);
      if (item.fromQuarantine) quarantineRealigns.push(item);
      currentOwnerByEmail.set(top.choice.email, memberId);
      if (wantCedula) {
        // Actualizar índice local de cédulas para el resto del run
        const prevList = memberByCedula.get(wantCedula) ?? [];
        memberByCedula.set(
          wantCedula,
          [...prevList.filter((m) => String(m._id) !== memberId), { ...member, cedula: wantCedula }],
        );
      }
      continue;
    }

    // Solo cédula (correo ya bueno o sin correo Excel usable)
    if (wantCedula) {
      cedulaOnlyFixes.push({
        _id: member._id,
        memberName: member.memberName,
        cedula: wantCedula,
        previousCedula: currentCedula || null,
        sourceRow: top.choice.row,
        method: currentScore >= SAFE_NAME_SCORE ? "cedula_align_keep_email" : "cedula_only",
        nameSim: top.nameSim,
        email: currentEmail || null,
        emailScore: currentScore,
      });
      continue;
    }

    if (currentEmail && currentScore >= SAFE_NAME_SCORE) {
      skipped.push({
        memberName: member.memberName,
        reason: "correo_actual_preservado",
        email: currentEmail,
        score: currentScore,
      });
    } else {
      skipped.push({ memberName: member.memberName, reason: "sin_mejora_clara" });
    }
  }

  // --- Resolver cédulas duplicadas (p. ej. real + NULO*) ---
  const cedulaConflictResolutions = [];
  const plannedCedula = new Map(); // memberId -> cedula
  for (const item of [...recoveries, ...cedulaOnlyFixes]) {
    if (item.cedula) plannedCedula.set(String(item._id), item.cedula);
  }
  // Estado efectivo de cédulas post-plan
  const effectiveCedula = new Map();
  for (const member of members) {
    const id = String(member._id);
    const ced = plannedCedula.get(id) || digits(member.cedula);
    if (ced && !isWeakCedula(ced)) {
      const list = effectiveCedula.get(ced) ?? [];
      list.push(member);
      effectiveCedula.set(ced, list);
    }
  }

  for (const [cedula, holders] of effectiveCedula) {
    if (holders.length < 2) continue;
    const excelGroup = excelByCedula.get(cedula) || [];
    const excelCanon = excelGroup.length ? chooseCanonicalExcel(excelGroup) : null;

    const ranked = holders
      .map((member) => {
        const id = String(member._id);
        const display = member.memberName || member.normalizedName || "";
        const junk = isJunkName(display);
        const verified = member.emailVerified === true;
        const nameSim = excelCanon ? nameSimilarity(excelCanon.memberName, display) : 0;
        const email = normalizeCandidateEmail(member.email)?.email || "";
        const emailScore =
          email && excelCanon?.email
            ? localNameScore(excelCanon.email, display)
            : email
              ? localNameScore(email, display)
              : 0;
        const score =
          (verified ? 2 : 0) +
          (junk ? -1.5 : 0) +
          nameSim * 1.2 +
          emailScore * 0.8 +
          (digits(member.cedula) === cedula ? 0.1 : 0);
        return { member, id, display, junk, verified, nameSim, emailScore, score };
      })
      .sort((a, b) => b.score - a.score);

    const winner = ranked[0];
    for (const loser of ranked.slice(1)) {
      // No quitar cédula a verificados si el winner no es verificado y empate raro
      if (loser.verified && !winner.verified) continue;
      // Limpiar basura / peores matches
      if (loser.junk || winner.nameSim >= loser.nameSim + 0.05 || winner.score >= loser.score + 0.2) {
        cedulaConflictResolutions.push({
          _id: loser.member._id,
          memberName: loser.display,
          clearCedula: cedula,
          winnerName: winner.display,
          winnerScore: winner.score,
          loserScore: loser.score,
          method: loser.junk ? "clear_junk_duplicate_cedula" : "clear_weaker_duplicate_cedula",
          excelName: excelCanon?.memberName || "",
        });
        // Si el loser tenía planned set a esta cédula, cancelarlo
        for (const list of [recoveries, cedulaOnlyFixes]) {
          for (const item of list) {
            if (String(item._id) === loser.id && item.cedula === cedula) {
              delete item.cedula;
              delete item.previousCedula;
            }
          }
        }
      }
    }

    // Asegurar que el winner tenga la cédula
    if (digits(winner.member.cedula) !== cedula && !plannedCedula.get(winner.id)) {
      if (winner.member.emailVerified !== true || isWeakCedula(winner.member.cedula)) {
        cedulaOnlyFixes.push({
          _id: winner.member._id,
          memberName: winner.display,
          cedula,
          previousCedula: digits(winner.member.cedula) || null,
          sourceRow: excelCanon?.row || 0,
          method: "cedula_conflict_winner",
          nameSim: winner.nameSim,
        });
      }
    }
  }

  // Contactos por ownership (match de nombre) + TODOS los recuperables del Excel
  // (incl. reparados de formato) para maximizar invite_recoverable.
  const contactsByEmail = new Map();
  for (const [email, ownerMap] of ownersByEmail.entries()) {
    const winner = selectedOwner.get(email);
    const singleOwner = ownerMap.size === 1 ? [...ownerMap.values()][0] : null;
    contactsByEmail.set(email, {
      email,
      name: winner?.member.memberName || singleOwner?.member.memberName || "Socio Xtreme",
      ambiguousOwners: winner ? 0 : ownerMap.size,
      status: winner ? "active" : "quarantined",
      safetyReason: winner
        ? "name_match"
        : singleOwner
          ? "name_email_mismatch"
          : "shared_without_clear_owner",
      nameScore:
        winner?.score ??
        (singleOwner
          ? localNameScore(email, singleOwner.member.memberName || singleOwner.member.normalizedName)
          : 0),
      category: winner
        ? winner.method?.includes("quarantine")
          ? "realigned_from_quarantine"
          : winner.method?.includes("fuzzy")
            ? "fuzzy_name_match"
            : winner.method?.includes("cedula")
              ? "cedula_name_match"
              : "excel_name_match"
        : singleOwner
          ? "identity_mismatch"
          : "shared_conflict",
    });
  }
  for (const [email, meta] of allRecoverableEmails.entries()) {
    if (contactsByEmail.has(email)) {
      // Si ya existe, marca reparación de formato sin bajar de active si era winner.
      const existing = contactsByEmail.get(email);
      if (meta.repaired) {
        existing.formatRepaired = true;
        existing.rawOriginal = meta.raw;
        if (meta.assumedGmail) existing.assumedGmail = true;
      }
      continue;
    }
    contactsByEmail.set(email, {
      email,
      name: meta.name || "Socio Xtreme",
      ambiguousOwners: 0,
      // active para invitación masiva aunque no haya match de nombre
      status: "active",
      safetyReason: meta.repaired ? "format_repaired" : "excel_raw_recoverable",
      nameScore: 0,
      category: meta.repaired
        ? meta.assumedGmail
          ? "format_repair_assumed_gmail"
          : "format_repair"
        : "excel_unmatched_recoverable",
      formatRepaired: Boolean(meta.repaired),
      rawOriginal: meta.raw,
      assumedGmail: Boolean(meta.assumedGmail),
      sourceRow: meta.row,
    });
  }
  const contacts = [...contactsByEmail.values()];

  let writeResult = null;
  if (apply) {
    const ops = [];

    for (const item of unsafeExistingAssignments) {
      ops.push({
        updateOne: {
          filter: { _id: item._id, email: item.email, emailVerified: { $ne: true } },
          update: {
            $set: {
              emailVerified: false,
              emailQuarantine: {
                previousEmail: item.email,
                reason: item.reason,
                at: now,
                source: "scripts/estado.xlsx-identity-audit",
                sourceRow: item.sourceRow,
                score: item.score,
              },
              updatedAt: now,
            },
            $unset: { email: "", emailRecovery: "" },
          },
        },
      });
    }

    for (const item of recoveries) {
      const set = {
        email: item.email,
        emailVerified: false,
        emailRecovery: {
          at: now,
          source: "scripts/estado.xlsx",
          sourceRow: item.sourceRow,
          method: item.method,
          score: item.score,
          previousEmail: item.previousEmail,
          domainChange: item.domainChange,
          matchMethod: item.matchMethod,
          nameSim: item.nameSim,
          excelName: item.excelName,
          excelCedula: item.excelCedula,
          category: item.fromQuarantine ? "quarantine_realign" : "excel_align",
        },
        updatedAt: now,
      };
      if (item.cedula) {
        set.cedula = item.cedula;
        set.identityAlign = {
          at: now,
          source: "scripts/estado.xlsx",
          sourceRow: item.sourceRow,
          previousCedula: item.previousCedula,
          method: item.method,
          nameSim: item.nameSim,
        };
      }
      ops.push({
        updateOne: {
          filter: { _id: item._id, emailVerified: { $ne: true } },
          update: {
            $set: set,
            $unset: { emailQuarantine: "" },
          },
        },
      });
    }

    for (const item of cedulaOnlyFixes) {
      if (!item.cedula) continue;
      const filter =
        item.method === "verified_fill_empty_cedula"
          ? { _id: item._id }
          : { _id: item._id, emailVerified: { $ne: true } };
      ops.push({
        updateOne: {
          filter,
          update: {
            $set: {
              cedula: item.cedula,
              identityAlign: {
                at: now,
                source: "scripts/estado.xlsx",
                sourceRow: item.sourceRow,
                previousCedula: item.previousCedula,
                method: item.method,
                nameSim: item.nameSim,
              },
              updatedAt: now,
            },
          },
        },
      });
    }

    for (const item of cedulaConflictResolutions) {
      ops.push({
        updateOne: {
          filter: {
            _id: item._id,
            cedula: item.clearCedula,
            emailVerified: { $ne: true },
          },
          update: {
            $set: {
              identityAlign: {
                at: now,
                source: "scripts/estado.xlsx-cedula-conflict",
                previousCedula: item.clearCedula,
                method: item.method,
                winnerName: item.winnerName,
              },
              updatedAt: now,
            },
            $unset: { cedula: "" },
          },
        },
      });
    }

    const memberWrite = ops.length
      ? await membersCol.bulkWrite(ops, { ordered: false })
      : { matchedCount: 0, modifiedCount: 0 };

    const contactWrite = contacts.length
      ? await contactsCol.bulkWrite(
          contacts.map((contact) => ({
            updateOne: {
              filter: { email: contact.email },
              update: {
                $set: { ...contact, source: "scripts/estado.xlsx-recovery", updatedAt: now },
                $setOnInsert: { createdAt: now },
              },
              upsert: true,
            },
          })),
          { ordered: false },
        )
      : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };

    await auditCol.insertOne({
      at: now,
      actor: "script:recover-member-emails",
      action: "member_identity.align",
      targetType: "members",
      summary: `${recoveries.length} correos; ${cedulaOnlyFixes.length} cédulas; ${cedulaConflictResolutions.length} conflictos cédula; ${unsafeExistingAssignments.length} inseguros`,
      context: {
        recoveries: recoveries.length,
        cedulaOnlyFixes: cedulaOnlyFixes.length,
        cedulaConflictResolutions: cedulaConflictResolutions.length,
        quarantineRealigns: quarantineRealigns.length,
        quarantined: unsafeExistingAssignments.length,
        contacts: contacts.length,
        sharedConflicts: sharedConflicts.length,
        identityMismatches: identityMismatches.length,
      },
    });

    writeResult = {
      membersMatched: memberWrite.matchedCount,
      membersModified: memberWrite.modifiedCount,
      emailRecoveries: recoveries.length,
      cedulaOnlyFixes: cedulaOnlyFixes.length,
      cedulaConflictsCleared: cedulaConflictResolutions.length,
      membersQuarantined: unsafeExistingAssignments.length,
      quarantineRealigns: quarantineRealigns.length,
      contactsMatched: contactWrite.matchedCount,
      contactsModified: contactWrite.modifiedCount,
      contactsInserted: contactWrite.upsertedCount,
    };
  }

  const report = {
    generatedAt: now.toISOString(),
    summary: {
      mode: apply ? "apply" : "dry-run",
      spreadsheetRows: rows.length,
      namesWithCandidateEmail: [...excelRowsByEmail.keys()].length,
      canonicalContactEmails: contacts.length,
      memberRecoveries: recoveries.length,
      cedulaOnlyFixes: cedulaOnlyFixes.length,
      cedulaConflictResolutions: cedulaConflictResolutions.length,
      quarantineRealigns: quarantineRealigns.length,
      uniqueExcelOwnerRecoveries: recoveries.filter((item) =>
        String(item.method).includes("unique"),
      ).length,
      cedulaNameMatchRecoveries: recoveries.filter((item) =>
        String(item.method).includes("cedula"),
      ).length,
      fuzzyNameRecoveries: recoveries.filter((item) => String(item.method).includes("fuzzy"))
        .length,
      sharedClearMatchRecoveries: recoveries.filter(
        (item) => item.method === "shared_clear_name_match",
      ).length,
      repairedDomains: recoveries.filter((item) => item.repairedDomain).length,
      formatRepairsFromExcel: formatRepairs.length,
      uniqueFormatRepairedEmails: new Set(formatRepairs.map((r) => r.email)).size,
      allRecoverableExcelEmails: allRecoverableEmails.size,
      unresolvedSharedEmails: sharedConflicts.length,
      invalidEmailRows: invalidRows.length,
      placeholderEmailsBlocked: placeholderEmailRows.length + placeholderEmails.size,
      identityMismatches: identityMismatches.length,
      unsafeExistingAssignments: unsafeExistingAssignments.length,
      quarantinedContacts: contacts.filter((contact) => contact.status === "quarantined").length,
      unmatchedExcelNames: unmatchedNames.length,
      ambiguousMongoNames: ambiguousNames.length,
      skippedMembers: skipped.length,
      byCategory: {
        excel_align: recoveries.filter((r) => !r.fromQuarantine).length,
        quarantine_realign: quarantineRealigns.length,
        cedula_only: cedulaOnlyFixes.length,
        cedula_conflict: cedulaConflictResolutions.length,
        identity_mismatch: identityMismatches.length,
        shared_conflict: sharedConflicts.length,
      },
    },
    writeResult,
    recoveries: recoveries.map(({ _id, ...item }) => item),
    formatRepairs: formatRepairs.slice(0, 300),
    cedulaOnlyFixes: cedulaOnlyFixes.map(({ _id, ...item }) => item),
    cedulaConflictResolutions: cedulaConflictResolutions.map(({ _id, ...item }) => item),
    quarantineRealigns: quarantineRealigns.map(({ _id, ...item }) => item),
    unsafeExistingAssignments: unsafeExistingAssignments.map(({ _id, ...item }) => item),
    identityMismatches,
    sharedConflicts,
    invalidRows: invalidRows.slice(0, 200),
    unmatchedNames: unmatchedNames.slice(0, 200),
    ambiguousNames: ambiguousNames.slice(0, 100),
    skipped: skipped.slice(0, 200),
  };
  if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report.summary, writeResult }, null, 2));
} finally {
  await client.close();
}
