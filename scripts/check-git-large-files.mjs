import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LIMIT = 20 * 1024 * 1024;
function git(args, input) {
  return execFileSync("git", args, { encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 });
}
function pendingObjects(revisions) {
  return git(["rev-list", "--objects", ...revisions]).trim().split("\n").filter(Boolean).map((line) => {
    const space = line.indexOf(" ");
    return { oid: space < 0 ? line : line.slice(0, space), path: space < 0 ? "" : line.slice(space + 1) };
  });
}
function stagedObjects() {
  const changed = new Set(git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]).split("\0"));
  return git(["ls-files", "--stage", "-z"]).split("\0").filter(Boolean).flatMap((entry) => {
    const tab = entry.indexOf("\t");
    const [, oid, stage] = entry.slice(0, tab).split(" ");
    const path = entry.slice(tab + 1);
    return stage === "0" && changed.has(path) ? [{ oid, path }] : [];
  });
}
function inspect(objects) {
  if (!objects.length) return [];
  const sizes = git(["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"], objects.map(({ oid }) => oid).join("\n") + "\n").trim().split("\n");
  return sizes.flatMap((line, index) => {
    const [, type, size] = line.split(" ");
    return type === "blob" && Number(size) >= LIMIT ? [{ ...objects[index], size: Number(size) }] : [];
  });
}

try {
  let objects;
  if (process.argv.includes("--staged")) {
    objects = stagedObjects();
  } else if (process.argv.includes("--push")) {
    const remote = process.argv[process.argv.indexOf("--push") + 1] || "origin";
    objects = readFileSync(0, "utf8").trim().split("\n").filter(Boolean).flatMap((line) => {
      const [, localOid, , remoteOid] = line.trim().split(/\s+/);
      if (/^0+$/.test(localOid)) return [];
      return pendingObjects(/^0+$/.test(remoteOid)
        ? [localOid, "--not", `--remotes=${remote}`]
        : [localOid, "--not", remoteOid]);
    });
  } else {
    objects = pendingObjects(["HEAD", "--not", process.argv[2] || "origin/main"]);
  }
  const large = inspect(objects);
  if (large.length) {
    console.error("Git bloqueado: hay archivos de 20 MiB o más. Conservá los originales fuera de Git y usá versiones comprimidas.");
    for (const file of large) console.error(`  ${(file.size / 1024 / 1024).toFixed(1)} MiB  ${file.path || file.oid}`);
    process.exitCode = 1;
  } else {
    console.log("Git OK: ningún archivo nuevo de 20 MiB o más.");
  }
} catch (error) {
  console.error("No se pudo verificar el tamaño de los archivos de Git:", error.message);
  process.exitCode = 1;
}
