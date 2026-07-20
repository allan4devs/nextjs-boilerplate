import { createHash, randomBytes } from "crypto";
import type { Db } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  ADMIN_CODE,
  RECEPTION_CODE,
  STAFF_SESSIONS_COLLECTION,
  SUPER_ADMIN_CODE,
  TRAINER_CODE,
  resolveStaffRole,
  type StaffRole,
} from "./shared";
import { SESSION_IDLE_TIMEOUT_MS } from "./session-policy";

export type StaffSurface = "reception" | "ingreso" | "trainer" | "admin";

const COOKIE_BY_SURFACE: Record<StaffSurface, string> = {
  reception: "xtreme_reception_session",
  ingreso: "xtreme_ingreso_session",
  trainer: "xtreme_trainer_session",
  admin: "xtreme_admin_session",
};

const TTL_SECONDS: Record<StaffSurface, number> = {
  reception: 12 * 60 * 60,
  ingreso: 24 * 60 * 60,
  trainer: 12 * 60 * 60,
  admin: 8 * 60 * 60,
};

type StaffSessionDoc = {
  tokenHash: string;
  surface: StaffSurface;
  role: StaffRole;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt?: Date | null;
  userAgent?: string;
  /**
   * Huella de los códigos de staff al crear la sesión.
   * Si cambian XTREME_*_CODE en el entorno, el epoch no coincide y la sesión muere.
   */
  authEpoch?: string;
};

/**
 * Huella de los códigos actuales de staff.
 * Al rotar ADMIN / SUPER / RECEPTION / TRAINER en env, las sesiones viejas dejan de valer.
 */
export function staffAuthEpoch() {
  return createHash("sha256")
    .update(
      `staff-auth|${ADMIN_CODE}|${SUPER_ADMIN_CODE}|${RECEPTION_CODE}|${TRAINER_CODE}|v1`,
    )
    .digest("hex")
    .slice(0, 24);
}

export type StaffSession = {
  surface: StaffSurface;
  role: StaffRole;
  tokenHash: string;
  expiresAt: Date;
};

function hashToken(token: string) {
  return createHash("sha256").update(`staff|${token}|v1`).digest("hex");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

export function staffSessionTtlSeconds(surface: StaffSurface) {
  return TTL_SECONDS[surface];
}

export function roleCanUseSurface(role: StaffRole, surface: StaffSurface) {
  if (surface === "trainer") return role === "trainer";
  if (surface === "admin") return role === "admin" || role === "super";
  return role === "reception" || role === "admin" || role === "super";
}

export async function createStaffSession(
  db: Db,
  args: { surface: StaffSurface; role: StaffRole; userAgent?: string },
) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_SECONDS[args.surface] * 1000);
  const doc: StaffSessionDoc = {
    tokenHash: hashToken(token),
    surface: args.surface,
    role: args.role,
    createdAt: now,
    expiresAt,
    lastSeenAt: now,
    revokedAt: null,
    userAgent: args.userAgent?.slice(0, 200),
    authEpoch: staffAuthEpoch(),
  };
  await db.collection<StaffSessionDoc>(STAFF_SESSIONS_COLLECTION).insertOne(doc);
  return { token, expiresAt };
}

export function attachStaffSessionCookie(
  res: NextResponse,
  surface: StaffSurface,
  token: string,
  expiresAt: Date,
) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  res.cookies.set(COOKIE_BY_SURFACE[surface], token, cookieOptions(maxAge));
  return res;
}

export function clearStaffSessionCookie(res: NextResponse, surface: StaffSurface) {
  res.cookies.set(COOKIE_BY_SURFACE[surface], "", cookieOptions(0));
  return res;
}

export function authenticateStaffCode(code: string, surface: StaffSurface) {
  const allowedRoles: readonly StaffRole[] = surface === "trainer"
    ? ["trainer"]
    : surface === "admin"
      ? ["super", "admin"]
      : ["super", "admin", "reception"];
  const role = resolveStaffRole(code, allowedRoles);
  return role && roleCanUseSurface(role, surface) ? role : null;
}

export async function resolveStaffSession(
  req: NextRequest,
  surface: StaffSurface,
  touchActivity = false,
): Promise<StaffSession | null> {
  const token = req.cookies.get(COOKIE_BY_SURFACE[surface])?.value?.trim() ?? "";
  if (!token) return null;

  const db = await getDb();
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
  const epoch = staffAuthEpoch();
  const doc = await db.collection<StaffSessionDoc>(STAFF_SESSIONS_COLLECTION).findOne({
    tokenHash: hashToken(token),
    surface,
    revokedAt: null,
    expiresAt: { $gt: now },
    lastSeenAt: { $gt: idleCutoff },
  });
  if (!doc || !roleCanUseSurface(doc.role, surface)) return null;

  // Código de staff rotado en env → sesión inválida (incluye docs viejos sin authEpoch).
  if (!doc.authEpoch || doc.authEpoch !== epoch) {
    await db.collection<StaffSessionDoc>(STAFF_SESSIONS_COLLECTION).updateOne(
      { tokenHash: doc.tokenHash, surface, revokedAt: null },
      { $set: { revokedAt: now } },
    );
    return null;
  }

  if (touchActivity) {
    await db.collection<StaffSessionDoc>(STAFF_SESSIONS_COLLECTION).updateOne(
      { tokenHash: doc.tokenHash, surface, revokedAt: null },
      { $set: { lastSeenAt: now } },
    );
  }

  return {
    surface,
    role: doc.role,
    tokenHash: doc.tokenHash,
    expiresAt: new Date(doc.expiresAt),
  };
}

export async function revokeStaffSession(req: NextRequest, surface: StaffSurface) {
  const token = req.cookies.get(COOKIE_BY_SURFACE[surface])?.value?.trim() ?? "";
  if (!token) return;
  const db = await getDb();
  await db.collection<StaffSessionDoc>(STAFF_SESSIONS_COLLECTION).updateOne(
    { tokenHash: hashToken(token), surface, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

/**
 * Revoca SOLO sesiones de staff (admin / recepción / ingreso / trainer).
 * Nunca toca sesiones de socios (Member OS / cookie xtreme_member_session).
 * Por defecto conserva la sesión actual del super admin (exceptTokenHash).
 */
export async function revokeAllStaffSessions(
  db: Db,
  options?: { exceptTokenHash?: string; surface?: StaffSurface },
): Promise<number> {
  // Colección exclusiva de staff — no confundir con SESSIONS_COLLECTION (socios).
  const filter: Record<string, unknown> = { revokedAt: null };
  if (options?.exceptTokenHash) {
    filter.tokenHash = { $ne: options.exceptTokenHash };
  }
  if (options?.surface) {
    filter.surface = options.surface;
  }
  const result = await db.collection<StaffSessionDoc>(STAFF_SESSIONS_COLLECTION).updateMany(
    filter,
    { $set: { revokedAt: new Date() } },
  );
  return result.modifiedCount;
}

/** Sesiones aún usables (no revocadas, no vencidas, no idle). */
export async function countActiveStaffSessions(db: Db): Promise<{
  total: number;
  bySurface: Record<StaffSurface, number>;
}> {
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
  const epoch = staffAuthEpoch();
  const rows = await db
    .collection<StaffSessionDoc>(STAFF_SESSIONS_COLLECTION)
    .aggregate<{ _id: StaffSurface; count: number }>([
      {
        $match: {
          revokedAt: null,
          expiresAt: { $gt: now },
          lastSeenAt: { $gt: idleCutoff },
          authEpoch: epoch,
        },
      },
      { $group: { _id: "$surface", count: { $sum: 1 } } },
    ])
    .toArray();

  const bySurface: Record<StaffSurface, number> = {
    reception: 0,
    ingreso: 0,
    trainer: 0,
    admin: 0,
  };
  let total = 0;
  for (const row of rows) {
    if (row._id in bySurface) {
      bySurface[row._id] = row.count;
      total += row.count;
    }
  }
  return { total, bySurface };
}

export async function requireStaffSession(req: NextRequest, surface: StaffSurface) {
  const session = await resolveStaffSession(req, surface);
  if (session) return session;
  return NextResponse.json(
    { error: "Sesion de staff requerida.", code: "staff_session_required" },
    { status: 401 },
  );
}

export function isStaffSession(value: StaffSession | NextResponse): value is StaffSession {
  return Boolean(value && typeof value === "object" && "surface" in value && "role" in value);
}
