import type { Db } from "mongodb";
import { AUDIT_COLLECTION, type AuditDoc, type StaffRole } from "./shared";

export async function writeAudit(
  db: Db,
  entry: {
    actorRole: StaffRole;
    action: string;
    targetType: AuditDoc["targetType"];
    targetId: string;
    summary: string;
    meta?: Record<string, unknown>;
  },
) {
  const now = new Date();
  const doc: AuditDoc = {
    id: `aud-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    at: now,
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId.slice(0, 120),
    summary: entry.summary.slice(0, 400),
    ...(entry.meta ? { meta: entry.meta } : {}),
  };

  try {
    await db.collection<AuditDoc>(AUDIT_COLLECTION).insertOne(doc);
  } catch (err) {
    // El audit nunca debe tumbar la mutacion principal.
    console.error("XTREME AUDIT WRITE", err);
  }

  return doc;
}

export async function listAudit(db: Db, limit = 40) {
  const docs = await db
    .collection<AuditDoc>(AUDIT_COLLECTION)
    .find({})
    .sort({ at: -1 })
    .limit(Math.max(1, Math.min(100, limit)))
    .toArray();

  return docs.map((d) => ({
    id: d.id,
    at: d.at,
    actorRole: d.actorRole,
    action: d.action,
    targetType: d.targetType,
    targetId: d.targetId,
    summary: d.summary,
    meta: d.meta ?? null,
  }));
}
