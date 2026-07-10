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
