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

export async function getMongoClient() {
  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = new MongoClient(getMongoUri()).connect();
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
    // Fase 3: OTP de recuperacion de PIN (TTL) + audit + badges admin
    db.collection("xtreme_gym_otps").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("xtreme_gym_otps").createIndex({ normalizedName: 1, purpose: 1 }),
    db.collection("xtreme_gym_audit").createIndex({ at: -1 }),
    db.collection("xtreme_gym_audit").createIndex({ targetId: 1, at: -1 }),
    db.collection("xtreme_gym_badges").createIndex({ id: 1 }, { unique: true }),
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
