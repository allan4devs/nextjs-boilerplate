import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import {
  attachStaffSessionCookie,
  createStaffSession,
  resolveStaffSession,
  revokeStaffSession,
  revokeStaffSessionsForStaff,
  staffSessionTtlSeconds,
} from "@/lib/xtreme/staff-session";
import {
  authAttemptStatus,
  clearAuthAttempts,
  clearPinAttempts,
  ensureAuthAttemptsIndex,
  recordFailedAuthAttempt,
  recordPinFailure,
} from "@/lib/xtreme/auth-attempts";
import {
  clearReceptionPin,
  ensureReceptionPinIndex,
  isValidReceptionPin,
  listReceptionOperators,
  setReceptionPin,
  verifyReceptionPin,
} from "@/lib/xtreme/reception-access";
import { isReceptionOperator } from "@/lib/xtreme/staff-directory";

export const dynamic = "force-dynamic";

const LOGIN_SCOPE = "reception_pin_login";
const SET_SCOPE = "reception_pin_set";

/**
 * Acceso al mostrador por operador + PIN propio.
 *
 * - GET: lista de operadores y si ya crearon su PIN (para el selector).
 * - POST set: crea el PIN la primera vez (sin código previo: se confía en el
 *   mostrador) y abre sesión de recepción.
 * - POST verify: entra con el PIN.
 * - DELETE: un super admin restablece el PIN de un operador.
 *
 * La sesión que abre esta ruta es SIEMPRE `role: "reception"`: el PIN de
 * mostrador nunca da Admin OS, aunque el operador sea Allan o Kengie.
 */
async function openReceptionSession(
  db: Awaited<ReturnType<typeof getDb>>,
  req: NextRequest,
  args: { staffId: string; staffName: string },
) {
  await revokeStaffSession(req, "reception");
  const { token, expiresAt } = await createStaffSession(db, {
    surface: "reception",
    role: "reception",
    staffId: args.staffId,
    staffName: args.staffName,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  const res = NextResponse.json({
    ok: true,
    authenticated: true,
    surface: "reception",
    role: "reception",
    staffId: args.staffId,
    staffName: args.staffName,
    expiresAt,
    ttlSeconds: staffSessionTtlSeconds("reception"),
  });
  return attachStaffSessionCookie(res, "reception", token, expiresAt);
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    await ensureReceptionPinIndex(db);
    const operators = await listReceptionOperators(db);
    const staffId = String(req.nextUrl.searchParams.get("staffId") ?? "").trim();
    if (staffId) {
      const one = operators.find((op) => op.id === staffId);
      if (!one) return NextResponse.json({ error: "Operador no válido." }, { status: 404 });
      return NextResponse.json({ operator: one }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ operators }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("XTREME RECEPTION ACCESS GET", err);
    return NextResponse.json({ error: "No se pudo cargar recepción." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "verify");
    const staffId = String(body.staffId ?? "").trim();
    const pin = String(body.pin ?? "").trim();

    if (!isReceptionOperator(staffId)) {
      return NextResponse.json({ error: "Elegí un operador de recepción válido." }, { status: 400 });
    }
    if (!isValidReceptionPin(pin)) {
      return NextResponse.json({ error: "El PIN debe tener 4 dígitos." }, { status: 400 });
    }

    const db = await getDb();
    ensureAuthAttemptsIndex(db).catch(() => undefined);
    ensureReceptionPinIndex(db).catch(() => undefined);

    if (action === "set") {
      const rate = await authAttemptStatus(db, req, { scope: SET_SCOPE, subject: staffId });
      if (rate.blocked) {
        return NextResponse.json(
          { error: "Demasiados intentos. Esperá unos minutos." },
          { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
        );
      }
      const done = await setReceptionPin(db, { staffId, pin, setBy: "desk" });
      if (!done.ok) {
        await recordFailedAuthAttempt(db, rate.key, {
          scope: SET_SCOPE,
          maxAttempts: 8,
          windowMs: 15 * 60_000,
        });
        return NextResponse.json({ error: done.error, code: done.code }, { status: done.status });
      }
      await writeAudit(db, {
        actorRole: "reception",
        actorId: done.profile.id,
        actorName: done.profile.name,
        action: "reception.pin_set",
        targetType: "system",
        targetId: `reception-operator:${done.profile.id}`,
        summary: `PIN de mostrador creado para ${done.profile.name}`,
      });
      return openReceptionSession(db, req, {
        staffId: done.profile.id,
        staffName: done.profile.name,
      });
    }

    if (action === "verify") {
      const rate = await authAttemptStatus(db, req, { scope: LOGIN_SCOPE, subject: staffId });
      if (rate.blocked) {
        return NextResponse.json(
          { error: "Demasiados intentos. Esperá unos minutos antes de volver a intentar." },
          { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
        );
      }
      const check = await verifyReceptionPin(db, staffId, pin);
      if (!check.hasPin) {
        return NextResponse.json(
          { error: "Todavía no tenés PIN. Creá uno para entrar.", code: "pin_not_set", hasPin: false },
          { status: 409 },
        );
      }
      if (!check.ok) {
        const failed = await recordPinFailure(db, req, { scope: LOGIN_SCOPE, subject: staffId });
        await recordFailedAuthAttempt(db, rate.key, {
          scope: LOGIN_SCOPE,
          maxAttempts: 5,
          windowMs: 60 * 60_000,
        });
        if (failed.blocked) {
          return NextResponse.json(
            {
              error:
                "PIN bloqueado por demasiados intentos. Pedí un restablecimiento a un administrador.",
              blocked: true,
            },
            { status: 429 },
          );
        }
        return NextResponse.json({ error: "PIN incorrecto.", valid: false }, { status: 401 });
      }
      await clearPinAttempts(db, req, { scope: LOGIN_SCOPE, subject: staffId });
      await clearAuthAttempts(db, rate.key);
      return openReceptionSession(db, req, {
        staffId: check.profile!.id,
        staffName: check.profile!.name,
      });
    }

    return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
  } catch (err) {
    console.error("XTREME RECEPTION ACCESS POST", err);
    return NextResponse.json({ error: "No se pudo procesar el acceso de recepción." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await resolveStaffSession(req, "admin");
  if (admin?.role !== "super") {
    return NextResponse.json(
      { error: "Solo un super admin puede restablecer el PIN de recepción." },
      { status: 403 },
    );
  }
  const staffId = String(req.nextUrl.searchParams.get("staffId") ?? "").trim();
  if (!isReceptionOperator(staffId)) {
    return NextResponse.json({ error: "Operador no válido." }, { status: 400 });
  }
  try {
    const db = await getDb();
    const done = await clearReceptionPin(db, {
      staffId,
      by: `reset:${admin.staffId ?? "super"}`,
    });
    if (!done.ok) {
      return NextResponse.json({ error: done.error }, { status: done.status ?? 400 });
    }
    const revokedSessions = await revokeStaffSessionsForStaff(db, "reception", staffId);
    await writeAudit(db, {
      actorRole: admin.role,
      actorId: admin.staffId,
      actorName: admin.staffName,
      action: "reception.pin_reset",
      targetType: "system",
      targetId: `reception-operator:${staffId}`,
      summary: `PIN de mostrador restablecido para ${done.name ?? staffId}`,
      meta: { hadPin: done.existed, revokedSessions },
    });
    return NextResponse.json({
      ok: true,
      staffId,
      name: done.name,
      hadPin: done.existed,
      revokedSessions,
      operators: await listReceptionOperators(db),
    });
  } catch (err) {
    console.error("XTREME RECEPTION ACCESS DELETE", err);
    return NextResponse.json({ error: "No se pudo restablecer el PIN." }, { status: 500 });
  }
}
