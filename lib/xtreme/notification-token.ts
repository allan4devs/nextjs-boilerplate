import { createHmac, timingSafeEqual } from "crypto";

export function notificationClickToken(memberKey: string, deliveryKey: string) {
  const secret = process.env.CRON_SECRET?.trim() || "";
  if (!secret) return "";
  return createHmac("sha256", secret).update(`${memberKey}:${deliveryKey}`).digest("base64url");
}

export function verifyNotificationClickToken(memberKey: string, deliveryKey: string, token: string) {
  const expected = notificationClickToken(memberKey, deliveryKey);
  if (!expected || !token || expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
