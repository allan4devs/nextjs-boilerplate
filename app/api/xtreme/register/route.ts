import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { recordEvent } from "@/lib/xtreme/events";
import {
  sendRegistrationConfirmEmail,
  sendWelcomeEmail,
} from "@/lib/helpers/email";
import { grantFreeFirstDayIfEligible } from "@/lib/xtreme/entitlements";
import { createFreeFirstDayMembership } from "@/lib/xtreme/members/membership";
import { businessDate } from "@/lib/xtreme/business-date";
import { requestAppUrl } from "@/lib/constants/app-url";
import {
  createRegistrationToken,
  hashRegistrationToken,
} from "@/lib/xtreme/registration-token";
import {
  MEMBERS_COLLECTION,
  PAYMENTS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  ENTITLEMENTS_COLLECTION,
  ENTITLEMENT_LEDGER_COLLECTION,
  BOOKINGS_COLLECTION,
  RESERVATIONS_COLLECTION,
  PINS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
  addDays,
  cedulaDigits,
  formatAccessCode,
  hashPin,
  isValidEmail,
  matchCedula,
  memberAccessCode,
  normalizeCedula,
  normalizeEmail,
  normalizeKey,
  normalizeName,
  normalizePhone,
  toUtcDate,
} from "@/lib/xtreme/shared";
import {
  attachSessionCookie,
  createMemberSession,
  revokeAllMemberSessions,
} from "@/lib/xtreme/session";
import {
  authAttemptStatus,
  recordFailedAuthAttempt,
  requestFingerprint,
} from "@/lib/xtreme/auth-attempts";

export const dynamic = "force-dynamic";

const TOKEN_TTL_MIN = 60;

function maskedEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "correo-invalido";
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Paso 1 — el usuario da solo su correo. Creamos un registro pendiente y le
 * enviamos un link magico para confirmar la cuenta. No se crea el perfil aun.
 */
async function startRegistration(req: NextRequest, body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const source = body.source === "app" ? "app" : "primer-dia";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Ingresá un correo válido." }, { status: 400 });
  }

  const db = await getDb();
  const rate = await authAttemptStatus(db, req, {
    scope: "public_registration_start",
    subject: email,
  });
  if (rate.blocked) {
    await recordEvent(db, {
      type: "registration_attempted",
      source: "site",
      properties: {
        outcome: "blocked",
        reason: "rate_limit",
        source,
        identityHint: maskedEmail(email),
        requestFingerprint: requestFingerprint(req),
      },
    });
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá unos minutos antes de pedir otro enlace." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  // Si el correo ya pertenece a un socio, no iniciamos otro registro ni enviamos correo.
  const existingMember = await db
    .collection<MemberDoc>(MEMBERS_COLLECTION)
    .findOne({ email });
  if (existingMember) {
    await recordFailedAuthAttempt(db, rate.key, {
      scope: "public_registration_start",
      maxAttempts: 4,
      windowMs: 15 * 60_000,
    });
    await recordEvent(db, {
      type: "registration_attempted",
      memberId: existingMember.normalizedName,
      source: "site",
      properties: {
        outcome: "existing_account",
        source,
        identityHint: maskedEmail(email),
        requestFingerprint: requestFingerprint(req),
      },
    });
    // No revelar públicamente si el correo ya pertenece a una cuenta.
    return NextResponse.json({
      ok: true,
      message: "Si el correo puede iniciar un registro, recibirás un enlace con los siguientes pasos.",
    });
  }

  const token = createRegistrationToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MIN * 60_000);
  const pendingCollection = db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION);
  const existingPending = await pendingCollection.findOne({ email });
  const previousTokenHashes = [
    existingPending?.tokenHash,
    ...(existingPending?.previousTokenHashes ?? []),
  ]
    .filter((hash): hash is string => Boolean(hash))
    .filter((hash, index, hashes) => hashes.indexOf(hash) === index)
    .slice(0, 5);

  // Un documento por correo, conservando enlaces recientes hasta completar el perfil.
  await pendingCollection.updateOne(
    { email },
    {
      $set: {
        email,
        tokenHash: hashRegistrationToken(token),
        previousTokenHashes,
        expiresAt,
        confirmedAt: null,
        memberNormalizedName: null,
        source,
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

  const result = await sendRegistrationConfirmEmail({
    to: email,
    token,
    expiresMinutes: TOKEN_TTL_MIN,
    baseUrl: requestAppUrl(req.url),
  });

  await recordEvent(db, {
    type: "registration_started",
    source: "site",
    properties: {
      source,
      emailSent: result.ok,
      identityHint: maskedEmail(email),
      requestFingerprint: requestFingerprint(req),
    },
  }).catch(() => {});

  await recordFailedAuthAttempt(db, rate.key, {
    scope: "public_registration_start",
    maxAttempts: 4,
    windowMs: 15 * 60_000,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error || "No se pudo enviar el correo de confirmación.",
        emailErrorCode: result.code || "unknown",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "Te enviamos un enlace para confirmar tu correo, completar el perfil y crear tu PIN. Revisá tu bandeja (y spam).",
    expiresMinutes: TOKEN_TTL_MIN,
  });
}

/** Paso 2a — validar el token sin completar el perfil (para mostrar el form). */
async function verifyToken(token: string) {
  if (!token) {
    return { error: "Falta el enlace de confirmación. Pedí uno nuevo desde el registro.", status: 400 as const };
  }
  const db = await getDb();
  const collection = db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION);
  const tokenHash = hashRegistrationToken(token);
  const pending = await collection.findOne({
    $or: [{ tokenHash }, { previousTokenHashes: tokenHash }],
  });

  if (!pending) {
    return {
      error: "Este enlace no es válido o ya se usó. Pedí uno nuevo desde el registro.",
      status: 404 as const,
    };
  }
  if (pending.expiresAt.getTime() < Date.now()) {
    return {
      error: "Este enlace venció. Pedí uno nuevo desde el registro o recepción.",
      status: 410 as const,
    };
  }
  return { pending, db };
}

export async function GET(req: NextRequest) {
  const token = String(req.nextUrl.searchParams.get("token") ?? "").trim();
  const verified = await verifyToken(token);
  if ("error" in verified) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }
  if (verified.pending.confirmedAt || verified.pending.memberNormalizedName) {
    const normalizedName = normalizeKey(verified.pending.memberNormalizedName || "");
    const member = normalizedName
      ? await verified.db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName })
      : null;
    if (!member) {
      return NextResponse.json(
        { error: "El perfil de este enlace no está disponible. Contactá recepción." },
        { status: 409 },
      );
    }
    // Reabrir el enlace después de completar: reemite sesión para ir directo a la app.
    const { token: sessionToken, expiresAt: sessionExpires } = await createMemberSession(
      verified.db,
      {
        memberKey: normalizedName,
        memberName: member.memberName || normalizedName,
      },
    );
    const res = NextResponse.json({
      ok: true,
      completed: true,
      memberName: member.memberName,
      accessCode: formatAccessCode(memberAccessCode(normalizedName)),
      freeFirstDay:
        verified.pending.source === "primer-dia" || verified.pending.source === "app",
      paidRegistration: verified.pending.source === "paypal",
      invitedRegistration:
        verified.pending.source === "reception" || verified.pending.source === "admin",
      session: true,
      hasPinSet: true,
    });
    attachSessionCookie(res, sessionToken, sessionExpires);
    return res;
  }
  const boundKey = normalizeKey(verified.pending.expectedMemberKey || "");
  let prefill = {
    memberName: verified.pending.expectedMemberName || "",
    cedula: "",
    phone: "",
    goal: "",
  };
  let neverRegistered = true;
  let bound: MemberDoc | null = null;

  if (boundKey) {
    bound = await verified.db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne(
      { normalizedName: boundKey },
      { projection: { memberName: 1, cedula: 1, phone: 1, goal: 1, emailVerified: 1, email: 1 } },
    );
  }

  // Campañas / import: si no hay ficha ligada por key, buscamos por el correo del enlace.
  if (!bound && verified.pending.email) {
    const email = normalizeEmail(verified.pending.email);
    bound =
      (await verified.db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne(
        {
          emailVerified: { $ne: true },
          email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        },
        { projection: { memberName: 1, cedula: 1, phone: 1, goal: 1, emailVerified: 1, email: 1, normalizedName: 1 } },
      )) || null;
  }

  if (bound) {
    neverRegistered = bound.emailVerified !== true;
    prefill = {
      memberName: bound.memberName || prefill.memberName,
      cedula: bound.cedula || "",
      phone: bound.phone || "",
      goal: bound.goal || "",
    };
  }

  const boundProfile = Boolean(boundKey || bound);
  // Snapshot de lo guardado: el socio ve lo viejo aunque edite el form.
  const savedProfile = {
    memberName: prefill.memberName,
    cedula: prefill.cedula,
    phone: prefill.phone,
    goal: prefill.goal,
  };

  return NextResponse.json({
    ok: true,
    email: verified.pending.email,
    source: verified.pending.source,
    boundProfile,
    neverRegistered,
    canEditName: true,
    canEditCedula: true,
    canEditPhone: true,
    /** Datos en archivo (import / ficha) para mostrar como referencia. */
    savedProfile,
    ...prefill,
  });
}

/**
 * Paso 2b — con el token valido, el usuario completa (o corrige) nombre, cedula y telefono.
 * Aqui se crea o reclama el perfil y se marca el correo como verificado.
 * Import legacy: en el primer registro se permite corregir datos basura del Excel.
 */
async function confirmRegistration(req: NextRequest, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const verified = await verifyToken(token);
  if ("error" in verified) {
    try {
      const db = await getDb();
      await recordEvent(db, {
        type: "registration_confirmation_attempted",
        source: "site",
        properties: {
          outcome: "failed",
          reason: `token_${verified.status}`,
          requestFingerprint: requestFingerprint(req),
        },
      });
    } catch {}
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }
  const { pending, db } = verified;

  if (pending.confirmedAt || pending.memberNormalizedName) {
    const normalizedName = normalizeKey(pending.memberNormalizedName || "");
    const member = normalizedName
      ? await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName })
      : null;
    if (!member) {
      return NextResponse.json(
        { error: "El perfil de este enlace no está disponible. Contactá recepción." },
        { status: 409 },
      );
    }
    const { token: sessionToken, expiresAt: sessionExpires } = await createMemberSession(db, {
      memberKey: normalizedName,
      memberName: member.memberName || normalizedName,
    });
    const res = NextResponse.json({
      ok: true,
      memberName: member.memberName,
      accessCode: formatAccessCode(memberAccessCode(normalizedName)),
      freeFirstDay: pending.source === "primer-dia" || pending.source === "app",
      paidRegistration: pending.source === "paypal",
      invitedRegistration: pending.source === "reception" || pending.source === "admin",
      alreadyCompleted: true,
      session: true,
      hasPinSet: true,
    });
    attachSessionCookie(res, sessionToken, sessionExpires);
    return res;
  }

  // Invitación ligada a ficha existente (PayPal, super admin, recepción, campaña admin).
  let boundKey = normalizeKey(pending.expectedMemberKey || "");
  let boundExisting = boundKey
    ? await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName: boundKey })
    : null;

  // Campaña / magic link solo con correo: reclamar ficha sin verificar de ese email.
  if (!boundExisting && pending.email) {
    const email = normalizeEmail(pending.email);
    const byEmail = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
      emailVerified: { $ne: true },
      email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (byEmail?.normalizedName) {
      boundKey = normalizeKey(byEmail.normalizedName);
      boundExisting = byEmail;
    }
  }

  const boundInvite = Boolean(boundKey);
  const paidInvite = pending.source === "paypal" && boundInvite;
  const staffInvite =
    pending.source === "reception" || pending.source === "admin";

  if (boundInvite && !boundExisting) {
    return NextResponse.json(
      {
        error: paidInvite
          ? "No encontramos el perfil asociado al pago. Contactá recepción."
          : "No encontramos el perfil asociado a la invitación. Contactá recepción.",
      },
      { status: 409 },
    );
  }

  // Nunca registrado = aún no verificó correo: puede corregir nombre/cédula/tel del import.
  let existing = boundExisting;
  let neverRegistered = !existing || existing.emailVerified !== true;

  // El enlace prueba propiedad del correo, pero el socio decide si conserva o
  // corrige lo precargado. La key ligada a la ficha/pago se mantiene estable.
  const memberName = normalizeName(body.memberName) ||
    normalizeName(pending.expectedMemberName) ||
    normalizeName(existing?.memberName);
  const cedula = normalizeCedula(body.cedula);
  const phone = normalizePhone(body.phone);
  const goal = String(body.goal ?? "").trim().slice(0, 80);
  const pin = String(body.pin ?? "").trim();
  const pinConfirm = String(body.pinConfirm ?? "").trim();
  const email = pending.email;
  const digits = cedulaDigits(cedula);

  if (!memberName) {
    return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });
  }
  if (!cedula || digits.length < 6) {
    return NextResponse.json(
      { error: "La cédula es requerida (mínimo 6 dígitos). Revisá que esté bien." },
      { status: 400 },
    );
  }
  if (!phone || phone.replace(/\D/g, "").length < 8) {
    return NextResponse.json(
      { error: "El teléfono es requerido (mínimo 8 dígitos)." },
      { status: 400 },
    );
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: "Elegí un PIN de exactamente 4 dígitos." },
      { status: 400 },
    );
  }
  if (pin === "0000" || pin === "1234") {
    return NextResponse.json(
      { error: "Elegí un PIN más seguro. Evitá combinaciones como 0000 o 1234." },
      { status: 400 },
    );
  }
  if (pin !== pinConfirm) {
    return NextResponse.json({ error: "Los dos PIN no coinciden." }, { status: 400 });
  }

  // Identidad estable: ficha importada/pago conserva su key; alta nueva usa el nombre.
  let normalizedName = boundInvite ? boundKey : normalizeKey(memberName);
  const now = new Date();

  // Duplicados en OTRO perfil (no la ficha que estamos reclamando).
  const contactCandidates = await db
    .collection<MemberDoc>(MEMBERS_COLLECTION)
    .find(
      {
        normalizedName: { $ne: normalizedName },
        $or: [
          { email },
          { phone },
          { cedula: { $exists: true, $type: "string", $ne: "" } },
        ],
      },
      {
        projection: {
          memberName: 1,
          phone: 1,
          email: 1,
          cedula: 1,
          normalizedName: 1,
          emailVerified: 1,
          membership: 1,
        },
      },
    )
    .limit(40)
    .toArray();

  const phoneDigits = phone.replace(/\D/g, "");
  const cedulaDuplicate = contactCandidates.find(
    (doc) => doc.cedula && matchCedula(doc.cedula, cedula),
  );
  const contactDuplicate = contactCandidates.find((doc) => {
    if (cedulaDuplicate?.normalizedName === doc.normalizedName) return false;
    if (doc.email && normalizeEmail(doc.email) === email) return true;
    return Boolean(doc.phone && normalizePhone(doc.phone).replace(/\D/g, "") === phoneDigits);
  });
  let claimedExistingCedula = false;
  const previousBoundKey = normalizedName;

  if (cedulaDuplicate?.normalizedName) {
    const sameVerifiedEmail =
      cedulaDuplicate.emailVerified === true && normalizeEmail(cedulaDuplicate.email) === email;
    const paidSourceIsProvisional =
      !paidInvite ||
      !boundExisting ||
      (boundExisting.emailVerified !== true && cedulaDigits(boundExisting.cedula).length === 0);
    const paidSourceCanMove =
      paidSourceIsProvisional ||
      normalizeEmail(boundExisting?.email) === email;
    if ((cedulaDuplicate.emailVerified !== true || sameVerifiedEmail) && paidSourceCanMove) {
      normalizedName = normalizeKey(cedulaDuplicate.normalizedName);
      existing = cedulaDuplicate;
      neverRegistered = cedulaDuplicate.emailVerified !== true;
      claimedExistingCedula = normalizedName !== previousBoundKey;
    } else {
      await recordEvent(db, {
        type: "registration_identity_conflict",
        memberId: normalizeKey(cedulaDuplicate.normalizedName),
        source: "member_app",
        properties: {
          reason: paidSourceCanMove ? "verified_cedula_owner" : "verified_paid_source",
          paidRegistration: paidInvite,
          requestFingerprint: requestFingerprint(req),
        },
      });
      return NextResponse.json(
        {
          error:
            paidSourceCanMove
              ? "Tu pago y este enlace siguen guardados. Esa cédula ya pertenece a una cuenta verificada, así que no la vamos a reemplazar ni a crear duplicada. Contactá a recepción para confirmar identidad y unir el pago de forma segura."
              : "Tu pago y este enlace siguen guardados, pero el perfil ligado al pago ya estaba verificado con otra identidad. No moveremos datos automáticamente. Contactá a recepción para revisar y unir el pago de forma segura.",
          code: "verified_cedula_owner",
          recoverable: true,
          paymentPreserved: paidInvite,
        },
        { status: 409 },
      );
    }
  } else if (contactDuplicate) {
    return NextResponse.json(
      {
        error: `El correo o teléfono ya está ligado a ${contactDuplicate.memberName}. Tus datos siguen guardados; hablá con recepción para unir las fichas sin perder el pago ni el acceso.`,
        code: "contact_already_registered",
        recoverable: true,
        paymentPreserved: paidInvite,
      },
      { status: 409 },
    );
  }

  // Si alguien ya reclamó este perfil con correo verificado, no reescribir con otro enlace suelto.
  const verifiedBySameEmail =
    existing?.emailVerified === true && normalizeEmail(existing.email) === email;
  if (existing?.emailVerified === true && !neverRegistered && !verifiedBySameEmail) {
    return NextResponse.json(
      {
        error: "Este perfil ya fue activado. Entrá a la app con tu cédula y PIN.",
      },
      { status: 409 },
    );
  }

  const today = businessDate(now);
  const set: Partial<MemberDoc> = {
    normalizedName,
    memberName,
    cedula,
    phone,
    email,
    emailVerified: true,
    updatedAt: now,
  };
  if (goal) set.goal = goal;

  // Un pago puede haber creado una ficha provisional por nombre antes de que la
  // persona escribiera su cédula. Al encontrar una ficha vieja sin verificar,
  // conservamos la membresía pagada y la trasladamos a la identidad por cédula.
  if (claimedExistingCedula && paidInvite && boundExisting?.membership) {
    set.membership = boundExisting.membership;
  }

  // Guardamos snapshot de lo que venía del import por si hay que auditar correcciones.
  if (existing && neverRegistered) {
    set.profileClaim = {
      claimedAt: now,
      source: pending.source,
      previous: {
        memberName: existing.memberName || "",
        cedula: existing.cedula || "",
        phone: existing.phone || "",
        email: existing.email || "",
      },
    } as MemberDoc["profileClaim"];
  }

  if (!existing) {
    // Solo los registros públicos reciben el primer día; staff crea cuenta sin plan.
    set.membership = staffInvite
      ? {
          plan: "Sin plan activo",
          status: "expired",
          startedAt: today,
          nextBillingDate: addDays(toUtcDate(today), -1).toISOString().slice(0, 10),
        }
      : createFreeFirstDayMembership(today);
  } else if (staffInvite && !existing.membership) {
    set.membership = {
      plan: "Sin plan activo",
      status: "expired",
      startedAt: today,
      nextBillingDate: addDays(toUtcDate(today), -1).toISOString().slice(0, 10),
    };
  }

  await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
    { normalizedName },
    {
      $set: set,
      $unset: { emailQuarantine: "" },
      $setOnInsert: { workouts: [], bodyMetrics: [], createdAt: now },
    },
    { upsert: true },
  );

  if (
    claimedExistingCedula &&
    boundInvite &&
    previousBoundKey &&
    previousBoundKey !== normalizedName
  ) {
    const associationFilter = pending.paymentId ? { id: pending.paymentId } : { normalizedName: previousBoundKey };
    const entitlementFilter = pending.paymentId
      ? {
          memberKey: previousBoundKey,
          "source.type": "payment",
          "source.id": pending.paymentId,
        }
      : { memberKey: previousBoundKey };
    const movedEntitlements = await db
      .collection<{ id: string }>(ENTITLEMENTS_COLLECTION)
      .find(entitlementFilter, { projection: { id: 1 } })
      .toArray();
    const movedEntitlementIds = movedEntitlements.map((item) => item.id).filter(Boolean);
    await Promise.all([
      db.collection(PAYMENTS_COLLECTION).updateMany(
        associationFilter,
        { $set: { normalizedName, memberName } },
      ),
      db.collection(ENTITLEMENTS_COLLECTION).updateMany(
        entitlementFilter,
        { $set: { memberKey: normalizedName } },
      ),
      db.collection(ENTITLEMENT_LEDGER_COLLECTION).updateMany(
        movedEntitlementIds.length
          ? { memberKey: previousBoundKey, entitlementId: { $in: movedEntitlementIds } }
          : { memberKey: "__none__" },
        { $set: { memberKey: normalizedName } },
      ),
      db.collection(BOOKINGS_COLLECTION).updateMany(
        movedEntitlementIds.length
          ? { memberKey: previousBoundKey, entitlementId: { $in: movedEntitlementIds } }
          : { memberKey: "__none__" },
        { $set: { memberKey: normalizedName, memberName } },
      ),
      db.collection(RESERVATIONS_COLLECTION).updateMany(
        movedEntitlementIds.length
          ? { normalizedName: previousBoundKey, entitlementId: { $in: movedEntitlementIds } }
          : pending.paymentId
            ? { normalizedName: "__none__" }
            : { normalizedName: previousBoundKey },
        { $set: { normalizedName, memberName } },
      ),
      db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION).updateOne(
        { email },
        { $set: { expectedMemberKey: normalizedName, expectedMemberName: memberName } },
      ),
    ]);

    // La ficha provisional de PayPal ya quedó absorbida por la identidad de cédula.
    if (paidInvite && boundExisting?.emailVerified !== true) {
      await db.collection<MemberDoc>(MEMBERS_COLLECTION).deleteOne({
        normalizedName: previousBoundKey,
        emailVerified: { $ne: true },
      });
    }

    await recordEvent(db, {
      type: "paid_profile_merged_by_cedula",
      memberId: normalizedName,
      source: "member_app",
      entity: { type: "member", id: normalizedName },
      properties: {
        previousMemberKey: previousBoundKey,
        paymentId: pending.paymentId || null,
      },
    });
  }

  const freeFirstDay = !existing && !staffInvite && !paidInvite && !boundInvite;
  if (freeFirstDay) {
    await grantFreeFirstDayIfEligible(db, normalizedName, today);
    await recordEvent(db, {
      type: "free_first_day_granted",
      memberId: normalizedName,
      source: "member_app",
      entity: { type: "member", id: normalizedName },
      properties: { registrationSource: pending.source, date: today },
    });
  }

  // El primer acceso termina en esta misma pantalla: guardamos el PIN después
  // de resolver la identidad, pero antes de consumir el enlace. Así, si esta
  // escritura falla, el usuario puede reintentar con el mismo token.
  const credentialKeys = new Set<string>([normalizedName]);
  if (previousBoundKey) credentialKeys.add(previousBoundKey);
  await Promise.all([...credentialKeys].map((key) => revokeAllMemberSessions(db, key)));
  if (previousBoundKey && previousBoundKey !== normalizedName) {
    await db.collection(PINS_COLLECTION).deleteMany({ normalizedName: previousBoundKey });
  }
  await db.collection(PINS_COLLECTION).updateOne(
    { normalizedName },
    {
      $set: {
        normalizedName,
        memberName,
        pinHash: hashPin(pin, normalizedName),
        setBy: "magic_link_registration",
        setAt: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  // Consumir el registro pendiente (token de un solo uso).
  await db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION).updateOne(
    { email },
    { $set: { confirmedAt: now, memberNormalizedName: normalizedName } },
  );

  const accessCode = formatAccessCode(memberAccessCode(normalizedName));
  const profileWasReady = Boolean(existing?.emailVerified && existing?.cedula);

  if (!profileWasReady) {
    await sendWelcomeEmail({ to: email, memberName, accessCode, cedula });
    await recordEvent(db, {
      type: "profile_created",
      memberId: normalizedName,
      source: "member_app",
      entity: { type: "member", id: normalizedName },
      properties: {
        hasEmail: true,
        hasPhone: true,
        verified: true,
        source: pending.source,
        freeFirstDay,
        paidRegistration: paidInvite,
        invitedRegistration: staffInvite,
        boundInvite,
        correctedImport: Boolean(existing && neverRegistered),
        claimedExistingCedula,
      },
    }).catch(() => {});
  }

  await recordEvent(db, {
    type: "registration_completed",
    memberId: normalizedName,
    source: "member_app",
    entity: { type: "member", id: normalizedName },
    properties: {
      source: pending.source,
      freeFirstDay,
      paidRegistration: paidInvite,
      invitedRegistration: staffInvite,
      requestFingerprint: requestFingerprint(req),
      claimedExistingCedula,
    },
  });

  // Sesión HttpOnly: el socio ya tiene PIN y puede entrar a /app sin otro paso.
  const { token: sessionToken, expiresAt: sessionExpires } = await createMemberSession(db, {
    memberKey: normalizedName,
    memberName,
  });
  const res = NextResponse.json({
    ok: true,
    memberName,
    accessCode,
    freeFirstDay,
    paidRegistration: paidInvite,
    invitedRegistration: staffInvite,
    session: true,
    canSetPin: false,
    hasPinSet: true,
    credentialsReady: true,
    profileCorrected: Boolean(existing && neverRegistered),
    claimedExistingCedula,
  });
  attachSessionCookie(res, sessionToken, sessionExpires);
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "start");
    if (action === "confirm") return await confirmRegistration(req, body);
    return await startRegistration(req, body);
  } catch (err) {
    console.error("XTREME REGISTER POST", err);
    return NextResponse.json({ error: "No se pudo procesar el registro." }, { status: 500 });
  }
}
