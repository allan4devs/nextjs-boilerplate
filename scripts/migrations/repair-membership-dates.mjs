/**
 * Repara la relación último pago -> próximo cobro en membresías existentes.
 *
 * Prioridad de evidencia:
 * 1. último cobro completado en xtreme_gym_payments;
 * 2. membership.lastPaidAt ya registrado;
 * 3. vencimiento de Latinsoft + tarifa, para inferir el pago anterior.
 *
 * Sin --apply solo reporta. No modifica precios, contactos, planes ni updatedAt.
 */
import { writeFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const args = process.argv.slice(2);
const apply = args.includes("--apply");

function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
}

const reportPath = argValue("--report");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");

const now = new Date();
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Costa_Rica",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(now);

function isoDate(value) {
  const raw = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw ? "" : raw;
}

function normalized(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es-CR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function billingPeriod({ optionId, planLabel, canonicalRate }) {
  const text = `${normalized(optionId)} ${normalized(planLabel)} ${normalized(canonicalRate)}`;
  if (/matricul|primer dia|gratis|free|sin plan|pase del dia|pase dia|day-pass|diari/.test(text)) {
    return null;
  }
  if (/trimes|quarter/.test(text)) return { unit: "months", count: 3 };
  if (/quincen|fortnight/.test(text)) return { unit: "days", count: 15 };
  if (/seman|week/.test(text)) return { unit: "days", count: 7 };
  if (/mensual|month|adultos? mayores?|senior|regular/.test(text)) {
    return { unit: "months", count: 1 };
  }
  return null;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addCalendarMonths(date, months) {
  const next = new Date(date);
  const originalDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const targetMonthEnd = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(originalDay, targetMonthEnd));
  return next;
}

function moveDate(dateIso, period, direction) {
  const date = isoDate(dateIso);
  if (!date || !period) return "";
  const base = new Date(`${date}T00:00:00.000Z`);
  const moved = period.unit === "months"
    ? addCalendarMonths(base, period.count * direction)
    : addDays(base, period.count * direction);
  return moved.toISOString().slice(0, 10);
}

function statusFor(nextBillingDate) {
  const days = Math.round(
    (Date.parse(`${nextBillingDate}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) /
      86_400_000,
  );
  return days < 0 ? "expired" : days <= 5 ? "warning" : "active";
}

const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 15_000,
});

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const membersCollection = db.collection("xtreme_gym_members");
  const paymentsCollection = db.collection("xtreme_gym_payments");

  const [members, payments] = await Promise.all([
    membersCollection
      .find(
        { seeded: { $ne: true }, membership: { $exists: true } },
        {
          projection: {
            memberName: 1,
            normalizedName: 1,
            membership: 1,
            "legacyImport.canonicalRate": 1,
          },
        },
      )
      .toArray(),
    paymentsCollection
      .find(
        { status: "completed" },
        {
          projection: {
            normalizedName: 1,
            date: 1,
            createdAt: 1,
            optionId: 1,
            optionLabel: 1,
            category: 1,
          },
        },
      )
      .sort({ date: -1, createdAt: -1 })
      .toArray(),
  ]);

  const latestRecurringPayment = new Map();
  for (const payment of payments) {
    const key = String(payment.normalizedName ?? "").trim();
    const period = billingPeriod({
      optionId: payment.optionId,
      planLabel: payment.optionLabel,
    });
    if (!key || !period || !isoDate(payment.date) || latestRecurringPayment.has(key)) continue;
    latestRecurringPayment.set(key, { payment, period });
  }

  const changes = [];
  const skipped = [];
  const sources = { payment: 0, storedLastPaidAt: 0, inferredFromExpiry: 0 };
  let repairedStartedAt = 0;

  for (const member of members) {
    const membership = member.membership ?? {};
    const key = String(member.normalizedName ?? "").trim();
    const paymentEvidence = latestRecurringPayment.get(key);
    const memberPeriod = billingPeriod({
      planLabel: membership.plan,
      canonicalRate: member.legacyImport?.canonicalRate,
    });
    const period = paymentEvidence?.period ?? memberPeriod;
    const storedLastPaidAt = isoDate(membership.lastPaidAt);
    const storedNextBillingDate = isoDate(membership.nextBillingDate);

    let source = "";
    let lastPaidAt = "";
    let nextBillingDate = "";

    if (paymentEvidence) {
      source = "payment";
      lastPaidAt = isoDate(paymentEvidence.payment.date);
      nextBillingDate = moveDate(lastPaidAt, period, 1);
    } else if (storedLastPaidAt && period) {
      source = "storedLastPaidAt";
      lastPaidAt = storedLastPaidAt;
      // Un vencimiento importado puede caer en un día que el mes anterior no tiene
      // (30 mar -> 29 feb). Si al retroceder recupera el pago guardado, el par es válido.
      nextBillingDate =
        storedNextBillingDate && moveDate(storedNextBillingDate, period, -1) === lastPaidAt
          ? storedNextBillingDate
          : moveDate(lastPaidAt, period, 1);
    } else if (storedNextBillingDate && period) {
      source = "inferredFromExpiry";
      nextBillingDate = storedNextBillingDate;
      lastPaidAt = moveDate(nextBillingDate, period, -1);
    }

    if (!source || !lastPaidAt || !nextBillingDate || nextBillingDate <= lastPaidAt) {
      skipped.push({
        name: member.memberName,
        plan: membership.plan ?? "",
        rate: member.legacyImport?.canonicalRate ?? "",
        reason: !period ? "periodo no deducible" : "faltan fechas confiables",
      });
      continue;
    }

    sources[source] += 1;
    const rawStartedAt = String(membership.startedAt ?? "");
    let startedAt = isoDate(rawStartedAt);
    if (!startedAt || startedAt > nextBillingDate) {
      startedAt = lastPaidAt;
      repairedStartedAt += 1;
    }
    const status = statusFor(nextBillingDate);
    const before = {
      lastPaidAt: String(membership.lastPaidAt ?? ""),
      nextBillingDate: String(membership.nextBillingDate ?? ""),
      startedAt: rawStartedAt,
      status: String(membership.status ?? ""),
    };
    const after = { lastPaidAt, nextBillingDate, startedAt, status };
    if (Object.keys(after).every((field) => before[field] === after[field])) continue;

    changes.push({
      id: member._id,
      name: member.memberName,
      normalizedName: key,
      source,
      before,
      after,
    });
  }

  let writeResult = null;
  if (apply && changes.length) {
    const result = await membersCollection.bulkWrite(
      changes.map((change) => ({
        updateOne: {
          filter: { _id: change.id, normalizedName: change.normalizedName },
          update: {
            $set: {
              "membership.lastPaidAt": change.after.lastPaidAt,
              "membership.nextBillingDate": change.after.nextBillingDate,
              "membership.startedAt": change.after.startedAt,
              "membership.status": change.after.status,
            },
          },
        },
      })),
      { ordered: false },
    );
    writeResult = { matched: result.matchedCount, modified: result.modifiedCount };

    await db.collection("xtreme_gym_audit").insertOne({
      id: `aud-${now.getTime()}-membership-dates`,
      at: now,
      actorRole: "super",
      actorName: "Migración de fechas",
      action: "membership.repair_dates",
      targetType: "system",
      targetId: "xtreme_gym_members",
      summary: `Fechas de membresía reparadas: ${result.modifiedCount} socios.`,
      meta: { sources, repairedStartedAt, skipped: skipped.length },
    });
  }

  const summary = {
    mode: apply ? "apply" : "dry-run",
    today,
    membersReviewed: members.length,
    changesNeeded: changes.length,
    sources,
    repairedStartedAt,
    skipped: skipped.length,
    writeResult,
  };
  const report = {
    generatedAt: now.toISOString(),
    summary,
    changes: changes.map(({ id: _id, normalizedName: _key, ...change }) => change),
    skipped,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (reportPath) {
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`Reporte: ${reportPath}`);
  }
} finally {
  await client.close();
}
