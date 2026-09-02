import { createHash, timingSafeEqual } from "crypto";
import type { Db } from "mongodb";
import {
  STAFF_RECEPTION_PINS_COLLECTION,
  STAFF_RECEPTION_PIN_PEPPER,
} from "./shared/config";
import {
  RECEPTION_OPERATORS,
  isReceptionOperator,
  receptionOperatorProfile,
  type ReceptionOperatorId,
  type StaffProfile,
} from "./staff-directory";

/**
 * PIN de mostrador por operador.
 *
 * Es una credencial propia de recepción: se crea la primera vez desde el
 * mostrador (sin código previo), vive en Mongo con hash + pepper propio y NUNCA
 * concede acceso al Admin OS. Un super admin puede restablecerlo.
 */
export type ReceptionPinDoc = {
  staffId: ReceptionOperatorId;
  /** Hash del PIN; "" cuando un admin lo restableció y falta volver a crearlo. */
  pinHash: string;
  createdAt: Date;
  updatedAt: Date;
  setAt: Date;
  /** "desk" en el alta normal, "reset:<adminId>" tras un restablecimiento. */
  setBy: string;
  resetAt?: Date | null;
  resetBy?: string | null;
};

export function isValidReceptionPin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export function hashReceptionPin(pin: string, staffId: string) {
  return createHash("sha256")
    .update(`staff-reception|${staffId}|${pin}|${STAFF_RECEPTION_PIN_PEPPER}`)
    .digest("hex");
}

function safeHashEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

let indexEnsured = false;
export async function ensureReceptionPinIndex(db: Db) {
  if (indexEnsured) return;
  try {
    await db
      .collection(STAFF_RECEPTION_PINS_COLLECTION)
      .createIndex({ staffId: 1 }, { unique: true, background: true });
    indexEnsured = true;
  } catch {
    /* ya existe o colección vacía; no fatal */
  }
}

export async function getReceptionPinDoc(db: Db, staffId: string) {
  if (!isReceptionOperator(staffId)) return null;
  return db
    .collection<ReceptionPinDoc>(STAFF_RECEPTION_PINS_COLLECTION)
    .findOne({ staffId });
}

export type ReceptionOperatorStatus = {
  id: ReceptionOperatorId;
  name: string;
  title: string;
  hasPin: boolean;
};

/** Los 4 operadores del mostrador, en orden, con si ya crearon su PIN. */
export async function listReceptionOperators(
  db: Db,
): Promise<ReceptionOperatorStatus[]> {
  const docs = await db
    .collection<ReceptionPinDoc>(STAFF_RECEPTION_PINS_COLLECTION)
    .find({}, { projection: { staffId: 1, pinHash: 1 } })
    .toArray();
  const withPin = new Set(
    docs.filter((doc) => Boolean(doc.pinHash)).map((doc) => doc.staffId),
  );
  return RECEPTION_OPERATORS.map((person) => ({
    id: person.id as ReceptionOperatorId,
    name: person.name,
    title: person.title,
    hasPin: withPin.has(person.id as ReceptionOperatorId),
  }));
}

export type SetReceptionPinResult =
  | { ok: true; profile: StaffProfile }
  | { ok: false; error: string; status: number; code?: string };

/**
 * Crea el PIN por primera vez (o tras un restablecimiento).
 * Escritura atómica: si ya existe un PIN vigente, no lo pisa.
 */
export async function setReceptionPin(
  db: Db,
  args: { staffId: string; pin: string; setBy: string },
): Promise<SetReceptionPinResult> {
  const profile = receptionOperatorProfile(args.staffId);
  if (!profile) {
    return { ok: false, error: "Operador de recepción no válido.", status: 400 };
  }
  if (!isValidReceptionPin(args.pin)) {
    return { ok: false, error: "El PIN debe tener 4 dígitos.", status: 400 };
  }

  const now = new Date();
  try {
    // Colección sin genérico a propósito: el filtro compara `pinHash` contra
    // null/"" para el alta atómica, algo que el tipado estricto de `ReceptionPinDoc`
    // rechaza. Mismo patrón que el PIN de socio en `app/api/xtreme/pin`.
    await db.collection(STAFF_RECEPTION_PINS_COLLECTION).updateOne(
      {
        staffId: profile.id,
        $or: [{ pinHash: { $exists: false } }, { pinHash: null }, { pinHash: "" }],
      },
      {
        $set: {
          staffId: profile.id,
          pinHash: hashReceptionPin(args.pin, profile.id),
          updatedAt: now,
          setAt: now,
          setBy: args.setBy.slice(0, 60),
          resetAt: null,
          resetBy: null,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      return {
        ok: false,
        error:
          "Ese operador ya tiene un PIN. Ingresá con él o pedí un restablecimiento a un administrador.",
        status: 409,
        code: "pin_already_set",
      };
    }
    throw err;
  }
  return { ok: true, profile };
}

export type VerifyReceptionPinResult = {
  ok: boolean;
  hasPin: boolean;
  profile: StaffProfile | null;
};

export async function verifyReceptionPin(
  db: Db,
  staffId: string,
  pin: string,
): Promise<VerifyReceptionPinResult> {
  const profile = receptionOperatorProfile(staffId);
  if (!profile) return { ok: false, hasPin: false, profile: null };
  const doc = await db
    .collection<ReceptionPinDoc>(STAFF_RECEPTION_PINS_COLLECTION)
    .findOne({ staffId: profile.id as ReceptionOperatorId });
  if (!doc?.pinHash) return { ok: false, hasPin: false, profile };
  const ok = safeHashEqual(doc.pinHash, hashReceptionPin(pin, profile.id));
  return { ok, hasPin: true, profile };
}

/** Restablecimiento por admin: deja el PIN en blanco para que se vuelva a crear. */
export async function clearReceptionPin(
  db: Db,
  args: { staffId: string; by: string },
): Promise<{ ok: boolean; error?: string; status?: number; name?: string; existed: boolean }> {
  const profile = receptionOperatorProfile(args.staffId);
  if (!profile) {
    return { ok: false, error: "Operador de recepción no válido.", status: 400, existed: false };
  }
  const now = new Date();
  const result = await db
    .collection(STAFF_RECEPTION_PINS_COLLECTION)
    .updateOne(
      { staffId: profile.id, pinHash: { $nin: ["", null] } },
      {
        $set: {
          pinHash: "",
          resetAt: now,
          resetBy: args.by.slice(0, 60),
          updatedAt: now,
        },
      },
    );
  return { ok: true, name: profile.name, existed: result.modifiedCount > 0 };
}
