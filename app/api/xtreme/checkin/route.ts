import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { activateDayPassOnCheckin } from "@/lib/xtreme/entitlements";
import { FACE_RECOGNITION_ENABLED } from "@/lib/xtreme/face/config";
import {
  CHECKINS_COLLECTION,
  MEMBERS_COLLECTION,
  PINS_COLLECTION,
  type CheckinDoc,
  type MemberDoc,
  computeOccupancy,
  formatAccessCode,
  hammingHexDistance,
  hashPin,
  isCheckinOpen,
  memberAccessCode,
  membershipStatus,
  normalizeKey,
  normalizeName,
  todayIso,
  toAdminMember,
} from "@/lib/xtreme/shared";
import { recordEvent } from "@/lib/xtreme/events";
import { pushMemberEvent } from "@/lib/xtreme/member-push";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import {
  MEMBER_NOT_FOUND_MESSAGE,
  resolveMember,
} from "@/lib/xtreme/members/resolve-member";

export const dynamic = "force-dynamic";

/** Threshold Hamming dHash 64-bit (hex 16). Más bajo = más estricto. */
const FACE_MATCH_MAX_DISTANCE = 12;
const FACE_CANDIDATES_LIMIT = 5;

function isValidFaceHash(value: string) {
  return /^[0-9a-f]{16}$/i.test(value);
}

/** Public kiosk view - no phone/email/cédula/access code leakage. */
function toKioskMember(
  doc: MemberDoc,
  extra?: { hasPin?: boolean; faceDistance?: number },
) {
  const admin = toAdminMember(doc);
  return {
    memberName: admin.memberName,
    normalizedName: admin.normalizedName,
    photoUrl: admin.photoUrl,
    hasFace: admin.hasFace,
    membershipStatus: admin.membershipStatus,
    daysRemaining: admin.daysRemaining,
    plan: admin.plan,
    streak: admin.streak,
    levelName: admin.levelName,
    hasPin: Boolean(extra?.hasPin),
    faceDistance: extra?.faceDistance,
  };
}

async function withKioskFlag(
  db: Awaited<ReturnType<typeof getDb>>,
  doc: MemberDoc,
  extra?: Record<string, unknown>,
  staff = false,
) {
  const hasPin = Boolean(
    await db.collection(PINS_COLLECTION).findOne({
      normalizedName: doc.normalizedName || normalizeKey(doc.memberName || ""),
      pinHash: { $exists: true, $ne: "" },
    }),
  );
  if (staff) {
    return { ...toAdminMember(doc), ...extra, hasPin };
  }
  return {
    ...toKioskMember(doc, {
      hasPin,
      faceDistance: typeof extra?.faceDistance === "number" ? extra.faceDistance : undefined,
    }),
    ...extra,
    hasPin,
  };
}

/** Lista estado de gym + busqueda de socio (PII solo con admin). */
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const staff = Boolean(await resolveStaffSession(req, "reception"));
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
        ranked.map((row) => withKioskFlag(db, row.doc, { faceDistance: row.distance }, staff)),
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

    // Fuente única: cédula > memberKey > código > nombre/teléfono
    const resolved = await resolveMember(db, {
      cedula: cedula || undefined,
      code: codeDigits || undefined,
      q: q || undefined,
      strictCedula: Boolean(cedula),
    });

    if (!resolved) {
      return NextResponse.json(
        { status, member: null, error: MEMBER_NOT_FOUND_MESSAGE },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status,
      member: await withKioskFlag(db, resolved.member, { resolvedBy: resolved.resolvedBy }, staff),
      resolvedBy: resolved.resolvedBy,
    });
  } catch (err) {
    console.error("XTREME CHECKIN GET", err);
    return NextResponse.json({ error: "No se pudo cargar el ingreso." }, { status: 500 });
  }
}

/** Registrar ingreso: PIN del socio o codigo de staff (recepcion/admin). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const memberName = normalizeName(body.memberName);
    const codeDigits = String(body.accessCode ?? body.code ?? "").replace(/\D/g, "");
    const pin = String(body.pin ?? "").trim();
    const cedula = String(body.cedula ?? "").trim();
    const staffRole = (await resolveStaffSession(req, "reception"))?.role ?? null;
    const byRaw = String(body.by ?? (staffRole ? "reception" : "kiosk"));
    const by = (["kiosk", "admin", "reception"].includes(byRaw) ? byRaw : "kiosk") as CheckinDoc["by"];
    const methodRaw = String(
      body.method ?? (pin ? "pin" : cedula ? "cedula" : codeDigits ? "code" : staffRole ? "admin" : "name"),
    );
    const allowedMethods = ["code", "name", "pin", "admin", "cedula"];
    if (FACE_RECOGNITION_ENABLED) allowedMethods.push("face");
    const method = (allowedMethods.includes(methodRaw)
      ? methodRaw
      : "name") as CheckinDoc["method"];

    const db = await getDb();

    const resolved = await resolveMember(db, {
      cedula: cedula || undefined,
      code: codeDigits || undefined,
      memberName: memberName || undefined,
      q: memberName || cedula || codeDigits || undefined,
      strictCedula: Boolean(cedula),
    });

    if (!resolved?.member.memberName) {
      return NextResponse.json({ error: MEMBER_NOT_FOUND_MESSAGE }, { status: 404 });
    }

    let currentMember = resolved.member;
    const displayName = String(currentMember.memberName || "").trim();
    if (!displayName) {
      return NextResponse.json({ error: MEMBER_NOT_FOUND_MESSAGE }, { status: 404 });
    }
    const normalizedName =
      resolved.memberKey || currentMember.normalizedName || normalizeKey(displayName);
    const accessCode = formatAccessCode(memberAccessCode(normalizedName));

    // Auth: staff header OR valid member PIN (required for self-service kiosk).
    if (!staffRole) {
      if (!/^\d{4}$/.test(pin)) {
        return NextResponse.json(
          { error: "Ingresá tu PIN de 4 dígitos para registrar el ingreso." },
          { status: 401 },
        );
      }
      const pinDoc = await db
        .collection<{ pinHash?: string }>(PINS_COLLECTION)
        .findOne({ normalizedName });
      if (!pinDoc?.pinHash) {
        return NextResponse.json(
          {
            error:
              "Este socio no tiene PIN. Configuralo en la app o registrá el ingreso en recepción.",
          },
          { status: 400 },
        );
      }
      if (pinDoc.pinHash !== hashPin(pin, normalizedName)) {
        return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
      }
    }

    const ms = membershipStatus(currentMember.membership);
    const now = new Date();
    const date = todayIso();

    const latestCheckin = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne(
      { normalizedName, date },
      { sort: { checkedInAt: -1 } },
    );
    const recent = latestCheckin && isCheckinOpen(latestCheckin) ? latestCheckin : null;
    if (recent) {
      const status = await computeOccupancy(db);
      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "Esta persona ya aparece dentro del gimnasio.",
        member: staffRole ? toAdminMember(currentMember) : toKioskMember(currentMember, { hasPin: true }),
        membershipStatus: ms.status,
        checkin: recent,
        status,
      });
    }

    const checkin: CheckinDoc = {
      id: `chk-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      memberName: displayName,
      normalizedName,
      accessCode,
      method: staffRole ? (method === "name" ? "admin" : method) : pin ? "pin" : method,
      membershipStatus: ms.status,
      date,
      checkedInAt: now,
      checkedOutAt: null,
      by: staffRole ? (by === "kiosk" ? "reception" : by) : "kiosk",
      note: String(body.note ?? "").trim().slice(0, 120),
    };

    await db.collection<CheckinDoc>(CHECKINS_COLLECTION).insertOne(checkin);

    // Activate 1-day pass on check-in if member has a pending day pass
    let activeMs = ms;
    try {
      const activatedEnt = await activateDayPassOnCheckin(db, normalizedName, date);
      if (activatedEnt) {
        const updatedMember = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
        if (updatedMember) {
          currentMember = updatedMember;
          activeMs = membershipStatus(updatedMember.membership);
          checkin.membershipStatus = activeMs.status;
        }
      }
    } catch (actErr) {
      console.error("XTREME DAY PASS ACTIVATE ERROR", actErr);
    }

    const priorCheckins = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).countDocuments({
      normalizedName,
      id: { $ne: checkin.id },
    });
    const isFirstCheckin = priorCheckins === 0;

    const eventSource = checkin.by === "reception" ? "reception" : checkin.by === "admin" ? "admin" : "kiosk";

    await recordEvent(db, {
      type: "checkin_completed",
      memberId: normalizedName,
      source: eventSource,
      entity: { type: "checkin", id: checkin.id },
      properties: { method: checkin.method, membershipStatus: ms.status, date, first: isFirstCheckin },
    });
    if (isFirstCheckin) {
      await recordEvent(db, {
        type: "first_checkin",
        memberId: normalizedName,
        source: eventSource,
        entity: { type: "checkin", id: checkin.id },
        properties: { method: checkin.method, membershipStatus: ms.status, date },
      });
    }

    // Ingreso OS confirma en el mismo celular que la entrada sí quedó registrada.
    // Se espera el resultado para que el runtime serverless no corte el envío al responder.
    if (checkin.by === "kiosk") {
      const push = await pushMemberEvent(db, normalizedName, { type: "visit_checked_in" });
      if (push.sent > 0) {
        await recordEvent(db, {
          type: "notification_sent",
          memberId: normalizedName,
          source: "kiosk",
          entity: { type: "checkin_confirmation", id: checkin.id },
          properties: {
            campaign: "checkin-confirmation",
            checkinId: checkin.id,
            pushDevices: push.sent,
          },
        });
      }
    }

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
        activeMs.status === "expired"
          ? "Ingreso registrado. Membresia vencida - hablar con recepcion."
          : activeMs.status === "warning"
            ? "Bienvenido. Tu membresia vence pronto."
            : referralReward.rewarded
              ? "Bienvenido. Referido calificado: +7 dias para vos y tu amigo."
              : "Bienvenido a Xtreme Gym.",
      member: staffRole ? toAdminMember(currentMember) : toKioskMember(currentMember, { hasPin: true }),
      membershipStatus: activeMs.status,
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
