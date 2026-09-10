import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const racks = [
  ["rack-discos-tren-superior", "Tren superior", "Rack de discos · Tren superior"],
  ["rack-bancas-izq-1", "Pesas - Bancas", "Rack de discos · Bancas · lado izquierdo · 1"],
  ["rack-bancas-izq-2", "Pesas - Bancas", "Rack de discos · Bancas · lado izquierdo · 2"],
  ["rack-bancas-der-1", "Pesas - Bancas", "Rack de discos · Bancas · lado derecho · 1"],
  ["rack-bancas-der-2", "Pesas - Bancas", "Rack de discos · Bancas · lado derecho · 2"],
].map(([id, area, name]) => ({ id, floor: 1, area, kind: "rack", code: "", name, levels: 2, status: "sin_dato", location: "Planta baja · ubicación exacta pendiente" }));

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const collection = db.collection("xtreme_gym_equipment_racks");
  const now = new Date();
  for (const rack of racks) await collection.updateOne({ id: rack.id }, { $set: { ...rack, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
  const plates = db.collection("xtreme_gym_equipment_assets");
  const loose = await plates.updateMany({ kind: "plate", id: { $in: ["eq-073", "eq-074", "eq-075", "eq-076", "eq-077"] } }, { $set: { storageGroup: "sueltos-fuera-de-racks", updatedAt: now } });
  const stored = await plates.updateMany({ kind: "plate", id: { $in: Array.from({ length: 33 }, (_, i) => `eq-${String(i + 40).padStart(3, "0")}`) } }, { $set: { storageGroup: "rack-pendiente-de-asignar", updatedAt: now } });
  console.log(JSON.stringify({ racks: racks.length, upserted: racks.length, platesMarked: stored.modifiedCount + loose.modifiedCount, loose: loose.modifiedCount, rackAssignmentPending: stored.modifiedCount }, null, 2));
} finally { await client.close(); }
