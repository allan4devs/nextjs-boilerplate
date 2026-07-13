import { Db, MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
  mongoIndexesEnsured?: boolean;
};

function getMongoUri() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  return uri;
}

/**
 * Conecta a Mongo. Si la promesa falla (DNS, red, cluster pausado),
 * se limpia el cache para reintentar en el siguiente request.
 */
export async function getMongoClient() {
  if (!globalForMongo.mongoClientPromise) {
    const uri = getMongoUri();
    globalForMongo.mongoClientPromise = new MongoClient(uri, {
      // Fallos de red / DNS no deben dejar el pool muerto para siempre
      serverSelectionTimeoutMS: 12_000,
      connectTimeoutMS: 12_000,
    })
      .connect()
      .catch((err) => {
        globalForMongo.mongoClientPromise = undefined;
        globalForMongo.mongoIndexesEnsured = false;
        throw err;
      });
  }

  return globalForMongo.mongoClientPromise;
}

async function ensureIndexes(db: Db) {
  const results = await Promise.allSettled([
    db.collection("xtreme_gym_members").createIndex({ normalizedName: 1 }, { unique: true }),
    db.collection("xtreme_gym_pins").createIndex({ normalizedName: 1 }, { unique: true }),
    db.collection("xtreme_gym_class_reservations").createIndex({ trainingDate: 1, status: 1 }),
    db
      .collection("xtreme_gym_class_reservations")
      .createIndex({ normalizedName: 1, trainingId: 1, trainingDate: 1 }),
    db.collection("xtreme_gym_checkins").createIndex({ date: 1, checkedInAt: -1 }),
    db.collection("xtreme_gym_checkins").createIndex({ normalizedName: 1, date: 1 }),
    db.collection("xtreme_gym_payments").createIndex({ status: 1, date: -1 }),
    db.collection("xtreme_gym_payments").createIndex({ id: 1 }),
    // Registro por correo: evita duplicados, acelera la confirmacion y limpia
    // automaticamente enlaces vencidos.
    db.collection("xtreme_gym_pending_registrations").createIndex({ email: 1 }, { unique: true }),
    db.collection("xtreme_gym_pending_registrations").createIndex({ tokenHash: 1 }, { unique: true }),
    db
      .collection("xtreme_gym_pending_registrations")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("xtreme_gym_email_suppressions").createIndex({ email: 1 }, { unique: true }),
    // Fase 3: OTP de recuperacion de PIN (TTL) + audit + badges admin
    db.collection("xtreme_gym_otps").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("xtreme_gym_otps").createIndex({ normalizedName: 1, purpose: 1 }),
    db.collection("xtreme_gym_audit").createIndex({ at: -1 }),
    db.collection("xtreme_gym_audit").createIndex({ targetId: 1, at: -1 }),
    db.collection("xtreme_gym_badges").createIndex({ id: 1 }, { unique: true }),
    // Fase 2.0: eventos, sesiones sociales y entregas de lifecycle
    db.collection("xtreme_gym_events").createIndex({ type: 1, occurredAt: -1 }),
    db.collection("xtreme_gym_events").createIndex({ memberId: 1, occurredAt: -1 }),
    db.collection("xtreme_gym_lifecycle_deliveries").createIndex({ deliveryKey: 1 }, { unique: true }),
    db.collection("xtreme_gym_job_runs").createIndex({ job: 1, startedAt: -1 }),
    db.collection("xtreme_gym_push_subscriptions").createIndex({ endpoint: 1 }, { unique: true }),
    db.collection("xtreme_gym_push_subscriptions").createIndex({ memberKey: 1 }),
    db.collection("xtreme_gym_referrals").createIndex({ referred: 1 }, { unique: true }),
    db.collection("xtreme_gym_referrals").createIndex({ referrer: 1, createdAt: -1 }),
    db.collection("xtreme_gym_buddy_requests").createIndex({ from: 1, to: 1 }, { unique: true }),
    db.collection("xtreme_gym_buddy_requests").createIndex({ to: 1, status: 1 }),
    // Strategy 2.0 hard path — member sessions, entitlements, class inventory
    db.collection("xtreme_gym_sessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("xtreme_gym_sessions").createIndex({ memberKey: 1, revokedAt: 1 }),
    db.collection("xtreme_gym_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("xtreme_gym_entitlements").createIndex({ id: 1 }, { unique: true }),
    db.collection("xtreme_gym_entitlements").createIndex({ memberKey: 1, status: 1, endsOn: -1 }),
    db.collection("xtreme_gym_entitlement_ledger").createIndex({ memberKey: 1, at: -1 }),
    db.collection("xtreme_gym_entitlement_ledger").createIndex({ entitlementId: 1, at: -1 }),
    db.collection("xtreme_gym_class_templates").createIndex({ id: 1 }, { unique: true }),
    db.collection("xtreme_gym_class_templates").createIndex({ trainingId: 1 }),
    db.collection("xtreme_gym_class_sessions").createIndex({ id: 1 }, { unique: true }),
    db.collection("xtreme_gym_class_sessions").createIndex({ date: 1, trainingId: 1 }),
    db.collection("xtreme_gym_bookings").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("xtreme_gym_bookings")
      .createIndex(
        { sessionId: 1, memberKey: 1 },
        { unique: true, partialFilterExpression: { status: "reserved" } },
      ),
    db.collection("xtreme_gym_bookings").createIndex({ memberKey: 1, trainingDate: -1 }),
    db.collection("xtreme_gym_bookings").createIndex({ sessionId: 1, status: 1 }),
    db.collection("xtreme_gym_waitlist").createIndex({ sessionId: 1, position: 1 }),
    // Chat live visita ↔ recepción
    db.collection("xtreme_gym_chat_sessions").createIndex({ id: 1 }, { unique: true }),
    db.collection("xtreme_gym_chat_sessions").createIndex({ status: 1, lastMessageAt: -1 }),
    db.collection("xtreme_gym_chat_sessions").createIndex({ guestTokenHash: 1 }),
    db.collection("xtreme_gym_chat_messages").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("xtreme_gym_chat_messages")
      .createIndex({ sessionId: 1, seq: 1 }, { unique: true }),
    db.collection("xtreme_gym_chat_messages").createIndex({ sessionId: 1, createdAt: 1 }),
  ]);
  for (const r of results) {
    if (r.status === "rejected") console.error("MONGO INDEX", r.reason);
  }
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB?.trim() || "lva");
  if (!globalForMongo.mongoIndexesEnsured) {
    globalForMongo.mongoIndexesEnsured = true;
    void ensureIndexes(db);
  }
  return db;
}
