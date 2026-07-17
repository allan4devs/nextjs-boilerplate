import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDb } from "@/lib/helpers/mongodb";
import {
  attachStaffSessionCookie,
  authenticateStaffCode,
  clearStaffSessionCookie,
  createStaffSession,
  roleCanUseSurface,
  resolveStaffSession,
  revokeStaffSession,
  staffSessionTtlSeconds,
  type StaffSurface,
} from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

const STAFF_AUTH_ATTEMPTS_COLLECTION = "xtreme_gym_staff_auth_attempts";
const ATTEMPT_WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

type AttemptDoc = {
  key: string;
  count: number;
  windowStartedAt: Date;
  blockedUntil?: Date;
  expiresAt: Date;
};

function parseSurface(value: unknown): StaffSurface | null {
  return value === "reception" || value === "ingreso" || value === "trainer" || value === "admin" ? value : null;
}

function attemptKey(req: NextRequest, surface: StaffSurface) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = req.headers.get("user-agent")?.slice(0, 120) || "unknown";
  return createHash("sha256").update(`${surface}|${forwarded}|${agent}`).digest("hex");
}

async function recordFailedAttempt(db: Awaited<ReturnType<typeof getDb>>, key: string) {
  const collection = db.collection<AttemptDoc>(STAFF_AUTH_ATTEMPTS_COLLECTION);
  const now = new Date();
  const current = await collection.findOne({ key });
  const windowExpired =
    !current || now.getTime() - new Date(current.windowStartedAt).getTime() > ATTEMPT_WINDOW_MS;
  const count = windowExpired ? 1 : current.count + 1;
  const blockedUntil = count >= MAX_ATTEMPTS ? new Date(now.getTime() + ATTEMPT_WINDOW_MS) : undefined;
  await collection.updateOne(
    { key },
    {
      $set: {
        count,
        windowStartedAt: windowExpired ? now : current.windowStartedAt,
        ...(blockedUntil ? { blockedUntil } : {}),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
      },
      ...(!blockedUntil ? { $unset: { blockedUntil: "" } } : {}),
    },
    { upsert: true },
  );
}

export async function GET(req: NextRequest) {
  const surface = parseSurface(req.nextUrl.searchParams.get("surface"));
  if (!surface) return NextResponse.json({ error: "Superficie invalida." }, { status: 400 });
  const session = await resolveStaffSession(req, surface, true);
  return NextResponse.json(
    session
      ? { authenticated: true, surface, role: session.role, expiresAt: session.expiresAt }
      : { authenticated: false, surface, role: null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { surface?: unknown; code?: unknown };
  const surface = parseSurface(body.surface);
  if (!surface) return NextResponse.json({ error: "Superficie invalida." }, { status: 400 });

  const db = await getDb();
  const key = attemptKey(req, surface);
  const attempt = await db.collection<AttemptDoc>(STAFF_AUTH_ATTEMPTS_COLLECTION).findOne({ key });
  if (attempt?.blockedUntil && new Date(attempt.blockedUntil).getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espere 15 minutos." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  const role = authenticateStaffCode(String(body.code ?? ""), surface);
  if (!role) {
    await recordFailedAttempt(db, key);
    return NextResponse.json({ error: "Codigo incorrecto para esta area." }, { status: 401 });
  }

  await db.collection<AttemptDoc>(STAFF_AUTH_ATTEMPTS_COLLECTION).deleteOne({ key });
  await revokeStaffSession(req, surface);
  const { token, expiresAt } = await createStaffSession(db, {
    surface,
    role,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  const res = NextResponse.json({
    authenticated: true,
    surface,
    role,
    expiresAt,
    ttlSeconds: staffSessionTtlSeconds(surface),
  });
  return attachStaffSessionCookie(res, surface, token, expiresAt);
}

/**
 * SSO interno: una sesión de staff ya autenticada puede abrir otra superficie
 * permitida por su rol sin volver a pedir el código.
 */
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { targetSurface?: unknown };
  const targetSurface = parseSurface(body.targetSurface);
  if (!targetSurface) {
    return NextResponse.json({ error: "Superficie destino invalida." }, { status: 400 });
  }

  const sourceSurfaces: StaffSurface[] = ["admin", "reception", "ingreso", "trainer"];
  let sourceSession: Awaited<ReturnType<typeof resolveStaffSession>> = null;
  for (const sourceSurface of sourceSurfaces) {
    const candidate = await resolveStaffSession(req, sourceSurface, true);
    if (candidate && roleCanUseSurface(candidate.role, targetSurface)) {
      sourceSession = candidate;
      break;
    }
  }
  if (!sourceSession) {
    return NextResponse.json(
      { error: "Tu sesión actual no permite entrar a esta área." },
      { status: 403 },
    );
  }

  const db = await getDb();
  await revokeStaffSession(req, targetSurface);
  const { token, expiresAt } = await createStaffSession(db, {
    surface: targetSurface,
    role: sourceSession.role,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  const res = NextResponse.json({
    authenticated: true,
    surface: targetSurface,
    role: sourceSession.role,
    expiresAt,
  });
  return attachStaffSessionCookie(res, targetSurface, token, expiresAt);
}

export async function DELETE(req: NextRequest) {
  const surface = parseSurface(req.nextUrl.searchParams.get("surface"));
  if (!surface) return NextResponse.json({ error: "Superficie invalida." }, { status: 400 });
  await revokeStaffSession(req, surface);
  const res = NextResponse.json({ ok: true, surface });
  return clearStaffSessionCookie(res, surface);
}
