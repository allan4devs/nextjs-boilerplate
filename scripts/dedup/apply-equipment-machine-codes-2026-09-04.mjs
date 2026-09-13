/**
 * Reasigna el `code` de las 76 máquinas del inventario físico
 * (xtreme_gym_equipment_assets, kind: "machine") a un esquema
 * prefijo-por-área + número de dos dígitos (PI-01, CA-01, RI-01, RD-01,
 * ZC-01, PA-01...), en vez de los números impresos originales (repetidos
 * y con huecos). NO toca bancos ni discos (kind: "bench" | "plate").
 *
 * Debe correrse una sola vez contra la base ya sembrada: el seed en
 * lib/xtreme/equipment.ts usa $setOnInsert, así que no actualiza docs
 * existentes por sí solo.
 *
 * Uso: node --env-file=.env scripts/apply-equipment-machine-codes-2026-09-04.mjs [--apply]
 */
import { MongoClient } from "mongodb";

const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");
const VERSION = "equipment-machine-codes-2026-09-04";
const now = new Date();

// id de activo -> nuevo código
const CODES = {
  "eq-001": "PI-01", "eq-002": "PI-02", "eq-003": "PI-03", "eq-004": "PI-04",
  "eq-005": "PI-05", "eq-006": "PI-06", "eq-007": "PI-07", "eq-008": "PI-08",
  "eq-009": "PI-09", "eq-010": "PI-10", "eq-011": "PI-11", "eq-012": "PI-12",
  "eq-013": "PI-13", "eq-014": "PI-14", "eq-015": "PI-15", "eq-016": "PI-16",
  "eq-017": "PI-17", "eq-018": "PI-18", "eq-019": "PI-19", "eq-020": "PI-20",
  "eq-021": "PI-21", "eq-022": "PI-22",

  "eq-078": "CA-01", "eq-079": "CA-02", "eq-080": "CA-03", "eq-081": "CA-04",
  "eq-082": "CA-05", "eq-083": "CA-06", "eq-084": "CA-07", "eq-085": "CA-08",
  "eq-086": "CA-09", "eq-087": "CA-10", "eq-088": "CA-11", "eq-089": "CA-12",
  "eq-090": "CA-13", "eq-091": "CA-14", "eq-092": "CA-15", "eq-093": "CA-16",
  "eq-094": "CA-17", "eq-095": "CA-18", "eq-096": "CA-19", "eq-097": "CA-20",
  "eq-098": "CA-21", "eq-099": "CA-22", "eq-100": "CA-23",

  "eq-101": "RI-01", "eq-102": "RI-02", "eq-103": "RI-03", "eq-104": "RI-04",
  "eq-105": "RI-05", "eq-106": "RI-06", "eq-107": "RI-07", "eq-108": "RI-08",
  "eq-109": "RI-09", "eq-110": "RI-10", "eq-111": "RI-11", "eq-112": "RI-12",

  "eq-113": "RD-01", "eq-114": "RD-02", "eq-115": "RD-03", "eq-116": "RD-04",
  "eq-117": "RD-05", "eq-118": "RD-06", "eq-119": "RD-07", "eq-120": "RD-08",
  "eq-121": "RD-09", "eq-122": "RD-10",

  "eq-123": "ZC-01", "eq-124": "ZC-02", "eq-125": "ZC-03", "eq-126": "ZC-04",
  "eq-127": "ZC-05",

  "eq-128": "PA-01", "eq-129": "PA-02", "eq-130": "PA-03", "eq-131": "PA-04",
};

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
const Assets = db.collection("xtreme_gym_equipment_assets");
const Audit = db.collection("xtreme_gym_audit");

try {
  const rows = [];
  for (const [id, code] of Object.entries(CODES)) {
    const before = await Assets.findOne({ id });
    if (!before) { rows.push({ id, status: "NOT FOUND" }); continue; }
    if (before.kind !== "machine") { rows.push({ id, status: `SKIP (kind=${before.kind})` }); continue; }
    if (before.code === code) { rows.push({ id, name: before.name, status: "sin cambio", before: before.code, after: code }); continue; }

    rows.push({ id, name: before.name, status: apply ? "updated" : "would update", before: before.code, after: code });
    if (apply) {
      await Assets.updateOne({ id }, { $set: { code, updatedAt: now } });
      await Audit.updateOne(
        { id: `aud-${VERSION}-${id}` },
        { $setOnInsert: {
            id: `aud-${VERSION}-${id}`, at: now, actorRole: "admin",
            action: "equipment_asset_updated", targetType: "system", targetId: id,
            summary: `Reasignó código de máquina (${VERSION}): ${before.name}`,
            meta: { reason: "Reasignación de códigos de máquinas a esquema prefijo-por-área",
              before: { code: before.code ?? "" }, after: { code } },
          } },
        { upsert: true },
      );
    }
  }

  console.log(`MODE: ${apply ? "APPLY" : "dry-run"}`);
  for (const r of rows) {
    const beforeAfter = "before" in r ? ` | "${r.before}" -> "${r.after}"` : "";
    console.log(`  ${r.status.padEnd(16)} ${r.id} ${r.name ?? ""}${beforeAfter}`);
  }
  if (!apply) console.log("\nVista previa. Agregá --apply para escribir.");
} finally { await client.close(); }
