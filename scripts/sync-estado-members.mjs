/**
 * Sincroniza plan, tarifa, estado histórico, fecha de vencimiento y cédula
 * desde estado.xlsx hacia socios que YA existen en Mongo. No crea socios ni
 * modifica correos: el Excel tiene placeholders y correos cruzados.
 *
 * El Excel usa Plan = "Regular" / "Regular1" / "Adulto Mayor" (tipo de cliente)
 * y "x Tarifa" = Semanal / Quincenal / Mensual / Diario. Aquí se normaliza a
 * las etiquetas del Member OS (Xtreme Semanal/Quincenal/Mensual, etc.).
 */
import { readFile, writeFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const args = process.argv.slice(2);

function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
}

const inputPath = argValue("--input");
const reportPath = argValue("--report");
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
  return clean(value).normalize("NFC").toLocaleUpperCase("es-CR");
}

function digits(value, max = 20) {
  return clean(value).replace(/\D/g, "").slice(0, max);
}

function normalizeText(value) {
  return clean(value)
    .toLocaleLowerCase("es-CR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function excelDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 1) return "";
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000);
  const year = date.getUTCFullYear();
  if (year < 1920 || year > now.getUTCFullYear() + 5) return "";
  return date.toISOString().slice(0, 10);
}

function membershipStatus(nextBillingDate) {
  const daysRemaining = Math.ceil(
    (Date.parse(`${nextBillingDate}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) /
      86_400_000,
  );
  const status = daysRemaining < 0 ? "expired" : daysRemaining <= 5 ? "warning" : "active";
  return { daysRemaining, status };
}

/**
 * Mapea Plan + x Tarifa del Excel → etiqueta del Member OS / admin.
 * Prioridad: Adulto Mayor → tarifa (semanal/quincenal/mensual/diario) → default mensual en Regular*.
 */
function mapCanonicalPlan(excelPlan, rate) {
  const p = normalizeText(excelPlan);
  const r = normalizeText(rate);

  if (p.includes("adulto") || p.includes("senior")) return "Clase adultos mayores";
  if (r.includes("seman") || r.includes("week")) return "Xtreme Semanal";
  if (r.includes("quincen") || r.includes("fortnight")) return "Xtreme Quincenal";
  if (r.includes("mensual") || r.includes("month")) return "Xtreme Mensual";
  if (r.includes("diari") || r.includes("day pass") || r === "day") return "Pase del día";
  if (r.includes("matricula")) return "Matrícula";
  // Sin tarifa legible: Regular / Regular1 → mensual (mayoría del histórico).
  if (p.includes("regular")) return "Xtreme Mensual";
  if (excelPlan) return excelPlan;
  return "Xtreme Mensual";
}

function isJunkName(key) {
  return !key || /^NULO(?:\s+NULO)?$/.test(key) || /^PRUEBA(?:\s+\d+)?$/.test(key);
}

const excelGroups = new Map();
for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const memberName = clean(`${clean(row.Nombre)} ${clean(row.Apellidos)}`);
  const key = normalizedName(memberName);
  if (isJunkName(key)) continue;

  const item = {
    rowNumber: index + 3,
    memberName,
    sourceStatus: clean(row.Estado),
    plan: clean(row.Plan),
    rate: clean(row["x Tarifa"]),
    cedula: digits(row.Cedula),
    expiresOn: excelDate(row["Fecha vence"]),
  };
  const group = excelGroups.get(key) ?? [];
  group.push(item);
  excelGroups.set(key, group);
}

function chooseCanonical(group) {
  return [...group].sort((left, right) => {
    const expiry = right.expiresOn.localeCompare(left.expiresOn);
    if (expiry) return expiry;
    const active = Number(/activo|recuperado/i.test(right.sourceStatus)) -
      Number(/activo|recuperado/i.test(left.sourceStatus));
    return active || right.rowNumber - left.rowNumber;
  })[0];
}

const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 15_000,
});

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const collection = db.collection("xtreme_gym_members");
  const members = await collection
    .find({}, { projection: { memberName: 1, normalizedName: 1, cedula: 1, membership: 1, legacyImport: 1 } })
    .toArray();

  const mongoByName = new Map();
  for (const member of members) {
    const keys = new Set([
      normalizedName(member.normalizedName),
      normalizedName(member.memberName),
    ].filter(Boolean));
    for (const key of keys) {
      const list = mongoByName.get(key) ?? [];
      if (!list.some((candidate) => String(candidate._id) === String(member._id))) list.push(member);
      mongoByName.set(key, list);
    }
  }

  const changes = [];
  const unmatchedExcel = [];
  const ambiguousMongo = [];
  const invalidExcel = [];
  const conflictingCedulas = [];

  for (const [key, group] of excelGroups) {
    const canonical = chooseCanonical(group);
    if (!canonical.plan || !canonical.expiresOn) {
      invalidExcel.push({ name: canonical.memberName, row: canonical.rowNumber, reason: !canonical.plan ? "sin plan" : "fecha de vencimiento invalida" });
      continue;
    }

    const hits = mongoByName.get(key) ?? [];
    if (!hits.length) {
      unmatchedExcel.push({ name: canonical.memberName, row: canonical.rowNumber });
      continue;
    }
    if (hits.length !== 1) {
      ambiguousMongo.push({ name: canonical.memberName, row: canonical.rowNumber, mongoMatches: hits.length });
      continue;
    }

    const cedulas = [...new Set(group.map((item) => item.cedula).filter(Boolean))];
    let cedula = canonical.cedula;
    if (!cedula && cedulas.length === 1) cedula = cedulas[0];
    if (cedulas.length > 1) {
      conflictingCedulas.push({ name: canonical.memberName, rows: group.map((item) => item.rowNumber) });
    }

    const member = hits[0];
    const rate = canonical.rate || group.find((item) => item.rate)?.rate || "";
    const mappedPlan = mapCanonicalPlan(canonical.plan, rate);
    const { daysRemaining, status } = membershipStatus(canonical.expiresOn);
    const startedAt =
      clean(member.membership?.startedAt) ||
      (daysRemaining >= 0 ? today : canonical.expiresOn);
    const set = {
      "membership.plan": mappedPlan,
      "membership.nextBillingDate": canonical.expiresOn,
      "membership.status": status,
      "membership.startedAt": startedAt,
      "legacyImport.source": "scripts/estado.xlsx",
      "legacyImport.canonicalSourceStatus": canonical.sourceStatus,
      "legacyImport.canonicalRate": rate,
      "legacyImport.canonicalExcelPlan": canonical.plan,
      "legacyImport.rowCount": group.length,
      updatedAt: now,
    };
    if (cedula) set.cedula = cedula;

    const before = {
      plan: clean(member.membership?.plan),
      expiresOn: clean(member.membership?.nextBillingDate),
      cedula: digits(member.cedula),
      rate: clean(member.legacyImport?.canonicalRate),
      sourceStatus: clean(member.legacyImport?.canonicalSourceStatus),
      excelPlan: clean(member.legacyImport?.canonicalExcelPlan),
    };
    const after = {
      plan: mappedPlan,
      expiresOn: canonical.expiresOn,
      cedula: cedula || before.cedula,
      rate,
      sourceStatus: canonical.sourceStatus,
      excelPlan: canonical.plan,
    };
    const changed = before.plan !== after.plan ||
      before.expiresOn !== after.expiresOn ||
      before.cedula !== after.cedula ||
      before.rate !== after.rate ||
      before.sourceStatus !== after.sourceStatus ||
      before.excelPlan !== after.excelPlan;
    changes.push({
      _id: member._id,
      key: normalizedName(member.normalizedName) || key,
      name: member.memberName || canonical.memberName,
      sourceRow: canonical.rowNumber,
      sourceStatus: canonical.sourceStatus,
      daysRemaining,
      status,
      before,
      after,
      changed,
      set,
    });
  }

  const changed = changes.filter((item) => item.changed);
  const activeMapped = changes.filter((item) => item.daysRemaining >= 0);
  const planBuckets = { week: 0, fortnight: 0, month: 0, senior: 0, other: 0 };
  for (const item of activeMapped) {
    const plan = normalizeText(item.after.plan);
    if (plan.includes("seman")) planBuckets.week += 1;
    else if (plan.includes("quincen")) planBuckets.fortnight += 1;
    else if (plan.includes("mensual") || plan.includes("month")) planBuckets.month += 1;
    else if (plan.includes("adulto") || plan.includes("senior")) planBuckets.senior += 1;
    else planBuckets.other += 1;
  }
  const summary = {
    mode: apply ? "apply" : "dry-run",
    spreadsheetRows: rows.length,
    spreadsheetNames: excelGroups.size,
    mongoMembers: members.length,
    exactNameMatches: changes.length,
    changesNeeded: changed.length,
    alreadyAligned: changes.length - changed.length,
    activePlansMapped: activeMapped.length,
    activePlanBuckets: planBuckets,
    unmatchedExcelNames: unmatchedExcel.length,
    ambiguousMongoMatches: ambiguousMongo.length,
    invalidExcelRows: invalidExcel.length,
    conflictingExcelCedulas: conflictingCedulas.length,
  };

  let writeResult = null;
  if (apply && changed.length) {
    const result = await collection.bulkWrite(
      changed.map((item) => ({
        updateOne: {
          filter: { _id: item._id, normalizedName: item.key },
          update: { $set: item.set },
          upsert: false,
        },
      })),
      { ordered: false },
    );
    writeResult = { matched: result.matchedCount, modified: result.modifiedCount };
  }

  const report = {
    generatedAt: now.toISOString(),
    summary,
    writeResult,
    changes: changed.map(({ _id, key, set, before, after, ...item }) => ({
      ...item,
      before: {
        plan: before.plan,
        expiresOn: before.expiresOn,
        rate: before.rate,
        sourceStatus: before.sourceStatus,
        excelPlan: before.excelPlan,
      },
      after: {
        plan: after.plan,
        expiresOn: after.expiresOn,
        rate: after.rate,
        sourceStatus: after.sourceStatus,
        excelPlan: after.excelPlan,
      },
      cedulaChanged: before.cedula !== after.cedula,
    })),
    unmatchedExcel,
    ambiguousMongo,
    invalidExcel,
    conflictingCedulas,
  };
  console.log(JSON.stringify({ ...summary, writeResult }, null, 2));
  if (reportPath) {
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`Reporte: ${reportPath}`);
  }
  if (!apply) console.log("Vista previa solamente. Use -Apply para escribir en MongoDB.");
} finally {
  await client.close();
}
