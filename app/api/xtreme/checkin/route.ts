import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { FACE_RECOGNITION_ENABLED } from "@/lib/xtreme/face/config";
import {
  CHECKINS_COLLECTION,
  MEMBERS_COLLECTION,
  PINS_COLLECTION,
  type CheckinDoc,
  type MemberDoc,
  computeOccupancy,
  findMemberByCedula,
  formatAccessCode,
  hammingHexDistance,
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

/** Threshold Hamming dHash 64-bit (hex 16). Más bajo = más estricto. */
const FACE_MATCH_MAX_DISTANCE = 12;
const FACE_CANDIDATES_LIMIT = 5;

function findByCedula(docs: MemberDoc[], raw: string): MemberDoc | undefined {
  return findMemberByCedula(docs, raw);
}

function isValidFaceHash(value: string) {
  return /^[0-9a-f]{16}$/i.test(value);
}

async function withPinFlag(
  db: Awaited<ReturnType<typeof getDb>>,
  doc: MemberDoc,
  extra?: Record<string, unknown>,
) {
  const adminMember = toAdminMember(doc);
  return {
    ...adminMember,
    ...extra,
    hasPin: Boolean(
      await db.collection(PINS_COLLECTION).findOne({
        normalizedName: adminMember.normalizedName,
      }),
    ),
  };
}

/** Lista estado del gym + busqueda de socio por nombre, codigo, cedula o rostro. */
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const q = normalizeName(req.nextUrl.searchParams.get("q"));
    const codeDigits = String(req.nextUrl.searchParams.get("code") ?? "").replace(/\D/g, "");
    const cedula = String(req.nextUrl.searchParams.get("cedula") ?? "").trim();
    const faceHash = String(req.nextUrl.searchParams.get("faceHash") ?? "")
      .toLowerCase()
      .replace(/[^0-9a-f]/g, "");

    const status = await computeOccupancy(db);

    if (faceHash && !FACE_RECOGNITION_ENABLED) {
      return NextResponse.json(
        { status, member: null, error: "Reconocimiento facial deshabilitado." },
        { status: 503 },
      );
    }

    // Match facial (kiosk /ingreso) — sin auth de staff
    if (faceHash && isValidFaceHash(faceHash)) {
      const docs = await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find({ faceHash: { $exists: true, $type: "string", $ne: "" } })
        .toArray();

      const ranked = docs
        .map((doc) => ({
          doc,
          distance: hammingHexDistance(faceHash, String(doc.faceHash || "")),
        }))
        .filter((row) => row.distance <= FACE_MATCH_MAX_DISTANCE)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, FACE_CANDIDATES_LIMIT);

      const matches = await Promise.all(
        ranked.map((row) => withPinFlag(db, row.doc, { faceDistance: row.distance })),
      );

      return NextResponse.json({
        status,
        matches,
        bestMatch: matches[0] ?? null,
        member: matches[0] ?? null,
        error: matches.length ? undefined : "Sin coincidencias de rostro.",
      });
    }

    if (!q && !codeDigits && !cedula) {
      return NextResponse.json({ status, member: null });
    }

    const docs = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray();
    let match: MemberDoc | undefined;

    if (cedula) {
      match = findByCedula(docs, cedula);
    }

    if (!match && codeDigits.length >= 4) {
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
        docs.find((d) => (d.phone || "").includes(q)) ||
        findByCedula(docs, q);
    }

    if (!match) {
      return NextResponse.json({ status, member: null, error: "Socio no encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      status,
      member: await withPinFlag(db, match),
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
    const cedula = String(body.cedula ?? "").trim();
    const byRaw = String(body.by ?? "kiosk");
    const by = (["kiosk", "admin", "reception"].includes(byRaw) ? byRaw : "kiosk") as CheckinDoc["by"];
    const methodRaw = String(
      body.method ?? (pin ? "pin" : cedula ? "cedula" : codeDigits ? "code" : "name"),
    );
    const allowedMethods = ["code", "name", "pin", "admin", "cedula"];
    if (FACE_RECOGNITION_ENABLED) allowedMethods.push("face");
    const method = (allowedMethods.includes(methodRaw)
      ? methodRaw
      : "name") as CheckinDoc["method"];

    const db = await getDb();
    const docs = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray();

    let member: MemberDoc | undefined;
    if (memberName) {
      const key = normalizeKey(memberName);
      member = docs.find((d) => (d.normalizedName || "") === key);
    }
    if (!member && cedula) {
      member = findByCedula(docs, cedula);
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
      by,
      note: String(body.note ?? "").trim().slice(0, 120),
    };

    await db.collection<CheckinDoc>(CHECKINS_COLLECTION).insertOne(checkin);

    const priorCheckins = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).countDocuments({
      normalizedName,
      id: { $ne: checkin.id },
    });
    const isFirstCheckin = priorCheckins === 0;

    const eventSource = by === "reception" ? "reception" : by === "admin" ? "admin" : "kiosk";

    await recordEvent(db, {
      type: "checkin_completed",
      memberId: normalizedName,
      source: eventSource,
      entity: { type: "checkin", id: checkin.id },
      properties: { method, membershipStatus: ms.status, date, first: isFirstCheckin },
    });
    if (isFirstCheckin) {
      await recordEvent(db, {
        type: "first_checkin",
        memberId: normalizedName,
        source: eventSource,
        entity: { type: "checkin", id: checkin.id },
        properties: { method, membershipStatus: ms.status, date },
      });
    }

    // Phase 3: qualify referral after first paid verified visit
    let referralReward: { rewarded: boolean; referrer?: string } = { rewarded: false };
    try {
      const { tryQualifyReferralOnCheckin } = await import("@/lib/xtreme/referrals");
      referralReward = await tryQualifyReferralOnCheckin(db, {
        memberKey: normalizedName,
        checkinId: checkin.id,
        date,
      });
    } catch (refErr) {
      console.error("XTREME REFERRAL QUALIFY", refErr);
    }

    const status = await computeOccupancy(db);

    return NextResponse.json({
      ok: true,
      duplicate: false,
      message:
        ms.status === "expired"
          ? "Ingreso registrado. Membresia vencida — hablar con recepcion."
          : ms.status === "warning"
            ? "Bienvenido. Tu membresia vence pronto."
            : referralReward.rewarded
              ? "Bienvenido. Referido calificado: +7 dias para vos y tu amigo."
              : "Bienvenido a Xtreme Gym.",
      member: toAdminMember(member),
      membershipStatus: ms.status,
      checkin,
      status,
      firstCheckin: isFirstCheckin,
      referralReward,
    });
  } catch (err) {
    console.error("XTREME CHECKIN POST", err);
    return NextResponse.json({ error: "No se pudo registrar el ingreso." }, { status: 500 });
  }
}
