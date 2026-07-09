// Falla si algún archivo versionado no es UTF-8 limpio.
// Uso: npm run check:encoding
import { readFileSync, statSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const SKIP = /\.(jpg|jpeg|png|ico|webp|gif|woff2?|ttf|pdf)$/i;

const files = execSync("git ls-files -co --exclude-standard", { encoding: "utf8" })
  .split("\n")
  .map((file) => file.trim())
  .filter((file) => file && !SKIP.test(file) && existsSync(file) && statSync(file).isFile());

const decoder = new TextDecoder("utf-8", { fatal: true });
const problems = [];

const hasSequence = (buf, matches) => {
  for (let i = 0; i + 3 < buf.length; i++) {
    if (matches(buf, i)) return true;
  }
  return false;
};

for (const file of files) {
  const buf = readFileSync(file);
  const issues = [];

  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) issues.push("BOM");

  try {
    decoder.decode(buf);
  } catch {
    issues.push("no es UTF-8 válido");
  }

  // "Ã"/"Â" seguido de un carácter C2: firma de UTF-8 leído como latin1 y reescrito.
  if (hasSequence(buf, (b, i) => b[i] === 0xc3 && (b[i + 1] === 0x83 || b[i + 1] === 0x82) && b[i + 2] === 0xc2)) {
    issues.push("doble codificación");
  }

  // U+FFFD: el carácter original ya se perdió y hay que reescribirlo a mano.
  if (hasSequence(buf, (b, i) => b[i] === 0xef && b[i + 1] === 0xbf && b[i + 2] === 0xbd)) {
    issues.push("carácter de reemplazo");
  }

  if (issues.length) problems.push(`  ${file}: ${issues.join(", ")}`);
}

if (problems.length) {
  console.error(`Problemas de encoding en ${problems.length} archivo(s):\n${problems.join("\n")}`);
  process.exit(1);
}

console.log(`Encoding OK en ${files.length} archivos.`);
