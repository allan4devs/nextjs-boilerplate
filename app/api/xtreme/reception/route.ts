import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { recordEvent } from "@/lib/xtreme/events";
import { writeAudit } from "@/lib/xtreme/audit";
import {
  CHECKINS_COLLECTION,
  FACE_RECOGNITION_ENABLED,
  MEMBERS_COLLECTION,
  type CheckinDoc,
  type MemberDoc,
  cedulaDigits,
  computeOccupancy,
  formatAccessCode,
  hammingHexDistance,
  isValidEmail,
  memberAccessCode,
  membershipStatus,
  normalizeCedula,
  normalizeEmail,
  normalizeKey,
  normalizeName,
  normalizePhone,
  resolveAdminRole,
  todayIso,
  toAdminMember,
} from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

/** Threshold de Hamming para dHash de 64 bits (hex 16 chars). Más bajo = más estricto. */
const FACE_MATCH_MAX_DISTANCE = 12;
const FACE_CANDIDATES_LIMIT = 5;

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function roleFromReq(req: NextRequest) {
  return resolveAdminRole(req.headers.get("x-xtreme-admin") ?? "");
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isDataUrlPhoto(value: string) {
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value) && value.length < 900_000;
}

function isValidFaceHash(value: string) {
  return /^[0-9a-f]{16}$/i.test(value);
}

/**
 * GET — panel de recepcion:
 *  - estado de ocupacion + ingresos recientes
 *  - roster ligero de socios con foto/face (para galeria)
 *  - match de faceHash por query
 */
export async function GET(req: NextRequest) {
  const role = roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const db = await getDb();
    const faceHash = String(req.nextUrl.searchParams.get("faceHash") ?? "")
      .toLowerCase()
      .replace(/[^0-9a-f]/g, "");
    const roster = req.nextUrl.searchParams.get("roster") === "1";

    const status = await computeOccupancy(db);
    const recent = await db
      .collection<CheckinDoc>(CHECKINS_COLLECTION)
      .find({ date: todayIso() })
      .sort({ checkedInAt: -1 })
      .limit(20)
      .toArray();

    if (faceHash && !FACE_RECOGNITION_ENABLED) {
      return NextResponse.json(
        { error: "Reconocimiento facial deshabilitado." },
        { status: 503 },
      );
    }

    if (faceHash && isValidFaceHash(faceHash)) {
      const docs = await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find({ faceHash: { $exists: true, $ne: "" } })
        .project({
          memberName: 1,
          normalizedName: 1,
          cedula: 1,
          phone: 1,
          email: 1,
          photoUrl: 1,
          faceHash: 1,
          membership: 1,
          goal: 1,
          coach: 1,
          workouts: 1,
          bodyMetrics: 1,
          weeklyGoal: 1,
          freezeHistory: 1,
          earnedBadges: 1,
          xpBonus: 1,
          freezesBonus: 1,
        })
        .toArray();

      const ranked = docs
        .map((doc) => ({
          doc,
          distance: hammingHexDistance(faceHash, String(doc.faceHash || "")),
        }))
        .filter((row) => row.distance <= FACE_MATCH_MAX_DISTANCE)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, FACE_CANDIDATES_LIMIT);

      return NextResponse.json({
        role,
        status,
        recent: recent.map((c) => ({
          id: c.id,
          memberName: c.memberName,
          accessCode: c.accessCode,
          method: c.method,
          membershipStatus: c.membershipStatus,
          checkedInAt: c.checkedInAt,
          by: c.by,
        })),
        matches: ranked.map((row) => ({
          ...toAdminMember(row.doc),
          faceDistance: row.distance,
        })),
        bestMatch: ranked[0]
          ? { ...toAdminMember(ranked[0].doc), faceDistance: ranked[0].distance }
          : null,
      });
    }

    let members: ReturnType<typeof toAdminMember>[] = [];
    if (roster) {
      const docs = await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find({})
        .project({
          memberName: 1,
          normalizedName: 1,
          cedula: 1,
          phone: 1,
          email: 1,
          photoUrl: 1,
          faceHash: 1,
          membership: 1,
          goal: 1,
          coach: 1,
          workouts: 1,
          bodyMetrics: 1,
          weeklyGoal: 1,
          freezeHistory: 1,
          earnedBadges: 1,
          xpBonus: 1,
          freezesBonus: 1,
        })
        .limit(400)
        .toArray();

      members = docs
        .filter((d) => d.memberName)
        .map((d) => toAdminMember(d))
        .sort((a, b) => a.memberName.localeCompare(b.memberName, "es"));
    }

    return NextResponse.json({
      role,
      status,
      recent: recent.map((c) => ({
        id: c.id,
        memberName: c.memberName,
        accessCode: c.accessCode,
        method: c.method,
        membershipStatus: c.membershipStatus,
        checkedInAt: c.checkedInAt,
        by: c.by,
      })),
      members,
      faceEnrolled: members.filter((m) => m.hasFace).length,
    });
  } catch (err) {
    console.error("XTREME RECEPTION GET", err);
    return NextResponse.json({ error: "No se pudo cargar recepcion." }, { status: 500 });
  }
}

/**
 * POST actions:
 *  - register: alta rapida en mostrador (sin email magic link)
 *  - enroll_face: guarda foto + faceHash de un socio
 */
export async function POST(req: NextRequest) {
  const role = roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "register");
    const db = await getDb();
    const now = new Date();

    if (action === "enroll_face") {
      if (!FACE_RECOGNITION_ENABLED) {
        return NextResponse.json(
          { error: "Reconocimiento facial deshabilitado." },
          { status: 503 },
        );
      }
      const memberName = normalizeName(body.memberName);
      const faceHash = String(body.faceHash ?? "")
        .toLowerCase()
        .replace(/[^0-9a-f]/g, "");
      const photoUrl = String(body.photoUrl ?? "").trim();

      if (!memberName) {
        return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
      }
      if (!isValidFaceHash(faceHash)) {
        return NextResponse.json({ error: "faceHash invalido." }, { status: 400 });
      }
      if (photoUrl && !isDataUrlPhoto(photoUrl) && !photoUrl.startsWith("https://")) {
        return NextResponse.json({ error: "Foto invalida." }, { status: 400 });
      }

      const normalizedName = normalizeKey(memberName);
      const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member) {
        return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
      }

      const set: Partial<MemberDoc> = {
        faceHash,
        updatedAt: now,
      };
      if (photoUrl) set.photoUrl = photoUrl;

      await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne({ normalizedName }, { $set: set });
      await writeAudit(db, {
        actorRole: role,
        action: "member.enroll_face",
        targetType: "member",
        targetId: normalizedName,
        summary: `Rostro enrolado: ${member.memberName || memberName}`,
      });

      const updated = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({
        ok: true,
        member: updated ? toAdminMember(updated) : null,
      });
    }

    if (action === "register") {
      const memberName = normalizeName(body.memberName);
      const cedula = normalizeCedula(body.cedula);
      const phone = normalizePhone(body.phone);
      const email = normalizeEmail(body.email);
      const goal = String(body.goal ?? "").trim().slice(0, 80);
      const plan = String(body.plan ?? "Xtreme Mensual").trim().slice(0, 80) || "Xtreme Mensual";
      const photoUrl = String(body.photoUrl ?? "").trim();
      // Con la feature apagada el alta sigue funcionando: solo se ignora el rostro.
      const faceHash = FACE_RECOGNITION_ENABLED
        ? String(body.faceHash ?? "")
            .toLowerCase()
            .replace(/[^0-9a-f]/g, "")
        : "";
      const checkInNow = body.checkInNow !== false;

      if (!memberName) {
        return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });
      }
      if (!cedula || cedulaDigits(cedula).length < 6) {
        return NextResponse.json({ error: "Cedula invalida (min. 6 digitos)." }, { status: 400 });
      }
      if (!phone || phone.replace(/\D/g, "").length < 8) {
        return NextResponse.json({ error: "Telefono invalido." }, { status: 400 });
      }
      if (email && !isValidEmail(email)) {
        return NextResponse.json({ error: "Correo invalido." }, { status: 400 });
      }
      if (photoUrl && !isDataUrlPhoto(photoUrl) && !photoUrl.startsWith("https://")) {
        return NextResponse.json({ error: "Foto invalida." }, { status: 400 });
      }
      if (faceHash && !isValidFaceHash(faceHash)) {
        return NextResponse.json({ error: "faceHash invalido." }, { status: 400 });
      }

      const normalizedName = normalizeKey(memberName);
      const digits = cedulaDigits(cedula);

      const candidates = await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find({
          normalizedName: { $ne: normalizedName },
          $or: [
            ...(email ? [{ email }] : []),
            { phone },
            { cedula },
            ...(digits ? [{ cedula: { $regex: digits } }] : []),
          ],
        })
        .limit(20)
        .toArray();

      const duplicate =
        candidates.find((d) => email && normalizeEmail(d.email) === email) ||
        candidates.find((d) => normalizePhone(d.phone) === phone) ||
        candidates.find((d) => {
          const other = cedulaDigits(d.cedula);
          return Boolean(other && digits && (other === digits || other.endsWith(digits) || digits.endsWith(other)));
        });

      if (duplicate) {
        return NextResponse.json(
          {
            error: `Ese contacto ya esta ligado a ${duplicate.memberName}. Use el ingreso.`,
            member: toAdminMember(duplicate),
          },
          { status: 409 },
        );
      }

      const existing = await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .findOne({ normalizedName });

      const set: Partial<MemberDoc> = {
        normalizedName,
        memberName,
        cedula,
        phone,
        updatedAt: now,
      };
      if (email) {
        set.email = email;
        set.emailVerified = true;
      }
      if (goal) set.goal = goal;
      if (photoUrl) set.photoUrl = photoUrl;
      if (faceHash) set.faceHash = faceHash;

      if (!existing) {
        set.membership = {
          plan,
          nextBillingDate: addMonths(now, 1).toISOString().slice(0, 10),
          startedAt: now.toISOString().slice(0, 10),
          status: "active",
        };
      } else if (!existing.membership) {
        set.membership = {
          plan,
          nextBillingDate: addMonths(now, 1).toISOString().slice(0, 10),
          startedAt: now.toISOString().slice(0, 10),
          status: "active",
        };
      }

      await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $set: set,
          $setOnInsert: { workouts: [], bodyMetrics: [], createdAt: now },
        },
        { upsert: true },
      );

      await writeAudit(db, {
        actorRole: role,
        action: existing ? "member.update_walkin" : "member.register_walkin",
        targetType: "member",
        targetId: normalizedName,
        summary: existing
          ? `Perfil actualizado en recepcion: ${memberName}`
          : `Alta en recepcion: ${memberName}`,
        meta: { cedula, phone, plan },
      });

      if (!existing) {
        await recordEvent(db, {
          type: "profile_created",
          memberId: normalizedName,
          source: "reception",
          entity: { type: "member", id: normalizedName },
          properties: {
            hasEmail: Boolean(email),
            hasPhone: true,
            hasCedula: true,
            hasFace: Boolean(faceHash || photoUrl),
            source: "reception",
          },
        }).catch(() => {});
      }

      const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      const adminMember = member ? toAdminMember(member) : null;

      let checkin: CheckinDoc | null = null;
      let membershipStatusValue = adminMember?.membershipStatus ?? "unknown";

      if (checkInNow && member?.memberName) {
        const ms = membershipStatus(member.membership);
        membershipStatusValue = ms.status;
        const date = todayIso();
        const recent = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne({
          normalizedName,
          date,
          checkedInAt: { $gte: new Date(now.getTime() - 20 * 60 * 1000) },
        });
        if (recent) {
          checkin = recent;
        } else {
          checkin = {
            id: `chk-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
            memberName: member.memberName,
            normalizedName,
            accessCode: formatAccessCode(memberAccessCode(normalizedName)),
            method: "admin",
            membershipStatus: ms.status,
            date,
            checkedInAt: now,
            by: "reception",
            note: "Alta + ingreso en recepcion",
          };
          await db.collection<CheckinDoc>(CHECKINS_COLLECTION).insertOne(checkin);
          await recordEvent(db, {
            type: "checkin_completed",
            memberId: normalizedName,
            source: "reception",
            entity: { type: "checkin", id: checkin.id },
            properties: {
              method: "admin",
              membershipStatus: ms.status,
              date,
              first: true,
              walkin: true,
            },
          }).catch(() => {});
          await recordEvent(db, {
            type: "first_checkin",
            memberId: normalizedName,
            source: "reception",
            entity: { type: "checkin", id: checkin.id },
            properties: { method: "admin", membershipStatus: ms.status, date, walkin: true },
          }).catch(() => {});
        }
      }

      const status = await computeOccupancy(db);
      return NextResponse.json({
        ok: true,
        created: !existing,
        member: adminMember,
        checkin,
        membershipStatus: membershipStatusValue,
        status,
        message: existing
          ? "Perfil actualizado en recepcion."
          : checkin
            ? "Socio registrado e ingresado."
            : "Socio registrado.",
      });
    }

    return NextResponse.json({ error: "Accion no soportada." }, { status: 400 });
  } catch (err) {
    console.error("XTREME RECEPTION POST", err);
    return NextResponse.json({ error: "No se pudo procesar en recepcion." }, { status: 500 });
  }
}
