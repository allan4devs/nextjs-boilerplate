import type { Db } from "mongodb";
import {
  createRegistrationToken,
  hashRegistrationToken,
} from "@/lib/xtreme/registration-token";
import {
  EMAIL_CONTACTS_COLLECTION,
  MEMBERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
  isValidEmail,
  normalizeEmail,
  normalizeKey,
  normalizeName,
  normalizePhone,
  normalizeCedula,
} from "@/lib/xtreme/shared";

/** Audiencias que reciben enlace mágico de activación (no solo /app o /precios). */
export const CLAIM_LINK_AUDIENCES = new Set([
  "claim_profile",
  "never_registered",
  "unregistered",
  "imported",
  "pending",
  "possible_foreign",
]);

/** Enlaces de campaña para activar app: 72 h (lotes grandes). */
const CLAIM_EXPIRES_HOURS = 72;

export type CampaignClaimLink =
  | { kind: "claim"; path: string; token: string; memberKey: string | null }
  | { kind: "app"; path: "/app" };

/**
 * Crea (o renueva) un pending registration ligado al correo y, si existe,
 * a la ficha sin verificar. El CTA del mail apunta a /registro/confirmar?token=
 */
export async function issueCampaignClaimLink(
  db: Db,
  rawEmail: string,
): Promise<CampaignClaimLink | null> {
  const email = normalizeEmail(rawEmail);
  if (!email || !isValidEmail(email)) return null;

  // Buscar ficha por correo (sin verificar primero; si ya verificó, solo manda a la app).
  const members = await db
    .collection<MemberDoc>(MEMBERS_COLLECTION)
    .find({ email: { $regex: `^${escapeRegex(email)}$`, $options: "i" } })
    .limit(5)
    .toArray();

  const unverified =
    members.find((m) => m.emailVerified !== true) ||
    members.find((m) => normalizeEmail(m.email) === email && m.emailVerified !== true);
  const verified = members.find((m) => m.emailVerified === true && normalizeEmail(m.email) === email);

  if (verified && !unverified) {
    return { kind: "app", path: "/app" };
  }

  const member = unverified || null;
  const memberKey = member?.normalizedName ? normalizeKey(member.normalizedName) : null;
  const memberName =
    normalizeName(member?.memberName) ||
    (await contactName(db, email)) ||
    memberKey ||
    "";

  const token = createRegistrationToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CLAIM_EXPIRES_HOURS * 60 * 60_000);
  const pendingCol = db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION);
  const existingPending = await pendingCol.findOne({ email });
  const previousTokenHashes = [
    existingPending?.tokenHash,
    ...(existingPending?.previousTokenHashes ?? []),
  ]
    .filter((hash): hash is string => Boolean(hash))
    .filter((hash, index, hashes) => hashes.indexOf(hash) === index)
    .slice(0, 5);

  const setDoc: Partial<PendingRegistrationDoc> = {
    email,
    tokenHash: hashRegistrationToken(token),
    previousTokenHashes,
    expiresAt,
    confirmedAt: null,
    memberNormalizedName: null,
    source: "admin",
  };

  if (memberKey) {
    setDoc.expectedMemberKey = memberKey;
    setDoc.expectedMemberName = memberName || memberKey;
  }

  await pendingCol.updateOne(
    { email },
    {
      $set: setDoc,
      $unset: memberKey ? { paymentId: "" } : { paymentId: "", expectedMemberKey: "", expectedMemberName: "" },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  // Asegurar que el correo quede en la ficha (sin verificar) para el claim.
  if (memberKey) {
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
  }

  return {
    kind: "claim",
    path: `/registro/confirmar?token=${encodeURIComponent(token)}`,
    token,
    memberKey,
  };
}

async function contactName(db: Db, email: string) {
  const contact = await db.collection<{ email?: string; name?: string }>(EMAIL_CONTACTS_COLLECTION).findOne({
    email,
  });
  return normalizeName(contact?.name) || "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Snapshot de ficha para mostrar en el form de activación. */
export function profileSnapshot(member: MemberDoc | null | undefined) {
  if (!member) {
    return {
      memberName: "",
      cedula: "",
      phone: "",
      goal: "",
    };
  }
  return {
    memberName: normalizeName(member.memberName) || "",
    cedula: normalizeCedula(member.cedula) || "",
    phone: normalizePhone(member.phone) || "",
    goal: String(member.goal || "").trim().slice(0, 80),
  };
}
