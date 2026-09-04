import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import { findMachineGuide } from "@/app/lib/machines";
import {
  MachineMediaValidationError,
  listMachineMedia,
  upsertMachineMedia,
  type MachineMediaPatch,
} from "@/lib/xtreme/machine-media";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

async function adminSession(req: NextRequest) {
  const session = await resolveStaffSession(req, "admin");
  return session?.role === "admin" || session?.role === "super" ? session : null;
}

function unauthorized() {
  return NextResponse.json({ error: "Sesión de admin requerida." }, { status: 401 });
}

/** Todas las fichas de video/fotos guardadas, para superponerlas sobre MACHINE_GUIDE en el admin. */
export async function GET(req: NextRequest) {
  const session = await adminSession(req);
  if (!session) return unauthorized();

  const db = await getDb();
  const items = await listMachineMedia(db);
  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const session = await adminSession(req);
  if (!session) return unauthorized();

  const body = (await req.json()) as { id?: string } & MachineMediaPatch;
  const id = body.id?.trim();
  if (!id) return NextResponse.json({ error: "Falta el id de la máquina." }, { status: 400 });
  if (!findMachineGuide(id)) {
    return NextResponse.json({ error: "Esa máquina no existe en el catálogo." }, { status: 404 });
  }

  const db = await getDb();
  try {
    const updated = await upsertMachineMedia(
      db,
      id,
      { videoUrl: body.videoUrl, videoLabel: body.videoLabel, images: body.images },
      session.staffName,
    );

    await writeAudit(db, {
      actorRole: session.role,
      actorId: session.staffId,
      actorName: session.staffName,
      action: "machine_media_updated",
      targetType: "system",
      targetId: id,
      summary: `Actualizó el video/fotos de ${findMachineGuide(id)?.name ?? id}`,
      meta: {
        videoUrlChanged: body.videoUrl !== undefined,
        imagesCount: body.images?.length ?? updated?.images?.length ?? 0,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (err) {
    if (err instanceof MachineMediaValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
