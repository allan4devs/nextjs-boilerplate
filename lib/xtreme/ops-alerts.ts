import type { Db } from "mongodb";
import { OPS_ALERTS_COLLECTION } from "./shared";

export type OpsAlertSeverity = "warning" | "critical";

export type OpsAlertDoc = {
  fingerprint: string;
  kind: string;
  severity: OpsAlertSeverity;
  title: string;
  detail: string;
  status: "open" | "resolved";
  count: number;
  createdAt: Date;
  lastSeenAt: Date;
  context?: Record<string, string | number | boolean | null>;
  resolvedAt?: Date;
};

function safeContext(input?: Record<string, unknown>) {
  if (!input) return undefined;
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input).slice(0, 20)) {
    if (typeof value === "string") result[key] = value.slice(0, 240);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) result[key] = value;
  }
  return result;
}

export async function recordOpsAlert(
  db: Db,
  alert: {
    fingerprint: string;
    kind: string;
    severity: OpsAlertSeverity;
    title: string;
    detail: string;
    context?: Record<string, unknown>;
  },
) {
  const now = new Date();
  await db.collection<OpsAlertDoc>(OPS_ALERTS_COLLECTION).updateOne(
    { fingerprint: alert.fingerprint.slice(0, 160), status: "open" },
    {
      $set: {
        kind: alert.kind.slice(0, 80),
        severity: alert.severity,
        title: alert.title.slice(0, 160),
        detail: alert.detail.slice(0, 800),
        lastSeenAt: now,
        context: safeContext(alert.context),
      },
      $setOnInsert: {
        fingerprint: alert.fingerprint.slice(0, 160),
        status: "open",
        createdAt: now,
      },
      $inc: { count: 1 },
    },
    { upsert: true },
  );
}

export async function listOpenOpsAlerts(db: Db, limit = 20) {
  return db
    .collection<OpsAlertDoc>(OPS_ALERTS_COLLECTION)
    .find({ status: "open" })
    .sort({ severity: 1, lastSeenAt: -1 })
    .limit(Math.max(1, Math.min(50, limit)))
    .project({ _id: 0 })
    .toArray();
}

export async function resolveOpsAlert(db: Db, fingerprint: string) {
  await db.collection<OpsAlertDoc>(OPS_ALERTS_COLLECTION).updateMany(
    { fingerprint: fingerprint.slice(0, 160), status: "open" },
    { $set: { status: "resolved", resolvedAt: new Date() } },
  );
}
