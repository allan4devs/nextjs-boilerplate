import type { Db } from "mongodb";
import { MACHINE_MEDIA_COLLECTION } from "./shared";

/** Máximo de fotos por máquina y tamaño máximo por foto (data URL ya redimensionada en el cliente). */
export const MACHINE_MEDIA_MAX_IMAGES = 4;
export const MACHINE_MEDIA_MAX_IMAGE_CHARS = 400_000;
export const MACHINE_MEDIA_MAX_VIDEO_URL_CHARS = 500;
export const MACHINE_MEDIA_MAX_VIDEO_LABEL_CHARS = 80;

export type MachineMediaDoc = {
  /** Id de MACHINE_GUIDE (`app/components/member/catalog/machines.ts`), no del activo físico. */
  id: string;
  /** Vacío = usar el video del catálogo estático. */
  videoUrl?: string;
  videoLabel?: string;
  /** Vacío/ausente = usar las fotos del catálogo estático. Data URLs (subidas desde el admin) o URLs externas. */
  images?: string[];
  updatedAt: Date;
  updatedBy?: string;
};

export async function getMachineMedia(db: Db, id: string) {
  return db.collection<MachineMediaDoc>(MACHINE_MEDIA_COLLECTION).findOne({ id });
}

export async function listMachineMedia(db: Db) {
  return db.collection<MachineMediaDoc>(MACHINE_MEDIA_COLLECTION).find({}).toArray();
}

export type MachineMediaPatch = {
  videoUrl?: string;
  videoLabel?: string;
  images?: string[];
};

export class MachineMediaValidationError extends Error {}

function validatePatch(patch: MachineMediaPatch) {
  if (patch.videoUrl !== undefined && patch.videoUrl.length > MACHINE_MEDIA_MAX_VIDEO_URL_CHARS) {
    throw new MachineMediaValidationError("El link del video es demasiado largo.");
  }
  if (
    patch.videoLabel !== undefined &&
    patch.videoLabel.length > MACHINE_MEDIA_MAX_VIDEO_LABEL_CHARS
  ) {
    throw new MachineMediaValidationError("El título del video es demasiado largo.");
  }
  if (patch.images !== undefined) {
    if (patch.images.length > MACHINE_MEDIA_MAX_IMAGES) {
      throw new MachineMediaValidationError(`Máximo ${MACHINE_MEDIA_MAX_IMAGES} fotos por máquina.`);
    }
    for (const image of patch.images) {
      if (typeof image !== "string" || !image) {
        throw new MachineMediaValidationError("Una de las fotos no es válida.");
      }
      if (image.length > MACHINE_MEDIA_MAX_IMAGE_CHARS) {
        throw new MachineMediaValidationError("Una de las fotos es demasiado pesada.");
      }
    }
  }
}

/** Upsert idempotente de video/fotos de una máquina. Lanza `MachineMediaValidationError` si el patch no es válido. */
export async function upsertMachineMedia(
  db: Db,
  id: string,
  patch: MachineMediaPatch,
  actorName?: string | null,
) {
  validatePatch(patch);

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.videoUrl !== undefined) set.videoUrl = patch.videoUrl.trim();
  if (patch.videoLabel !== undefined) set.videoLabel = patch.videoLabel.trim();
  if (patch.images !== undefined) set.images = patch.images;
  if (actorName) set.updatedBy = actorName;

  const collection = db.collection<MachineMediaDoc>(MACHINE_MEDIA_COLLECTION);
  await collection.updateOne({ id }, { $set: set, $setOnInsert: { id } }, { upsert: true });
  return collection.findOne({ id });
}
