/** Recordatorio push para visitas que siguen abiertas después del tiempo esperado. */
import type { Db } from "mongodb";
import { sendMemberPush } from "@/lib/helpers/push";
import { businessDate } from "@/lib/xtreme/business-date";
import { recordEvent } from "@/lib/xtreme/events";
import { VISIT_CHECKOUT_REMINDER_MINUTES } from "@/lib/xtreme/member-visit";
import { notificationClickToken } from "@/lib/xtreme/notification-token";
import {
  CHECKINS_COLLECTION,
  type CheckinDoc,
} from "@/lib/xtreme/shared";

const DELIVERIES_COLLECTION = "xtreme_gym_lifecycle_deliveries";

type VisitReminderDelivery = {
  deliveryKey: string;
  memberKey: string;
  kind: "visit-checkout-reminder";
  createdAt: Date;
  sentAt?: Date;
  status: "sending" | "sent" | "skipped";
  checkinId: string;
};

export type VisitReminderSummary = {
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
};

export async function processVisitCheckoutReminders(
  db: Db,
  now = new Date(),
): Promise<VisitReminderSummary> {
  const reminderCutoff = new Date(
    now.getTime() - VISIT_CHECKOUT_REMINDER_MINUTES * 60_000,
  );
  const visits = await db
    .collection<CheckinDoc>(CHECKINS_COLLECTION)
    .find({
      date: businessDate(now),
      checkedOutAt: null,
      checkedInAt: { $lte: reminderCutoff },
    })
    .sort({ checkedInAt: 1 })
    .limit(250)
    .toArray();

  const deliveries = db.collection<VisitReminderDelivery>(DELIVERIES_COLLECTION);
  await deliveries.createIndex({ deliveryKey: 1 }, { unique: true });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const visit of visits) {
    const memberKey = String(visit.normalizedName || "").trim();
    if (!memberKey) {
      skipped += 1;
      continue;
    }
    const deliveryKey = `visit-checkout-reminder:${visit.id}`;
    try {
      await deliveries.insertOne({
        deliveryKey,
        memberKey,
        kind: "visit-checkout-reminder",
        createdAt: now,
        status: "sending",
        checkinId: visit.id,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        skipped += 1;
        continue;
      }
      failed += 1;
      console.error("XTREME VISIT REMINDER CLAIM", error);
      continue;
    }

    try {
      const push = await sendMemberPush(db, memberKey, {
        title: "🚪 ¿Ya terminaste tu entreno?",
        body: "Tu visita sigue abierta en el gym. Registrá tu salida para liberar espacio y guardar la duración exacta.",
        url: "/app?action=checkout",
        tag: "xtreme-checkout-reminder",
        renotify: true,
        requireInteraction: true,
        vibrate: [100, 50, 100],
        actions: [{ action: "checkout", title: "Registrar Salida 🚪" }],
        actionUrls: { checkout: "/app?action=checkout" },
        deliveryKey,
        memberKey,
        clickToken: notificationClickToken(memberKey, deliveryKey),
      });
      if (push.sent > 0) {
        sent += 1;
        await deliveries.updateOne(
          { deliveryKey },
          { $set: { status: "sent", sentAt: new Date() } },
        );
        await recordEvent(db, {
          type: "notification_sent",
          memberId: memberKey,
          source: "job",
          entity: { type: "visit_checkout_reminder", id: deliveryKey },
          properties: {
            campaign: "visit-checkout-reminder",
            checkinId: visit.id,
            reminderAfterMinutes: VISIT_CHECKOUT_REMINDER_MINUTES,
            pushDevices: push.sent,
          },
        });
      } else if (push.skipped || push.attempted === 0) {
        skipped += 1;
        await deliveries.updateOne(
          { deliveryKey },
          { $set: { status: "skipped", sentAt: new Date() } },
        );
      } else {
        failed += 1;
        await deliveries.deleteOne({ deliveryKey });
      }
    } catch (error) {
      failed += 1;
      await deliveries.deleteOne({ deliveryKey }).catch(() => undefined);
      console.error("XTREME VISIT REMINDER SEND", error);
    }
  }

  return { candidates: visits.length, sent, skipped, failed };
}
