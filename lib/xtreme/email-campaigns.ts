import { randomUUID } from "crypto";
import type { Db } from "mongodb";
import { emailEnabled, sendCampaignEmail } from "@/lib/helpers/email";
import {
  EMAIL_CAMPAIGN_DELIVERIES_COLLECTION,
  EMAIL_CAMPAIGNS_COLLECTION,
} from "@/lib/xtreme/shared/config";

export type EmailAudience = "imported" | "unregistered" | "pending" | "inactive" | "members" | "all";

export type EmailCampaignDoc = {
  id: string;
  subject: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaPath?: string;
  audience: EmailAudience;
  status: "queued" | "processing" | "completed";
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
};

type EmailDeliveryDoc = {
  deliveryKey: string;
  campaignId: string;
  email: string;
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
};

export function newEmailCampaignId() {
  return `email-${randomUUID()}`;
}

/** Procesa pocos destinatarios por corrida para no competir con correos transaccionales. */
export async function processQueuedEmailCampaigns(db: Db, limit = 20) {
  if (!emailEnabled()) return { configured: false, processed: 0, sent: 0, failed: 0, skipped: 0 };

  const campaign = await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).findOne(
    { status: { $in: ["queued", "processing"] } },
    { sort: { createdAt: 1 } },
  );
  if (!campaign) return { configured: true, processed: 0, sent: 0, failed: 0, skipped: 0 };

  await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).updateOne(
    { id: campaign.id },
    { $set: { status: "processing", updatedAt: new Date() } },
  );

  const deliveries = db.collection<EmailDeliveryDoc>(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION);
  // Recupera un lote si la función terminó después de reclamarlo y antes de guardar el resultado.
  await deliveries.updateMany(
    {
      campaignId: campaign.id,
      status: "sending",
      updatedAt: { $lt: new Date(Date.now() - 10 * 60_000) },
    },
    { $set: { status: "queued", updatedAt: new Date() } },
  );
  const batch = await deliveries.find({ campaignId: campaign.id, status: "queued" }).limit(limit).toArray();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of batch) {
    const claimed = await deliveries.updateOne(
      { deliveryKey: item.deliveryKey, status: "queued" },
      { $set: { status: "sending", updatedAt: new Date() }, $inc: { attempts: 1 } },
    );
    if (!claimed.modifiedCount) continue;

    const result = await sendCampaignEmail({
      to: item.email,
      subject: campaign.subject,
      title: campaign.title,
      message: campaign.message,
      ctaLabel: campaign.ctaLabel,
      ctaPath: campaign.ctaPath,
      idempotencyKey: item.deliveryKey,
    });
    const now = new Date();
    if (result.ok) {
      sent += 1;
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        { $set: { status: "sent", updatedAt: now }, $unset: { error: "" } },
      );
    } else if (result.skipped) {
      skipped += 1;
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        { $set: { status: "skipped", updatedAt: now, error: "Suprimido o no disponible" } },
      );
    } else if (item.attempts + 1 < 3) {
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        { $set: { status: "queued", updatedAt: now, error: result.error || "Error de envío" } },
      );
    } else {
      failed += 1;
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        { $set: { status: "failed", updatedAt: now, error: result.error || "Error de envío" } },
      );
    }
    // Resend parte de 5 req/s por equipo; dejamos espacio para correos transaccionales.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const counts = await deliveries
    .aggregate<{ _id: EmailDeliveryDoc["status"]; count: number }>([
      { $match: { campaignId: campaign.id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();
  const byStatus = Object.fromEntries(counts.map((row) => [row._id, row.count]));
  const queued = (byStatus.queued || 0) + (byStatus.sending || 0);
  const completed = queued === 0;
  await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).updateOne(
    { id: campaign.id },
    {
      $set: {
        status: completed ? "completed" : "processing",
        sent: byStatus.sent || 0,
        failed: byStatus.failed || 0,
        skipped: byStatus.skipped || 0,
        updatedAt: new Date(),
        ...(completed ? { completedAt: new Date() } : {}),
      },
    },
  );

  return { configured: true, campaignId: campaign.id, processed: batch.length, sent, failed, skipped };
}
