/**
 * Bitácora de correo saliente.
 *
 * Antes solo quedaba rastro de las campañas: los recibos, recordatorios, OTP y
 * avisos de ciclo de vida se enviaban y desaparecían. Sin ese registro no se
 * puede responder "¿qué le hemos mandado a este socio?", que es justo lo que
 * recepción y administración necesitan antes de volver a escribirle.
 *
 * La escritura es best-effort: un fallo de la bitácora nunca debe convertir un
 * correo enviado en un error para quien lo disparó.
 */
import type { Db } from "mongodb";
import { getDb } from "@/lib/helpers/mongodb";
import { EMAIL_LOG_COLLECTION } from "./shared/config";

export type EmailLogDoc = {
  id: string;
  at: Date;
  /** Destinatario normalizado en minúsculas. */
  to: string;
  /** Todos los destinatarios del envío (por si fue multi-destino o con copia). */
  recipients: string[];
  subject: string;
  /** Etiqueta del tipo de correo: `payment_receipt`, `pin_recovery`, `campaign`... */
  kind: string;
  ok: boolean;
  skipped: boolean;
  /** Código del proveedor cuando falló (`suppressed`, `rate_limit`, ...). */
  code?: string;
  error?: string;
  provider?: string;
  /** ID de Resend o Message-ID de SMTP cuando salió bien. */
  providerId?: string;
  /** Socio asociado cuando quien envía ya lo conoce. */
  memberKey?: string;
  campaignId?: string;
};

export type EmailLogEntry = Omit<EmailLogDoc, "id" | "at" | "to" | "recipients"> & {
  to: string | string[];
};

function newId() {
  return `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

/** Registra un envío. Nunca lanza: el correo ya salió (o ya falló) sin esto. */
export async function logEmailSend(entry: EmailLogEntry) {
  const recipients = (Array.isArray(entry.to) ? entry.to : [entry.to])
    .map(normalizeEmail)
    .filter(Boolean);
  if (!recipients.length) return;

  const doc: EmailLogDoc = {
    id: newId(),
    at: new Date(),
    to: recipients[0],
    recipients,
    subject: String(entry.subject ?? "").slice(0, 200),
    kind: String(entry.kind || "otro").slice(0, 60),
    ok: Boolean(entry.ok),
    skipped: Boolean(entry.skipped),
    ...(entry.code ? { code: String(entry.code).slice(0, 40) } : {}),
    ...(entry.error ? { error: String(entry.error).slice(0, 300) } : {}),
    ...(entry.provider ? { provider: String(entry.provider).slice(0, 20) } : {}),
    ...(entry.providerId ? { providerId: String(entry.providerId).slice(0, 120) } : {}),
    ...(entry.memberKey ? { memberKey: String(entry.memberKey).slice(0, 120) } : {}),
    ...(entry.campaignId ? { campaignId: String(entry.campaignId).slice(0, 80) } : {}),
  };

  try {
    const db = await getDb();
    await db.collection<EmailLogDoc>(EMAIL_LOG_COLLECTION).insertOne(doc);
  } catch (err) {
    console.error("XTREME EMAIL LOG WRITE", err);
  }
}

export type EmailLogRow = {
  id: string;
  at: string;
  to: string;
  subject: string;
  kind: string;
  ok: boolean;
  skipped: boolean;
  code: string | null;
  error: string | null;
  provider: string | null;
  providerId: string | null;
};

function toRow(doc: EmailLogDoc): EmailLogRow {
  return {
    id: doc.id,
    at: new Date(doc.at).toISOString(),
    to: doc.to,
    subject: doc.subject,
    kind: doc.kind,
    ok: doc.ok,
    skipped: doc.skipped,
    code: doc.code ?? null,
    error: doc.error ?? null,
    provider: doc.provider ?? null,
    providerId: doc.providerId ?? null,
  };
}

/**
 * Historial de correo de un socio. Se busca por sus direcciones conocidas
 * (la actual y las que quedaron en cuarentena o recuperación) y por memberKey,
 * porque una ficha puede haber cambiado de correo con el tiempo.
 */
export async function listMemberEmailLog(
  db: Db,
  args: { memberKey?: string; emails?: (string | null | undefined)[]; limit?: number },
) {
  const emails = [...new Set((args.emails ?? []).map(normalizeEmail).filter(Boolean))];
  const or: Record<string, unknown>[] = [];
  if (emails.length) or.push({ recipients: { $in: emails } });
  if (args.memberKey) or.push({ memberKey: args.memberKey });
  if (!or.length) return [];

  const docs = await db
    .collection<EmailLogDoc>(EMAIL_LOG_COLLECTION)
    .find({ $or: or })
    .sort({ at: -1 })
    .limit(Math.max(1, Math.min(300, args.limit ?? 120)))
    .toArray();

  return docs.map(toRow);
}

/** Conteo por tipo de correo, para el resumen de la ficha del socio. */
export function summarizeEmailLog(rows: EmailLogRow[]) {
  const byKind: Record<string, { kind: string; total: number; sent: number; failed: number }> = {};
  for (const row of rows) {
    const bucket = (byKind[row.kind] ??= { kind: row.kind, total: 0, sent: 0, failed: 0 });
    bucket.total += 1;
    if (row.ok) bucket.sent += 1;
    else if (!row.skipped) bucket.failed += 1;
  }
  return {
    total: rows.length,
    sent: rows.filter((r) => r.ok).length,
    failed: rows.filter((r) => !r.ok && !r.skipped).length,
    skipped: rows.filter((r) => r.skipped).length,
    lastAt: rows[0]?.at ?? null,
    byKind: Object.values(byKind).sort((a, b) => b.total - a.total),
  };
}
