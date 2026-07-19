import type { Db } from "mongodb";
import {
  createRegistrationToken,
  hashRegistrationToken,
} from "@/lib/xtreme/registration-token";
import {
  EMAIL_CONTACTS_COLLECTION,
  MEMBERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  PINS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
  isValidEmail,
  normalizeEmail,
  normalizeKey,
  normalizeName,
  normalizePhone,
  normalizeCedula,
} from "@/lib/xtreme/shared";

/**
 * Audiencias que priorizan CTA de activación.
 * Igual, el procesador de campañas intenta magic link para TODOS los destinos
 * cuando el correo aún no tiene cuenta verificada con PIN.
 */
export const CLAIM_LINK_AUDIENCES = new Set([
  "claim_profile",
  "claim_recovered",
  "claim_native",
  "claim_active_plan",
  "invite_recoverable",
  "unverified_not_sent",
  "excel_recovered",
  "never_registered",
  "unregistered",
  "imported",
  "pending",
  "possible_foreign",
  "winback_90",
  "winback_180",
  "winback_365",
  "inactive",
  "never_opened",
  "no_plan",
  "plan_week",
  "plan_fortnight",
  "plan_month",
  "plan_senior",
  "all",
]);

/** Enlaces de campaña para activar app: 72 h (lotes grandes). */
const CLAIM_EXPIRES_HOURS = 72;

export type CampaignClaimLink =
  | { kind: "claim"; path: string; token: string; memberKey: string | null }
  | { kind: "app"; path: "/app" };

/**
 * Crea (o renueva) un pending registration ligado al correo y, si existe,
 * a la ficha sin verificar (o sin PIN). El CTA del mail apunta a
 * /registro/confirmar?token= para precargar datos y setear PIN.
 */
export async function issueCampaignClaimLink(
  db: Db,
  rawEmail: string,
): Promise<CampaignClaimLink | null> {
  const email = normalizeEmail(rawEmail);
  if (!email || !isValidEmail(email)) return null;

  const members = await db
    .collection<MemberDoc>(MEMBERS_COLLECTION)
    .find({ email: { $regex: `^${escapeRegex(email)}$`, $options: "i" } })
    .limit(8)
    .toArray();

  const byEmailExact = members.filter((m) => normalizeEmail(m.email) === email);
  const unverified =
    byEmailExact.find((m) => m.emailVerified !== true) ||
    members.find((m) => m.emailVerified !== true);
  const verified = byEmailExact.find((m) => m.emailVerified === true);

  // Cuenta ya activa con PIN: solo mandar a la app.
  if (verified && !unverified) {
    const pinDoc = await db.collection(PINS_COLLECTION).findOne(
      { normalizedName: normalizeKey(verified.normalizedName || "") },
      { projection: { pinHash: 1 } },
    );
    if (pinDoc?.pinHash) {
      return { kind: "app", path: "/app" };
    }
    // Verificado pero sin PIN: magic link para completar y crear PIN con los datos.
  }

  // Preferir ficha sin verificar; si solo hay verificada sin PIN, usarla.
  let member: MemberDoc | null = unverified || (verified && !unverified ? verified : null) || null;

  // Correo solo en lista de contactos: intentar ligar a ficha por nombre del contacto
  // (socios importados sin email en la ficha).
  if (!member) {
    member = await findMemberForContactEmail(db, email);
  }

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
    source: "campaign",
  };

  if (memberKey) {
    setDoc.expectedMemberKey = memberKey;
    setDoc.expectedMemberName = memberName || memberKey;
  }

  await pendingCol.updateOne(
    { email },
    {
      $set: setDoc,
      $unset: memberKey
        ? { paymentId: "" }
        : { paymentId: "", expectedMemberKey: "", expectedMemberName: "" },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  // Asegurar que el correo quede en la ficha (sin verificar) para el claim.
  // No pisar un correo ya verificado de otra persona: solo la ficha ligada.
  if (memberKey) {
    const target = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
      normalizedName: memberKey,
    });
    const targetVerified = target?.emailVerified === true;
    const targetEmail = normalizeEmail(target?.email);
    if (!targetVerified || targetEmail === email || !targetEmail) {
      await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName: memberKey },
        {
          $set: {
            email,
            // Si ya estaba verificado con este mismo correo, se mantiene verificado.
            emailVerified: targetVerified && targetEmail === email ? true : false,
            updatedAt: now,
          },
          $unset: { emailQuarantine: "" },
        },
      );
    }
  }

  // Solo devolver claim si el token tiene el formato que verifyToken acepta (64 hex).
  // Evita que un bug de generación mande ?token= vacío o truncado al correo masivo.
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    console.error("CAMPAIGN CLAIM TOKEN INVALID FORMAT", email, token?.length);
    return null;
  }

  const path = `/registro/confirmar?token=${encodeURIComponent(token)}`;
  return {
    kind: "claim",
    path,
    token,
    memberKey,
  };
}

/**
 * Contacto importado con nombre ≈ ficha sin correo (o correo no verificado).
 * Evita que un socio "sin correo en ficha" no pueda reclamar vía la lista.
 */
async function findMemberForContactEmail(db: Db, email: string): Promise<MemberDoc | null> {
  const contact = await db
    .collection<{ email?: string; name?: string; phone?: string }>(EMAIL_CONTACTS_COLLECTION)
    .findOne({ email });
  const name = normalizeName(contact?.name);
  const key = name ? normalizeKey(name) : "";
  if (key) {
    const byKey = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
      normalizedName: key,
      emailVerified: { $ne: true },
    });
    if (byKey) return byKey;
  }

  // Teléfono del contacto vs ficha sin verificar.
  const phone = normalizePhone(contact?.phone);
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length >= 8) {
    const candidates = await db
      .collection<MemberDoc>(MEMBERS_COLLECTION)
      .find({
        emailVerified: { $ne: true },
        phone: { $exists: true, $type: "string", $ne: "" },
      })
      .project({
        memberName: 1,
        normalizedName: 1,
        phone: 1,
        email: 1,
        emailVerified: 1,
        cedula: 1,
        goal: 1,
      })
      .limit(200)
      .toArray();
    const hit = candidates.find(
      (m) => normalizePhone(m.phone).replace(/\D/g, "") === phoneDigits,
    );
    if (hit) return hit as MemberDoc;
  }

  return null;
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
