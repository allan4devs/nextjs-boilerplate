/**
 * Copia los pesos del reconocedor facial (Human) desde node_modules a
 * `public/models/human`, para que el navegador de recepción los baje del mismo
 * origen y no dependa de un CDN externo.
 *
 * Corre solo en `prebuild`, así Vercel los publica sin que ~10 MB de binarios
 * queden versionados en git (`public/` está en .gitignore).
 *
 * Uso manual: npm run face:models
 */
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "node_modules", "@vladmandic", "human", "models");
const TARGET_DIR = path.join(ROOT, "public", "models", "human");

/** Solo los modelos que usa el pipeline de rostro; el resto del paquete no se publica. */
const REQUIRED_MODELS = ["blazeface", "facemesh", "faceres", "antispoof", "liveness"];

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    console.warn(
      "[face-models] @vladmandic/human no está instalado; se omite la copia de pesos.",
    );
    return;
  }

  await mkdir(TARGET_DIR, { recursive: true });
  const available = await readdir(SOURCE_DIR);
  let copied = 0;
  let bytes = 0;
  const missing = [];

  for (const model of REQUIRED_MODELS) {
    const files = available.filter(
      (name) => name === `${model}.json` || name === `${model}.bin`,
    );
    if (!files.some((name) => name.endsWith(".json"))) {
      missing.push(model);
      continue;
    }
    for (const name of files) {
      const from = path.join(SOURCE_DIR, name);
      const to = path.join(TARGET_DIR, name);
      const source = await stat(from);
      // Sin cambios de tamaño no se vuelve a copiar: mantiene rápido el rebuild.
      if (existsSync(to) && (await stat(to)).size === source.size) continue;
      await copyFile(from, to);
      copied += 1;
      bytes += source.size;
    }
  }

  if (missing.length) {
    console.warn(`[face-models] Faltan modelos en el paquete: ${missing.join(", ")}`);
  }
  console.log(
    copied
      ? `[face-models] ${copied} archivos copiados (${(bytes / 1024 / 1024).toFixed(1)} MB) a public/models/human`
      : "[face-models] Pesos ya sincronizados en public/models/human",
  );
}

main().catch((error) => {
  // Un fallo acá no debe tumbar el build: el reconocimiento facial queda
  // deshabilitado en runtime y el resto de recepción sigue funcionando.
  console.warn("[face-models] No se pudieron sincronizar los pesos:", error?.message || error);
});
