import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { sendAdminOperationalAlert, sendReceptionAppInviteEmail, sendWelcomeEmail } from "@/lib/helpers/email";
import { requestAppUrl } from "@/lib/constants/app-url";
import { recordEvent } from "@/lib/xtreme/events";
import { writeAudit } from "@/lib/xtreme/audit";
import { createRegistrationToken, hashRegistrationToken } from "@/lib/xtreme/registration-token";
import { recordOpsAlert } from "@/lib/xtreme/ops-alerts";
import { FACE_RECOGNITION_ENABLED } from "@/lib/xtreme/face/config";
import {
  inviteBaseUrlFromRequest,
  inviteExistingMemberToApp,
} from "@/lib/xtreme/member-app-invite";
import {
  CHECKINS_COLLECTION,
  MEMBERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  type CheckinDoc,
  type MemberDoc,
  type PendingRegistrationDoc,
  cedulaDigits,
  computeOccupancy,
  findMemberByCedula,
  formatAccessCode,
  hammingHexDistance,
  isValidEmail,
  isCheckinOpen,
  memberAccessCode,
  membershipStatus,
  normalizeCedula,
  normalizeEmail,
  normalizeKey,
  normalizeName,
  normalizePhone,
  todayIso,
  toAdminMember,
} from "@/lib/xtreme/shared";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { resolveMember } from "@/lib/xtreme/members/resolve-member";

export const dynamic = "force-dynamic";

/** Threshold de Hamming para dHash de 64 bits (hex 16 chars). Más bajo = más estricto. */
const FACE_MATCH_MAX_DISTANCE = 12;
const FACE_CANDIDATES_LIMIT = 5;

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

async function roleFromReq(req: NextRequest) {
  return (await resolveStaffSession(req, "reception"))?.role ?? null;
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
  const role = await roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const db = await getDb();
    const faceHash = String(req.nextUrl.searchParams.get("faceHash") ?? "")
      .toLowerCase()
      .replace(/[^0-9a-f]/g, "");
    const roster = req.nextUrl.searchParams.get("roster") === "1";

    const status = await computeOccupancy(db);
    const todayCheckins = await db
      .collection<CheckinDoc>(CHECKINS_COLLECTION)
      .find({ date: todayIso() })
      .sort({ checkedInAt: -1 })
      .limit(500)
      .toArray();
    const recent = todayCheckins.slice(0, 20);
    const latestByMember = new Map<string, CheckinDoc>();
    for (const checkin of todayCheckins) {
      if (!latestByMember.has(checkin.normalizedName)) {
        latestByMember.set(checkin.normalizedName, checkin);
      }
    }
    const openCheckins = [...latestByMember.values()].filter((checkin) => isCheckinOpen(checkin));
    const insideMembers = openCheckins.length
      ? await db
          .collection<MemberDoc>(MEMBERS_COLLECTION)
          .find({ normalizedName: { $in: openCheckins.map((checkin) => checkin.normalizedName) } })
          .project({ memberName: 1, normalizedName: 1, cedula: 1, photoUrl: 1 })
          .toArray()
      : [];
    const insideMemberMap = new Map(
      insideMembers.map((member) => [member.normalizedName, member]),
    );
    const inside = openCheckins.map((checkin) => {
      const member = insideMemberMap.get(checkin.normalizedName);
      return {
        id: checkin.id,
        memberName: checkin.memberName,
        normalizedName: checkin.normalizedName,
        cedula: member?.cedula || "",
        photoUrl: member?.photoUrl || "",
        membershipStatus: checkin.membershipStatus,
        checkedInAt: checkin.checkedInAt,
      };
    });

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
        inside,
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
      inside,
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
  const role = await roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "register");
    const db = await getDb();
    const now = new Date();

    if (action === "invite_app") {
      const email = normalizeEmail(body.email);
      if (!email || !isValidEmail(email)) {
        return NextResponse.json({ error: "Ingresá un correo válido." }, { status: 400 });
      }

      // Si mandan socio (cédula / nombre / key), se liga la invitación a esa ficha.
      const boundKey = normalizeKey(
        String(body.normalizedName ?? "").trim() || normalizeName(body.memberName),
      );
      if (boundKey) {
        const bound = await inviteExistingMemberToApp(db, {
          memberKey: boundKey,
          email,
          source: "reception",
          baseUrl: inviteBaseUrlFromRequest(req.url) || requestAppUrl(req.url),
        });
        if (!bound.ok) {
          return NextResponse.json({ error: bound.error }, { status: bound.status });
        }
        await writeAudit(db, {
          actorRole: role,
          action: "registration.invite_app",
          targetType: "member",
          targetId: bound.memberKey,
          summary: `Invitación ligada a ${bound.memberName}`,
          meta: { email: bound.email, bound: true },
        });
        await recordEvent(db, {
          type: "registration_invited",
          source: "reception",
          memberId: bound.memberKey,
          entity: { type: "member", id: bound.memberKey },
          properties: { emailSent: true, grantsFreeDay: false, bound: true },
        }).catch(() => {});
        return NextResponse.json({
          ok: true,
          message: `Invitación enviada a ${bound.email}. El enlace vence en ${bound.expiresHours} horas y queda unido a ${bound.memberName}.`,
          sentTo: bound.email,
          bound: true,
        });
      }

      const existingMember = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ email });
      if (existingMember?.emailVerified) {
        return NextResponse.json(
          { error: "Ese correo ya tiene una cuenta. La persona puede ingresar directamente a la app." },
          { status: 409 },
        );
      }

      const token = createRegistrationToken();
      const expiresHours = 24;
      const expiresAt = new Date(now.getTime() + expiresHours * 60 * 60_000);
      const collection = db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION);
      const existingPending = await collection.findOne({ email });
      const previousTokenHashes = [
        existingPending?.tokenHash,
        ...(existingPending?.previousTokenHashes ?? []),
      ]
        .filter((hash): hash is string => Boolean(hash))
        .filter((hash, index, hashes) => hashes.indexOf(hash) === index)
        .slice(0, 5);

      await collection.updateOne(
        { email },
        {
          $set: {
            email,
            tokenHash: hashRegistrationToken(token),
            previousTokenHashes,
            expiresAt,
            confirmedAt: null,
            memberNormalizedName: null,
            source: "reception",
          },
          $unset: {
            expectedMemberKey: "",
            expectedMemberName: "",
            paymentId: "",
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      const sent = await sendReceptionAppInviteEmail({
        to: email,
        token,
        expiresHours,
        baseUrl: requestAppUrl(req.url),
      });
      await writeAudit(db, {
        actorRole: role,
        action: "registration.invite_app",
        targetType: "system",
        targetId: "app-invitation",
        summary: "Invitación directa a la app generada desde recepción",
        meta: { email, emailSent: sent.ok },
      });
      await recordEvent(db, {
        type: "registration_invited",
        source: "reception",
        entity: { type: "registration", id: email },
        properties: { emailSent: sent.ok, grantsFreeDay: false },
      }).catch(() => {});

      if (!sent.ok) {
        const detail = sent.error || "No se pudo enviar el correo de invitación.";
        await recordOpsAlert(db, {
          fingerprint: `reception-invite:${email}`,
          kind: "registration_invite",
          severity: "warning",
          title: "Invitación de recepción sin entregar",
          detail,
          context: { email },
        });
        await sendAdminOperationalAlert({
          severity: "warning",
          title: "Invitación de recepción sin entregar",
          detail,
          context: { email },
        });
        return NextResponse.json(
          { error: detail },
          { status: 502 },
        );
      }

      return NextResponse.json({
        ok: true,
        message: "Invitación enviada. El enlace vence en 24 horas.",
      });
    }

    if (action === "checkout") {
      const checkinId = String(body.checkinId ?? "").trim();
      const cedula = String(body.cedula ?? "").trim();
      let normalizedName = normalizeKey(normalizeName(body.memberName));

      if (!normalizedName || cedula) {
        const hit = await resolveMember(db, {
          cedula: cedula || undefined,
          memberName: String(body.memberName ?? "") || undefined,
          q: String(body.memberName ?? "") || undefined,
        });
        if (hit) normalizedName = hit.memberKey;
      }

      if (!checkinId && !normalizedName) {
        return NextResponse.json(
          { error: "Seleccioná una persona o ingresá una cédula válida." },
          { status: 400 },
        );
      }

      const openCheckin = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne(
        {
          ...(checkinId ? { id: checkinId } : { normalizedName }),
          date: todayIso(),
          checkedOutAt: null,
        },
        { sort: { checkedInAt: -1 } },
      );
      if (!openCheckin) {
        return NextResponse.json(
          { error: "No encontramos un ingreso abierto para esta persona." },
          { status: 404 },
        );
      }

      const updated = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).updateOne(
        { id: openCheckin.id, checkedOutAt: null },
        { $set: { checkedOutAt: now, checkedOutBy: role } },
      );
      if (!updated.modifiedCount) {
        return NextResponse.json({ error: "La salida ya habia sido registrada." }, { status: 409 });
      }

      const durationMinutes = Math.max(
        0,
        Math.round((now.getTime() - new Date(openCheckin.checkedInAt).getTime()) / 60_000),
      );
      await writeAudit(db, {
        actorRole: role,
        action: "checkin.checkout",
        targetType: "member",
        targetId: openCheckin.normalizedName,
        summary: `Salida registrada: ${openCheckin.memberName}`,
        meta: { checkinId: openCheckin.id, durationMinutes },
      });
      await recordEvent(db, {
        type: "checkout_completed",
        memberId: openCheckin.normalizedName,
        source: "reception",
        entity: { type: "checkin", id: openCheckin.id },
        properties: {
          checkedInAt: new Date(openCheckin.checkedInAt).toISOString(),
          checkedOutAt: now.toISOString(),
          durationMinutes,
        },
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        memberName: openCheckin.memberName,
        checkedOutAt: now,
        durationMinutes,
        status: await computeOccupancy(db),
      });
    }

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
            error: `Ese contacto ya está ligado a ${duplicate.memberName}. Usá el ingreso.`,
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
        if (email) {
          await sendWelcomeEmail({
            to: email,
            memberName,
            accessCode: formatAccessCode(memberAccessCode(normalizedName)),
            cedula,
          });
        }
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
        const latestCheckin = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne(
          { normalizedName, date },
          { sort: { checkedInAt: -1 } },
        );
        const recent = latestCheckin && isCheckinOpen(latestCheckin) ? latestCheckin : null;
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
            checkedOutAt: null,
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
