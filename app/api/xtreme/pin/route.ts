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
  normalizeKey,
  normalizeName,
} from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

const OTP_TTL_MIN = 15;
const OTP_MAX_ATTEMPTS = 5;

type MemberContact = {
  normalizedName?: string;
  memberName?: string;
  phone?: string;
  email?: string;
};

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/[^\d+]/g, "").slice(0, 24);
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 80);
}

function hashOtp(code: string, normalizedName: string) {
  return createHash("sha256").update(`otp|${normalizedName}|${code}|pin-recovery`).digest("hex");
}

function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function GET(req: NextRequest) {
  const memberName = normalizeName(req.nextUrl.searchParams.get("memberName"));
  if (!memberName) {
    return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const doc = await db
      .collection(PINS_COLLECTION)
      .findOne({ normalizedName: normalizeKey(memberName) }, { projection: { pinHash: 1 } });

    return NextResponse.json({ hasPinSet: Boolean(doc?.pinHash) });
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
        .findOne({ normalizedName }, { projection: { email: 1, memberName: 1 } });
      if (member?.email) {
        await sendPinChangedEmail({
          to: member.email,
          memberName: member.memberName || memberName,
          kind,
        });
      }
    }

    // --- Solicitar codigo OTP por correo (Fase 3) ---
    if (action === "requestOtp") {
      const member = await db.collection<MemberContact>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member) {
        return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
      }
      if (!member.email) {
        return NextResponse.json(
          {
            error:
              "Este perfil no tiene correo. Agregue un correo en Perfil o pida ayuda en recepcion.",
          },
          { status: 400 },
        );
      }

      // Si envian contacto, debe coincidir con el email del perfil.
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
        purpose: "pin_recovery",
        codeHash: hashOtp(code, normalizedName),
        attempts: 0,
        expiresAt,
        createdAt: now,
      };

      await db.collection<OtpDoc>(OTPS_COLLECTION).deleteMany({
        normalizedName,
        purpose: "pin_recovery",
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
              ? "Correo no configurado (RESEND_API_KEY). Use recuperacion por contacto o recepcion."
              : "No se pudo enviar el codigo. Intente de nuevo.",
          },
          { status: 502 },
        );
      }

      const masked = member.email.replace(/(.{2}).+(@.+)/, "$1***$2");
      return NextResponse.json({
        ok: true,
        sent: true,
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

    if (action === "set") {
      const existing = await col.findOne({ normalizedName });
      if (existing?.pinHash) {
        return NextResponse.json(
          { error: "Este usuario ya tiene PIN.", hasPinSet: true },
          { status: 409 },
        );
      }

      const now = new Date();
      await col.updateOne(
        { normalizedName },
        {
          $set: {
            normalizedName,
            memberName,
            pinHash: hashPin(pin, normalizedName),
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      await notifyPinEvent("set");
      return NextResponse.json({ ok: true });
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
      return NextResponse.json({ ok: true, changed: true, hasPinSet: true });
    }

    if (action === "recover") {
      // Preferido: OTP de 6 digitos enviado al correo del perfil.
      if (otpCode.length === 6) {
        const otp = await db.collection<OtpDoc>(OTPS_COLLECTION).findOne({
          normalizedName,
          purpose: "pin_recovery",
        });
        if (!otp || new Date(otp.expiresAt).getTime() < Date.now()) {
          return NextResponse.json(
            { error: "Codigo vencido o inexistente. Solicite uno nuevo." },
            { status: 401 },
          );
        }
        if (otp.attempts >= OTP_MAX_ATTEMPTS) {
          await db.collection(OTPS_COLLECTION).deleteMany({ normalizedName, purpose: "pin_recovery" });
          return NextResponse.json(
            { error: "Demasiados intentos. Solicite un codigo nuevo." },
            { status: 429 },
          );
        }
        if (otp.codeHash !== hashOtp(otpCode, normalizedName)) {
          await db.collection(OTPS_COLLECTION).updateOne(
            { normalizedName, purpose: "pin_recovery" },
            { $inc: { attempts: 1 } },
          );
          return NextResponse.json({ error: "Codigo incorrecto." }, { status: 401 });
        }

        await col.updateOne(
          { normalizedName },
          { $set: { pinHash: hashPin(pin, normalizedName), updatedAt: new Date() } },
        );
        await db.collection(OTPS_COLLECTION).deleteMany({ normalizedName, purpose: "pin_recovery" });
        await notifyPinEvent("recovered");
        return NextResponse.json({ ok: true, recovered: true, hasPinSet: true, method: "otp" });
      }

      // Fallback: contacto (telefono o correo) debe coincidir con el perfil.
      const member = await db.collection<MemberContact>(MEMBERS_COLLECTION).findOne({ normalizedName });
      const contactPhone = normalizePhone(recoveryContact);
      const contactEmail = normalizeEmail(recoveryContact);
      const matchesPhone = Boolean(
        contactPhone && member?.phone && normalizePhone(member.phone) === contactPhone,
      );
      const matchesEmail = Boolean(
        contactEmail && member?.email && normalizeEmail(member.email) === contactEmail,
      );

      if (!matchesPhone && !matchesEmail) {
        return NextResponse.json(
          {
            error:
              "Use el codigo del correo, o un contacto que coincida con el perfil. Recepcion puede actualizarlo.",
          },
          { status: 401 },
        );
      }

      await col.updateOne(
        { normalizedName },
        { $set: { pinHash: hashPin(pin, normalizedName), updatedAt: new Date() } },
      );
      await notifyPinEvent("recovered");
      return NextResponse.json({ ok: true, recovered: true, hasPinSet: true, method: "contact" });
    }

    return NextResponse.json({
      valid: doc.pinHash === hashPin(pin, normalizedName),
      hasPinSet: true,
    });
  } catch (err) {
    console.error("XTREME PIN POST", err);
    return NextResponse.json({ error: "No se pudo procesar el PIN." }, { status: 500 });
  }
}
