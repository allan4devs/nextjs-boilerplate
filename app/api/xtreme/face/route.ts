/**
 * Reconocimiento facial de recepción.
 *
 * GET               → estado del sistema (motor, enrolados, umbrales).
 * GET ?bundle=1     → plantillas para que recepción compare localmente.
 * POST match        → comparación del lado del servidor (respaldo del cliente).
 * POST enroll       → guarda una muestra del rostro de un socio.
 * POST forget       → borra las plantillas de un socio.
 * POST count        → cuántas muestras tiene un socio.
 *
 * Todo exige sesión de staff de recepción: son datos biométricos y el
 * padrón completo sale en el bundle.
 */
import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import { recordEvent } from "@/lib/xtreme/events";
import {
  FACE_AUTO_MARGIN,
  FACE_AUTO_SIMILARITY,
  FACE_ENGINE_ID,
  FACE_ENROLL_SAMPLES,
  FACE_MATCH_LIMIT,
  FACE_MIN_ENROLL_QUALITY,
  FACE_MIN_SIMILARITY,
  FACE_RECOGNITION_ENABLED,
  FACE_TEMPLATES_PER_MEMBER,
} from "@/lib/xtreme/face/config";
import { parseDescriptor, rankFaceMatches } from "@/lib/xtreme/face/descriptor";
import {
  countFaceTemplates,
  faceEnrollmentSummary,
  loadFaceTemplates,
  removeFaceTemplates,
  saveFaceTemplate,
} from "@/lib/xtreme/face/templates";
import {
  MEMBERS_COLLECTION,
  type MemberDoc,
  normalizeKey,
  normalizeName,
  toAdminMember,
} from "@/lib/xtreme/shared";
import { resolveStaffSession, type StaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

/** Una foto de rostro recortada ronda los 30 KB; el tope deja margen sin abrir la puerta a subir archivos. */
const MAX_PHOTO_DATA_URL_LENGTH = 900_000;

/** Umbrales que la UI muestra para que recepción entienda por qué aceptó o dudó. */
const FACE_THRESHOLDS = {
  engine: FACE_ENGINE_ID,
  minSimilarity: FACE_MIN_SIMILARITY,
  autoSimilarity: FACE_AUTO_SIMILARITY,
  autoMargin: FACE_AUTO_MARGIN,
  enrollSamples: FACE_ENROLL_SAMPLES,
  templatesPerMember: FACE_TEMPLATES_PER_MEMBER,
} as const;

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function disabled() {
  return NextResponse.json(
    { error: "Reconocimiento facial deshabilitado." },
    { status: 503 },
  );
}

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function isDataUrlPhoto(value: string) {
  return (
    /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value) &&
    value.length < MAX_PHOTO_DATA_URL_LENGTH
  );
}

/** Recepción manda `memberKey` o, si solo tiene el rótulo en pantalla, `memberName`. */
function resolveMemberKey(body: Record<string, unknown>): string {
  return normalizeKey(String(body.memberKey ?? "") || normalizeName(body.memberName));
}

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return unauthorized();
  if (!FACE_RECOGNITION_ENABLED) {
    return NextResponse.json({ enabled: false, ...FACE_THRESHOLDS, enrolled: null });
  }

  try {
    const db = await getDb();

    if (req.nextUrl.searchParams.get("bundle") === "1") {
      const templates = await loadFaceTemplates(db);
      return NextResponse.json({
        enabled: true,
        ...FACE_THRESHOLDS,
        templates,
        generatedAt: new Date().toISOString(),
      });
    }

    const enrolled = await faceEnrollmentSummary(db);
    return NextResponse.json({ enabled: true, ...FACE_THRESHOLDS, enrolled });
  } catch (err) {
    console.error("XTREME FACE GET", err);
    return NextResponse.json(
      { error: "No se pudo cargar el reconocimiento facial." },
      { status: 500 },
    );
  }
}

type FaceActionContext = {
  db: Db;
  body: Record<string, unknown>;
  session: StaffSession;
};

type FaceAction = (ctx: FaceActionContext) => Promise<NextResponse>;

/** Compara un rostro contra el padrón y devuelve los socios más parecidos. */
const matchAction: FaceAction = async ({ db, body }) => {
  const descriptor = parseDescriptor(body.descriptor);
  if (!descriptor) return badRequest("Descriptor facial inválido.");

  const templates = await loadFaceTemplates(db);
  const ranked = rankFaceMatches(templates, descriptor, {
    minSimilarity: FACE_MIN_SIMILARITY,
    limit: FACE_MATCH_LIMIT,
  });
  if (!ranked.length) {
    return NextResponse.json({ matches: [], bestMatch: null, ...FACE_THRESHOLDS });
  }

  const docs = await db
    .collection<MemberDoc>(MEMBERS_COLLECTION)
    .find({ normalizedName: { $in: ranked.map((match) => match.normalizedName) } })
    .toArray();
  const byKey = new Map(docs.map((doc) => [doc.normalizedName ?? "", doc]));

  // Se recorren los rankeados y no los docs: el orden por similitud es el que
  // importa, y una plantilla sin socio vivo simplemente se cae de la lista.
  const matches = ranked.flatMap((match) => {
    const doc = byKey.get(match.normalizedName);
    if (!doc) return [];
    return [
      {
        ...toAdminMember(doc),
        faceSimilarity: match.similarity,
        faceSamples: match.samples,
      },
    ];
  });

  return NextResponse.json({
    matches,
    bestMatch: matches[0] ?? null,
    ...FACE_THRESHOLDS,
  });
};

/** Guarda una muestra del rostro de un socio ya existente. */
const enrollAction: FaceAction = async ({ db, body, session }) => {
  const memberKey = resolveMemberKey(body);
  if (!memberKey) return badRequest("Socio requerido.");

  const descriptor = parseDescriptor(body.descriptor);
  if (!descriptor) return badRequest("Descriptor facial inválido.");

  const quality = Number(body.quality);
  if (!Number.isFinite(quality) || quality < FACE_MIN_ENROLL_QUALITY) {
    return badRequest(
      "La captura no tiene calidad suficiente. Repetila con mejor luz y de frente.",
    );
  }

  const photoUrl = String(body.photoUrl ?? "").trim();
  if (photoUrl && !isDataUrlPhoto(photoUrl) && !photoUrl.startsWith("https://")) {
    return badRequest("Foto inválida.");
  }

  const members = db.collection<MemberDoc>(MEMBERS_COLLECTION);
  const member = await members.findOne({ normalizedName: memberKey });
  if (!member?.memberName) return badRequest("Socio no encontrado.", 404);

  const { samples } = await saveFaceTemplate(db, {
    normalizedName: memberKey,
    memberName: member.memberName,
    descriptor,
    quality,
    capturedByRole: session.role,
    capturedByName: session.staffName ?? undefined,
  });

  const now = new Date();
  const updated = await members.findOneAndUpdate(
    { normalizedName: memberKey },
    {
      $set: {
        faceEnrolledAt: now,
        faceEngine: FACE_ENGINE_ID,
        updatedAt: now,
        // La foto solo se pisa si recepción capturó una nueva en esta ronda.
        ...(photoUrl ? { photoUrl } : {}),
      },
    },
    { returnDocument: "after" },
  );

  await writeAudit(db, {
    actorRole: session.role,
    action: "member.enroll_face_descriptor",
    targetType: "member",
    targetId: memberKey,
    summary: `Rostro enrolado (${FACE_ENGINE_ID}): ${member.memberName}`,
    meta: { samples, quality, engine: FACE_ENGINE_ID, staff: session.staffName ?? null },
  });
  await recordEvent(db, {
    type: "face_enrolled",
    memberId: memberKey,
    source: "reception",
    entity: { type: "member", id: memberKey },
    properties: { samples, engine: FACE_ENGINE_ID },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    samples,
    complete: samples >= FACE_ENROLL_SAMPLES,
    member: updated ? toAdminMember(updated) : null,
  });
};

/** Borra todo rastro biométrico de un socio (incluido el dHash heredado). */
const forgetAction: FaceAction = async ({ db, body, session }) => {
  const memberKey = resolveMemberKey(body);
  if (!memberKey) return badRequest("Socio requerido.");

  const removed = await removeFaceTemplates(db, memberKey);
  await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
    { normalizedName: memberKey },
    { $unset: { faceEnrolledAt: "", faceEngine: "", faceHash: "" } },
  );
  await writeAudit(db, {
    actorRole: session.role,
    action: "member.forget_face",
    targetType: "member",
    targetId: memberKey,
    summary: `Rostro borrado: ${memberKey}`,
    meta: { removed, staff: session.staffName ?? null },
  });

  return NextResponse.json({ ok: true, removed });
};

/** Muestras vigentes de un socio: la UI de enrolamiento la usa para el progreso. */
const countAction: FaceAction = async ({ db, body }) => {
  const memberKey = resolveMemberKey(body);
  if (!memberKey) return badRequest("Socio requerido.");
  return NextResponse.json({ samples: await countFaceTemplates(db, memberKey) });
};

// Map y no objeto: la llave viene del request y un objeto respondería a
// `toString` o `constructor` con algo heredado del prototipo.
const FACE_ACTIONS = new Map<string, FaceAction>([
  ["match", matchAction],
  ["enroll", enrollAction],
  ["forget", forgetAction],
  ["count", countAction],
]);

export async function POST(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return unauthorized();
  if (!FACE_RECOGNITION_ENABLED) return disabled();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = FACE_ACTIONS.get(String(body.action ?? "match"));
    if (!action) return badRequest("Acción no soportada.");

    return await action({ db: await getDb(), body, session });
  } catch (err) {
    console.error("XTREME FACE POST", err);
    return NextResponse.json(
      { error: "No se pudo procesar el rostro." },
      { status: 500 },
    );
  }
}
