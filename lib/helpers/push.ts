import webpush from "web-push";
import type { Db } from "mongodb";

export const PUSH_SUBSCRIPTIONS_COLLECTION = "xtreme_gym_push_subscriptions";

export type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  memberKey: string;
  createdAt: Date;
  updatedAt: Date;
};

export function pushEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
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

export async function sendMemberPush(
  db: Db,
  memberKey: string,
  payload: { title: string; body: string; url?: string },
) {
  if (!configure()) return { sent: 0, skipped: true };
  const collection = db.collection<StoredPushSubscription>(PUSH_SUBSCRIPTIONS_COLLECTION);
  const subscriptions = await collection.find({ memberKey }).toArray();
  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify({ ...payload, icon: "/pwa-icon-192.png" }),
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await collection.deleteOne({ endpoint: subscription.endpoint });
      } else {
        console.error("XTREME PUSH SEND", error);
      }
    }
  }
  return { sent, skipped: false };
}
