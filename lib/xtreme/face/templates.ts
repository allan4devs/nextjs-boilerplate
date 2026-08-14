/**
 * Plantillas faciales en Mongo. Viven en su propia colección y no dentro del
 * doc del socio: son datos biométricos que se leen en bloque en cada escaneo,
 * se borran por separado y no deberían viajar en cada consulta de perfil.
 */
import type { Db } from "mongodb";
import { FACE_TEMPLATES_COLLECTION } from "@/lib/xtreme/shared";
import { FACE_ENGINE_ID, FACE_TEMPLATES_PER_MEMBER } from "./config";
import {
  encodeDescriptor,
  type FaceDescriptor,
  type FaceTemplateEntry,
} from "./descriptor";

export type FaceTemplateDoc = {
  id: string;
  normalizedName: string;
  memberName: string;
  /** Modelo que produjo el vector; solo se comparan plantillas del mismo motor. */
  engine: string;
  dim: number;
  encoded: string;
  quality: number;
  capturedAt: Date;
  capturedByRole: string;
  capturedByName?: string;
};

let indexesReady = false;

async function ensureIndexes(db: Db) {
  if (indexesReady) return;
  try {
    const collection = db.collection<FaceTemplateDoc>(FACE_TEMPLATES_COLLECTION);
    await collection.createIndex({ normalizedName: 1, capturedAt: -1 });
    await collection.createIndex({ engine: 1, dim: 1 });
    indexesReady = true;
  } catch (error) {
    // Un fallo de índice no debe romper el ingreso: solo lo vuelve más lento.
    console.error("XTREME FACE INDEXES", error);
  }
}

/** Plantillas comparables con el motor vigente, listas para rankFaceMatches. */
export async function loadFaceTemplates(db: Db): Promise<FaceTemplateEntry[]> {
  await ensureIndexes(db);
  const docs = await db
    .collection<FaceTemplateDoc>(FACE_TEMPLATES_COLLECTION)
    .find({ engine: FACE_ENGINE_ID })
    .project<{ normalizedName: string; memberName: string; dim: number; encoded: string }>({
      _id: 0,
      normalizedName: 1,
      memberName: 1,
      dim: 1,
      encoded: 1,
    })
    .toArray();

  return docs.map((doc) => ({
    normalizedName: doc.normalizedName,
    memberName: doc.memberName,
    dim: doc.dim,
    encoded: doc.encoded,
  }));
}

export async function saveFaceTemplate(
  db: Db,
  input: {
    normalizedName: string;
    memberName: string;
    descriptor: FaceDescriptor;
    quality: number;
    capturedByRole: string;
    capturedByName?: string;
  },
): Promise<{ samples: number }> {
  await ensureIndexes(db);
  const collection = db.collection<FaceTemplateDoc>(FACE_TEMPLATES_COLLECTION);
  const now = new Date();

  const encoded = encodeDescriptor(input.descriptor);
  if (!encoded) throw new Error("descriptor-vacio");

  await collection.insertOne({
    id: `face-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    normalizedName: input.normalizedName,
    memberName: input.memberName,
    engine: FACE_ENGINE_ID,
    dim: input.descriptor.length,
    encoded,
    quality: Math.round(input.quality * 100) / 100,
    capturedAt: now,
    capturedByRole: input.capturedByRole,
    ...(input.capturedByName ? { capturedByName: input.capturedByName } : {}),
  });

  // Tope por socio: se conservan las más recientes, que reflejan cómo se ve hoy.
  const stale = await collection
    .find({ normalizedName: input.normalizedName, engine: FACE_ENGINE_ID })
    .sort({ capturedAt: -1 })
    .skip(FACE_TEMPLATES_PER_MEMBER)
    .project<{ id: string }>({ _id: 0, id: 1 })
    .toArray();
  if (stale.length) {
    await collection.deleteMany({ id: { $in: stale.map((doc) => doc.id) } });
  }

  const samples = await collection.countDocuments({
    normalizedName: input.normalizedName,
    engine: FACE_ENGINE_ID,
  });
  return { samples };
}

export async function removeFaceTemplates(db: Db, normalizedName: string): Promise<number> {
  const result = await db
    .collection<FaceTemplateDoc>(FACE_TEMPLATES_COLLECTION)
    .deleteMany({ normalizedName });
  return result.deletedCount ?? 0;
}

export async function countFaceTemplates(
  db: Db,
  normalizedName: string,
): Promise<number> {
  return db
    .collection<FaceTemplateDoc>(FACE_TEMPLATES_COLLECTION)
    .countDocuments({ normalizedName, engine: FACE_ENGINE_ID });
}

export async function faceEnrollmentSummary(
  db: Db,
): Promise<{ members: number; samples: number }> {
  const collection = db.collection<FaceTemplateDoc>(FACE_TEMPLATES_COLLECTION);
  const samples = await collection.countDocuments({ engine: FACE_ENGINE_ID });
  const members = (await collection.distinct("normalizedName", { engine: FACE_ENGINE_ID }))
    .length;
  return { members, samples };
}
