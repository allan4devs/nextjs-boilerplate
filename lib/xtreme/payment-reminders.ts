import type { Db } from "mongodb";
import {
  AUDIT_COLLECTION,
  PAYMENT_REMINDERS_COLLECTION,
  normalizeKey,
  type AuditDoc,
} from "./shared";

export const PAYMENT_REMINDER_AUDIT_ACTION = "member.payment_reminder";

type ReminderMember = {
  normalizedName: string;
  lastPaidAt: string;
  nextBillingDate: string;
};

type PaymentReminderMarker = {
  _id: string;
  memberKey: string;
  nextBillingDate: string;
  lastPaidAt: string;
  email: string;
  status: "sending" | "sent";
  createdAt: Date;
  sentAt?: Date;
  createdBy?: string | null;
  importedFromAudit?: boolean;
};

export type PaymentReminderState = {
  sent: true;
  sentAt: string;
};

export type PaymentReminderReservation =
  | { ok: true; id: string }
  | { ok: false; sentAt: string | null };

function markerId(memberKey: string, nextBillingDate: string) {
  return `${normalizeKey(memberKey)}:${nextBillingDate || "sin-vencimiento"}`;
}

function cycleStart(lastPaidAt: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastPaidAt)) return null;
  const value = new Date(`${lastPaidAt}T00:00:00.000Z`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function auditMatchesCycle(audit: AuditDoc, member: ReminderMember) {
  const recordedBillingDate = audit.meta?.nextBillingDate;
  if (typeof recordedBillingDate === "string") {
    return recordedBillingDate === member.nextBillingDate;
  }

  // Los recordatorios anteriores a este cambio no guardaban el vencimiento.
  // Se consideran del ciclo actual solo si ocurrieron desde el último pago.
  const startedAt = cycleStart(member.lastPaidAt);
  return startedAt ? audit.at >= startedAt : true;
}

function iso(value?: Date | null) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
}

function isDuplicateKey(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000,
  );
}

async function currentLegacyAudit(db: Db, member: ReminderMember) {
  const key = normalizeKey(member.normalizedName);
  const audits = await db
    .collection<AuditDoc>(AUDIT_COLLECTION)
    .find({ action: PAYMENT_REMINDER_AUDIT_ACTION, targetId: key })
    .sort({ at: -1 })
    .limit(20)
    .toArray();
  return audits.find((audit) => auditMatchesCycle(audit, member)) ?? null;
}

/**
 * Estado de recordatorio del ciclo vigente. Lee también la bitácora histórica
 * para respetar correos enviados antes de que existieran marcadores idempotentes.
 */
export async function listPaymentReminderStates(db: Db, members: ReminderMember[]) {
  const uniqueMembers = [...new Map(members.map((member) => [normalizeKey(member.normalizedName), member])).values()];
  const keys = uniqueMembers.map((member) => normalizeKey(member.normalizedName));
  const ids = uniqueMembers.map((member) => markerId(member.normalizedName, member.nextBillingDate));
  const [markers, audits] = await Promise.all([
    ids.length
      ? db
          .collection<PaymentReminderMarker>(PAYMENT_REMINDERS_COLLECTION)
          .find({ _id: { $in: ids } })
          .toArray()
      : Promise.resolve([]),
    keys.length
      ? db
          .collection<AuditDoc>(AUDIT_COLLECTION)
          .find({ action: PAYMENT_REMINDER_AUDIT_ACTION, targetId: { $in: keys } })
          .sort({ at: -1 })
          .toArray()
      : Promise.resolve([]),
  ]);

  const markerById = new Map(markers.map((marker) => [marker._id, marker]));
  const auditsByMember = new Map<string, AuditDoc[]>();
  for (const audit of audits) {
    const rows = auditsByMember.get(audit.targetId) ?? [];
    rows.push(audit);
    auditsByMember.set(audit.targetId, rows);
  }

  const states = new Map<string, PaymentReminderState>();
  for (const member of uniqueMembers) {
    const key = normalizeKey(member.normalizedName);
    const marker = markerById.get(markerId(key, member.nextBillingDate));
    const legacy = (auditsByMember.get(key) ?? []).find((audit) => auditMatchesCycle(audit, member));
    const sentAt = marker ? iso(marker.sentAt ?? marker.createdAt) : iso(legacy?.at);
    if (sentAt) states.set(key, { sent: true, sentAt });
  }
  return states;
}

/**
 * Reserva atómica antes de hablar con el proveedor de correo. El `_id`
 * determinista (socio + vencimiento) hace que dos clics simultáneos no puedan
 * producir dos envíos. Si el proveedor falla limpiamente, la reserva se libera.
 */
export async function reservePaymentReminder(
  db: Db,
  member: ReminderMember,
  details: { email: string; createdBy?: string | null },
): Promise<PaymentReminderReservation> {
  const key = normalizeKey(member.normalizedName);
  const id = markerId(key, member.nextBillingDate);
  const collection = db.collection<PaymentReminderMarker>(PAYMENT_REMINDERS_COLLECTION);
  const existing = await collection.findOne({ _id: id });
  if (existing) return { ok: false, sentAt: iso(existing.sentAt ?? existing.createdAt) };

  const legacy = await currentLegacyAudit(db, { ...member, normalizedName: key });
  if (legacy) {
    const sentAt = legacy.at;
    try {
      await collection.insertOne({
        _id: id,
        memberKey: key,
        nextBillingDate: member.nextBillingDate,
        lastPaidAt: member.lastPaidAt,
        email: details.email,
        status: "sent",
        createdAt: sentAt,
        sentAt,
        createdBy: details.createdBy ?? null,
        importedFromAudit: true,
      });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
    return { ok: false, sentAt: sentAt.toISOString() };
  }

  try {
    await collection.insertOne({
      _id: id,
      memberKey: key,
      nextBillingDate: member.nextBillingDate,
      lastPaidAt: member.lastPaidAt,
      email: details.email,
      status: "sending",
      createdAt: new Date(),
      createdBy: details.createdBy ?? null,
    });
    return { ok: true, id };
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const winner = await collection.findOne({ _id: id });
    return { ok: false, sentAt: iso(winner?.sentAt ?? winner?.createdAt) };
  }
}

export async function completePaymentReminder(db: Db, id: string) {
  const sentAt = new Date();
  await db.collection<PaymentReminderMarker>(PAYMENT_REMINDERS_COLLECTION).updateOne(
    { _id: id },
    { $set: { status: "sent", sentAt } },
  );
  return sentAt;
}

export async function releasePaymentReminder(db: Db, id: string) {
  await db
    .collection<PaymentReminderMarker>(PAYMENT_REMINDERS_COLLECTION)
    .deleteOne({ _id: id, status: "sending" });
}
