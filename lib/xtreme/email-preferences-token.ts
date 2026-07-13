import { createHmac, timingSafeEqual } from "crypto";
import { normalizeEmail } from "./shared";

function secret() {
  return process.env.CRON_SECRET?.trim() || "";
}

export function emailPreferencesToken(email: string) {
  const normalized = normalizeEmail(email);
  const key = secret();
  if (!normalized || !key) return "";
  const payload = Buffer.from(normalized).toString("base64url");
  const signature = createHmac("sha256", key).update(payload).digest("base64url");
  return payload + "." + signature;
}

export function emailFromPreferencesToken(token: string) {
  const [payload, signature] = token.split(".");
  const key = secret();
  if (!payload || !signature || !key) return "";
  const expected = createHmac("sha256", key).update(payload).digest("base64url");
  if (expected.length !== signature.length) return "";
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return "";
  try {
    return normalizeEmail(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return "";
  }
}
