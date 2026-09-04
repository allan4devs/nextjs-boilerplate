import { NextRequest, NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogv", ".ogg"]);
const VIDEOS_DIR = path.join(process.cwd(), "public", "videos");

async function adminSession(req: NextRequest) {
  const session = await resolveStaffSession(req, "admin");
  return session?.role === "admin" || session?.role === "super" ? session : null;
}

/** Videos ya subidos a public/videos, para elegirlos desde el admin sin escribir la URL a mano. */
export async function GET(req: NextRequest) {
  const session = await adminSession(req);
  if (!session) return NextResponse.json({ error: "Sesión de admin requerida." }, { status: 401 });

  let entries: string[] = [];
  try {
    entries = await readdir(VIDEOS_DIR);
  } catch {
    entries = [];
  }

  const items = entries
    .filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((name) => ({ name, path: `/videos/${name}` }));

  return NextResponse.json({ items });
}
