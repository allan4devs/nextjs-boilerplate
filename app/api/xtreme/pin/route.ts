import { createHash, randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { sendPinChangedEmail, sendPinRecoveryOtpEmail } from "@/lib/helpers/email";
import {
  MEMBERS_COLLECTION,
  OTPS_COLLECTION,
  PINS_COLLECTION,
  type OtpDoc,
  hashPin,
  memberEmailIsTrusted,
  normalizeKey,
  normalizeName,
} from "@/lib/xtreme/shared";
import {
  attachSessionCookie,
  createMemberSession,
  resolveMemberSession,
  revokeAllMemberSessions,
} from "@/lib/xtreme/session";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { recordEvent } from "@/lib/xtreme/events";
import {
  authAttemptStatus,
  clearAuthAttempts,
  recordFailedAuthAttempt,
  requestFingerprint,
} from "@/lib/xtreme/auth-attempts";

export const dynamic = "force-dynamic";

const OTP_TTL_MIN = 15;
const OTP_MAX_ATTEMPTS = 5;

type MemberContact = {
  normalizedName?: string;
  memberName?: string;
  phone?: string;
  email?: string;
  emailVerified?: boolean;
};

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 80);
}

function hashOtp(code: string, normalizedName: string, purpose: OtpDoc["purpose"]) {
  return createHash("sha256").update(`otp|${normalizedName}|${code}|${purpose}`).digest("hex");
}

function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Strategy 2.0: issue HttpOnly session cookie after successful PIN auth. */
async function withMemberSession(
  db: Awaited<ReturnType<typeof getDb>>,
  req: NextRequest,
  args: { memberKey: string; memberName: string },
  payload: Record<string, unknown>,
  opts?: { rotateAll?: boolean },
) {
  if (opts?.rotateAll) {
    await revokeAllMemberSessions(db, args.memberKey);
  }
  const { token, expiresAt } = await createMemberSession(db, {
    memberKey: args.memberKey,
    memberName: args.memberName,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  const res = NextResponse.json({ ...payload, session: true, memberKey: args.memberKey });
  attachSessionCookie(res, token, expiresAt);
  return res;
}

export async function GET(req: NextRequest) {
  const memberName = normalizeName(req.nextUrl.searchParams.get("memberName"));
  if (!memberName) {
    return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    const [doc, member] = await Promise.all([
      db.collection(PINS_COLLECTION).findOne({ normalizedName }, { projection: { pinHash: 1 } }),
      db
        .collection<MemberContact>(MEMBERS_COLLECTION)
        .findOne({ normalizedName }, { projection: { emailVerified: 1 } }),
    ]);
    const hasPinSet = Boolean(doc?.pinHash);
    const emailVerified = Boolean(member?.emailVerified);
    const pinGate = hasPinSet ? "verify" : emailVerified ? "setup_otp" : "needs_invite";
    return NextResponse.json({ hasPinSet, emailVerified, pinGate });
  } catch (err) {
    console.error("XTREME PIN GET", err);
    return NextResponse.json({ error: "No se pudo verificar el PIN." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const memberName = normalizeName(body.memberName);
    const pin = String(body.pin ?? "").trim();
    const currentPin = String(body.currentPin ?? "").trim();
    const recoveryContact = String(body.recoveryContact ?? "").trim();
    const otpCode = String(body.otp ?? body.code ?? "").replace(/\D/g, "").slice(0, 6);
    const action = String(body.action ?? "");

    if (!memberName) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }

    const normalizedName = normalizeKey(memberName);
    const db = await getDb();
    const col = db.collection(PINS_COLLECTION);

    async function trackAccess(
      type: string,
      outcome: "success" | "failed" | "blocked",
      reason?: string,
    ) {
      await recordEvent(db, {
        type,
        memberId: normalizedName,
        source: "member_app",
        entity: { type: "member", id: normalizedName },
        properties: {
          outcome,
          action,
          ...(reason ? { reason } : {}),
          requestFingerprint: requestFingerprint(req),
        },
      });
    }

    async function notifyPinEvent(kind: "set" | "changed" | "recovered") {
      const member = await db
        .collection<MemberContact>(MEMBERS_COLLECTION)
        .findOne({ normalizedName }, { projection: { email: 1, emailVerified: 1, memberName: 1 } });
      if (memberEmailIsTrusted(member) && member?.email) {
        await sendPinChangedEmail({
          to: member.email,
          memberName: member.memberName || memberName,
          kind,
        });
      }
    }

    async function consumeOtp(purpose: OtpDoc["purpose"], code: string) {
      if (code.length !== 6) return { ok: false as const, error: "Código OTP de 6 dígitos requerido.", status: 400 };
      const otp = await db.collection<OtpDoc>(OTPS_COLLECTION).findOne({
        normalizedName,
        purpose,
      });
      if (!otp || new Date(otp.expiresAt).getTime() < Date.now()) {
        return {
          ok: false as const,
          error: "Codigo vencido o inexistente. Solicite uno nuevo.",
          status: 401,
        };
      }
      if (otp.attempts >= OTP_MAX_ATTEMPTS) {
        await db.collection(OTPS_COLLECTION).deleteMany({ normalizedName, purpose });
        return {
          ok: false as const,
          error: "Demasiados intentos. Solicite un codigo nuevo.",
          status: 429,
        };
      }
      if (otp.codeHash !== hashOtp(code, normalizedName, purpose)) {
        await db.collection(OTPS_COLLECTION).updateOne(
          { normalizedName, purpose },
          { $inc: { attempts: 1 } },
        );
        return { ok: false as const, error: "Codigo incorrecto.", status: 401 };
      }
      await db.collection(OTPS_COLLECTION).deleteMany({ normalizedName, purpose });
      return { ok: true as const };
    }

    // --- OTP: recuperación (PIN ya existe) o primer setup (correo verificado, sin PIN) ---
    if (action === "requestOtp") {
      const rate = await authAttemptStatus(db, req, {
        scope: "member_otp_request",
        subject: normalizedName,
      });
      if (rate.blocked) {
        await trackAccess("otp_requested", "blocked", "rate_limit");
        return NextResponse.json(
          { error: "Demasiadas solicitudes. Esperá unos minutos antes de pedir otro código." },
          { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
        );
      }
      const member = await db.collection<MemberContact>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member) {
        await recordFailedAuthAttempt(db, rate.key, {
          scope: "member_otp_request",
          maxAttempts: 3,
          windowMs: 15 * 60_000,
        });
        await trackAccess("otp_requested", "failed", "profile_not_found");
        return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
      }
      if (!memberEmailIsTrusted(member) || !member.email) {
        return NextResponse.json(
          {
            error:
              "Este perfil no tiene un correo verificado. Usá el enlace de invitación/registro o pedí ayuda en recepción.",
          },
          { status: 400 },
        );
      }

      const pinDoc = await col.findOne({ normalizedName }, { projection: { pinHash: 1 } });
      const purpose: OtpDoc["purpose"] = pinDoc?.pinHash ? "pin_recovery" : "pin_setup";

      if (recoveryContact) {
        const contactEmail = normalizeEmail(recoveryContact);
        if (contactEmail && contactEmail !== normalizeEmail(member.email)) {
          return NextResponse.json(
            { error: "El correo no coincide con el perfil." },
            { status: 401 },
          );
        }
      }

      const code = generateOtp();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + OTP_TTL_MIN * 60 * 1000);
      const otpDoc: OtpDoc = {
        normalizedName,
        purpose,
        codeHash: hashOtp(code, normalizedName, purpose),
        attempts: 0,
        expiresAt,
        createdAt: now,
      };

      await db.collection<OtpDoc>(OTPS_COLLECTION).deleteMany({
        normalizedName,
        purpose,
      });
      await db.collection<OtpDoc>(OTPS_COLLECTION).insertOne(otpDoc);

      const sent = await sendPinRecoveryOtpEmail({
        to: member.email,
        memberName: member.memberName || memberName,
        code,
        expiresMinutes: OTP_TTL_MIN,
        purpose,
      });

      if (!sent.ok) {
        await trackAccess("otp_requested", "failed", "email_delivery");
        return NextResponse.json(
          {
            error: sent.error || "No se pudo enviar el código. Intentá de nuevo.",
            emailErrorCode: sent.code || "unknown",
          },
          { status: 502 },
        );
      }

      const masked = member.email.replace(/(.{2}).+(@.+)/, "$1***$2");
      await recordFailedAuthAttempt(db, rate.key, {
        scope: "member_otp_request",
        maxAttempts: 3,
        windowMs: 15 * 60_000,
      });
      await trackAccess("otp_requested", "success");
      return NextResponse.json({
        ok: true,
        sent: true,
        purpose,
        expiresInMin: OTP_TTL_MIN,
        maskedEmail: masked,
      });
    }

    if (action !== "set" && action !== "verify" && action !== "change" && action !== "recover") {
      return NextResponse.json({ error: "Accion invalida." }, { status: 400 });
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN invalido." }, { status: 400 });
    }

    // --- Primer PIN (una sola vez): sesión post-enlace, OTP al correo verificado, o staff ---
    // No se puede "reconfigurar" con set: después solo change (PIN actual) o recover (OTP).
    if (action === "set") {
      const existing = await col.findOne({ normalizedName }, { projection: { pinHash: 1 } });
      if (existing?.pinHash) {
        await trackAccess("pin_created", "failed", "already_set");
        return NextResponse.json(
          {
            error: "Este usuario ya tiene PIN. Ingresalo o recuperarlo con el código del correo.",
            hasPinSet: true,
            code: "pin_already_set",
          },
          { status: 409 },
        );
      }

      const member = await db.collection<MemberContact>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member) {
        return NextResponse.json(
          {
            error:
              "Perfil no encontrado. Completá el registro con el enlace del correo o en recepción.",
          },
          { status: 404 },
        );
      }

      const memberSession = await resolveMemberSession(req);
      const staff = await resolveStaffSession(req, "reception");
      const staffOk = Boolean(staff?.role);
      // Token válido: cookie de sesión emitida al confirmar el enlace mágico / registro.
      const sessionOk = Boolean(memberSession && memberSession.memberKey === normalizedName);

      let otpOk = false;
      if (otpCode.length === 6) {
        const consumed = await consumeOtp("pin_setup", otpCode);
        if (!consumed.ok) {
          await trackAccess("pin_created", "failed", "otp_invalid");
          return NextResponse.json({ error: consumed.error }, { status: consumed.status });
        }
        if (!memberEmailIsTrusted(member)) {
          return NextResponse.json(
            { error: "El correo del perfil no está verificado." },
            { status: 403 },
          );
        }
        otpOk = true;
      }

      if (!sessionOk && !otpOk && !staffOk) {
        await trackAccess("pin_created", "failed", "token_required");
        if (memberEmailIsTrusted(member)) {
          return NextResponse.json(
            {
              error:
                "Para crear el PIN pedí un código al correo verificado de la cuenta (botón Enviar código), o abrí el enlace de invitación.",
              code: "pin_setup_otp_required",
              pinGate: "setup_otp",
            },
            { status: 403 },
          );
        }
        return NextResponse.json(
          {
            error:
              "No se puede crear el PIN solo con la cédula. Usá el enlace de invitación/registro del correo o pedí el alta en recepción.",
            code: "pin_setup_invite_required",
            pinGate: "needs_invite",
          },
          { status: 403 },
        );
      }

      const now = new Date();
      const setBy = sessionOk ? "magic_link_session" : otpOk ? "otp" : "staff";
      const pinHashValue = hashPin(pin, normalizedName);

      // Escritura atómica: solo si aún no hay pinHash (evita carrera de doble set).
      // Si ya existe doc con PIN, el filtro no matchea y el upsert choca el índice único.
      let created = false;
      try {
        const write = await col.updateOne(
          {
            normalizedName,
            $or: [{ pinHash: { $exists: false } }, { pinHash: null }, { pinHash: "" }],
          },
          {
            $set: {
              normalizedName,
              memberName: member.memberName || memberName,
              pinHash: pinHashValue,
              updatedAt: now,
              setBy,
              setAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true },
        );
        created = write.upsertedCount > 0 || write.modifiedCount > 0 || write.matchedCount > 0;
      } catch (err) {
        const code = (err as { code?: number })?.code;
        if (code === 11000) {
          await trackAccess("pin_created", "failed", "already_set_race");
          return NextResponse.json(
            {
              error: "Este usuario ya tiene PIN. Ingresalo o recuperarlo con el código del correo.",
              hasPinSet: true,
              code: "pin_already_set",
            },
            { status: 409 },
          );
        }
        throw err;
      }

      if (!created) {
        const again = await col.findOne({ normalizedName }, { projection: { pinHash: 1 } });
        if (again?.pinHash) {
          await trackAccess("pin_created", "failed", "already_set");
          return NextResponse.json(
            {
              error: "Este usuario ya tiene PIN. Ingresalo o recuperarlo con el código del correo.",
              hasPinSet: true,
              code: "pin_already_set",
            },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: "No se pudo crear el PIN. Intentá de nuevo." }, { status: 500 });
      }

      await notifyPinEvent("set");
      await trackAccess("pin_created", "success", setBy);
      return withMemberSession(
        db,
        req,
        { memberKey: normalizedName, memberName: member.memberName || memberName },
        { ok: true, hasPinSet: true, created: true },
        { rotateAll: true },
      );
    }

    const doc = await col.findOne({ normalizedName });
    if (!doc?.pinHash) return NextResponse.json({ valid: false, hasPinSet: false });

    if (action === "change") {
      const memberSession = await resolveMemberSession(req);
      if (!memberSession || memberSession.memberKey !== normalizedName) {
        await trackAccess("pin_change_attempted", "failed", "session_required");
        return NextResponse.json(
          { error: "Iniciá sesión antes de cambiar el PIN." },
          { status: 401 },
        );
      }
      if (!/^\d{4}$/.test(currentPin)) {
        return NextResponse.json({ error: "PIN actual requerido." }, { status: 400 });
      }
      if (doc.pinHash !== hashPin(currentPin, normalizedName)) {
        await trackAccess("pin_change_attempted", "failed", "incorrect_current_pin");
        return NextResponse.json({ error: "PIN actual incorrecto." }, { status: 401 });
      }
      await col.updateOne(
        { normalizedName },
        { $set: { pinHash: hashPin(pin, normalizedName), updatedAt: new Date() } },
      );
      await notifyPinEvent("changed");
      await trackAccess("pin_change_attempted", "success");
      return withMemberSession(
        db,
        req,
        { memberKey: normalizedName, memberName },
        { ok: true, changed: true, hasPinSet: true },
        { rotateAll: true },
      );
    }

    if (action === "recover") {
      // Solo OTP al correo verificado. Ya no se acepta teléfono/correo "a ojo"
      // (cualquiera que conociera el contacto reseteaba el PIN).
      if (otpCode.length !== 6) {
        return NextResponse.json(
          {
            error:
              "Para recuperar el PIN pedí un código al correo verificado de la cuenta. Recepción puede ayudar si no tenés acceso.",
            code: "otp_required",
          },
          { status: 401 },
        );
      }
      const member = await db.collection<MemberContact>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!memberEmailIsTrusted(member)) {
        return NextResponse.json(
          {
            error:
              "Este perfil no tiene correo verificado. Pedí una invitación en recepción o al super admin.",
          },
          { status: 403 },
        );
      }
      const consumed = await consumeOtp("pin_recovery", otpCode);
      if (!consumed.ok) {
        return NextResponse.json({ error: consumed.error }, { status: consumed.status });
      }

      await col.updateOne(
        { normalizedName },
        { $set: { pinHash: hashPin(pin, normalizedName), updatedAt: new Date() } },
      );
      await notifyPinEvent("recovered");
      await trackAccess("pin_recovered", "success", "otp");
      return withMemberSession(
        db,
        req,
        { memberKey: normalizedName, memberName },
        { ok: true, recovered: true, hasPinSet: true, method: "otp" },
        { rotateAll: true },
      );
    }

    // verify
    const loginRate = await authAttemptStatus(db, req, {
      scope: "member_pin_login",
      subject: normalizedName,
    });
    if (loginRate.blocked) {
      await trackAccess("login_attempted", "blocked", "rate_limit");
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá unos minutos antes de volver a ingresar." },
        { status: 429, headers: { "Retry-After": String(loginRate.retryAfterSeconds) } },
      );
    }
    const valid = doc.pinHash === hashPin(pin, normalizedName);
    if (!valid) {
      const failed = await recordFailedAuthAttempt(db, loginRate.key, {
        scope: "member_pin_login",
        maxAttempts: 5,
        windowMs: 15 * 60_000,
      });
      await trackAccess(
        "login_attempted",
        failed.blocked ? "blocked" : "failed",
        "incorrect_pin",
      );
      return NextResponse.json({ valid: false, hasPinSet: true });
    }
    await clearAuthAttempts(db, loginRate.key);
    await trackAccess("login_attempted", "success");
    return withMemberSession(
      db,
      req,
      { memberKey: normalizedName, memberName },
      { valid: true, hasPinSet: true },
    );
  } catch (err) {
    console.error("XTREME PIN POST", err);
    return NextResponse.json({ error: "No se pudo procesar el PIN." }, { status: 500 });
  }
}
