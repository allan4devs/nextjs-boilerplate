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
      const member = await db.collection<MemberContact>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member) {
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
      });

      if (!sent.ok) {
        return NextResponse.json(
          {
            error: sent.skipped
              ? "Correo no configurado (RESEND_API_KEY). Pedí ayuda en recepción."
              : sent.error || "No se pudo enviar el código. Intentá de nuevo.",
          },
          { status: 502 },
        );
      }

      const masked = member.email.replace(/(.{2}).+(@.+)/, "$1***$2");
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

    // --- Primer PIN: solo dueño del enlace (sesión post-registro), OTP al correo verificado, o staff ---
    if (action === "set") {
      const existing = await col.findOne({ normalizedName });
      if (existing?.pinHash) {
        return NextResponse.json(
          { error: "Este usuario ya tiene PIN.", hasPinSet: true },
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
      const sessionOk = Boolean(memberSession && memberSession.memberKey === normalizedName);

      let otpOk = false;
      if (otpCode.length === 6) {
        const consumed = await consumeOtp("pin_setup", otpCode);
        if (!consumed.ok) {
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
      await col.updateOne(
        { normalizedName },
        {
          $set: {
            normalizedName,
            memberName: member.memberName || memberName,
            pinHash: hashPin(pin, normalizedName),
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      await notifyPinEvent("set");
      return withMemberSession(
        db,
        req,
        { memberKey: normalizedName, memberName: member.memberName || memberName },
        { ok: true, hasPinSet: true },
        { rotateAll: true },
      );
    }

    const doc = await col.findOne({ normalizedName });
    if (!doc?.pinHash) return NextResponse.json({ valid: false, hasPinSet: false });

    if (action === "change") {
      if (!/^\d{4}$/.test(currentPin)) {
        return NextResponse.json({ error: "PIN actual requerido." }, { status: 400 });
      }
      if (doc.pinHash !== hashPin(currentPin, normalizedName)) {
        return NextResponse.json({ error: "PIN actual incorrecto." }, { status: 401 });
      }
      await col.updateOne(
        { normalizedName },
        { $set: { pinHash: hashPin(pin, normalizedName), updatedAt: new Date() } },
      );
      await notifyPinEvent("changed");
      return withMemberSession(
        db,
        req,
        { memberKey: normalizedName, memberName },
        { ok: true, changed: true, hasPinSet: true },
        { rotateAll: true },
      );
    }

    if (action === "recover") {
      // Solo OTP al correo verificado. Ya no se acepta teléfono/correo “a ojo”
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
      return withMemberSession(
        db,
        req,
        { memberKey: normalizedName, memberName },
        { ok: true, recovered: true, hasPinSet: true, method: "otp" },
        { rotateAll: true },
      );
    }

    // verify
    const valid = doc.pinHash === hashPin(pin, normalizedName);
    if (!valid) {
      return NextResponse.json({ valid: false, hasPinSet: true });
    }
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
