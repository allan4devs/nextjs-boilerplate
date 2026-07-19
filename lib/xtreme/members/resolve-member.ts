/**
 * Única fuente de verdad para resolver un socio en todos los OS.
 *
 * Orden de prioridad (cédula siempre gana):
 * 1. Cédula (explícita o inferida)
 * 2. memberKey / normalizedName (sesión)
 * 3. Código de acceso de 8 dígitos
 * 4. Nombre exacto
 * 5. Nombre parcial
 * 6. Teléfono
 *
 * memberKey interno sigue siendo normalizedName (compat. sesiones/PIN/entitlements),
 * pero la búsqueda de cara al usuario prioriza cédula.
 */
import type { Db } from "mongodb";
import {
  MEMBERS_COLLECTION,
  findMemberByCedula,
  memberAccessCode,
  normalizeKey,
  normalizeName,
  normalizePhone,
  type MemberDoc,
} from "@/lib/xtreme/shared";
import {
  buildMemberLookupParams,
  digitsOnly,
  type MemberLookupParams,
} from "@/lib/xtreme/shared/lookup-query";

export type MemberResolvedBy =
  | "cedula"
  | "memberKey"
  | "code"
  | "name"
  | "phone"
  | "face";

export type ResolvedMember = {
  member: MemberDoc;
  memberKey: string;
  resolvedBy: MemberResolvedBy;
};

export const MEMBER_NOT_FOUND_MESSAGE =
  "Socio no encontrado. Probá la cédula (principal), nombre y apellido, o el código de 8 dígitos de la app.";

function memberKeyOf(doc: MemberDoc) {
  return doc.normalizedName || normalizeKey(doc.memberName || "");
}

function phoneDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

/** Candidatos con cédula cargados (más liviano que toda la colección). */
async function membersWithCedula(db: Db) {
  return db
    .collection<MemberDoc>(MEMBERS_COLLECTION)
    .find({ cedula: { $exists: true, $type: "string", $ne: "" } })
    .toArray();
}

async function allMembers(db: Db) {
  return db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray();
}

async function resolveByCedula(db: Db, raw: string): Promise<ResolvedMember | null> {
  const digits = digitsOnly(raw);
  if (digits.length < 6) return null;

  // Match flexible (guiones, endsWith) sobre docs con cédula.
  const withCed = await membersWithCedula(db);
  const hit = findMemberByCedula(withCed, raw) || findMemberByCedula(withCed, digits);
  if (!hit) return null;
  return { member: hit, memberKey: memberKeyOf(hit), resolvedBy: "cedula" };
}

async function resolveByMemberKey(db: Db, keyRaw: string): Promise<ResolvedMember | null> {
  const key = normalizeKey(normalizeName(keyRaw));
  if (!key) return null;
  const hit = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName: key });
  if (!hit) return null;
  return { member: hit, memberKey: memberKeyOf(hit), resolvedBy: "memberKey" };
}

async function resolveByAccessCode(
  db: Db,
  codeRaw: string,
  docs?: MemberDoc[],
): Promise<ResolvedMember | null> {
  const codeDigits = digitsOnly(codeRaw);
  if (codeDigits.length < 4 || codeDigits.length > 8) return null;

  // 9+ nunca llega acá (se trata como cédula arriba).
  const list = docs ?? (await allMembers(db));
  const padded = codeDigits.padStart(8, "0");

  let hit =
    codeDigits.length === 8
      ? list.find((d) => memberAccessCode(memberKeyOf(d)) === padded)
      : undefined;

  if (!hit && codeDigits.length < 8) {
    hit = list.find((d) => memberAccessCode(memberKeyOf(d)).includes(codeDigits));
  }
  if (!hit && codeDigits.length === 8) {
    // fallback includes (por si hay padding raro)
    hit = list.find((d) => memberAccessCode(memberKeyOf(d)) === codeDigits);
  }
  if (!hit) return null;
  return { member: hit, memberKey: memberKeyOf(hit), resolvedBy: "code" };
}

async function resolveByNameOrPhone(
  db: Db,
  qRaw: string,
  docs?: MemberDoc[],
): Promise<ResolvedMember | null> {
  const q = normalizeName(qRaw);
  if (!q) return null;
  const list = docs ?? (await allMembers(db));
  const key = normalizeKey(q);
  const qPhone = phoneDigits(q);

  const exact =
    list.find((d) => (d.normalizedName || "") === key) ||
    list.find((d) => normalizeKey(d.memberName || "") === key);
  if (exact) {
    return { member: exact, memberKey: memberKeyOf(exact), resolvedBy: "name" };
  }

  const partial = list.find((d) => (d.memberName || "").toUpperCase().includes(key));
  if (partial) {
    return { member: partial, memberKey: memberKeyOf(partial), resolvedBy: "name" };
  }

  if (qPhone.length >= 4) {
    const byPhone = list.find((d) => {
      const phone = phoneDigits(d.phone) || phoneDigits(normalizePhone(d.phone));
      return Boolean(phone && (phone.includes(qPhone) || qPhone.includes(phone)));
    });
    if (byPhone) {
      return { member: byPhone, memberKey: memberKeyOf(byPhone), resolvedBy: "phone" };
    }
  }

  return null;
}

/**
 * Resuelve un socio con la prioridad canónica.
 * Usar en checkin, reception, admin, trainer, user bootstrap y social.
 */
export async function resolveMember(
  db: Db,
  input: MemberLookupParams,
): Promise<ResolvedMember | null> {
  const p = buildMemberLookupParams(input);

  // 1) Cédula - siempre primero
  if (p.cedula && digitsOnly(p.cedula).length >= 6) {
    const byCed = await resolveByCedula(db, p.cedula);
    if (byCed) return byCed;
    // En autenticación y check-in la cédula es autoritativa. Si no existe,
    // no se debe reinterpretar como teléfono/código y elegir a otra persona.
    if (p.strictCedula) return null;
  }

  // 2) Sesión / memberKey
  if (p.memberKey) {
    const byKey = await resolveByMemberKey(db, p.memberKey);
    if (byKey) return byKey;
  }

  // 3) Nombre explícito como key
  if (p.memberName) {
    const byNameKey = await resolveByMemberKey(db, p.memberName);
    if (byNameKey) return byNameKey;
  }

  // 4) Código de acceso (solo 4-8 dígitos; 9+ ya se intentó como cédula)
  const codeDigits = p.code ? digitsOnly(p.code) : "";
  if (codeDigits.length >= 9) {
    const byCedFromCode = await resolveByCedula(db, codeDigits);
    if (byCedFromCode) return byCedFromCode;
  }
  if (codeDigits.length >= 4 && codeDigits.length <= 8) {
    const byCode = await resolveByAccessCode(db, codeDigits);
    if (byCode) return byCode;
  }

  // 5) Texto libre q (cédula ya se intentó vía buildMemberLookupParams → p.cedula)
  if (p.q) {
    const qDigits = digitsOnly(p.q);
    if (qDigits.length >= 6) {
      const byCedQ = await resolveByCedula(db, p.q);
      if (byCedQ) return byCedQ;
    }
    if (qDigits.length === 8) {
      const byCodeQ = await resolveByAccessCode(db, qDigits);
      if (byCodeQ) return byCodeQ;
    }
    const byText = await resolveByNameOrPhone(db, p.q);
    if (byText) return byText;
  }

  return null;
}

/** Atajo: clasifica un string suelto y resuelve. */
export async function resolveMemberFromSearch(
  db: Db,
  raw: string,
): Promise<ResolvedMember | null> {
  return resolveMember(db, { q: raw });
}
