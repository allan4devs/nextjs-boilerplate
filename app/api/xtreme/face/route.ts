/**
 * Reconocimiento facial de recepción.
 *
 * GET               → estado del sistema (motor, enrolados, umbrales).
 * GET ?bundle=1     → plantillas para que recepción compare localmente.
 * POST match        → comparación del lado del servidor (respaldo del cliente).
 * POST enroll       → guarda una muestra del rostro de un socio.
 * POST forget       → borra las plantillas de un socio.
 *
 * Todo exige sesión de staff de recepción: son datos biométricos y el
 * padrón completo sale en el bundle.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import { recordEvent } from "@/lib/xtreme/events";
import {
  FACE_AUTO_MARGIN,
  FACE_AUTO_SIMILARITY,
  FACE_ENGINE_ID,
  FACE_ENROLL_SAMPLES,
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
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

const MATCH_LIMIT = 5;

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function disabled() {
  return NextResponse.json(
    { error: "Reconocimiento facial deshabilitado." },
    { status: 503 },
  );
}

function isDataUrlPhoto(value: string) {
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value) && value.length < 900_000;
}

/** Umbrales que la UI muestra para que recepción entienda por qué aceptó o dudó. */
function thresholds() {
  return {
    engine: FACE_ENGINE_ID,
    minSimilarity: FACE_MIN_SIMILARITY,
    autoSimilarity: FACE_AUTO_SIMILARITY,
    autoMargin: FACE_AUTO_MARGIN,
    enrollSamples: FACE_ENROLL_SAMPLES,
    templatesPerMember: FACE_TEMPLATES_PER_MEMBER,
  };
}

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return unauthorized();
  if (!FACE_RECOGNITION_ENABLED) {
    return NextResponse.json({ enabled: false, ...thresholds(), enrolled: null });
  }

  try {
    const db = await getDb();

    if (req.nextUrl.searchParams.get("bundle") === "1") {
      const templates = await loadFaceTemplates(db);
      return NextResponse.json({
        enabled: true,
        ...thresholds(),
        templates,
        generatedAt: new Date().toISOString(),
      });
    }

    const enrolled = await faceEnrollmentSummary(db);
    return NextResponse.json({ enabled: true, ...thresholds(), enrolled });
  } catch (err) {
    console.error("XTREME FACE GET", err);
    return NextResponse.json(
      { error: "No se pudo cargar el reconocimiento facial." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return unauthorized();
  if (!FACE_RECOGNITION_ENABLED) return disabled();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "match");
    const db = await getDb();

    if (action === "match") {
      const descriptor = parseDescriptor(body.descriptor);
      if (!descriptor) {
        return NextResponse.json({ error: "Descriptor facial inválido." }, { status: 400 });
      }

      const templates = await loadFaceTemplates(db);
      const ranked = rankFaceMatches(templates, descriptor, {
        minSimilarity: FACE_MIN_SIMILARITY,
        limit: MATCH_LIMIT,
      });
      if (!ranked.length) {
        return NextResponse.json({ matches: [], bestMatch: null, ...thresholds() });
      }

      const docs = await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find({ normalizedName: { $in: ranked.map((match) => match.normalizedName) } })
        .toArray();
      const byKey = new Map(docs.map((doc) => [doc.normalizedName ?? "", doc]));

      const matches = ranked
        .map((match) => {
          const doc = byKey.get(match.normalizedName);
          if (!doc) return null;
          return {
            ...toAdminMember(doc),
            faceSimilarity: match.similarity,
            faceSamples: match.samples,
          };
        })
        .filter((match): match is NonNullable<typeof match> => Boolean(match));

      return NextResponse.json({
        matches,
        bestMatch: matches[0] ?? null,
        ...thresholds(),
      });
    }

    if (action === "enroll") {
      const memberKey = normalizeKey(
        String(body.memberKey ?? "") || normalizeName(body.memberName),
      );
      if (!memberKey) {
        return NextResponse.json({ error: "Socio requerido." }, { status: 400 });
      }

      const descriptor = parseDescriptor(body.descriptor);
      if (!descriptor) {
        return NextResponse.json({ error: "Descriptor facial inválido." }, { status: 400 });
      }

      const quality = Number(body.quality);
      if (!Number.isFinite(quality) || quality < FACE_MIN_ENROLL_QUALITY) {
        return NextResponse.json(
          { error: "La captura no tiene calidad suficiente. Repetila con mejor luz y de frente." },
          { status: 400 },
        );
      }

      const photoUrl = String(body.photoUrl ?? "").trim();
      if (photoUrl && !isDataUrlPhoto(photoUrl) && !photoUrl.startsWith("https://")) {
        return NextResponse.json({ error: "Foto inválida." }, { status: 400 });
      }

      const member = await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .findOne({ normalizedName: memberKey });
      if (!member?.memberName) {
        return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
      }

      const { samples } = await saveFaceTemplate(db, {
        normalizedName: memberKey,
        memberName: member.memberName,
        descriptor,
        quality,
        capturedByRole: session.role,
        capturedByName: session.staffName ?? undefined,
      });

      const now = new Date();
      const set: Record<string, unknown> = {
        faceEnrolledAt: now,
        faceEngine: FACE_ENGINE_ID,
        updatedAt: now,
      };
      // La foto solo se pisa si recepción capturó una nueva en esta ronda.
      if (photoUrl) set.photoUrl = photoUrl;
      await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .updateOne({ normalizedName: memberKey }, { $set: set });

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

      const updated = await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .findOne({ normalizedName: memberKey });

      return NextResponse.json({
        ok: true,
        samples,
        complete: samples >= FACE_ENROLL_SAMPLES,
        member: updated ? toAdminMember(updated) : null,
      });
    }

    if (action === "forget") {
      const memberKey = normalizeKey(
        String(body.memberKey ?? "") || normalizeName(body.memberName),
      );
      if (!memberKey) {
        return NextResponse.json({ error: "Socio requerido." }, { status: 400 });
      }

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
    }

    if (action === "count") {
      const memberKey = normalizeKey(
        String(body.memberKey ?? "") || normalizeName(body.memberName),
      );
      if (!memberKey) {
        return NextResponse.json({ error: "Socio requerido." }, { status: 400 });
      }
      return NextResponse.json({ samples: await countFaceTemplates(db, memberKey) });
    }

    return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
  } catch (err) {
    console.error("XTREME FACE POST", err);
    return NextResponse.json(
      { error: "No se pudo procesar el rostro." },
      { status: 500 },
    );
  }
}
