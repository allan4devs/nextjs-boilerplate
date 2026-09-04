/**
 * Aplica los "movimientos" del export de Latinsoft (Total Estado Socios *.xlsx)
 * sobre los socios que YA existen en Mongo, y crea los pocos que faltan.
 *
 * Qué hace:
 *  1. RENOVACIONES: socios cuyo "Fecha vence" del Excel está por delante del
 *     membership.nextBillingDate de Mongo. Se actualiza plan / vencimiento /
 *     estado / startedAt / lastPaidAt. Si el "Costo" del Excel es > 0 se
 *     siembra además un pago (PaymentDoc, recordedBy:"seed", method:"other").
 *  2. NUEVOS: socios presentes en el Excel pero sin doc en Mongo (por nombre ni
 *     cédula) se crean con su membresía y, si aplica, su pago.
 *
 * Qué NO hace:
 *  - No degrada a nadie: si Mongo ya está por delante del Excel (regressed) se
 *    deja intacto y solo se reporta.
 *  - No toca correos existentes ni usa el placeholder "clientesincorreo".
 *
 * Idempotente: los pagos se upsertean por un id determinístico
 * (pay-seed-<slug>-<vence>) y los nuevos socios por normalizedName, así que
 * re-correr no duplica nada.
 *
 * Uso:
 *   node --env-file=.env scripts/excel/seed-latinsoft-movements.mjs \
 *     --workbook "C:/.../Total Estado Socios (8).xlsx" --report scripts/excel/latinsoft-movements-report.json
 *   (agregar --apply para escribir en Mongo; sin --apply es vista previa)
 */
import { readFile, writeFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { MongoClient } from "mongodb";

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : "";
};
const workbookPath = argValue("--workbook");
const reportPath = argValue("--report");
const apply = args.includes("--apply");
const noPayments = args.includes("--no-payments");

if (!workbookPath) throw new Error("Falta --workbook con la ruta al .xlsx.");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");

const now = new Date();
const today = now.toISOString().slice(0, 10);

const clean = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
const norm = (v) => clean(v).normalize("NFC").toLocaleUpperCase("es-CR");
const digits = (v, max = 20) => clean(v).replace(/\D/g, "").slice(0, max);
const normText = (v) =>
  clean(v).toLocaleLowerCase("es-CR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const slug = (v) =>
  normText(v).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** Excel entrega Date (celda de fecha) o serial numérico o texto ISO. */
function isoDate(value) {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    if (y < 1920 || y > now.getUTCFullYear() + 15) return "";
    return value.toISOString().slice(0, 10);
  }
  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 1) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000);
    const y = d.getUTCFullYear();
    if (y < 1920 || y > now.getUTCFullYear() + 15) return "";
    return d.toISOString().slice(0, 10);
  }
  const s = clean(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const y = Number(m[1]);
  if (y < 1920 || y > now.getUTCFullYear() + 15) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function membershipStatus(vence) {
  const days = Math.ceil(
    (Date.parse(`${vence}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) / 86_400_000,
  );
  return { days, status: days < 0 ? "expired" : days <= 5 ? "warning" : "active" };
}

/** rate del Excel → bucket de plan (id, etiqueta canónica, días del período). */
function planFor(excelPlan, rate) {
  const p = normText(excelPlan);
  const r = normText(rate);
  if (p.includes("adulto") || p.includes("senior"))
    return { id: "senior", label: "Clase adultos mayores", days: 30 };
  if (r.includes("seman") || r.includes("week")) return { id: "week", label: "Xtreme Semanal", days: 7 };
  if (r.includes("quincen")) return { id: "fortnight", label: "Xtreme Quincenal", days: 15 };
  if (r.includes("mensual") || r.includes("month")) return { id: "month", label: "Xtreme Mensual", days: 30 };
  if (r.includes("diari") || r.includes("day")) return { id: "day-pass", label: "Pase del día", days: 0 };
  if (p.includes("regular")) return { id: "month", label: "Xtreme Mensual", days: 30 };
  return { id: "month", label: excelPlan || "Xtreme Mensual", days: 30 };
}

const isJunk = (k) => !k || /^NULO(?:\s+NULO)?$/.test(k) || /^PRUEBA(?:\s+\d+)?$/.test(k);
const isPlaceholderEmail = (e) =>
  !e || /clientesincorreo|sincorreo|noemail|no-email/i.test(e) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

// ---- leer Excel ----
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(workbookPath);
const ws = wb.worksheets[0];
const H = {};
ws.getRow(2).eachCell((c, i) => {
  H[clean(c.value)] = i;
});
for (const req of ["Estado", "Nombre", "Apellidos", "Plan", "Cedula", "Fecha vence", "x Tarifa", "Costo"]) {
  if (!H[req]) throw new Error(`Falta la columna requerida: ${req}`);
}
const cell = (row, name) => (H[name] ? row.getCell(H[name]).value : null);

const groups = new Map();
for (let r = 3; r <= ws.rowCount; r += 1) {
  const row = ws.getRow(r);
  const name = clean(`${clean(cell(row, "Nombre"))} ${clean(cell(row, "Apellidos"))}`);
  const key = norm(name);
  if (isJunk(key)) continue;
  const item = {
    row: r,
    name,
    key,
    estado: clean(cell(row, "Estado")),
    plan: clean(cell(row, "Plan")),
    rate: clean(cell(row, "x Tarifa")),
    cedula: digits(cell(row, "Cedula")),
    ingreso: isoDate(cell(row, "Fecha Ingreso")),
    vence: isoDate(cell(row, "Fecha vence")),
    costo: Math.round(Number(cell(row, "Costo")) || 0),
    phone: digits(cell(row, "Telefono1"), 40),
    email: clean(cell(row, "Correo")),
  };
  const g = groups.get(key) ?? [];
  g.push(item);
  groups.set(key, g);
}
const chooseCanon = (g) =>
  [...g].sort((a, b) => b.vence.localeCompare(a.vence) || b.row - a.row)[0];

// ---- leer Mongo ----
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20_000,
  connectTimeoutMS: 20_000,
});
await client.connect();
const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
const Members = db.collection("xtreme_gym_members");
const Payments = db.collection("xtreme_gym_payments");

try {
  const members = await Members.find(
    {},
    { projection: { memberName: 1, normalizedName: 1, cedula: 1, membership: 1 } },
  ).toArray();

  const byName = new Map();
  const byCed = new Map();
  for (const m of members) {
    for (const k of new Set([norm(m.normalizedName), norm(m.memberName)].filter(Boolean))) {
      const l = byName.get(k) ?? [];
      if (!l.some((x) => String(x._id) === String(m._id))) l.push(m);
      byName.set(k, l);
    }
    const cd = digits(m.cedula);
    if (cd) {
      const l = byCed.get(cd) ?? [];
      if (!l.some((x) => String(x._id) === String(m._id))) l.push(m);
      byCed.set(cd, l);
    }
  }

  const membershipUpdates = []; // { _id, key, name, set, before, after, seedPayment? }
  const newMembers = []; // { doc, seedPayment? }
  const paymentsToSeed = []; // PaymentDoc-ish
  const report = { renewed: [], created: [], regressed: [], aligned: 0, ambiguous: [], invalid: [] };

  function buildPayment(memberName, normalizedName, phone, email, plan, canon) {
    const date = plan.days > 0
      ? new Date(Date.parse(`${canon.vence}T00:00:00.000Z`) - plan.days * 86_400_000)
          .toISOString().slice(0, 10)
      : canon.vence;
    return {
      id: `pay-seed-${slug(normalizedName)}-${canon.vence}`,
      memberName,
      normalizedName,
      customerName: memberName,
      phone: String(phone ?? "").slice(0, 40),
      email: isPlaceholderEmail(email) ? "" : String(email).slice(0, 80),
      optionId: plan.id,
      optionLabel: plan.label,
      category: "Plan",
      amountCrc: canon.costo,
      amountUsd: Math.round((canon.costo / 500) * 100) / 100,
      currency: "CRC",
      method: "other",
      status: "completed",
      paypalOrderId: null,
      paypalCaptureId: null,
      note: `Importado de Latinsoft (Total Estado Socios, ${today}).`,
      date,
      createdAt: now,
      recordedBy: "seed",
      recordedByStaffId: null,
      recordedByStaffName: null,
    };
  }

  for (const [key, g] of groups) {
    const canon = chooseCanon(g);
    let hits = byName.get(key) ?? [];
    if (!hits.length && canon.cedula) hits = byCed.get(canon.cedula) ?? [];

    // Fecha vence inservible (placeholder 1900 / vacía): a los socios YA en Mongo
    // no se les toca; los que no existen se crean como prospecto sin membresía.
    if (!canon.vence && hits.length) {
      report.invalid.push({ name: canon.name, row: canon.row, estado: canon.estado });
      continue;
    }

    const plan = planFor(canon.plan, canon.rate);
    const { status } = canon.vence ? membershipStatus(canon.vence) : { status: "expired" };

    // --- socio nuevo ---
    if (!hits.length) {
      const membership =
        !canon.vence || (status === "expired" && Number(canon.vence.slice(0, 4)) < 2020)
          ? { plan: plan.label, status: "expired" }
          : {
              plan: plan.label,
              nextBillingDate: canon.vence,
              status,
              startedAt: canon.ingreso || canon.vence,
              lastPaidAt: plan.days > 0
                ? new Date(Date.parse(`${canon.vence}T00:00:00.000Z`) - plan.days * 86_400_000)
                    .toISOString().slice(0, 10)
                : canon.vence,
            };
      const doc = {
        memberName: canon.name,
        normalizedName: key,
        cedula: canon.cedula || "",
        phone: canon.phone || "",
        email: isPlaceholderEmail(canon.email) ? "" : canon.email,
        membership,
        seeded: true,
        legacyImport: {
          source: "latinsoft:Total Estado Socios",
          importedAt: now,
          canonicalSourceStatus: canon.estado,
          canonicalRate: canon.rate,
          canonicalExcelPlan: canon.plan,
          rowCount: g.length,
        },
        createdAt: now,
        updatedAt: now,
      };
      const seedPayment =
        !noPayments && canon.costo > 0 && membership.nextBillingDate
          ? buildPayment(canon.name, key, canon.phone, canon.email, plan, canon)
          : null;
      newMembers.push({ doc, seedPayment });
      if (seedPayment) paymentsToSeed.push(seedPayment);
      report.created.push({
        name: canon.name, cedula: canon.cedula, estado: canon.estado,
        vence: canon.vence, plan: plan.label, costo: canon.costo, payment: Boolean(seedPayment),
      });
      continue;
    }

    if (hits.length > 1) {
      report.ambiguous.push({ name: canon.name, row: canon.row, matches: hits.length });
      continue;
    }

    const m = hits[0];
    const mongoVence = clean(m.membership?.nextBillingDate);
    if (mongoVence && canon.vence <= mongoVence) {
      if (canon.vence === mongoVence) report.aligned += 1;
      else report.regressed.push({ name: canon.name, mongoVence, excelVence: canon.vence });
      continue;
    }

    // --- renovación ---
    const lastPaidAt = plan.days > 0
      ? new Date(Date.parse(`${canon.vence}T00:00:00.000Z`) - plan.days * 86_400_000)
          .toISOString().slice(0, 10)
      : canon.vence;
    const set = {
      "membership.plan": plan.label,
      "membership.nextBillingDate": canon.vence,
      "membership.status": status,
      "membership.startedAt": clean(m.membership?.startedAt) || canon.ingreso || canon.vence,
      "membership.lastPaidAt": lastPaidAt,
      "legacyImport.source": "latinsoft:Total Estado Socios",
      "legacyImport.importedAt": now,
      "legacyImport.canonicalSourceStatus": canon.estado,
      "legacyImport.canonicalRate": canon.rate,
      "legacyImport.canonicalExcelPlan": canon.plan,
      updatedAt: now,
    };
    if (canon.cedula && !digits(m.cedula)) set.cedula = canon.cedula;

    const seedPayment =
      !noPayments && canon.costo > 0
        ? buildPayment(m.memberName || canon.name, m.normalizedName || key, canon.phone, canon.email, plan, canon)
        : null;
    if (seedPayment) paymentsToSeed.push(seedPayment);

    membershipUpdates.push({ _id: m._id, key: norm(m.normalizedName) || key, set });
    report.renewed.push({
      name: m.memberName || canon.name,
      mongoVence: mongoVence || "(none)",
      excelVence: canon.vence,
      plan: plan.label,
      costo: canon.costo,
      payment: Boolean(seedPayment),
      estado: canon.estado,
    });
  }

  const summary = {
    mode: apply ? "APPLY" : "dry-run",
    workbook: workbookPath,
    excelNames: groups.size,
    mongoMembers: members.length,
    renewed: membershipUpdates.length,
    newMembers: newMembers.length,
    paymentsToSeed: paymentsToSeed.length,
    aligned: report.aligned,
    regressed: report.regressed.length,
    ambiguous: report.ambiguous.length,
    invalidExcelRows: report.invalid.length,
  };

  let writeResult = null;
  if (apply) {
    const membersWrites = [];
    for (const u of membershipUpdates) {
      membersWrites.push({
        updateOne: { filter: { _id: u._id, normalizedName: u.key }, update: { $set: u.set }, upsert: false },
      });
    }
    for (const nm of newMembers) {
      membersWrites.push({
        updateOne: {
          filter: { normalizedName: nm.doc.normalizedName },
          update: { $setOnInsert: nm.doc },
          upsert: true,
        },
      });
    }
    const mRes = membersWrites.length
      ? await Members.bulkWrite(membersWrites, { ordered: false })
      : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };

    let pRes = { upsertedCount: 0, matchedCount: 0 };
    if (paymentsToSeed.length) {
      const r = await Payments.bulkWrite(
        paymentsToSeed.map((p) => ({
          updateOne: { filter: { id: p.id }, update: { $setOnInsert: p }, upsert: true },
        })),
        { ordered: false },
      );
      pRes = { upsertedCount: r.upsertedCount, matchedCount: r.matchedCount };
    }
    writeResult = {
      membersMatched: mRes.matchedCount,
      membersModified: mRes.modifiedCount,
      membersCreated: mRes.upsertedCount,
      paymentsInserted: pRes.upsertedCount,
      paymentsAlreadyPresent: pRes.matchedCount,
    };
  }

  console.log(JSON.stringify({ ...summary, writeResult }, null, 2));
  if (reportPath) {
    await writeFile(
      reportPath,
      JSON.stringify({ generatedAt: now.toISOString(), summary, writeResult, ...report }, null, 2),
      "utf8",
    );
    console.log(`Reporte: ${reportPath}`);
  }
  if (!apply) console.log("Vista previa solamente. Agregá --apply para escribir en MongoDB.");
} finally {
  await client.close();
}
