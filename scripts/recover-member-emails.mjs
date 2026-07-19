/**
 * Recupera correos del estado.xlsx con trazabilidad y sin inventar identidad.
 * Un correo unico por nombre se restaura; uno compartido solo si hay ganador claro.
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
const clean = (value) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
const fold = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CR");
const nameKey = (value) => fold(value).replace(/[^a-z0-9]+/g, " ").trim().toUpperCase();
const nameTokens = (value) => fold(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && token !== "nulo");

const KNOWN_DOMAIN_FIXES = new Map([
  ["gmaill.com", "gmail.com"], ["gamil.com", "gmail.com"],
  ["gmial.com", "gmail.com"], ["gmail.co", "gmail.com"], ["gmail.con", "gmail.com"],
  ["gotmail.com", "hotmail.com"], ["htomail.com", "hotmail.com"],
  ["hotmal.com", "hotmail.com"], ["hotmai.com", "hotmail.com"], ["homail.com", "hotmail.com"],
  ["outlok.com", "outlook.com"], ["outllok.com", "outlook.com"],
  ["!cloud.com", "icloud.com"], ["iclod.com", "icloud.com"], ["yahooo.com", "yahoo.com"],
]);

function normalizeCandidateEmail(value) {
  let raw = clean(value).toLowerCase().replace(/^mailto\s*:/, "").replace(/[<>"']/g, "");
  raw = raw.replace(/\s*@\s*/g, "@").replace(/\s*\.\s*/g, ".").replace(/\s+/g, "");
  if (!raw.includes("@")) {
    raw = raw.replace(/[?\u00bf]/, "@");
    if (!raw.includes("@")) {
      const provider = ["gmail.com", "hotmail.com", "hotmail.es", "outlook.com", "outlook.es", "icloud.com", "yahoo.com"]
        .find((domain) => raw.endsWith(domain) && raw.length > domain.length);
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
  return /^(sin|no|nulo|nada|ningun|ninguno|prueba|test)([._-]?(correo|email|mail|tiene|aplica))?\d*$/i.test(local)
    || /sin(correo|email|mail)/i.test(local)
    || /^(correo|email|mail|sincorreo|nada)\.(com|net)$/i.test(domain)
    || /^(a|x)@(a|x)\./i.test(email);
}

function levenshtein(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = old;
    }
  }
  return row[right.length];
}

function localNameScore(email, memberName) {
  const local = fold(email.split("@")[0]).replace(/[^a-z]/g, "");
  const tokens = nameTokens(memberName);
  if (!local || !tokens.length) return 0;
  const variants = new Set([...tokens, `${tokens[0] ?? ""}${tokens.at(-1) ?? ""}`, tokens.slice(0, 2).join(""), tokens.slice(-2).join(""), tokens.join("")]);
  let best = 0;
  for (const variant of variants) {
    if (!variant) continue;
    const ratio = Math.min(local.length, variant.length) / Math.max(local.length, variant.length);
    if (local.includes(variant) || variant.includes(local)) best = Math.max(best, ratio);
    best = Math.max(best, 1 - levenshtein(local, variant) / Math.max(local.length, variant.length));
  }
  const hits = tokens.filter((token) => local.includes(token)).length;
  if (hits >= 2) best = Math.max(best, 0.96);
  else if (hits === 1) best = Math.max(best, 0.72);
  return Math.round(best * 100) / 100;
}

const excelByName = new Map();
const invalidRows = [];
for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const memberName = clean(`${clean(row.Nombre)} ${clean(row.Apellidos)}`);
  const key = nameKey(memberName);
  const rawEmail = clean(row.Correo);
  if (!key || !rawEmail || /^NULO(?:\s+NULO)?$/.test(key)) continue;
  const candidate = normalizeCandidateEmail(rawEmail);
  if (!candidate) {
    invalidRows.push({ row: index + 3, memberName, value: rawEmail.slice(0, 120) });
    continue;
  }
  const list = excelByName.get(key) ?? [];
  list.push({
    row: index + 3,
    memberName,
    sourceStatus: clean(row.Estado),
    expiresSerial: Number(row["Fecha vence"]) || 0,
    ...candidate,
  });
  excelByName.set(key, list);
}

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15_000, connectTimeoutMS: 15_000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const membersCol = db.collection("xtreme_gym_members");
  const contactsCol = db.collection("xtreme_gym_email_contacts");
  const auditCol = db.collection("xtreme_gym_audit");
  const members = await membersCol.find({}, { projection: { memberName: 1, normalizedName: 1, email: 1, emailVerified: 1, emailQuarantine: 1, emailRecovery: 1 } }).toArray();

  const memberByName = new Map();
  for (const member of members) {
    for (const key of new Set([nameKey(member.normalizedName), nameKey(member.memberName)].filter(Boolean))) {
      const list = memberByName.get(key) ?? [];
      if (!list.some((item) => String(item._id) === String(member._id))) list.push(member);
      memberByName.set(key, list);
    }
  }
  const placeholderEmails = new Set(members
    .filter((member) => member.emailQuarantine?.reason === "placeholder")
    .map((member) => normalizeCandidateEmail(member.emailQuarantine?.previousEmail)?.email).filter(Boolean));

  const candidatesByMember = new Map();
  const ownersByEmail = new Map();
  const unmatchedNames = [];
  const ambiguousNames = [];
  for (const [key, sourceRows] of excelByName) {
    const matches = memberByName.get(key) ?? [];
    if (!matches.length) { unmatchedNames.push({ key, rows: sourceRows.map((row) => row.row) }); continue; }
    if (matches.length !== 1) { ambiguousNames.push({ key, matches: matches.length }); continue; }
    const member = matches[0];
    const unique = new Map();
    for (const row of sourceRows) {
      if (placeholderEmails.has(row.email) || isPlaceholder(row.email)) continue;
      if (!unique.has(row.email) || row.row > unique.get(row.email).row) unique.set(row.email, row);
    }
    const choices = [...unique.values()].sort((left, right) => {
      const expiry = right.expiresSerial - left.expiresSerial;
      if (expiry) return expiry;
      const active = Number(/activo|recuperado/i.test(right.sourceStatus)) - Number(/activo|recuperado/i.test(left.sourceStatus));
      return active || right.row - left.row;
    }).slice(0, 1);
    if (!choices.length) continue;
    candidatesByMember.set(String(member._id), { member, choices });
    for (const choice of choices) {
      const owners = ownersByEmail.get(choice.email) ?? new Map();
      owners.set(String(member._id), { member, source: choice });
      ownersByEmail.set(choice.email, owners);
    }
  }

  const selectedOwner = new Map();
  const sharedConflicts = [];
  const identityMismatches = [];
  for (const [email, ownerMap] of ownersByEmail) {
    const owners = [...ownerMap.values()];
    if (owners.length === 1) {
      const owner = owners[0];
      const score = localNameScore(email, owner.member.memberName);
      const verifiedOwner = owner.member.emailVerified === true && normalizeCandidateEmail(owner.member.email)?.email === email;
      if (verifiedOwner || score >= SAFE_NAME_SCORE) {
        selectedOwner.set(email, { ...owner, method: verifiedOwner ? "verified_current_owner" : "unique_clear_name_match", score });
      } else {
        identityMismatches.push({
          email,
          memberName: owner.member.memberName,
          sourceRow: owner.source.row,
          score,
          reason: "name_email_mismatch",
        });
      }
      continue;
    }
    const verifiedOwners = owners.filter((owner) =>
      owner.member.emailVerified === true && normalizeCandidateEmail(owner.member.email)?.email === email,
    );
    if (verifiedOwners.length === 1) {
      selectedOwner.set(email, { ...verifiedOwners[0], method: "verified_current_owner", score: 1 });
      continue;
    }
    const ranked = owners.map((owner) => ({ ...owner, score: localNameScore(email, owner.member.memberName) })).sort((left, right) => right.score - left.score);
    const margin = ranked[0].score - (ranked[1]?.score ?? 0);
    if (ranked[0].score >= SAFE_NAME_SCORE && margin >= 0.15) selectedOwner.set(email, { ...ranked[0], method: "shared_clear_name_match", margin });
    else sharedConflicts.push({ email, ownerCount: owners.length, bestScore: ranked[0]?.score ?? 0, margin, names: ranked.map((owner) => owner.member.memberName) });
  }

  const currentOwnerByEmail = new Map();
  for (const member of members) {
    const current = normalizeCandidateEmail(member.email)?.email;
    if (current) currentOwnerByEmail.set(current, String(member._id));
  }
  const unsafeExistingAssignments = members.flatMap((member) => {
    const email = normalizeCandidateEmail(member.email)?.email;
    if (!email || member.emailVerified === true || !member.emailRecovery) return [];
    const score = localNameScore(email, member.memberName);
    if (score >= SAFE_NAME_SCORE) return [];
    return [{
      _id: member._id,
      memberName: member.memberName,
      email,
      score,
      sourceRow: member.emailRecovery?.sourceRow ?? null,
      recoveryMethod: member.emailRecovery?.method ?? "",
      reason: "aggressive_name_mismatch",
    }];
  });
  const recoveries = [];
  const skipped = [];
  for (const [memberId, { member, choices }] of candidatesByMember) {
    if (normalizeCandidateEmail(member.email)) {
      skipped.push({
        memberName: member.memberName,
        reason: member.emailVerified === true ? "correo_actual_verificado" : "correo_actual_preservado",
      });
      continue;
    }
    const selected = choices.map((choice) => ({ choice, ownership: selectedOwner.get(choice.email) }))
      .find(({ ownership }) => ownership && String(ownership.member._id) === memberId);
    if (!selected) { skipped.push({ memberName: member.memberName, reason: "correo_compartido_sin_ganador_claro" }); continue; }
    const occupiedBy = currentOwnerByEmail.get(selected.choice.email);
    if (occupiedBy && occupiedBy !== memberId) { skipped.push({ memberName: member.memberName, reason: "correo_ya_asignado", email: selected.choice.email }); continue; }
    const current = normalizeCandidateEmail(member.email)?.email ?? "";
    const quarantine = normalizeCandidateEmail(member.emailQuarantine?.previousEmail)?.email ?? "";
    if (current === selected.choice.email && !member.emailQuarantine) continue;
    recoveries.push({
      _id: member._id, memberName: member.memberName, email: selected.choice.email,
      previousEmail: current || quarantine || null, sourceRow: selected.choice.row,
      repairedDomain: selected.choice.repairedDomain,
      domainChange: selected.choice.repairedDomain ? `${selected.choice.fromDomain} -> ${selected.choice.toDomain}` : null,
      method: selected.ownership.method, score: selected.ownership.score,
    });
  }

  const contacts = [...ownersByEmail.entries()].map(([email, ownerMap]) => {
    const winner = selectedOwner.get(email);
    const singleOwner = ownerMap.size === 1 ? [...ownerMap.values()][0] : null;
    return {
      email,
      name: winner?.member.memberName || singleOwner?.member.memberName || "Socio Xtreme",
      ambiguousOwners: winner ? 0 : ownerMap.size,
      status: winner ? "active" : "quarantined",
      safetyReason: winner ? "name_match" : singleOwner ? "name_email_mismatch" : "shared_without_clear_owner",
      nameScore: winner?.score ?? (singleOwner ? localNameScore(email, singleOwner.member.memberName) : 0),
    };
  });

  let writeResult = null;
  if (apply) {
    const quarantineWrite = unsafeExistingAssignments.length ? await membersCol.bulkWrite(unsafeExistingAssignments.map((item) => ({ updateOne: {
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
    } })), { ordered: false }) : { matchedCount: 0, modifiedCount: 0 };
    const memberWrite = recoveries.length ? await membersCol.bulkWrite(recoveries.map((item) => ({ updateOne: {
      filter: { _id: item._id, emailVerified: { $ne: true } },
      update: { $set: { email: item.email, emailVerified: false, emailRecovery: {
        at: now, source: "scripts/estado.xlsx", sourceRow: item.sourceRow, method: item.method,
        score: item.score, previousEmail: item.previousEmail, domainChange: item.domainChange,
      }, updatedAt: now }, $unset: { emailQuarantine: "" } },
    } })), { ordered: false }) : { matchedCount: 0, modifiedCount: 0 };
    const contactWrite = contacts.length ? await contactsCol.bulkWrite(contacts.map((contact) => ({ updateOne: {
      filter: { email: contact.email },
      update: { $set: { ...contact, source: "scripts/estado.xlsx-recovery", updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true,
    } })), { ordered: false }) : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    await auditCol.insertOne({ at: now, actor: "script:recover-member-emails", action: "member_emails.recover", targetType: "members",
      summary: `${memberWrite.modifiedCount} fichas recuperadas; ${quarantineWrite.modifiedCount} asignaciones inseguras aisladas; ${contacts.length} contactos procesados`,
      context: { recoveries: recoveries.length, quarantined: unsafeExistingAssignments.length, contacts: contacts.length, sharedConflicts: sharedConflicts.length, identityMismatches: identityMismatches.length } });
    writeResult = { membersMatched: memberWrite.matchedCount, membersModified: memberWrite.modifiedCount,
      membersQuarantined: quarantineWrite.modifiedCount, contactsMatched: contactWrite.matchedCount, contactsModified: contactWrite.modifiedCount, contactsInserted: contactWrite.upsertedCount };
  }

  const report = { generatedAt: now.toISOString(), summary: {
    mode: apply ? "apply" : "dry-run", spreadsheetRows: rows.length, namesWithCandidateEmail: excelByName.size,
    canonicalContactEmails: contacts.length, memberRecoveries: recoveries.length,
    uniqueExcelOwnerRecoveries: recoveries.filter((item) => item.method === "unique_clear_name_match").length,
    sharedClearMatchRecoveries: recoveries.filter((item) => item.method === "shared_clear_name_match").length,
    repairedDomains: recoveries.filter((item) => item.repairedDomain).length, unresolvedSharedEmails: sharedConflicts.length,
    repairedContactDomains: [...ownersByEmail.values()].flatMap((owners) => [...owners.values()]).filter((owner) => owner.source.repairedDomain).length,
    invalidEmailRows: invalidRows.length, placeholderEmailsBlocked: placeholderEmails.size,
    identityMismatches: identityMismatches.length, unsafeExistingAssignments: unsafeExistingAssignments.length,
    quarantinedContacts: contacts.filter((contact) => contact.status === "quarantined").length,
    unmatchedExcelNames: unmatchedNames.length, ambiguousMongoNames: ambiguousNames.length, skippedMembers: skipped.length,
  }, writeResult, recoveries: recoveries.map(({ _id, ...item }) => item), unsafeExistingAssignments: unsafeExistingAssignments.map(({ _id, ...item }) => item), identityMismatches, sharedConflicts, invalidRows, unmatchedNames, ambiguousNames, skipped };
  if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report.summary, writeResult }, null, 2));
} finally {
  await client.close();
}
