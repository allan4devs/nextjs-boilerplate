import webpush from "web-push";
import type { Db } from "mongodb";

export const PUSH_SUBSCRIPTIONS_COLLECTION = "xtreme_gym_push_subscriptions";

export type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  memberKey: string;
  createdAt: Date;
  updatedAt: Date;
  /** User-Agent del dispositivo al suscribirse (debug / multi-device). */
  userAgent?: string;
};

/** Qué llaves VAPID faltan (solo nombres, nunca valores). */
export function missingVapidKeys(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()) missing.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  if (!process.env.VAPID_PRIVATE_KEY?.trim()) missing.push("VAPID_PRIVATE_KEY");
  if (!process.env.VAPID_SUBJECT?.trim()) missing.push("VAPID_SUBJECT");
  return missing;
}

export function pushEnabled() {
  return missingVapidKeys().length === 0;
}

function configure() {
  if (!pushEnabled()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!.trim(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  deliveryKey?: string;
  memberKey?: string;
  clickToken?: string;
  tag?: string;
  badge?: string;
  icon?: string;
  vibrate?: number[];
  renotify?: boolean;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
  actionUrls?: Record<string, string>;
};

export async function sendMemberPush(
  db: Db,
  memberKey: string,
  payload: PushPayload,
) {
  if (!configure()) return { sent: 0, attempted: 0, failed: 0, skipped: true };
  const collection = db.collection<StoredPushSubscription>(PUSH_SUBSCRIPTIONS_COLLECTION);
  const subscriptions = await collection.find({ memberKey }).toArray();
  let sent = 0;
  let failed = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify({
          icon: "/pwa-icon-192.png",
          badge: "/pwa-icon-192.png",
          ...payload,
        }),
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await collection.deleteOne({ endpoint: subscription.endpoint });
      } else {
        failed += 1;
        console.error("XTREME PUSH SEND", error);
      }
    }
  }
  return { sent, attempted: subscriptions.length, failed, skipped: false };
}
