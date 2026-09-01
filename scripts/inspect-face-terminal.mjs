/**
 * Inspecciona la terminal física de rostro y reconcilia su `enrollid` contra el
 * padrón de socios en Mongo, para responder UNA pregunta:
 *
 *   ¿el id que la terminal emite por cada rostro ES la cédula del socio,
 *    o es un número de enrolamiento interno?
 *
 * De eso depende cómo se cablea el ingreso por rostro sin Latinsoft:
 *   - si enrollid == cédula  → join directo por cédula, cero migración.
 *   - si enrollid es interno → hace falta una tabla enrollid → cédula.
 *
 * SOLO LECTURA. No escribe en Mongo ni en la terminal (solo lee el rtlog).
 * La contraseña sale de .env (XTREME_FACE_TERMINAL_PASSWORD), nunca del código.
 *
 * Uso:
 *   1) en .env: XTREME_FACE_TERMINAL_PASSWORD=<clave admin del equipo>
 *   2) pedile a 3-4 socios conocidos que pasen la cara por la puerta
 *   3) node scripts/inspect-face-terminal.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ── .env (parser mínimo; Node no lo carga solo) ─────────────────────────
function loadEnv(file) {
  const env = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadEnv(path.join(ROOT, ".env"));

const HOST = (env.XTREME_FACE_TERMINAL_HOST || "192.168.1.20").trim();
const API_PATH = (env.XTREME_FACE_TERMINAL_API_PATH || "/api").trim();
const API_URL = `http://${HOST}${API_PATH}`;
const PASSWORD = String(env.XTREME_FACE_TERMINAL_PASSWORD ?? "");
const MONGODB_URI = env.MONGODB_URI;
const MONGODB_DB = env.MONGODB_DB || "xtreme_gym";
const TIMEOUT_MS = Number(env.XTREME_FACE_TERMINAL_TIMEOUT_MS) || 6000;

const digits = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 20);
// Aproxima el normalizedName de Mongo (mayúsculas, sin acentos, un espacio).
const normName = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

async function deviceApi(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Trae el rtlog completo (maneja la paginación index/to/count del equipo). */
async function pullRtlog() {
  const seen = new Map(); // enrollid -> { name, count, lastTime, photo }
  let index = 0;
  let guard = 0;
  while (guard++ < 200) {
    const resp = await deviceApi({ cmd: "getrtlog", index, password: PASSWORD });
    if (!resp || resp.result === false) {
      throw new Error(resp?.msg || "la terminal rechazó getrtlog (¿contraseña?)");
    }
    for (const rec of resp.record ?? []) {
      const id = String(rec.enrollid ?? "").trim();
      if (!id) continue;
      const prev = seen.get(id);
      seen.set(id, {
        name: rec.name || prev?.name || "",
        count: (prev?.count ?? 0) + 1,
        lastTime: rec.time || prev?.lastTime || "",
        photo: rec.photourl || prev?.photo || "",
      });
    }
    const count = resp.count ?? 0;
    const to = resp.to ?? 0;
    if (count > to) { index = to + 1; continue; }
    break;
  }
  return seen;
}

async function main() {
  if (!PASSWORD) {
    console.error("❌ Falta XTREME_FACE_TERMINAL_PASSWORD en .env (clave admin del equipo).");
    console.error("   Ponela, hacé que unos socios conocidos pasen la cara, y volvé a correr.");
    process.exit(2);
  }
  if (!MONGODB_URI) {
    console.error("❌ Falta MONGODB_URI en .env.");
    process.exit(2);
  }

  console.log(`Leyendo rtlog de ${API_URL} …`);
  let scans;
  try {
    scans = await pullRtlog();
  } catch (err) {
    console.error(`❌ No se pudo leer la terminal: ${err.message}`);
    console.error("   Revisá que la PC vea 192.168.1.20 y que la contraseña sea la correcta.");
    process.exit(1);
  }

  if (!scans.size) {
    console.log("⚠️  El rtlog vino vacío: nadie pasó la cara recientemente (o el equipo ya");
    console.log("    entregó y limpió esos eventos). Pedile a 3-4 socios que pasen y reintentá.");
    return;
  }

  // Padrón para reconciliar.
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 12000 });
  await client.connect();
  const members = await client
    .db(MONGODB_DB)
    .collection("xtreme_gym_members")
    .find({ memberName: { $exists: true } })
    .project({ _id: 0, memberName: 1, normalizedName: 1, cedula: 1 })
    .toArray();
  await client.close();

  const byCedula = new Map();
  const byName = new Map();
  for (const m of members) {
    const cd = digits(m.cedula);
    if (cd) byCedula.set(cd, m);
    byName.set(m.normalizedName || normName(m.memberName), m);
  }

  console.log(`\nSocios en Mongo: ${members.length} · con cédula: ${byCedula.size}`);
  console.log(`enrollids distintos vistos en la terminal: ${scans.size}\n`);

  let cedulaHits = 0;
  let nameHits = 0;
  let nameConfirmsCedula = 0;

  const rows = [];
  for (const [id, info] of scans) {
    const byCd = byCedula.get(digits(id));
    const byNm = info.name ? byName.get(normName(info.name)) : null;
    if (byCd) cedulaHits++;
    if (byNm) nameHits++;
    if (byCd && byNm && byCd.normalizedName === byNm.normalizedName) nameConfirmsCedula++;

    rows.push({
      enrollid: id,
      terminalName: info.name || "—",
      cedulaMatch: byCd ? byCd.memberName : "",
      nameMatch: byNm ? byNm.memberName : "",
    });
  }

  // Tabla
  const pad = (s, n) => String(s).slice(0, n).padEnd(n);
  console.log(pad("enrollid", 16) + pad("nombre en terminal", 26) + pad("match x cédula", 26) + "match x nombre");
  console.log("─".repeat(94));
  for (const r of rows) {
    console.log(pad(r.enrollid, 16) + pad(r.terminalName, 26) + pad(r.cedulaMatch || "·", 26) + (r.nameMatch || "·"));
  }

  // Veredicto
  const total = scans.size;
  const pct = (n) => `${Math.round((n / total) * 100)}%`;
  console.log("\n── Veredicto ───────────────────────────────");
  console.log(`  enrollid coincide con una cédula: ${cedulaHits}/${total} (${pct(cedulaHits)})`);
  console.log(`  enrollid.name coincide con un socio: ${nameHits}/${total} (${pct(nameHits)})`);
  console.log(`  nombre confirma la misma persona que la cédula: ${nameConfirmsCedula}/${total}`);
  console.log("");
  if (cedulaHits / total >= 0.8) {
    console.log("✅ enrollid ES la cédula. Se puede cablear el ingreso por rostro con un join");
    console.log("   directo enrollid → member por cédula. Cero migración de biometría.");
  } else if (nameHits / total >= 0.6) {
    console.log("🟨 enrollid parece un id interno, PERO el nombre sí matchea. Se puede cablear");
    console.log("   construyendo una tabla enrollid → cédula (una vez), reconciliando por nombre.");
  } else {
    console.log("🟥 Ni la cédula ni el nombre matchean bien. Hay que ver un socio de prueba");
    console.log("   concreto (su cédula real vs el enrollid que emite) antes de cablear.");
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err?.message || err);
  process.exit(1);
});
