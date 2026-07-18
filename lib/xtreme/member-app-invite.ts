import type { Db } from "mongodb";
import { requestAppUrl } from "@/lib/constants/app-url";
import { sendStaffMemberAppInviteEmail, type SendEmailResult } from "@/lib/helpers/email";
import {
  createRegistrationToken,
  hashRegistrationToken,
} from "@/lib/xtreme/registration-token";
import {
  MEMBERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
  isValidEmail,
  normalizeEmail,
  normalizeKey,
  normalizeName,
} from "@/lib/xtreme/shared";

const INVITE_EXPIRES_HOURS = 24;

export type MemberAppInviteSource = "admin" | "reception";

export type MemberAppInviteResult =
  | {
      ok: true;
      email: string;
      memberKey: string;
      memberName: string;
      expiresHours: number;
      emailSent: true;
      alreadyVerified?: false;
    }
  | { ok: false; status: number; error: string };

/**
 * Asigna correo (sin verificar) a un socio existente y manda magic link
 * ligado con expectedMemberKey — al confirmar no se crea ficha nueva.
 */
export async function inviteExistingMemberToApp(
  db: Db,
  args: {
    memberKey: string;
    email?: string;
    source: MemberAppInviteSource;
    baseUrl?: string;
  },
): Promise<MemberAppInviteResult> {
  const memberKey = normalizeKey(args.memberKey);
  if (!memberKey) {
    return { ok: false, status: 400, error: "Socio requerido." };
  }

  const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
    normalizedName: memberKey,
  });
  if (!member) {
    return { ok: false, status: 404, error: "Socio no encontrado." };
  }

  if (member.emailVerified === true && member.email) {
    return {
      ok: false,
      status: 409,
      error:
        "Este socio ya tiene correo verificado. Si nunca creó el PIN: que entre a /app con su cédula, toque «Enviar código al correo» y cree el PIN de 4 dígitos. Si ya tiene PIN, que lo use para entrar.",
    };
  }

  const email = normalizeEmail(args.email || member.email || "");
  if (!email || !isValidEmail(email)) {
    return {
      ok: false,
      status: 400,
      error: "Ingresá un correo válido para invitar a este socio.",
    };
  }

  const emailOwner = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
    email,
    normalizedName: { $ne: memberKey },
  });
  if (emailOwner) {
    return {
      ok: false,
      status: 409,
      error: `Ese correo ya está en la ficha de ${emailOwner.memberName || "otro socio"}. Resolvé el conflicto antes de invitar.`,
    };
  }

  const now = new Date();
  const memberName = normalizeName(member.memberName) || memberKey;

  await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
    { normalizedName: memberKey },
    {
      $set: {
        email,
        emailVerified: false,
        updatedAt: now,
      },
      $unset: { emailQuarantine: "" },
    },
  );

  const token = createRegistrationToken();
  const expiresAt = new Date(now.getTime() + INVITE_EXPIRES_HOURS * 60 * 60_000);
  const pendingCol = db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION);
  const existingPending = await pendingCol.findOne({ email });
  const previousTokenHashes = [
    existingPending?.tokenHash,
    ...(existingPending?.previousTokenHashes ?? []),
  ]
    .filter((hash): hash is string => Boolean(hash))
    .filter((hash, index, hashes) => hashes.indexOf(hash) === index)
    .slice(0, 5);

  await pendingCol.updateOne(
    { email },
    {
      $set: {
        email,
        tokenHash: hashRegistrationToken(token),
        previousTokenHashes,
        expiresAt,
        confirmedAt: null,
        memberNormalizedName: null,
        expectedMemberKey: memberKey,
        expectedMemberName: memberName,
        source: args.source,
      },
      $unset: { paymentId: "" },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  const sent: SendEmailResult = await sendStaffMemberAppInviteEmail({
    to: email,
    token,
    memberName,
    expiresHours: INVITE_EXPIRES_HOURS,
    source: args.source,
    baseUrl: args.baseUrl,
  });

  if (!sent.ok) {
    return {
      ok: false,
      status: 502,
      error: sent.error || "No se pudo enviar el correo de invitación.",
    };
  }

  return {
    ok: true,
    email,
    memberKey,
    memberName,
    expiresHours: INVITE_EXPIRES_HOURS,
    emailSent: true,
  };
}

export function inviteBaseUrlFromRequest(url: string) {
  return requestAppUrl(url);
}
