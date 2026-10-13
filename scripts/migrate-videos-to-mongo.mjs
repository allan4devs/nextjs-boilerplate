import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { MongoClient, GridFSBucket } from "mongodb";

for (const envFile of [".env", ".env.local"]) {
  try {
    const text = await readFile(envFile, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}

const root = path.resolve("public");
const extensions = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogv", ".ogg"]);
const uri = process.env.MONGODB_URI?.trim();
if (!uri) throw new Error("MONGODB_URI is required");

async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await files(full));
    else if (extensions.has(path.extname(entry.name).toLowerCase())) result.push(full);
  }
  return result;
}

const client = await MongoClient.connect(uri);
try {
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const bucket = new GridFSBucket(db, { bucketName: "xtreme_media" });
  const collection = db.collection("xtreme_media_catalog");
  const all = await files(root);
  let migrated = 0;
  for (const full of all) {
    const relative = path.relative(root, full).replaceAll(path.sep, "/");
    const existing = await collection.findOne({ sourcePath: `/${relative}` });
    if (existing?.fileId) { console.log(`SKIP ${relative}`); continue; }
    const info = await stat(full);
    const contentType = relative.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4";
    const upload = bucket.openUploadStream(relative, { metadata: { sourcePath: `/${relative}`, contentType } });
    await new Promise((resolve, reject) => createReadStream(full).pipe(upload).on("finish", resolve).on("error", reject));
    await collection.updateOne({ sourcePath: `/${relative}` }, { $set: { sourcePath: `/${relative}`, fileId: upload.id, name: relative, contentType, size: info.size, migratedAt: new Date() } }, { upsert: true });
    migrated++;
    console.log(`OK ${relative} ${info.size}`);
  }
  console.log(`Migrated ${migrated}/${all.length} videos.`);
} finally { await client.close(); }
