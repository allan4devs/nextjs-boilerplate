// Falla si algún archivo versionado o nuevo no es UTF-8 limpio.
// Uso: npm run check:encoding
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SKIP = /\.(jpg|jpeg|png|ico|webp|gif|avif|bmp|mp4|webm|mov|avi|mp3|wav|ogg|woff2?|ttf|otf|pdf|zip|gz|tgz|7z|rar|docx?|xlsx?|pptx?)$/i;
const INTENTIONAL_MOJIBAKE_EXAMPLES = new Set([
  ".claude/skills/verify/SKILL.md",
  "scripts/excel/fix-mojibake.py",
]);

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter((file) => file && !SKIP.test(file) && existsSync(file) && statSync(file).isFile());

const decoder = new TextDecoder("utf-8", { fatal: true });
const problems = [];

const hasSequence = (buffer, matches) => {
  for (let index = 0; index + 2 < buffer.length; index += 1) {
    if (matches(buffer, index)) return true;
  }
  return false;
};

for (const file of files) {
  const buffer = readFileSync(file);
  const issues = [];

  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) issues.push("BOM");

  try {
    decoder.decode(buffer);
  } catch {
    issues.push("no es UTF-8 válido");
  }

  // Firma típica de UTF-8 leído como latin1 y vuelto a guardar como UTF-8.
  if (
    !INTENTIONAL_MOJIBAKE_EXAMPLES.has(file.replace(/\\/g, "/")) &&
    hasSequence(
      buffer,
      (bytes, index) =>
        bytes[index] === 0xc3 &&
        (bytes[index + 1] === 0x83 || bytes[index + 1] === 0x82) &&
        bytes[index + 2] === 0xc2,
    )
  ) {
    issues.push("doble codificación");
  }

  // U+FFFD indica que el carácter original ya se perdió.
  if (
    hasSequence(
      buffer,
      (bytes, index) =>
        bytes[index] === 0xef && bytes[index + 1] === 0xbf && bytes[index + 2] === 0xbd,
    )
  ) {
    issues.push("carácter de reemplazo");
  }

  if (issues.length) problems.push(`  ${file}: ${issues.join(", ")}`);
}

if (problems.length) {
  console.error(`Problemas de encoding en ${problems.length} archivo(s):\n${problems.join("\n")}`);
  process.exit(1);
}

console.log(`Encoding OK en ${files.length} archivos.`);
