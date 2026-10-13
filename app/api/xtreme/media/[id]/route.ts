import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getDb } from "@/lib/helpers/mongodb";
import { mediaBucket, parseMediaId } from "@/lib/xtreme/media-gridfs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fileId = parseMediaId(id);
  if (!fileId) return NextResponse.json({ error: "Media no encontrada." }, { status: 404 });

  const db = await getDb();
  const file = await db.collection(`${"xtreme_media"}.files`).findOne({ _id: fileId });
  if (!file) return NextResponse.json({ error: "Media no encontrada." }, { status: 404 });

  const size = Number(file.length);
  const contentType = typeof file.contentType === "string" ? file.contentType : "video/mp4";
  const range = req.headers.get("range");
  const headers = new Headers({
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  let stream = mediaBucket(db).openDownloadStream(fileId);
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]) - 1);
      const end = match[2] ? Number(match[2]) : size - 1;
      if (start >= 0 && start <= end && end < size) {
        stream.destroy();
        stream = mediaBucket(db).openDownloadStream(fileId, { start, end: end + 1 });
        headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
        headers.set("Content-Length", String(end - start + 1));
        return new NextResponse(Readable.toWeb(stream) as ReadableStream, { status: 206, headers });
      }
    }
  }

  headers.set("Content-Length", String(size));
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, { headers });
}
