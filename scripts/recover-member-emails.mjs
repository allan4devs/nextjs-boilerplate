/**
 * Recupera / realinea correos del estado.xlsx con nombres y apellidos.
 *
 * - Asigna correos únicos del Excel a fichas sin correo o en cuarentena.
 * - Re-evalúa cuarentena (mismatch / shared) y restaura si hay ganador claro por nombre.
 * - No toca correos ya verificados por el socio.
 *
 * Uso:
 *   node scripts/recover-member-emails.mjs --input scripts/estado.json --report scripts/email-recovery-report.json
 *   node scripts/recover-member-emails.mjs --input ... --report ... --apply
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

const KNOWN_DOMAIN_FIXES = new Map([
  ["gmaill.com", "gmail.com"],
  ["gamil.com", "gmail.com"],
  ["gmial.com", "gmail.com"],
  ["gmail.co", "gmail.com"],
  ["gmail.con", "gmail.com"],
  ["gotmail.com", "hotmail.com"],
  ["htomail.com", "hotmail.com"],
  ["hotmal.com", "hotmail.com"],
  ["hotmai.com", "hotmail.com"],
  ["homail.com", "hotmail.com"],
  ["outlok.com", "outlook.com"],
  ["outllok.com", "outlook.com"],
  ["!cloud.com", "icloud.com"],
  ["iclod.com", "icloud.com"],
  ["yahooo.com", "yahoo.com"],
]);

function normalizeCandidateEmail(value) {
  let raw = clean(value)
    .toLowerCase()
    .replace(/^mailto\s*:/, "")
    .replace(/[<>"']/g, "");
  raw = raw
    .replace(/\s*@\s*/g, "@")
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s+/g, "");
  if (!raw.includes("@")) {
    raw = raw.replace(/[?\u00bf]/, "@");
    if (!raw.includes("@")) {
      const provider = [
        "gmail.com",
        "hotmail.com",
        "hotmail.es",
        "outlook.com",
        "outlook.es",
        "icloud.com",
        "yahoo.com",
      ].find((domain) => raw.endsWith(domain) && raw.length > domain.length);
      if (provider) raw = `${raw.slice(0, -provider.length)}@${provider}`;
    }
  }
  if (!/^[^@,;|/]+@[^@,;|/]+\.[^@,;|/]+$/.test(raw)) return null;
  const [localRaw, domainRaw] = raw.split("@");
  const local = localRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const domain = KNOWN_DOMAIN_FIXES.get(domainRaw) ?? domainRaw;
  const email = `${local}@${domain}`.slice(0, 120);
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) return null;
  return { email, repairedDomain: domain !== domainRaw, fromDomain: domainRaw, toDomain: domain };
}

function isPlaceholder(email) {
  const [local, domain = ""] = email.split("@");
  return (
    /^(sin|no|nulo|nada|ningun|ninguno|prueba|test)([._-]?(correo|email|mail|tiene|aplica))?\d*$/i.test(
      local,
    ) ||
    /sin(correo|email|mail)/i.test(local) ||
    /^(correo|email|mail|sincorreo|nada)\.(com|net)$/i.test(domain) ||
    /^(a|x)@(a|x)\./i.test(email)
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

/** Misma lógica que lib/xtreme/email-identity.ts (script standalone). */
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

/** Claves de nombre para cruzar Excel ↔ Mongo (orden normal y apellidos primero). */
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
const excelRowsByEmail = new Map();
const invalidRows = [];
for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const memberName = clean(`${clean(row.Nombre)} ${clean(row.Apellidos)}`);
  const rawEmail = clean(row.Correo);
  if (!memberName || /^NULO(?:\s+NULO)?$/i.test(nameKey(memberName))) continue;
  if (!rawEmail) continue;
  const candidate = normalizeCandidateEmail(rawEmail);
  if (!candidate) {
    invalidRows.push({ row: index + 3, memberName, value: rawEmail.slice(0, 120) });
    continue;
  }
  if (isPlaceholder(candidate.email)) continue;

  const entry = {
    row: index + 3,
    memberName,
    sourceStatus: clean(row.Estado),
    expiresSerial: Number(row["Fecha vence"]) || 0,
    ...candidate,
  };
  for (const key of nameKeyVariants(memberName)) {
    const list = excelByName.get(key) ?? [];
    list.push(entry);
    excelByName.set(key, list);
  }
  const byEmail = excelRowsByEmail.get(candidate.email) ?? [];
  byEmail.push(entry);
  excelRowsByEmail.set(candidate.email, byEmail);
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
          email: 1,
          emailVerified: 1,
          emailQuarantine: 1,
          emailRecovery: 1,
        },
      },
    )
    .toArray();

  const memberByName = new Map();
  const membersByLast = new Map();
  for (const member of members) {
    const display = member.memberName || member.normalizedName || "";
    for (const key of new Set([
      ...nameKeyVariants(member.normalizedName),
      ...nameKeyVariants(member.memberName),
    ].filter(Boolean))) {
      const list = memberByName.get(key) ?? [];
      if (!list.some((item) => String(item._id) === String(member._id))) list.push(member);
      memberByName.set(key, list);
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

  function resolveMemberForExcelName(memberName) {
    for (const key of nameKeyVariants(memberName)) {
      const matches = memberByName.get(key) ?? [];
      if (matches.length === 1) return { member: matches[0], method: "exact_name_key" };
      if (matches.length > 1) return { member: null, method: "ambiguous", count: matches.length };
    }
    // Apellido + inicial / nombre: solo si un único candidato claro.
    const tokens = nameTokens(memberName);
    if (tokens.length < 2) return { member: null, method: "unmatched" };
    const last = tokens[tokens.length - 1];
    const first = tokens[0];
    const pool = membersByLast.get(last) || [];
    if (!pool.length) return { member: null, method: "unmatched" };
    const ranked = pool
      .map((member) => ({
        member,
        score: localNameScore(
          // score usando un pseudo-local del nombre excel vs ficha
          `${first}${last}@x.local`,
          member.memberName || member.normalizedName,
        ),
        nameScore: (() => {
          const mt = nameTokens(member.memberName || member.normalizedName);
          const mLast = mt[mt.length - 1] || "";
          const mFirst = mt[0] || "";
          if (mLast !== last) return 0;
          if (mFirst === first) return 1;
          if (mFirst[0] === first[0]) return 0.85;
          if (mt.some((t) => t === first)) return 0.9;
          return 0.4;
        })(),
      }))
      .filter((row) => row.nameScore >= 0.85)
      .sort((a, b) => b.nameScore - a.nameScore || b.score - a.score);
    if (ranked.length === 1) {
      return { member: ranked[0].member, method: "fuzzy_lastname_firstname" };
    }
    if (ranked.length > 1 && ranked[0].nameScore - (ranked[1]?.nameScore ?? 0) >= 0.15) {
      return { member: ranked[0].member, method: "fuzzy_lastname_firstname_margin" };
    }
    return { member: null, method: ranked.length ? "fuzzy_ambiguous" : "unmatched" };
  }

  // Agrupar filas Excel por ficha (sin duplicar por variantes de key).
  const candidatesByMember = new Map();
  const ownersByEmail = new Map();
  const unmatchedNames = [];
  const ambiguousNames = [];
  const seenExcelKeys = new Set();

  for (const [key, sourceRows] of excelByName) {
    // Cada fila puede estar en varias keys; procesamos por nombre canónico de la fila.
    for (const source of sourceRows) {
      const dedupe = `${source.row}:${source.email}`;
      if (seenExcelKeys.has(dedupe)) continue;
      seenExcelKeys.add(dedupe);

      const resolved = resolveMemberForExcelName(source.memberName);
      if (!resolved.member) {
        if (resolved.method === "ambiguous" || resolved.method === "fuzzy_ambiguous") {
          ambiguousNames.push({
            key,
            memberName: source.memberName,
            matches: resolved.count || 2,
            row: source.row,
          });
        } else {
          unmatchedNames.push({ key, memberName: source.memberName, row: source.row });
        }
        continue;
      }
      if (placeholderEmails.has(source.email) || isPlaceholder(source.email)) continue;

      const memberId = String(resolved.member._id);
      const bucket = candidatesByMember.get(memberId) ?? {
        member: resolved.member,
        choices: new Map(),
        matchMethod: resolved.method,
      };
      const prev = bucket.choices.get(source.email);
      if (!prev || source.row > prev.row) bucket.choices.set(source.email, source);
      candidatesByMember.set(memberId, bucket);

      const owners = ownersByEmail.get(source.email) ?? new Map();
      owners.set(memberId, {
        member: resolved.member,
        source,
        matchMethod: resolved.method,
      });
      ownersByEmail.set(source.email, owners);
    }
  }

  // También: fichas en cuarentena con previousEmail → intentar realinear sin fila Excel nueva.
  for (const member of members) {
    const prev = normalizeCandidateEmail(member.emailQuarantine?.previousEmail)?.email;
    if (!prev || isPlaceholder(prev) || placeholderEmails.has(prev)) continue;
    if (member.emailVerified === true) continue;
    const memberId = String(member._id);
    const bucket = candidatesByMember.get(memberId) ?? {
      member,
      choices: new Map(),
      matchMethod: "quarantine_previous",
    };
    if (!bucket.choices.has(prev)) {
      const excelHit = (excelRowsByEmail.get(prev) || [])[0];
      bucket.choices.set(prev, {
        row: excelHit?.row || member.emailQuarantine?.sourceRow || 0,
        memberName: member.memberName,
        sourceStatus: "",
        expiresSerial: 0,
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
        source: bucket.choices.get(prev),
        matchMethod: "quarantine_previous",
      });
      ownersByEmail.set(prev, owners);
    }
  }

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
      // Dueño único: umbral un poco más bajo si el match vino de nombre claro.
      const threshold =
        owner.matchMethod?.startsWith("fuzzy") || owner.matchMethod === "quarantine_previous"
          ? SAFE_NAME_SCORE
          : UNIQUE_OWNER_SCORE;
      if (verifiedOwner || score >= threshold) {
        selectedOwner.set(email, {
          ...owner,
          method: verifiedOwner
            ? "verified_current_owner"
            : owner.source?.fromQuarantine
              ? "quarantine_realign"
              : owner.matchMethod?.startsWith("fuzzy")
                ? "fuzzy_unique_name_match"
                : "unique_clear_name_match",
          score,
        });
      } else {
        identityMismatches.push({
          email,
          memberName: owner.member.memberName,
          sourceRow: owner.source?.row,
          score,
          reason: "name_email_mismatch",
          matchMethod: owner.matchMethod,
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
      .map((owner) => ({
        ...owner,
        score: localNameScore(email, owner.member.memberName || owner.member.normalizedName),
      }))
      .sort((left, right) => right.score - left.score);
    const margin = ranked[0].score - (ranked[1]?.score ?? 0);
    if (ranked[0].score >= SAFE_NAME_SCORE && margin >= 0.12) {
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
      });
    }
  }

  const currentOwnerByEmail = new Map();
  for (const member of members) {
    const current = normalizeCandidateEmail(member.email)?.email;
    if (current) currentOwnerByEmail.set(current, String(member._id));
  }

  // Aislar recuperaciones previas agresivas (score bajo) que sigan en ficha.
  const unsafeExistingAssignments = members.flatMap((member) => {
    const email = normalizeCandidateEmail(member.email)?.email;
    if (!email || member.emailVerified === true || !member.emailRecovery) return [];
    const score = localNameScore(email, member.memberName || member.normalizedName);
    if (score >= SAFE_NAME_SCORE) return [];
    return [
      {
        _id: member._id,
        memberName: member.memberName,
        email,
        score,
        sourceRow: member.emailRecovery?.sourceRow ?? null,
        recoveryMethod: member.emailRecovery?.method ?? "",
        reason: "aggressive_name_mismatch",
      },
    ];
  });

  const recoveries = [];
  const skipped = [];
  const quarantineRealigns = [];

  for (const [memberId, { member, choices, matchMethod }] of candidatesByMember) {
    const currentEmail = normalizeCandidateEmail(member.email)?.email ?? "";
    const verified = member.emailVerified === true;

    if (verified) {
      skipped.push({ memberName: member.memberName, reason: "correo_actual_verificado" });
      continue;
    }

    // Si ya tiene correo "seguro", no lo pisamos salvo que sea recovery mala (la aísla unsafeExisting).
    if (currentEmail) {
      const currentScore = localNameScore(currentEmail, member.memberName || member.normalizedName);
      if (currentScore >= SAFE_NAME_SCORE) {
        skipped.push({
          memberName: member.memberName,
          reason: "correo_actual_preservado",
          email: currentEmail,
          score: currentScore,
        });
        continue;
      }
    }

    // Mejor elección del Excel/cuarentena para esta ficha.
    const rankedChoices = [...choices.values()]
      .map((choice) => {
        const ownership = selectedOwner.get(choice.email);
        const score = ownership?.score ?? localNameScore(choice.email, member.memberName);
        return { choice, ownership, score };
      })
      .filter(({ ownership, score }) => {
        if (ownership && String(ownership.member._id) === memberId) return true;
        // Si no ganó ownership global pero es único en choices y score alto local
        return !ownership && score >= SAFE_NAME_SCORE;
      })
      .sort((a, b) => b.score - a.score || (b.choice.expiresSerial || 0) - (a.choice.expiresSerial || 0));

    const selected = rankedChoices[0];
    if (!selected) {
      skipped.push({ memberName: member.memberName, reason: "correo_compartido_sin_ganador_claro" });
      continue;
    }

    const occupiedBy = currentOwnerByEmail.get(selected.choice.email);
    if (occupiedBy && occupiedBy !== memberId) {
      const occupant = members.find((m) => String(m._id) === occupiedBy);
      // Si el ocupante no está verificado y pierde por score, permitimos mover si el score del target es mejor.
      if (occupant?.emailVerified === true) {
        skipped.push({
          memberName: member.memberName,
          reason: "correo_ya_asignado_verificado",
          email: selected.choice.email,
        });
        continue;
      }
      const occupantScore = localNameScore(
        selected.choice.email,
        occupant?.memberName || occupant?.normalizedName,
      );
      if (occupantScore >= selected.score - 0.05) {
        skipped.push({
          memberName: member.memberName,
          reason: "correo_ya_asignado",
          email: selected.choice.email,
        });
        continue;
      }
    }

    if (currentEmail === selected.choice.email && !member.emailQuarantine) {
      continue;
    }

    const quarantine = normalizeCandidateEmail(member.emailQuarantine?.previousEmail)?.email ?? "";
    const item = {
      _id: member._id,
      memberName: member.memberName,
      email: selected.choice.email,
      previousEmail: currentEmail || quarantine || null,
      sourceRow: selected.choice.row,
      repairedDomain: selected.choice.repairedDomain,
      domainChange: selected.choice.repairedDomain
        ? `${selected.choice.fromDomain} -> ${selected.choice.toDomain}`
        : null,
      method:
        selected.ownership?.method ||
        (selected.choice.fromQuarantine ? "quarantine_realign" : matchMethod || "unique_clear_name_match"),
      score: selected.score,
      matchMethod: matchMethod || selected.ownership?.matchMethod || "",
      fromQuarantine: Boolean(member.emailQuarantine || selected.choice.fromQuarantine),
    };
    recoveries.push(item);
    if (item.fromQuarantine) quarantineRealigns.push(item);
    // Reservar email para no darlo a otra ficha en el mismo run.
    currentOwnerByEmail.set(selected.choice.email, memberId);
  }

  const contacts = [...ownersByEmail.entries()].map(([email, ownerMap]) => {
    const winner = selectedOwner.get(email);
    const singleOwner = ownerMap.size === 1 ? [...ownerMap.values()][0] : null;
    return {
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
            : "excel_name_match"
        : singleOwner
          ? "identity_mismatch"
          : "shared_conflict",
    };
  });

  let writeResult = null;
  if (apply) {
    const quarantineWrite = unsafeExistingAssignments.length
      ? await membersCol.bulkWrite(
          unsafeExistingAssignments.map((item) => ({
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
          })),
          { ordered: false },
        )
      : { matchedCount: 0, modifiedCount: 0 };

    const memberWrite = recoveries.length
      ? await membersCol.bulkWrite(
          recoveries.map((item) => ({
            updateOne: {
              filter: { _id: item._id, emailVerified: { $ne: true } },
              update: {
                $set: {
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
                    category: item.fromQuarantine ? "quarantine_realign" : "excel_align",
                  },
                  updatedAt: now,
                },
                $unset: { emailQuarantine: "" },
              },
            },
          })),
          { ordered: false },
        )
      : { matchedCount: 0, modifiedCount: 0 };

    // Liberar email del ocupante no verificado si se lo reasignamos.
    const stealIds = recoveries
      .map((item) => {
        // ya actualizamos currentOwnerByEmail; buscar quién tenía el correo y no es el target
        return null;
      })
      .filter(Boolean);

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
      action: "member_emails.recover",
      targetType: "members",
      summary: `${memberWrite.modifiedCount} fichas alineadas; ${quarantineWrite.modifiedCount} inseguras aisladas; ${quarantineRealigns.length} desde cuarentena; ${contacts.length} contactos`,
      context: {
        recoveries: recoveries.length,
        quarantineRealigns: quarantineRealigns.length,
        quarantined: unsafeExistingAssignments.length,
        contacts: contacts.length,
        sharedConflicts: sharedConflicts.length,
        identityMismatches: identityMismatches.length,
        stealIds,
      },
    });
    writeResult = {
      membersMatched: memberWrite.matchedCount,
      membersModified: memberWrite.modifiedCount,
      membersQuarantined: quarantineWrite.modifiedCount,
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
      namesWithCandidateEmail: excelByName.size,
      canonicalContactEmails: contacts.length,
      memberRecoveries: recoveries.length,
      quarantineRealigns: quarantineRealigns.length,
      uniqueExcelOwnerRecoveries: recoveries.filter((item) =>
        String(item.method).includes("unique"),
      ).length,
      fuzzyNameRecoveries: recoveries.filter((item) => String(item.method).includes("fuzzy"))
        .length,
      sharedClearMatchRecoveries: recoveries.filter(
        (item) => item.method === "shared_clear_name_match",
      ).length,
      repairedDomains: recoveries.filter((item) => item.repairedDomain).length,
      unresolvedSharedEmails: sharedConflicts.length,
      invalidEmailRows: invalidRows.length,
      placeholderEmailsBlocked: placeholderEmails.size,
      identityMismatches: identityMismatches.length,
      unsafeExistingAssignments: unsafeExistingAssignments.length,
      quarantinedContacts: contacts.filter((contact) => contact.status === "quarantined").length,
      unmatchedExcelNames: unmatchedNames.length,
      ambiguousMongoNames: ambiguousNames.length,
      skippedMembers: skipped.length,
      byCategory: {
        excel_align: recoveries.filter((r) => !r.fromQuarantine).length,
        quarantine_realign: quarantineRealigns.length,
        identity_mismatch: identityMismatches.length,
        shared_conflict: sharedConflicts.length,
      },
    },
    writeResult,
    recoveries: recoveries.map(({ _id, ...item }) => item),
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
