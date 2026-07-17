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
  PENDING_REGISTRATIONS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
  addDays,
  cedulaDigits,
  formatAccessCode,
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
} from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

const TOKEN_TTL_MIN = 60;

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

  // Si el correo ya pertenece a un socio, no iniciamos otro registro ni enviamos correo.
  const existingMember = await db
    .collection<MemberDoc>(MEMBERS_COLLECTION)
    .findOne({ email });
  if (existingMember) {
    return NextResponse.json(
      {
        error:
          "Ese correo ya está registrado. No enviamos un nuevo enlace. Ingresá desde la app.",
      },
      { status: 409 },
    );
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
    entity: { type: "registration", id: email },
    properties: { source, emailSent: result.ok },
  }).catch(() => {});

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.error ||
          "El correo de confirmación no está configurado. Contactá al administrador.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Te enviamos un correo para confirmar tu cuenta.",
  });
}

/** Paso 2a — validar el token sin completar el perfil (para mostrar el form). */
async function verifyToken(token: string) {
  if (!token) {
    return { error: "Falta el token de confirmacion.", status: 400 as const };
  }
  const db = await getDb();
  const collection = db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION);
  const tokenHash = hashRegistrationToken(token);
  const pending = await collection.findOne({
    $or: [{ tokenHash }, { previousTokenHashes: tokenHash }],
  });

  if (!pending) return { error: "Enlace invalido o ya usado.", status: 404 as const };
  if (pending.expiresAt.getTime() < Date.now()) {
    return { error: "El enlace vencio. Registrese de nuevo.", status: 410 as const };
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
        { error: "El perfil asociado a este enlace no esta disponible. Contactá recepción." },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      completed: true,
      memberName: member.memberName,
      accessCode: formatAccessCode(memberAccessCode(normalizedName)),
      paidRegistration: verified.pending.source === "paypal",
      invitedRegistration:
        verified.pending.source === "reception" || verified.pending.source === "admin",
    });
  }
  const boundKey = normalizeKey(verified.pending.expectedMemberKey || "");
  const boundProfile = Boolean(boundKey);
  let prefill = {
    memberName: verified.pending.expectedMemberName || "",
    cedula: "",
    phone: "",
    goal: "",
  };
  let neverRegistered = true;
  if (boundKey) {
    const bound = await verified.db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne(
      { normalizedName: boundKey },
      { projection: { memberName: 1, cedula: 1, phone: 1, goal: 1, emailVerified: 1 } },
    );
    if (bound) {
      neverRegistered = bound.emailVerified !== true;
      prefill = {
        memberName: bound.memberName || prefill.memberName,
        cedula: bound.cedula || "",
        phone: bound.phone || "",
        goal: bound.goal || "",
      };
    }
  }

  return NextResponse.json({
    ok: true,
    email: verified.pending.email,
    source: verified.pending.source,
    boundProfile,
    /** Primer claim: el import puede traer cédula/nombre/tel mal — se pueden corregir. */
    neverRegistered,
    canEditName: verified.pending.source !== "paypal",
    canEditCedula: true,
    canEditPhone: true,
    ...prefill,
  });
}

/**
 * Paso 2b — con el token valido, el usuario completa (o corrige) nombre, cedula y telefono.
 * Aqui se crea o reclama el perfil y se marca el correo como verificado.
 * Import legacy: en el primer registro se permite corregir datos basura del Excel.
 */
async function confirmRegistration(body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const verified = await verifyToken(token);
  if ("error" in verified) {
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
        { error: "El perfil asociado a este enlace no esta disponible. Contactá recepción." },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      memberName: member.memberName,
      accessCode: formatAccessCode(memberAccessCode(normalizedName)),
      freeFirstDay: pending.source === "primer-dia" || pending.source === "app",
      paidRegistration: pending.source === "paypal",
      invitedRegistration: pending.source === "reception" || pending.source === "admin",
      alreadyCompleted: true,
    });
  }

  // Invitación ligada a ficha existente (PayPal, super admin, recepción con socio).
  const boundKey = normalizeKey(pending.expectedMemberKey || "");
  const boundInvite = Boolean(boundKey);
  const paidInvite = pending.source === "paypal" && boundInvite;
  const staffInvite = pending.source === "reception" || pending.source === "admin";

  const existing = boundInvite
    ? await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName: boundKey })
    : null;
  if (boundInvite && !existing) {
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
  const neverRegistered = !existing || existing.emailVerified !== true;

  // PayPal: nombre queda atado al pago. Invitación/import: el socio corrige basura del Excel.
  const memberName = paidInvite
    ? normalizeName(pending.expectedMemberName) || normalizeName(existing?.memberName)
    : normalizeName(body.memberName) ||
      normalizeName(pending.expectedMemberName) ||
      normalizeName(existing?.memberName);
  const cedula = normalizeCedula(body.cedula);
  const phone = normalizePhone(body.phone);
  const goal = String(body.goal ?? "").trim().slice(0, 80);
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

  // Identidad estable: ficha importada/pago conserva su key; alta nueva usa el nombre.
  const normalizedName = boundInvite ? boundKey : normalizeKey(memberName);
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
      { projection: { memberName: 1, phone: 1, email: 1, cedula: 1, normalizedName: 1 } },
    )
    .limit(40)
    .toArray();

  const phoneDigits = phone.replace(/\D/g, "");
  const duplicate = contactCandidates.find((doc) => {
    if (doc.email && normalizeEmail(doc.email) === email) return true;
    if (doc.phone && normalizePhone(doc.phone).replace(/\D/g, "") === phoneDigits) return true;
    if (doc.cedula && matchCedula(doc.cedula, cedula)) return true;
    return false;
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: `Ese contacto o cédula ya está ligado a ${duplicate.memberName}. Hablá con recepción para unir las fichas.`,
      },
      { status: 409 },
    );
  }

  // Si alguien ya reclamó este perfil con correo verificado, no reescribir con otro enlace suelto.
  if (existing?.emailVerified === true && !neverRegistered) {
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

  const freeFirstDay = !existing && !staffInvite && !paidInvite && !boundInvite;
  if (freeFirstDay) {
    await grantFreeFirstDayIfEligible(db, normalizedName, today);
  }

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
      },
    }).catch(() => {});
  }

  // Sesión HttpOnly al confirmar el enlace: solo quien abrió el mail puede setear PIN en /app.
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
    canSetPin: true,
    profileCorrected: Boolean(existing && neverRegistered),
  });
  attachSessionCookie(res, sessionToken, sessionExpires);
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "start");
    if (action === "confirm") return await confirmRegistration(body);
    return await startRegistration(req, body);
  } catch (err) {
    console.error("XTREME REGISTER POST", err);
    return NextResponse.json({ error: "No se pudo procesar el registro." }, { status: 500 });
  }
}
