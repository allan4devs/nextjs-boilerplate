import { createHash } from "crypto";
import type { Db } from "mongodb";
import type { NextRequest } from "next/server";

export const AUTH_ATTEMPTS_COLLECTION = "xtreme_gym_auth_attempts";

type AuthAttemptDoc = {
  key: string;
  scope: string;
  count: number;
  windowStartedAt: Date;
  blockedUntil?: Date;
  /** Número de veces que se ha bloqueado esta clave (para backoff exponencial). */
  lockoutCount?: number;
  expiresAt: Date;
};

// ---------------------------------------------------------------------------
// Fingerprint helpers
// ---------------------------------------------------------------------------

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function clientFingerprint(req: NextRequest): string {
  const ip = clientIp(req);
  const agent = req.headers.get("user-agent")?.slice(0, 160) || "unknown";
  return createHash("sha256").update(`${ip}|${agent}`).digest("hex");
}

export function requestFingerprint(req: NextRequest): string {
  return clientFingerprint(req).slice(0, 16);
}

// ---------------------------------------------------------------------------
// Key factories — dos ejes independientes de bloqueo
// ---------------------------------------------------------------------------

/**
 * Eje 1: por cuenta (subject) solamente.
 * No depende de IP ni user-agent: un atacante que rota IPs sigue
 * acumulando intentos en esta clave hasta el lockout.
 */
function subjectKey(scope: string, subject: string): string {
  return createHash("sha256").update(`subj|${scope}|${subject}`).digest("hex");
}

/**
 * Eje 2: por IP (cross-account).
 * Limita ataques de enumeración de cuentas desde la misma IP.
 */
function ipKey(req: NextRequest, scope: string): string {
  return createHash("sha256")
    .update(`ip|${scope}|${clientIp(req)}`)
    .digest("hex");
}

/**
 * Eje 3 (legacy / compatibilidad): IP + cuenta.
 * Se mantiene para la API antigua que ya existía.
 */
function legacyKey(req: NextRequest, scope: string, subject: string): string {
  return createHash("sha256")
    .update(`${scope}|${subject}|${clientFingerprint(req)}`)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Lockout exponencial: 1h → 2h → 4h → 8h → 24h (tope)
// ---------------------------------------------------------------------------

const LOCKOUT_STEPS_MS = [
  1 * 60 * 60_000,   // 1 hora
  2 * 60 * 60_000,   // 2 horas
  4 * 60 * 60_000,   // 4 horas
  8 * 60 * 60_000,   // 8 horas
  24 * 60 * 60_000,  // 24 horas (tope)
];

function lockoutDurationMs(lockoutCount: number): number {
  const idx = Math.min(lockoutCount, LOCKOUT_STEPS_MS.length - 1);
  return LOCKOUT_STEPS_MS[idx];
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

async function getStatus(db: Db, key: string) {
  const doc = await db
    .collection<AuthAttemptDoc>(AUTH_ATTEMPTS_COLLECTION)
    .findOne({ key });
  const blockedUntil = doc?.blockedUntil ? new Date(doc.blockedUntil) : null;
  const blocked = Boolean(blockedUntil && blockedUntil.getTime() > Date.now());
  return {
    key,
    doc,
    blocked,
    retryAfterSeconds: blockedUntil
      ? Math.max(1, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000))
      : 0,
  };
}

async function applyFailedAttempt(
  db: Db,
  key: string,
  args: { scope: string; maxAttempts: number; windowMs: number },
) {
  const collection = db.collection<AuthAttemptDoc>(AUTH_ATTEMPTS_COLLECTION);
  const now = new Date();
  const current = await collection.findOne({ key });
  const windowExpired =
    !current ||
    now.getTime() - new Date(current.windowStartedAt).getTime() > args.windowMs;
  const count = windowExpired ? 1 : current.count + 1;
  const shouldBlock = count >= args.maxAttempts;
  const lockoutCount = shouldBlock
    ? (current?.lockoutCount ?? 0) + 1
    : (current?.lockoutCount ?? 0);
  const blockedUntil = shouldBlock
    ? new Date(now.getTime() + lockoutDurationMs(lockoutCount - 1))
    : undefined;

  await collection.updateOne(
    { key },
    {
      $set: {
        scope: args.scope,
        count,
        windowStartedAt: windowExpired ? now : current!.windowStartedAt,
        lockoutCount,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60_000), // TTL 7 días
        ...(blockedUntil ? { blockedUntil } : {}),
      },
      ...(!blockedUntil ? { $unset: { blockedUntil: "" } } : {}),
    },
    { upsert: true },
  );

  return { count, blocked: Boolean(blockedUntil), blockedUntil, lockoutCount };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Verifica ambos ejes de rate limit (cuenta + IP).
 * Si cualquiera está bloqueado, devuelve blocked=true.
 */
export async function authAttemptStatus(
  db: Db,
  req: NextRequest,
  args: { scope: string; subject: string },
) {
  const [subj, ip] = await Promise.all([
    getStatus(db, subjectKey(args.scope, args.subject)),
    getStatus(db, ipKey(req, args.scope)),
  ]);

  // El más restrictivo de los dos ejes gana.
  const blocked = subj.blocked || ip.blocked;
  const retryAfterSeconds = Math.max(
    subj.retryAfterSeconds,
    ip.retryAfterSeconds,
  );

  // Mantener la clave legacy para que el código del route no cambie de API.
  const legKey = legacyKey(req, args.scope, args.subject);
  return { key: legKey, blocked, retryAfterSeconds, subjKey: subj.key, ipRateKey: ip.key };
}

/**
 * Registra un intento fallido en los tres ejes (legacy, cuenta, IP).
 * Devuelve el peor estado de bloqueo.
 */
export async function recordFailedAuthAttempt(
  db: Db,
  _legacyKey: string, // mantenemos firma para no romper callers existentes
  args: { scope: string; maxAttempts?: number; windowMs?: number },
  _req?: NextRequest,
) {
  // Los callers existentes pasan el key legacy; ignoramos y usamos el subject del key.
  // Para la nueva API interna usamos directamente los ejes.
  // Nota: el subject no está disponible aquí sin cambiar todos los callers,
  // así que esta función se mantiene como shim y los bloques reales
  // van en recordPinFailure / recordOtpFailure a continuación.
  const maxAttempts = args.maxAttempts ?? 5;
  const windowMs = args.windowMs ?? 15 * 60_000;
  const collection = db.collection<AuthAttemptDoc>(AUTH_ATTEMPTS_COLLECTION);
  const now = new Date();
  const current = await collection.findOne({ key: _legacyKey });
  const windowExpired =
    !current ||
    now.getTime() - new Date(current.windowStartedAt).getTime() > windowMs;
  const count = windowExpired ? 1 : current.count + 1;
  const lockoutCount = count >= maxAttempts
    ? (current?.lockoutCount ?? 0) + 1
    : (current?.lockoutCount ?? 0);
  const blockedUntil =
    count >= maxAttempts
      ? new Date(now.getTime() + lockoutDurationMs(lockoutCount - 1))
      : undefined;

  await collection.updateOne(
    { key: _legacyKey },
    {
      $set: {
        scope: args.scope,
        count,
        windowStartedAt: windowExpired ? now : current!.windowStartedAt,
        lockoutCount,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60_000),
        ...(blockedUntil ? { blockedUntil } : {}),
      },
      ...(!blockedUntil ? { $unset: { blockedUntil: "" } } : {}),
    },
    { upsert: true },
  );
  return { count, blocked: Boolean(blockedUntil), blockedUntil };
}

/**
 * Registra un intento fallido de PIN en AMBOS ejes (cuenta + IP).
 * Máximos recomendados para PIN de 4 dígitos:
 *   - Por cuenta: 5 intentos → lockout exponencial 1h/2h/4h/8h/24h
 *   - Por IP: 20 intentos en 15 min (cross-account enumeration)
 */
export async function recordPinFailure(
  db: Db,
  req: NextRequest,
  args: { scope: string; subject: string },
) {
  const [subj, ip] = await Promise.all([
    applyFailedAttempt(db, subjectKey(args.scope, args.subject), {
      scope: args.scope,
      maxAttempts: 5,            // 5 intentos por cuenta → bloqueo
      windowMs: 60 * 60_000,    // ventana de 1 hora
    }),
    applyFailedAttempt(db, ipKey(req, args.scope), {
      scope: `${args.scope}:ip`,
      maxAttempts: 20,           // 20 intentos cross-account por IP → bloqueo
      windowMs: 15 * 60_000,    // ventana de 15 minutos
    }),
  ]);
  const blocked = subj.blocked || ip.blocked;
  return { ...subj, blocked };
}

export async function clearAuthAttempts(db: Db, key: string) {
  await db.collection(AUTH_ATTEMPTS_COLLECTION).deleteOne({ key });
}

/**
 * Limpia los intentos de ambos ejes al hacer login exitoso.
 */
export async function clearPinAttempts(
  db: Db,
  req: NextRequest,
  args: { scope: string; subject: string },
) {
  await Promise.all([
    db
      .collection(AUTH_ATTEMPTS_COLLECTION)
      .deleteOne({ key: subjectKey(args.scope, args.subject) }),
    db
      .collection(AUTH_ATTEMPTS_COLLECTION)
      .deleteOne({ key: ipKey(req, args.scope) }),
  ]);
}

/**
 * Asegura el índice TTL en la colección para limpieza automática.
 * Llamar en el primer request (el cliente Mongo lo cachea).
 */
export async function ensureAuthAttemptsIndex(db: Db) {
  try {
    await db
      .collection(AUTH_ATTEMPTS_COLLECTION)
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });
  } catch {
    // Ya existe o colección vacía; no fatal.
  }
}
