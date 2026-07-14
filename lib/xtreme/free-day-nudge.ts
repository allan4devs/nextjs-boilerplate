/**
 * Recordatorios a las 48 h para quienes empezaron el primer día gratis
 * pero no completaron el perfil o no se inscribieron a un plan.
 */
import type { Db } from "mongodb";
import { absoluteAppUrl } from "@/lib/constants/app-url";
import {
  sendFreeDayPendingReminderEmail,
  sendFreeDayUpgradeReminderEmail,
} from "@/lib/helpers/email";
import { recordEvent } from "@/lib/xtreme/events";
import { createRegistrationToken, hashRegistrationToken } from "@/lib/xtreme/registration-token";
import {
  MEMBERS_COLLECTION,
  PAYMENTS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
} from "@/lib/xtreme/shared";

export const FREE_DAY_NUDGE_AFTER_MS = 48 * 60 * 60_000;
export const REGISTRATION_REMINDER_TTL_MIN = 24 * 60;

export type FreeDayNudgeKind = "pending-profile" | "upgrade-plan";

export type FreeDayNudgeTarget = {
  kind: FreeDayNudgeKind;
  email: string;
  deliveryKey: string;
  source: PendingRegistrationDoc["source"];
  memberName?: string;
  normalizedName?: string;
  anchorAt: Date;
};

type DeliveryDoc = {
  deliveryKey: string;
  memberKey: string;
  kind: FreeDayNudgeKind;
  createdAt: Date;
  sentAt?: Date;
  status: "sending" | "sent" | "skipped";
};

const DELIVERIES_COLLECTION = "xtreme_gym_lifecycle_deliveries";
const FREE_DAY_SOURCES = new Set<PendingRegistrationDoc["source"]>(["primer-dia", "app"]);

function isFreeDaySource(source: PendingRegistrationDoc["source"]) {
  return FREE_DAY_SOURCES.has(source);
}

async function hasCompletedPayment(db: Db, normalizedName: string) {
  if (!normalizedName) return false;
  const payment = await db.collection(PAYMENTS_COLLECTION).findOne(
    { normalizedName, status: "completed" },
    { projection: { _id: 1 } },
  );
  return Boolean(payment);
}

export async function listFreeDayNudgeTargets(db: Db, now = new Date()): Promise<FreeDayNudgeTarget[]> {
  const cutoff = new Date(now.getTime() - FREE_DAY_NUDGE_AFTER_MS);
  const targets: FreeDayNudgeTarget[] = [];

  const pendingProfiles = await db
    .collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION)
    .find({
      source: { $in: [...FREE_DAY_SOURCES] },
      confirmedAt: null,
      $or: [{ memberNormalizedName: null }, { memberNormalizedName: "" }],
      createdAt: { $lte: cutoff },
    })
    .toArray();

  for (const pending of pendingProfiles) {
    if (!pending.email || !isFreeDaySource(pending.source)) continue;
    targets.push({
      kind: "pending-profile",
      email: pending.email,
      deliveryKey: `free-day-nudge:pending:${pending.email}`,
      source: pending.source,
      anchorAt: pending.createdAt,
    });
  }

  const confirmedFreeDay = await db
    .collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION)
    .find({
      source: { $in: [...FREE_DAY_SOURCES] },
      confirmedAt: { $ne: null, $lte: cutoff },
      memberNormalizedName: { $exists: true, $nin: [null, ""] },
    })
    .toArray();

  for (const pending of confirmedFreeDay) {
    const normalizedName = String(pending.memberNormalizedName ?? "").trim();
    if (!pending.email || !normalizedName) continue;

    const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
    if (!member?.email || member.emailVerified === false) continue;
    if (await hasCompletedPayment(db, normalizedName)) continue;

    const plan = member.membership?.plan ?? "";
    const paidPlan =
      plan &&
      plan !== "Primer día gratis" &&
      plan !== "Sin plan activo" &&
      !plan.toLowerCase().includes("primer día");
    if (paidPlan) continue;

    targets.push({
      kind: "upgrade-plan",
      email: member.email,
      deliveryKey: `free-day-nudge:upgrade:${normalizedName}`,
      source: pending.source,
      memberName: member.memberName || "Socio Xtreme",
      normalizedName,
      anchorAt: pending.confirmedAt ?? member.createdAt ?? cutoff,
    });
  }

  return targets;
}

async function refreshRegistrationToken(db: Db, email: string) {
  const token = createRegistrationToken();
  const expiresAt = new Date(Date.now() + REGISTRATION_REMINDER_TTL_MIN * 60_000);
  const result = await db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION).updateOne(
    { email, source: { $in: [...FREE_DAY_SOURCES] }, confirmedAt: null },
    { $set: { tokenHash: hashRegistrationToken(token), expiresAt } },
  );
  if (!result.matchedCount) return null;
  return token;
}

export async function processFreeDayNudges(
  db: Db,
  now = new Date(),
): Promise<{ sent: number; skipped: number; failed: number }> {
  const deliveries = db.collection<DeliveryDoc>(DELIVERIES_COLLECTION);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of await listFreeDayNudgeTargets(db, now)) {
    const memberKey = target.normalizedName || target.email;

    try {
      await deliveries.insertOne({
        deliveryKey: target.deliveryKey,
        memberKey,
        kind: target.kind,
        createdAt: now,
        status: "sending",
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        skipped += 1;
        continue;
      }
      throw error;
    }

    if (target.kind === "pending-profile") {
      const token = await refreshRegistrationToken(db, target.email);
      if (!token) {
        skipped += 1;
        await deliveries.updateOne(
          { deliveryKey: target.deliveryKey },
          { $set: { status: "skipped", sentAt: now } },
        );
        continue;
      }

      const confirmHref = absoluteAppUrl(`/registro/confirmar?token=${encodeURIComponent(token)}`);
      const emailResult = await sendFreeDayPendingReminderEmail({
        to: target.email,
        confirmUrl: confirmHref,
        expiresHours: Math.round(REGISTRATION_REMINDER_TTL_MIN / 60),
      });

      if (emailResult.ok) {
        sent += 1;
        await deliveries.updateOne(
          { deliveryKey: target.deliveryKey },
          { $set: { status: "sent", sentAt: now } },
        );
        await recordEvent(db, {
          type: "free_day_nudge_sent",
          source: "job",
          entity: { type: "free_day_nudge", id: target.deliveryKey },
          properties: { kind: target.kind, source: target.source },
        });
      } else if (emailResult.skipped) {
        skipped += 1;
        await deliveries.updateOne(
          { deliveryKey: target.deliveryKey },
          { $set: { status: "skipped", sentAt: now } },
        );
      } else {
        failed += 1;
        await deliveries.deleteOne({ deliveryKey: target.deliveryKey });
      }
      continue;
    }

    const emailResult = await sendFreeDayUpgradeReminderEmail({
      to: target.email,
      memberName: target.memberName || "Socio Xtreme",
      appUrl: absoluteAppUrl("/app"),
      pricesUrl: absoluteAppUrl("/precios?plan=month#inscripcion"),
    });
    if (emailResult.ok) {
      sent += 1;
      await deliveries.updateOne(
        { deliveryKey: target.deliveryKey },
        { $set: { status: "sent", sentAt: now } },
      );
      await recordEvent(db, {
        type: "free_day_nudge_sent",
        memberId: target.normalizedName,
        source: "job",
        entity: { type: "free_day_nudge", id: target.deliveryKey },
        properties: { kind: target.kind, source: target.source },
      });
    } else if (emailResult.skipped) {
      skipped += 1;
      await deliveries.updateOne(
        { deliveryKey: target.deliveryKey },
        { $set: { status: "skipped", sentAt: now } },
      );
    } else {
      failed += 1;
      await deliveries.deleteOne({ deliveryKey: target.deliveryKey });
    }
  }

  return { sent, skipped, failed };
}