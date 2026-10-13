import { GridFSBucket, ObjectId, type Db } from "mongodb";

export const MEDIA_BUCKET = "xtreme_media";

export function mediaBucket(db: Db) {
  return new GridFSBucket(db, { bucketName: MEDIA_BUCKET });
}

export function parseMediaId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}
