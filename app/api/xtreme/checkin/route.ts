import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  CHECKINS_COLLECTION,
  MEMBERS_COLLECTION,
  PINS_COLLECTION,
  type CheckinDoc,
  type MemberDoc,
  computeOccupancy,
  formatAccessCode,
  hashPin,
  memberAccessCode,
  membershipStatus,
  normalizeKey,
  normalizeName,
  todayIso,
  toAdminMember,
} from "@/lib/xtreme/shared";
import { recordEvent } from "@/lib/xtreme/events";

export const dynamic = "force-dynamic";

/** Lista estado del gym + busqueda de socio por nombre o codigo. */
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const q = normalizeName(req.nextUrl.searchParams.get("q"));
    const codeDigits = String(req.nextUrl.searchParams.get("code") ?? "").replace(/\D/g, "");

    const status = await computeOccupancy(db);

    if (!q && !codeDigits) {
      return NextResponse.json({ status, member: null });
    }

    const docs = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray();
    let match: MemberDoc | undefined;

    if (codeDigits.length >= 4) {
      match = docs.find((d) => {
        const key = d.normalizedName || normalizeKey(d.memberName || "");
        const code = memberAccessCode(key);
        return code.includes(codeDigits) || code === codeDigits.padStart(8, "0");
      });
    }

    if (!match && q) {
      const key = normalizeKey(q);
      match =
        docs.find((d) => (d.normalizedName || "") === key) ||
        docs.find((d) => (d.memberName || "").toUpperCase().includes(key)) ||
        docs.find((d) => (d.phone || "").includes(q));
    }

    if (!match) {
      return NextResponse.json({ status, member: null, error: "Socio no encontrado." }, { status: 404 });
    }

    const adminMember = toAdminMember(match);
    return NextResponse.json({
      status,
      member: {
        ...adminMember,
        hasPin: Boolean(
          await db.collection(PINS_COLLECTION).findOne({
            normalizedName: adminMember.normalizedName,
          }),
        ),
      },
    });
  } catch (err) {
    console.error("XTREME CHECKIN GET", err);
    return NextResponse.json({ error: "No se pudo cargar el ingreso." }, { status: 500 });
  }
}

/** Registrar ingreso al gym. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const memberName = normalizeName(body.memberName);
    const codeDigits = String(body.accessCode ?? body.code ?? "").replace(/\D/g, "");
    const pin = String(body.pin ?? "").trim();
    const methodRaw = String(body.method ?? (pin ? "pin" : codeDigits ? "code" : "name"));
    const method = (["code", "name", "pin", "admin"].includes(methodRaw)
      ? methodRaw
      : "name") as CheckinDoc["method"];

    const db = await getDb();
    const docs = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray();

    let member: MemberDoc | undefined;
    if (memberName) {
      const key = normalizeKey(memberName);
      member = docs.find((d) => (d.normalizedName || "") === key);
    }
    if (!member && codeDigits.length >= 4) {
      member = docs.find((d) => {
        const key = d.normalizedName || normalizeKey(d.memberName || "");
        const code = memberAccessCode(key);
        return code === codeDigits.padStart(8, "0") || code.includes(codeDigits);
      });
    }

    if (!member?.memberName) {
      return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    }

    const normalizedName = member.normalizedName || normalizeKey(member.memberName);
    const accessCode = formatAccessCode(memberAccessCode(normalizedName));

    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        return NextResponse.json({ error: "PIN invalido." }, { status: 400 });
      }
      const pinDoc = await db
        .collection<{ pinHash?: string }>(PINS_COLLECTION)
        .findOne({ normalizedName });
      if (!pinDoc?.pinHash) {
        return NextResponse.json({ error: "Este socio no tiene PIN configurado." }, { status: 400 });
      }
      if (pinDoc.pinHash !== hashPin(pin, normalizedName)) {
        return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
      }
    }

    const ms = membershipStatus(member.membership);
    const now = new Date();
    const date = todayIso();

    const recent = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne({
      normalizedName,
      date,
      checkedInAt: { $gte: new Date(now.getTime() - 20 * 60 * 1000) },
    });
    if (recent) {
      const status = await computeOccupancy(db);
      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "Ya ingreso hace poco. Bienvenido de nuevo.",
        member: toAdminMember(member),
        membershipStatus: ms.status,
        checkin: recent,
        status,
      });
    }

    const checkin: CheckinDoc = {
      id: `chk-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      memberName: member.memberName,
      normalizedName,
      accessCode,
      method,
      membershipStatus: ms.status,
      date,
      checkedInAt: now,
      by: "kiosk",
      note: String(body.note ?? "").trim().slice(0, 120),
    };

    await db.collection<CheckinDoc>(CHECKINS_COLLECTION).insertOne(checkin);
    await recordEvent(db, {
      type: "checkin_completed",
      memberId: normalizedName,
      source: "kiosk",
      entity: { type: "checkin", id: checkin.id },
      properties: { method, membershipStatus: ms.status, date },
    });
    const status = await computeOccupancy(db);

    return NextResponse.json({
      ok: true,
      duplicate: false,
      message:
        ms.status === "expired"
          ? "Ingreso registrado. Membresia vencida — hablar con recepcion."
          : ms.status === "warning"
            ? "Bienvenido. Tu membresia vence pronto."
            : "Bienvenido a Xtreme Gym.",
      member: toAdminMember(member),
      membershipStatus: ms.status,
      checkin,
      status,
    });
  } catch (err) {
    console.error("XTREME CHECKIN POST", err);
    return NextResponse.json({ error: "No se pudo registrar el ingreso." }, { status: 500 });
  }
}
