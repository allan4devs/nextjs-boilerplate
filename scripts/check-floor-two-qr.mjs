import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const assets = await db.collection("xtreme_gym_equipment_assets").find({ floor: 2, kind: "machine" }).toArray();
  const missing = assets.filter((asset) => !asset.id || !asset.code || !asset.machineGuideId);
  const urls = assets.map((asset) => `/maquinas/equipo/${encodeURIComponent(asset.id)}`);
  if (missing.length || new Set(urls).size !== assets.length) throw new Error(`QR incompletos: ${missing.map((asset) => asset.id).join(", ")}`);
  console.log(JSON.stringify({ floor: 2, count: assets.length, qr: assets.map((asset, index) => ({ assetId: asset.id, code: asset.code, guide: asset.machineGuideId, path: urls[index] })) }, null, 2));
} finally { await client.close(); }
