import { NextRequest, NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import builtVideoLibrary from "@/lib/xtreme/video-library.generated.json";

export const dynamic = "force-dynamic";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogv", ".ogg"]);
const PUBLIC_DIR = path.join(process.cwd(), "public");

async function listVideos(directory: string, segments: string[] = []): Promise<{ name: string; path: string }[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async (entry) => {
    const parts = [...segments, entry.name];
    if (entry.isDirectory()) return listVideos(path.join(directory, entry.name), parts);
    if (!entry.isFile() || !VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) return [];
    return [{ name: parts.join("/"), path: `/${parts.map(encodeURIComponent).join("/")}` }];
  }));
  return groups.flat();
}

async function adminSession(req: NextRequest) {
  const session = await resolveStaffSession(req, "admin");
  return session?.role === "admin" || session?.role === "super" ? session : null;
}

/** Videos de public y sus subcarpetas, conservando el nombre real del archivo. */
export async function GET(req: NextRequest) {
  const session = await adminSession(req);
  if (!session) return NextResponse.json({ error: "Sesión de admin requerida." }, { status: 401 });

  try {
    const items = process.env.NODE_ENV === "production" ? [...builtVideoLibrary] : await listVideos(PUBLIC_DIR);
    items.sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo leer la biblioteca de videos." }, { status: 500 });
  }
}
