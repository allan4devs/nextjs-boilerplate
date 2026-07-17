/**
 * Importa socios desde el JSON de estado.xlsx (vía import-estado.ps1).
 *
 * Reglas de correo (el Excel histórico viene sucio):
 *  - Descarta placeholders (sincorreo, noaplica, typos, etc.)
 *  - Un correo solo se asigna a UNA persona (la de mejor match nombre↔correo)
 *  - Si el nombre tiene 2+ tokens y el local-part no se parece, se deja vacío
 *  - Nunca pisa emailVerified === true en un re-import
 */
import { readFile, writeFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : "";
const reportIndex = args.indexOf("--report");
const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : "";
const apply = args.includes("--apply");

if (!inputPath) throw new Error("Falta --input con el JSON convertido desde estado.xlsx.");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");

const rows = JSON.parse(await readFile(inputPath, "utf8"));
const now = new Date();
const today = now.toISOString().slice(0, 10);

function clean(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizedName(value) {
  return clean(value).toLocaleUpperCase("es-CR");
}

function digits(value, max = 20) {
  return clean(value).replace(/\D/g, "").slice(0, max);
}

function excelDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 1) return "";
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000);
  const iso = date.toISOString().slice(0, 10);
  const year = date.getUTCFullYear();
  return year >= 1920 && year <= now.getUTCFullYear() + 3 ? iso : "";
}

const PLACEHOLDER_EMAIL_RE =
  /clientesin\w*|cleintesin\w*|clinetesin\w*|sincorreo|sin\.correo|noaplica|noindica|notiene|sinmail|noemail|noreply|no-reply|prueba\d*|test@|ejemplo@|example\.com|latinsoft|soporte@latinsoft|nulo@|null@|@gmil\.|correo@correo|email@email/i;

function usableEmail(value) {
  const email = clean(value).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  if (PLACEHOLDER_EMAIL_RE.test(email)) return "";
  const local = email.split("@")[0];
  if (/^\d{1,6}$/.test(local)) return "";
  return email.slice(0, 80);
}

function nameTokens(value) {
  return clean(value)
    .toLocaleUpperCase("es-CR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 3 && t !== "NULO" && t !== "NULL");
}

const COMMON_NAME_TOKENS = new Set([
  "ana", "andrea", "carlos", "daniel", "david", "jose", "juan", "maria", "marco",
  "manuel", "miguel", "luis", "laura", "sofia",
]);

function ascii(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function levenshtein(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function fuzzyTokenHit(token, pieces) {
  if (token.length < 5) return false;
  return pieces.some(
    (piece) =>
      piece.length >= 4 &&
      Math.abs(piece.length - token.length) <= 1 &&
      levenshtein(token, piece) <= 1,
  );
}

function birthYearCandidates(source) {
  const exactYear = source.birthDate ? Number(source.birthDate.slice(0, 4)) : 0;
  if (exactYear) return [exactYear];
  const age = Number(source.age);
  if (!Number.isInteger(age) || age < 5 || age > 110) return [];
  return [now.getUTCFullYear() - age, now.getUTCFullYear() - age - 1];
}

function globalEmailScore(profile, candidate) {
  const localRaw = ascii(candidate.email.split("@")[0]);
  const local = localRaw.replace(/[^a-z0-9]/g, "");
  const pieces = localRaw.split(/[^a-z]+/).filter(Boolean);
  const firstNames = nameTokens(profile.canonical.row.Nombre).map((token) => token.toLowerCase());
  const surnames = nameTokens(profile.canonical.row.Apellidos).map((token) => token.toLowerCase());
  const reasons = [];
  let score = 0;
  let nameEvidence = 0;

  for (const token of [...new Set(firstNames)]) {
    if (local.includes(token)) {
      const points = COMMON_NAME_TOKENS.has(token)
        ? 20
        : token.length <= 3
          ? 25
          : token.length === 4
            ? 42
            : 55;
      score += points;
      nameEvidence += points;
      reasons.push(`first:${token}`);
    } else if (fuzzyTokenHit(token, pieces)) {
      score += 34;
      nameEvidence += 34;
      reasons.push(`first~:${token}`);
    }
  }
  for (const token of [...new Set(surnames)]) {
    if (local.includes(token)) {
      const points = token.length <= 3 ? 20 : token.length === 4 ? 32 : 42;
      score += points;
      nameEvidence += points;
      reasons.push(`last:${token}`);
    } else if (fuzzyTokenHit(token, pieces)) {
      score += 28;
      nameEvidence += 28;
      reasons.push(`last~:${token}`);
    }
  }

  const first = firstNames[0] || "";
  const last = surnames[0] || "";
  if (first && last && (local.includes(`${first[0]}${last}`) || local.includes(`${first}${last[0]}`))) {
    score += 24;
    nameEvidence += 24;
    reasons.push("initial+name");
  }

  const cedula = profile.canonical.source.cedula;
  if (cedula.length >= 8 && local.includes(cedula)) {
    score += 90;
    reasons.push("cedula");
  } else if (cedula.length >= 8 && local.includes(cedula.slice(-4))) {
    score += 12;
    reasons.push("cedula-last4");
  }

  const years = birthYearCandidates(profile.canonical.source);
  if (years.some((year) => local.includes(String(year)))) {
    score += 24;
    reasons.push("birth-year");
  } else if (years.some((year) => local.includes(String(year).slice(-2)))) {
    score += 12;
    reasons.push("birth-year-2");
  }
  const age = String(profile.canonical.source.age || "");
  if (age && localRaw.split(/\D+/).includes(age)) {
    score += 6;
    reasons.push("age");
  }

  if (candidate.observedKeys.has(profile.key)) {
    score += nameEvidence > 0 ? 12 : 3;
    reasons.push("same-row-group");
  }

  return { score, nameEvidence, reasons };
}

function statusFor(nextBillingDate) {
  if (!nextBillingDate) return "expired";
  const remaining = Math.ceil(
    (Date.parse(`${nextBillingDate}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) /
      86_400_000,
  );
  return remaining < 0 ? "expired" : remaining <= 5 ? "warning" : "active";
}

function sourceRow(row, index) {
  return {
    row: index + 3,
    location: clean(row.Sede),
    cardNumber: clean(row.Carnet),
    sourceStatus: clean(row.Estado),
    plan: clean(row.Plan),
    cedula: digits(row.Cedula),
    phone: digits(row.Telefono1, 24),
    alternatePhone: digits(row.Telefono2, 24),
    rawEmail: clean(row.Correo).toLowerCase(),
    birthDate: excelDate(row["Fecha Nacimiento"]),
    age: Number(row.Edad) || null,
    joinedAt: excelDate(row["Fecha Ingreso"]),
    expiresAt: excelDate(row["Fecha vence"]),
    rate: clean(row["x Tarifa"]),
    costCrc: Number(row.Costo) || 0,
  };
}

function isJunkName(key) {
  return (
    !key ||
    /^NULO(\s+NULO)?$/.test(key) ||
    key === "PRUEBA" ||
    /^PRUEBA\s+\d+$/.test(key)
  );
}

const groups = new Map();
let invalidNames = 0;
let skippedNulo = 0;
rows.forEach((row, index) => {
  const memberName = clean(`${clean(row.Nombre)} ${clean(row.Apellidos)}`);
  const key = normalizedName(memberName);
  if (isJunkName(key)) {
    if (key) skippedNulo += 1;
    else invalidNames += 1;
    return;
  }
  const item = { row, source: sourceRow(row, index), memberName };
  const group = groups.get(key) ?? [];
  group.push(item);
  groups.set(key, group);
});

const provisional = [];

for (const [key, group] of groups) {
  const ranked = [...group].sort((left, right) => {
    const expiry = right.source.expiresAt.localeCompare(left.source.expiresAt);
    if (expiry) return expiry;
    const rightActive = /activo|recuperado/i.test(right.source.sourceStatus) ? 1 : 0;
    const leftActive = /activo|recuperado/i.test(left.source.sourceStatus) ? 1 : 0;
    return rightActive - leftActive || right.source.row - left.source.row;
  });
  const canonical = ranked[0];

  provisional.push({ key, group, canonical });
}

// Un correo puede estar pegado en la fila de otra persona. Resolvemos el
// propietario contra toda la lista y exigimos ventaja clara sobre el segundo.
const emailCandidates = new Map();
for (const profile of provisional) {
  for (const { row, source } of profile.group) {
    const email = usableEmail(row.Correo);
    if (!email) continue;
    const candidate = emailCandidates.get(email) ?? {
      email,
      observedKeys: new Set(),
      sourceRows: [],
    };
    candidate.observedKeys.add(profile.key);
    candidate.sourceRows.push(source.row);
    emailCandidates.set(email, candidate);
  }
}

const profileEmailAssignments = new Map();
let globallyAssignedEmails = 0;
let ambiguousEmails = 0;
let unmatchedEmails = 0;
const alignmentDecisions = [];

for (const candidate of emailCandidates.values()) {
  const ranked = provisional
    .map((profile) => ({ profile, ...globalEmailScore(profile, candidate) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const margin = best.score - (runnerUp?.score ?? 0);
  const strongIdentity =
    best.nameEvidence >= 55 ||
    best.reasons.includes("cedula") ||
    (best.nameEvidence >= 34 && best.score >= 66);

  if (best.score < 55 || margin < 15 || !strongIdentity) {
    const action = best.score >= 55 ? "review_ambiguous" : "unmatched";
    if (action === "review_ambiguous") ambiguousEmails += 1;
    else unmatchedEmails += 1;
    alignmentDecisions.push({
      email: candidate.email,
      action,
      proposedOwner: best.profile.canonical.memberName,
      score: best.score,
      margin,
      reasons: best.reasons,
      runnerUp: runnerUp?.profile.canonical.memberName ?? null,
      runnerUpScore: runnerUp?.score ?? null,
      sourceRows: candidate.sourceRows,
    });
    continue;
  }

  const assignment = {
    email: candidate.email,
    score: best.score,
    margin,
    reasons: best.reasons,
    sourceRows: candidate.sourceRows,
    observedOnOwner: candidate.observedKeys.has(best.profile.key),
  };
  const previous = profileEmailAssignments.get(best.profile.key);
  if (
    !previous ||
    assignment.score > previous.score ||
    (assignment.score === previous.score && assignment.margin > previous.margin)
  ) {
    profileEmailAssignments.set(best.profile.key, assignment);
  }
  globallyAssignedEmails += 1;
  alignmentDecisions.push({
    email: candidate.email,
    action: assignment.observedOnOwner ? "assign_observed" : "reassign_global",
    ownerKey: best.profile.key,
    owner: best.profile.canonical.memberName,
    score: assignment.score,
    margin: assignment.margin,
    reasons: assignment.reasons,
    runnerUp: runnerUp?.profile.canonical.memberName ?? null,
    runnerUpScore: runnerUp?.score ?? null,
    sourceRows: candidate.sourceRows,
  });
}

for (const decision of alignmentDecisions) {
  if (!decision.ownerKey) continue;
  const selected = profileEmailAssignments.get(decision.ownerKey);
  if (selected?.email !== decision.email) decision.action = "superseded_for_same_owner";
  delete decision.ownerKey;
}
const finalReassignedEmails = [...profileEmailAssignments.values()].filter(
  (assignment) => !assignment.observedOnOwner,
).length;

const operations = [];
let realEmails = 0;
let questionableDates = 0;

for (const { key, group, canonical } of provisional) {
  const emailAssignment = profileEmailAssignments.get(key);
  const email = emailAssignment?.email ?? "";

  const phone = canonical.source.phone || group.map(({ source }) => source.phone).find(Boolean) || "";
  const cedula = canonical.source.cedula || group.map(({ source }) => source.cedula).find(Boolean) || "";
  const startedAt = canonical.source.joinedAt || today;
  const nextBillingDate = canonical.source.expiresAt || today;
  if (email) realEmails += 1;
  if (!canonical.source.expiresAt && clean(canonical.row["Fecha vence"])) questionableDates += 1;

  const legacyImport = {
    source: "scripts/estado.xlsx",
    importedAt: now,
    subscriptionVerification: "pending",
    canonicalSourceStatus: canonical.source.sourceStatus,
    rowCount: group.length,
    rows: group.map(({ source }) => source),
    emailAssignment: email
      ? emailAssignment
      : { email: null, reason: "missing_ambiguous_or_mismatch" },
  };

  const baseSet = {
    memberName: canonical.memberName,
    normalizedName: key,
    ...(cedula ? { cedula } : {}),
    ...(phone ? { phone } : {}),
    membership: {
      plan: canonical.source.plan || "Plan histórico",
      status: statusFor(nextBillingDate),
      startedAt,
      nextBillingDate,
    },
    notificationPrefs: {
      streakRisk: false,
      milestones: false,
      renewalReminders: false,
      winBack: false,
      weeklyRecap: false,
    },
    legacyImport,
    updatedAt: now,
  };

  // Una sola operación evita un upsert duplicado cuando el perfil ya tiene un
  // correo verificado. En ese caso preserva correo y verificación sin tocarlos.
  operations.push({
    updateOne: {
      filter: { normalizedName: key },
      update: [
        {
          $set: {
            ...baseSet,
            email: {
              $cond: [
                { $eq: ["$emailVerified", true] },
                "$email",
                email || "$$REMOVE",
              ],
            },
            emailVerified: {
              $cond: [{ $eq: ["$emailVerified", true] }, true, false],
            },
            goal: { $ifNull: ["$goal", ""] },
            favoriteTraining: { $ifNull: ["$favoriteTraining", ""] },
            workouts: { $ifNull: ["$workouts", []] },
            createdAt: { $ifNull: ["$createdAt", now] },
          },
        },
      ],
      upsert: true,
    },
  });
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      spreadsheetRows: rows.length,
      consolidatedMembers: provisional.length,
      writeOps: operations.length,
      duplicateRowsPreserved: rows.length - provisional.length - invalidNames - skippedNulo,
      invalidNames,
      skippedNulo,
      membersWithUsableEmail: realEmails,
      uniqueCandidateEmails: emailCandidates.size,
      acceptedCandidateEmails: globallyAssignedEmails,
      assignedMemberEmails: profileEmailAssignments.size,
      reassignedFromAnotherPersonRows: finalReassignedEmails,
      ambiguousEmails,
      unmatchedEmails,
      questionableExpiryDates: questionableDates,
    },
    null,
    2,
  ),
);

if (reportPath) {
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        thresholds: { minimumScore: 55, minimumMargin: 15 },
        decisions: alignmentDecisions,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`Reporte de alineación: ${reportPath}`);
}

if (!apply) {
  console.log("Vista previa solamente. Usa -Apply en import-estado.ps1 para escribir en MongoDB.");
  process.exit(0);
}

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const collection = db.collection("xtreme_gym_members");
  const existing = await collection.countDocuments();
  const result = await collection.bulkWrite(operations, { ordered: false });
  console.log(
    JSON.stringify(
      {
        existingBefore: existing,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        inserted: result.upsertedCount,
        totalAfter: await collection.countDocuments(),
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
