import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const extensions = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogv", ".ogg"]);
async function scan(directory, segments = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    if (/\.(browser|partial)\.mp4$/i.test(entry.name)) return [];
    const parts = [...segments, entry.name];
    if (entry.isDirectory()) return scan(path.join(directory, entry.name), parts);
    if (!entry.isFile() || !extensions.has(path.extname(entry.name).toLowerCase())) return [];
    const playable = entries.some((candidate) => candidate.isFile() && candidate.name === `${entry.name}.browser.mp4`)
      ? [...segments, `${entry.name}.browser.mp4`] : parts;
    return [{ name: parts.join("/"), path: `/${playable.map(encodeURIComponent).join("/")}` }];
  }))).flat();
}
const items = await scan(path.join(process.cwd(), "public"));
items.sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
await writeFile(new URL("../lib/xtreme/video-library.generated.json", import.meta.url), `${JSON.stringify(items, null, 2)}\n`);
console.log(`Biblioteca de videos: ${items.length} archivos.`);
