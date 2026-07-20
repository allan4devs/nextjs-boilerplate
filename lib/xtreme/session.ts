/**
 * Xtreme Gym - Member sessions (Strategy 2.0 §4.1).
 * Opaque random token in HttpOnly cookie; only a hash is stored in Mongo.
 */
import { createHash, randomBytes } from "crypto";
import type { Db } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { SESSIONS_COLLECTION } from "./shared";
import { SESSION_IDLE_TIMEOUT_MS } from "./session-policy";

export const MEMBER_SESSION_COOKIE = "xtreme_member_session";
export const SESSION_TTL_DAYS = 30;
/**
 * Rotación de seguridad global de sesiones de socios.
 * Cambiar esta versión invalida todas las cookies Member OS emitidas antes,
 * sin tocar las sesiones independientes de admin/staff.
 */
const MEMBER_SESSION_TOKEN_VERSION = "v2";

export type MemberSessionDoc = {
  tokenHash: string;
  memberKey: string;
  memberName: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt?: Date | null;
  userAgent?: string;
};

export type MemberSession = {
  memberKey: string;
  memberName: string;
  tokenHash: string;
  expiresAt: Date;
};

function hashToken(token: string) {
  return createHash("sha256")
    .update(`sess|${token}|${MEMBER_SESSION_TOKEN_VERSION}`)
    .digest("hex");
}

function cookieSecure() {
  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export async function createMemberSession(
  db: Db,
  args: { memberKey: string; memberName: string; userAgent?: string },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 86_400_000);
  const doc: MemberSessionDoc = {
    tokenHash: hashToken(token),
    memberKey: args.memberKey,
    memberName: args.memberName,
    createdAt: now,
    expiresAt,
    lastSeenAt: now,
    revokedAt: null,
    userAgent: args.userAgent?.slice(0, 200),
  };
  await db.collection<MemberSessionDoc>(SESSIONS_COLLECTION).insertOne(doc);
  return { token, expiresAt };
}

export function attachSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  res.cookies.set(MEMBER_SESSION_COOKIE, token, sessionCookieOptions(maxAge));
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(MEMBER_SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}

export async function revokeSessionByToken(db: Db, token: string) {
  if (!token) return;
  await db.collection<MemberSessionDoc>(SESSIONS_COLLECTION).updateOne(
    { tokenHash: hashToken(token), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function revokeAllMemberSessions(db: Db, memberKey: string) {
  await db.collection<MemberSessionDoc>(SESSIONS_COLLECTION).updateMany(
    { memberKey, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

/**
 * Resolve the current member from the session cookie.
 * Returns null if missing, expired or revoked.
 */
export async function resolveMemberSession(
  req: NextRequest,
  touchActivity = false,
): Promise<MemberSession | null> {
  const token = req.cookies.get(MEMBER_SESSION_COOKIE)?.value?.trim() ?? "";
  if (!token) return null;

  const db = await getDb();
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
  const doc = await db.collection<MemberSessionDoc>(SESSIONS_COLLECTION).findOne({
    tokenHash: hashToken(token),
    revokedAt: null,
    expiresAt: { $gt: now },
    lastSeenAt: { $gt: idleCutoff },
  });
  if (!doc) return null;

  if (touchActivity) {
    await db.collection(SESSIONS_COLLECTION).updateOne(
      { tokenHash: doc.tokenHash, revokedAt: null },
      { $set: { lastSeenAt: now } },
    );
  }

  return {
    memberKey: doc.memberKey,
    memberName: doc.memberName,
    tokenHash: doc.tokenHash,
    expiresAt: new Date(doc.expiresAt),
  };
}

/**
 * Renovacion deslizante ("refresh"): si la sesion sigue valida y ya paso mas
 * de un dia desde la ultima renovacion, extiende expiresAt al TTL completo.
 * Devuelve la nueva fecha de expiracion (para re-emitir la cookie) o null si
 * no hacia falta renovar todavia.
 */
export async function renewMemberSession(db: Db, session: MemberSession): Promise<Date | null> {
  const remainingMs = session.expiresAt.getTime() - Date.now();
  if (remainingMs <= 0) return null;
  // Throttle: renovar a lo sumo una vez al dia.
  if (remainingMs > (SESSION_TTL_DAYS - 1) * 86_400_000) return null;

  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await db.collection<MemberSessionDoc>(SESSIONS_COLLECTION).updateOne(
    { tokenHash: session.tokenHash, revokedAt: null },
    { $set: { expiresAt } },
  );
  return expiresAt;
}

/** Ventana “conectado ahora” en el panel admin (presencia en vivo). */
export const ONLINE_PRESENCE_MS = 5 * 60_000;

export type OnlineMemberPresence = {
  memberKey: string;
  memberName: string;
  lastSeenAt: string;
  /** Sesión autenticada (cookie PIN) y/o bitácora de uso del Member OS. */
  via: "session" | "usage" | "both";
  source?: string;
  path?: string;
};

/**
 * Socios con actividad reciente (Member OS).
 * - Sesiones con PIN (lastSeenAt &lt; idle 10 min)
 * - Bitácora de uso con memberId (lastSeenAt &lt; 5 min)
 * No toca ni lista sesiones de staff.
 */
export async function listOnlineMembers(db: Db): Promise<{
  count: number;
  windowMinutes: number;
  members: OnlineMemberPresence[];
}> {
  const now = new Date();
  const sessionCutoff = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
  const usageCutoff = new Date(now.getTime() - ONLINE_PRESENCE_MS);

  type Row = {
    memberKey: string;
    memberName: string;
    lastSeenAt: Date;
    hasSession: boolean;
    hasUsage: boolean;
    source?: string;
    path?: string;
  };
  const byKey = new Map<string, Row>();

  const authSessions = await db
    .collection<MemberSessionDoc>(SESSIONS_COLLECTION)
    .find({
      revokedAt: null,
      expiresAt: { $gt: now },
      lastSeenAt: { $gt: sessionCutoff },
    })
    .project({ memberKey: 1, memberName: 1, lastSeenAt: 1 })
    .sort({ lastSeenAt: -1 })
    .limit(100)
    .toArray();

  for (const s of authSessions) {
    const key = String(s.memberKey || "").trim().toUpperCase();
    if (!key) continue;
    const last =
      s.lastSeenAt instanceof Date ? s.lastSeenAt : new Date(s.lastSeenAt);
    byKey.set(key, {
      memberKey: key,
      memberName: String(s.memberName || key).trim() || key,
      lastSeenAt: last,
      hasSession: true,
      hasUsage: false,
    });
  }

  try {
    const usage = await db
      .collection<{
        memberId?: string;
        memberName?: string;
        lastSeenAt?: Date;
        source?: string;
        exitPath?: string;
        entryPath?: string;
      }>("xtreme_gym_session_logs")
      .find({
        lastSeenAt: { $gte: usageCutoff },
        memberId: { $type: "string", $ne: "" },
      })
      .project({
        memberId: 1,
        memberName: 1,
        lastSeenAt: 1,
        source: 1,
        exitPath: 1,
        entryPath: 1,
      })
      .sort({ lastSeenAt: -1 })
      .limit(150)
      .toArray();

    for (const u of usage) {
      const key = String(u.memberId || "").trim().toUpperCase();
      if (!key) continue;
      const last =
        u.lastSeenAt instanceof Date
          ? u.lastSeenAt
          : new Date(u.lastSeenAt || now);
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, {
          memberKey: key,
          memberName: String(u.memberName || key).trim() || key,
          lastSeenAt: last,
          hasSession: false,
          hasUsage: true,
          source: u.source,
          path: u.exitPath || u.entryPath,
        });
      } else {
        prev.hasUsage = true;
        if (last.getTime() > prev.lastSeenAt.getTime()) {
          prev.lastSeenAt = last;
          prev.source = u.source || prev.source;
          prev.path = u.exitPath || u.entryPath || prev.path;
        }
        if (!prev.memberName || prev.memberName === key) {
          prev.memberName = String(u.memberName || prev.memberName).trim() || key;
        }
      }
    }
  } catch (err) {
    console.error("listOnlineMembers usage", err);
  }

  const members = [...byKey.values()]
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
    .slice(0, 40)
    .map((r) => ({
      memberKey: r.memberKey,
      memberName: r.memberName,
      lastSeenAt: r.lastSeenAt.toISOString(),
      via:
        r.hasSession && r.hasUsage
          ? ("both" as const)
          : r.hasSession
            ? ("session" as const)
            : ("usage" as const),
      source: r.source,
      path: r.path,
    }));

  return {
    count: members.length,
    windowMinutes: Math.round(ONLINE_PRESENCE_MS / 60_000),
    members,
  };
}

export function unauthorizedMember(message = "Sesión requerida. Ingresá tu PIN.") {
  return NextResponse.json({ error: message, code: "session_required" }, { status: 401 });
}

export function forbiddenMember(message = "No autorizado para este perfil.") {
  return NextResponse.json({ error: message, code: "forbidden" }, { status: 403 });
}

/**
 * Guard for member mutations. Identity comes from the session cookie only.
 * If `expectedMemberKey` is provided, it must match the session (defense in depth).
 */
export async function requireMemberSession(
  req: NextRequest,
  expectedMemberKey?: string,
): Promise<MemberSession | NextResponse> {
  const session = await resolveMemberSession(req);
  if (!session) return unauthorizedMember();
  if (expectedMemberKey && expectedMemberKey !== session.memberKey) {
    return forbiddenMember();
  }
  return session;
}

export function isSession(value: MemberSession | NextResponse): value is MemberSession {
  return Boolean(value && typeof value === "object" && "memberKey" in value);
}
