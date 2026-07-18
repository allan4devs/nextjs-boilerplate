import { createHash } from "crypto";
import type { Db } from "mongodb";
import type { NextRequest } from "next/server";

export const AUTH_ATTEMPTS_COLLECTION = "xtreme_gym_auth_attempts";

type AuthAttemptDoc = {
  key: string;
  scope: string;
  count: number;
  windowStartedAt: Date;
  blockedUntil?: Date;
  expiresAt: Date;
};

function clientFingerprint(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = req.headers.get("user-agent")?.slice(0, 160) || "unknown";
  return createHash("sha256").update(`${forwarded}|${agent}`).digest("hex");
}

export function requestFingerprint(req: NextRequest) {
  return clientFingerprint(req).slice(0, 16);
}

function attemptKey(req: NextRequest, scope: string, subject: string) {
  return createHash("sha256")
    .update(`${scope}|${subject}|${clientFingerprint(req)}`)
    .digest("hex");
}

export async function authAttemptStatus(
  db: Db,
  req: NextRequest,
  args: { scope: string; subject: string },
) {
  const key = attemptKey(req, args.scope, args.subject);
  const doc = await db.collection<AuthAttemptDoc>(AUTH_ATTEMPTS_COLLECTION).findOne({ key });
  const blockedUntil = doc?.blockedUntil ? new Date(doc.blockedUntil) : null;
  const blocked = Boolean(blockedUntil && blockedUntil.getTime() > Date.now());
  return {
    key,
    blocked,
    retryAfterSeconds: blockedUntil
      ? Math.max(1, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000))
      : 0,
  };
}

export async function recordFailedAuthAttempt(
  db: Db,
  key: string,
  args: { scope: string; maxAttempts?: number; windowMs?: number },
) {
  const maxAttempts = args.maxAttempts ?? 5;
  const windowMs = args.windowMs ?? 15 * 60_000;
  const collection = db.collection<AuthAttemptDoc>(AUTH_ATTEMPTS_COLLECTION);
  const now = new Date();
  const current = await collection.findOne({ key });
  const windowExpired =
    !current || now.getTime() - new Date(current.windowStartedAt).getTime() > windowMs;
  const count = windowExpired ? 1 : current.count + 1;
  const blockedUntil = count >= maxAttempts ? new Date(now.getTime() + windowMs) : undefined;

  await collection.updateOne(
    { key },
    {
      $set: {
        scope: args.scope,
        count,
        windowStartedAt: windowExpired ? now : current!.windowStartedAt,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
        ...(blockedUntil ? { blockedUntil } : {}),
      },
      ...(!blockedUntil ? { $unset: { blockedUntil: "" } } : {}),
    },
    { upsert: true },
  );
  return { count, blocked: Boolean(blockedUntil), blockedUntil };
}

export async function clearAuthAttempts(db: Db, key: string) {
  await db.collection(AUTH_ATTEMPTS_COLLECTION).deleteOne({ key });
}
