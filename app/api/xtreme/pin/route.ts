import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";

export const dynamic = "force-dynamic";

const PINS_COLLECTION = "xtreme_gym_pins";
const MEMBERS_COLLECTION = "xtreme_gym_members";
const PEPPER = "xtreme-gym-member-pin-v1";

type MemberDoc = {
  normalizedName?: string;
  memberName?: string;
  phone?: string;
  email?: string;
};

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/[^\d+]/g, "").slice(0, 24);
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 80);
}

function hashPin(pin: string, normalizedName: string) {
  return createHash("sha256").update(`${normalizedName}|${pin}|${PEPPER}`).digest("hex");
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
    const action = String(body.action ?? "");

    if (!memberName) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN invalido." }, { status: 400 });
    }
    if (action !== "set" && action !== "verify" && action !== "change" && action !== "recover") {
      return NextResponse.json({ error: "Accion invalida." }, { status: 400 });
    }

    const normalizedName = normalizeKey(memberName);
    const db = await getDb();
    const col = db.collection(PINS_COLLECTION);

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
      return NextResponse.json({ ok: true, changed: true, hasPinSet: true });
    }

    if (action === "recover") {
      const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      const contactPhone = normalizePhone(recoveryContact);
      const contactEmail = normalizeEmail(recoveryContact);
      const matchesPhone = Boolean(contactPhone && member?.phone && normalizePhone(member.phone) === contactPhone);
      const matchesEmail = Boolean(contactEmail && member?.email && normalizeEmail(member.email) === contactEmail);

      if (!matchesPhone && !matchesEmail) {
        return NextResponse.json(
          { error: "El contacto no coincide con el perfil. Recepcion puede actualizarlo." },
          { status: 401 },
        );
      }

      await col.updateOne(
        { normalizedName },
        { $set: { pinHash: hashPin(pin, normalizedName), updatedAt: new Date() } },
      );
      return NextResponse.json({ ok: true, recovered: true, hasPinSet: true });
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
