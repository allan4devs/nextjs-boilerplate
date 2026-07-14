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
  formatAccessCode,
  isValidEmail,
  memberAccessCode,
  normalizeCedula,
  normalizeEmail,
  normalizeKey,
  normalizeName,
  normalizePhone,
  toUtcDate,
} from "@/lib/xtreme/shared";

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
    return NextResponse.json({ error: "Ingrese un correo valido." }, { status: 400 });
  }

  const db = await getDb();

  // Si ya existe un socio con este correo y ya confirmo, no reregistramos.
  const existingMember = await db
    .collection<MemberDoc>(MEMBERS_COLLECTION)
    .findOne({ email });
  if (existingMember?.emailVerified) {
    return NextResponse.json(
      { error: "Ese correo ya tiene una cuenta confirmada. Ingrese desde la app." },
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
          "El correo de confirmacion no esta configurado. Contacte al administrador.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Le enviamos un correo para confirmar su cuenta.",
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
        { error: "El perfil asociado a este enlace no esta disponible. Contacte recepcion." },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      completed: true,
      memberName: member.memberName,
      accessCode: formatAccessCode(memberAccessCode(normalizedName)),
      paidRegistration: verified.pending.source === "paypal",
      invitedRegistration: verified.pending.source === "reception",
    });
  }
  return NextResponse.json({
    ok: true,
    email: verified.pending.email,
    source: verified.pending.source,
    memberName: verified.pending.expectedMemberName || "",
  });
}

/**
 * Paso 2b — con el token valido, el usuario completa nombre, cedula y telefono.
 * Aqui se crea (o completa) el perfil y se marca el correo como verificado.
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
        { error: "El perfil asociado a este enlace no esta disponible. Contacte recepcion." },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      memberName: member.memberName,
      accessCode: formatAccessCode(memberAccessCode(normalizedName)),
      freeFirstDay: pending.source === "primer-dia" || pending.source === "app",
      paidRegistration: pending.source === "paypal",
      invitedRegistration: pending.source === "reception",
      alreadyCompleted: true,
    });
  }

  const paidInvite = pending.source === "paypal" && Boolean(pending.expectedMemberKey);
  const receptionInvite = pending.source === "reception";
  const memberName = paidInvite
    ? normalizeName(pending.expectedMemberName)
    : normalizeName(body.memberName);
  const cedula = normalizeCedula(body.cedula);
  const phone = normalizePhone(body.phone);
  const goal = String(body.goal ?? "").trim().slice(0, 80);
  const email = pending.email;

  if (!memberName) {
    return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });
  }
  if (!cedula) {
    return NextResponse.json({ error: "La cedula es requerida." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "El telefono es requerido." }, { status: 400 });
  }

  const normalizedName = paidInvite
    ? normalizeKey(pending.expectedMemberKey || "")
    : normalizeKey(memberName);
  const now = new Date();

  // Chequear duplicados de contacto ligados a OTRO perfil.
  const duplicate = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
    normalizedName: { $ne: normalizedName },
    $or: [{ phone }, { email }, { cedula }],
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: `Ese contacto ya esta ligado a ${duplicate.memberName}. Hable con recepcion.`,
      },
      { status: 409 },
    );
  }

  const existing = await db
    .collection<MemberDoc>(MEMBERS_COLLECTION)
    .findOne({ normalizedName });
  if (paidInvite && !existing) {
    return NextResponse.json(
      { error: "No encontramos el perfil asociado al pago. Contacte recepcion." },
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
  if (!existing) {
    // Solo los registros públicos reciben el primer día; recepción crea una cuenta sin plan.
    set.membership = receptionInvite
      ? {
          plan: "Sin plan activo",
          status: "expired",
          startedAt: today,
          nextBillingDate: addDays(toUtcDate(today), -1).toISOString().slice(0, 10),
        }
      : createFreeFirstDayMembership(today);
  } else if (receptionInvite && !existing.membership) {
    set.membership = {
      plan: "Sin plan activo",
      status: "expired",
      startedAt: today,
      nextBillingDate: addDays(toUtcDate(today), -1).toISOString().slice(0, 10),
    };
  }

  await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
    { normalizedName },
    { $set: set, $setOnInsert: { workouts: [], bodyMetrics: [], createdAt: now } },
    { upsert: true },
  );

  const freeFirstDay = !existing && !receptionInvite && !paidInvite;
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
        invitedRegistration: receptionInvite,
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    memberName,
    accessCode,
    freeFirstDay,
    paidRegistration: paidInvite,
    invitedRegistration: receptionInvite,
  });
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
