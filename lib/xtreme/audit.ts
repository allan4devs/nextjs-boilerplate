import type { Db, Filter } from "mongodb";
import {
  AUDIT_COLLECTION,
  type AuditChange,
  type AuditDoc,
  type StaffRole,
} from "./shared";

/** Quién ejecutó la acción. El rol autoriza; el nombre identifica a la persona. */
export type AuditActor = {
  role: StaffRole;
  id?: string | null;
  name?: string | null;
};

export async function writeAudit(
  db: Db,
  entry: {
    actorRole: StaffRole;
    /** Identidad del colaborador (Allan, Eileen, Verónica...) cuando la sesión la conserva. */
    actorId?: string | null;
    actorName?: string | null;
    action: string;
    targetType: AuditDoc["targetType"];
    targetId: string;
    summary: string;
    meta?: Record<string, unknown>;
    changes?: AuditChange[];
  },
) {
  const now = new Date();
  const doc: AuditDoc = {
    id: `aud-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    at: now,
    actorRole: entry.actorRole,
    ...(entry.actorId ? { actorId: String(entry.actorId).slice(0, 60) } : {}),
    ...(entry.actorName ? { actorName: String(entry.actorName).slice(0, 80) } : {}),
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId.slice(0, 120),
    summary: entry.summary.slice(0, 400),
    ...(entry.meta ? { meta: entry.meta } : {}),
    ...(entry.changes?.length ? { changes: entry.changes.slice(0, 60) } : {}),
  };

  try {
    await db.collection<AuditDoc>(AUDIT_COLLECTION).insertOne(doc);
  } catch (err) {
    // El audit nunca debe tumbar la mutacion principal.
    console.error("XTREME AUDIT WRITE", err);
  }

  return doc;
}

export type AuditRow = {
  id: string;
  at: Date;
  actorRole: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  meta: Record<string, unknown> | null;
  changes: AuditChange[];
};

function toRow(d: AuditDoc): AuditRow {
  return {
    id: d.id,
    at: d.at,
    actorRole: d.actorRole,
    actorId: d.actorId ?? null,
    actorName: d.actorName ?? null,
    action: d.action,
    targetType: d.targetType,
    targetId: d.targetId,
    summary: d.summary,
    meta: d.meta ?? null,
    changes: d.changes ?? [],
  };
}

export async function listAudit(db: Db, limit = 40) {
  const docs = await db
    .collection<AuditDoc>(AUDIT_COLLECTION)
    .find({})
    .sort({ at: -1 })
    .limit(Math.max(1, Math.min(100, limit)))
    .toArray();

  return docs.map(toRow);
}

export type AuditQuery = {
  /** Texto libre: busca en resumen, objetivo y nombre del colaborador. */
  search?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  actorRole?: string;
  actorName?: string;
  /** `YYYY-MM-DD` inclusive. */
  fromDate?: string;
  toDate?: string;
  limit?: number;
  skip?: number;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFilter(query: AuditQuery): Filter<AuditDoc> {
  const filter: Filter<AuditDoc> = {};

  if (query.action) filter.action = query.action;
  if (query.targetType) filter.targetType = query.targetType as AuditDoc["targetType"];
  if (query.targetId) filter.targetId = query.targetId;
  if (query.actorRole) filter.actorRole = query.actorRole as StaffRole;
  if (query.actorName) filter.actorName = query.actorName;

  const at: Record<string, Date> = {};
  if (query.fromDate) at.$gte = new Date(`${query.fromDate}T00:00:00.000Z`);
  if (query.toDate) at.$lte = new Date(`${query.toDate}T23:59:59.999Z`);
  if (Object.keys(at).length) filter.at = at as Filter<AuditDoc>["at"];

  const search = query.search?.trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ summary: rx }, { targetId: rx }, { action: rx }, { actorName: rx }];
  }

  return filter;
}

/** Bitácora global con filtros y paginación para la pantalla de historial. */
export async function queryAudit(db: Db, query: AuditQuery = {}) {
  const limit = Math.max(1, Math.min(200, query.limit ?? 50));
  const skip = Math.max(0, query.skip ?? 0);
  const filter = buildFilter(query);
  const collection = db.collection<AuditDoc>(AUDIT_COLLECTION);

  const [docs, total] = await Promise.all([
    collection.find(filter).sort({ at: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(filter),
  ]);

  return { rows: docs.map(toRow), total, limit, skip };
}

/** Valores distintos para poblar los filtros sin adivinar qué acciones existen. */
export async function auditFacets(db: Db) {
  const collection = db.collection<AuditDoc>(AUDIT_COLLECTION);
  const [actions, targetTypes, actors, roles] = await Promise.all([
    collection.distinct("action"),
    collection.distinct("targetType"),
    collection.distinct("actorName"),
    collection.distinct("actorRole"),
  ]);
  return {
    actions: actions.map(String).filter(Boolean).sort(),
    targetTypes: targetTypes.map(String).filter(Boolean).sort(),
    actors: actors.map((a) => String(a || "")).filter(Boolean).sort(),
    roles: roles.map(String).filter(Boolean).sort(),
  };
}

/** Historial de un socio: lo que se le hizo a su ficha, más reciente primero. */
export async function listAuditForTarget(db: Db, targetId: string, limit = 120) {
  const docs = await db
    .collection<AuditDoc>(AUDIT_COLLECTION)
    .find({ targetId })
    .sort({ at: -1 })
    .limit(Math.max(1, Math.min(300, limit)))
    .toArray();
  return docs.map(toRow);
}

/**
 * Diff entre lo que había y lo que se guarda. Solo devuelve los campos que
 * realmente cambiaron: un historial lleno de "no cambió nada" no sirve.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string> = {},
): AuditChange[] {
  const changes: AuditChange[] = [];
  for (const [field, nextRaw] of Object.entries(after)) {
    const prevRaw = before[field];
    const next = normalizeAuditValue(nextRaw);
    const prev = normalizeAuditValue(prevRaw);
    if (prev === next) continue;
    changes.push({
      field,
      ...(labels[field] ? { label: labels[field] } : {}),
      before: prev,
      after: next,
    });
  }
  return changes;
}

function normalizeAuditValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ") || null;
  if (typeof value === "object") return JSON.stringify(value).slice(0, 300);
  return String(value).slice(0, 300);
}
