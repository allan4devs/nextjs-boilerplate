import { createHash, randomBytes } from "crypto";
import type { Db } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { STAFF_SESSIONS_COLLECTION, resolveStaffRole, type StaffRole } from "./shared";

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
};

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
): Promise<StaffSession | null> {
  const token = req.cookies.get(COOKIE_BY_SURFACE[surface])?.value?.trim() ?? "";
  if (!token) return null;

  const db = await getDb();
  const now = new Date();
  const doc = await db.collection<StaffSessionDoc>(STAFF_SESSIONS_COLLECTION).findOne({
    tokenHash: hashToken(token),
    surface,
    revokedAt: null,
    expiresAt: { $gt: now },
  });
  if (!doc || !roleCanUseSurface(doc.role, surface)) return null;

  if (!doc.lastSeenAt || now.getTime() - new Date(doc.lastSeenAt).getTime() > 10 * 60_000) {
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
