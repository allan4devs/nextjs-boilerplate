/**
 * Seguimiento de campañas masivas por destinatario:
 * enviado → abrió el enlace → se registró / verificó.
 * También reenvío de recordatorio de verificación.
 */
import type { Db } from "mongodb";
import {
  buildCampaignEmail,
  sendBatchEmails,
  sendEmail,
  type SendEmailArgs,
} from "@/lib/helpers/email";
import {
  assertSafeCampaignCta,
  extractCampaignRegistrationToken,
  isUsableCampaignClaimPath,
  resolveCampaignCta,
} from "@/lib/xtreme/email-campaigns";
import { campaignClickPath } from "@/lib/xtreme/campaign-click";
import { issueCampaignClaimLink } from "@/lib/xtreme/campaign-claim-link";
import { hashRegistrationToken } from "@/lib/xtreme/registration-token";
import {
  EMAIL_CAMPAIGN_DELIVERIES_COLLECTION,
  EMAIL_CAMPAIGNS_COLLECTION,
  EMAIL_CONTACTS_COLLECTION,
  MEMBERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  type MemberDoc,
} from "@/lib/xtreme/shared";

export type CampaignDeliveryStatus =
  | "queued"
  | "sending"
  | "sent"
  | "opened"
  | "registered"
  | "failed"
  | "skipped";

export type CampaignDeliveryRow = {
  deliveryKey: string;
  campaignId: string;
  email: string;
  name: string;
  status: CampaignDeliveryStatus;
  deliveryStatus: string;
  sentAt: string | null;
  openedAt: string | null;
  registeredAt: string | null;
  lastReminderAt: string | null;
  reminderCount: number;
  linkKind?: string;
  error?: string;
  emailVerified: boolean;
  canResend: boolean;
};

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

type DeliveryDoc = {
  deliveryKey: string;
  campaignId: string;
  email: string;
  status: string;
  attempts?: number;
  createdAt?: Date;
  updatedAt?: Date;
  sentAt?: Date;
  openedAt?: Date;
  registeredAt?: Date;
  lastReminderAt?: Date;
  reminderCount?: number;
  ctaPath?: string;
  linkKind?: string;
  error?: string;
};

/**
 * Marca apertura del enlace (click o GET de /registro/confirmar).
 * No pisa openedAt si ya existía.
 */
export async function markCampaignLinkOpened(
  db: Db,
  args: { deliveryKey?: string; email?: string; token?: string },
) {
  const now = new Date();
  const deliveries = db.collection(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION);

  if (args.deliveryKey) {
    await deliveries.updateOne(
      {
        deliveryKey: args.deliveryKey,
        status: "sent",
        openedAt: { $exists: false },
      },
      { $set: { openedAt: now, updatedAt: now } },
    );
    return;
  }

  let email = normalizeEmail(args.email);
  if (!email && args.token) {
    const tokenHash = hashRegistrationToken(args.token);
    const pending = await db.collection(PENDING_REGISTRATIONS_COLLECTION).findOne({
      $or: [{ tokenHash }, { previousTokenHashes: tokenHash }],
    });
    email = normalizeEmail(
      (pending as { email?: string } | null)?.email,
    );
  }
  if (!email) return;

  await deliveries.updateMany(
    {
      email,
      status: "sent",
      openedAt: { $exists: false },
    },
    { $set: { openedAt: now, updatedAt: now } },
  );
}

/** Marca registro/verificación completada para ese correo en campañas enviadas. */
export async function markCampaignRegistered(db: Db, rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  if (!email) return;
  const now = new Date();
  const deliveries = db.collection(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION);
  await deliveries.updateMany(
    {
      email,
      status: "sent",
      registeredAt: { $exists: false },
    },
    {
      $set: {
        registeredAt: now,
        updatedAt: now,
      },
    },
  );
  // Asegurar openedAt en los que se registraron sin click trackeado
  await deliveries.updateMany(
    {
      email,
      status: "sent",
      registeredAt: { $exists: true },
      openedAt: { $exists: false },
    },
    { $set: { openedAt: now } },
  );
}

export async function getCampaignDeliveryStats(db: Db, campaignId: string) {
  const rows = await db
    .collection<DeliveryDoc>(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION)
    .find({ campaignId })
    .project({
      status: 1,
      sentAt: 1,
      openedAt: 1,
      registeredAt: 1,
      email: 1,
    })
    .toArray();

  const emails = rows.map((r) => normalizeEmail(r.email)).filter(Boolean);
  const verified = new Set(
    (
      await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find({
          email: { $in: emails },
          emailVerified: true,
        })
        .project({ email: 1 })
        .toArray()
    )
      .map((m) => normalizeEmail(m.email))
      .filter(Boolean),
  );

  let sent = 0;
  let opened = 0;
  let registered = 0;
  let failed = 0;
  let skipped = 0;
  let queued = 0;

  for (const row of rows) {
    if (row.status === "failed") failed += 1;
    else if (row.status === "skipped") skipped += 1;
    else if (row.status === "queued" || row.status === "sending") queued += 1;
    else if (row.status === "sent") {
      sent += 1;
      const email = normalizeEmail(row.email);
      const isReg = Boolean(row.registeredAt) || verified.has(email);
      const isOpen = Boolean(row.openedAt) || isReg;
      if (isOpen) opened += 1;
      if (isReg) registered += 1;
    }
  }

  return {
    total: rows.length,
    sent,
    opened,
    registered,
    notOpened: Math.max(0, sent - opened),
    notRegistered: Math.max(0, sent - registered),
    failed,
    skipped,
    queued,
  };
}

export async function listCampaignDeliveries(
  db: Db,
  campaignId: string,
  options?: { filter?: string; limit?: number; offset?: number },
): Promise<{ rows: CampaignDeliveryRow[]; stats: Awaited<ReturnType<typeof getCampaignDeliveryStats>> }> {
  const filter = String(options?.filter || "all");
  const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);
  const offset = Math.max(options?.offset ?? 0, 0);

  const deliveries = await db
    .collection<DeliveryDoc>(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION)
    .find({ campaignId })
    .sort({ updatedAt: -1 })
    .toArray();

  const emails = [...new Set(deliveries.map((d) => normalizeEmail(d.email)).filter(Boolean))];
  const [members, contacts] = await Promise.all([
    db
      .collection<MemberDoc>(MEMBERS_COLLECTION)
      .find({ email: { $in: emails } })
      .project({ email: 1, memberName: 1, emailVerified: 1 })
      .toArray(),
    db
      .collection<{ email?: string; name?: string }>(EMAIL_CONTACTS_COLLECTION)
      .find({ email: { $in: emails } })
      .project({ email: 1, name: 1 })
      .toArray(),
  ]);

  const memberByEmail = new Map<string, MemberDoc[]>();
  for (const m of members) {
    const e = normalizeEmail(m.email);
    if (!e) continue;
    const list = memberByEmail.get(e) ?? [];
    list.push(m);
    memberByEmail.set(e, list);
  }
  const contactName = new Map(
    contacts.map((c) => [normalizeEmail(c.email), String(c.name || "").trim()]),
  );

  const rows: CampaignDeliveryRow[] = deliveries.map((d) => {
    const email = normalizeEmail(d.email);
    const hits = memberByEmail.get(email) ?? [];
    const emailVerified = hits.some((h) => h.emailVerified === true);
    const name =
      hits.map((h) => String(h.memberName || "").trim()).filter(Boolean).join(" / ") ||
      contactName.get(email) ||
      "Sin nombre";
    const registeredAt = iso(d.registeredAt);
    const openedAt = iso(d.openedAt) || (registeredAt ? registeredAt : null);
    const sentAt = iso(d.sentAt) || (d.status === "sent" ? iso(d.updatedAt) : null);

    let status: CampaignDeliveryStatus = "queued";
    if (d.status === "failed") status = "failed";
    else if (d.status === "skipped") status = "skipped";
    else if (d.status === "sending") status = "sending";
    else if (d.status === "queued") status = "queued";
    else if (d.status === "sent") {
      if (emailVerified || d.registeredAt) status = "registered";
      else if (d.openedAt) status = "opened";
      else status = "sent";
    }

    return {
      deliveryKey: d.deliveryKey,
      campaignId: d.campaignId,
      email,
      name,
      status,
      deliveryStatus: d.status,
      sentAt,
      openedAt,
      registeredAt: registeredAt || (emailVerified ? sentAt : null),
      lastReminderAt: iso(d.lastReminderAt),
      reminderCount: Number(d.reminderCount || 0),
      linkKind: d.linkKind,
      error: d.error,
      emailVerified,
      canResend:
        d.status === "sent" &&
        !emailVerified &&
        !d.registeredAt &&
        Boolean(email),
    };
  });

  const filtered = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "sent") return row.deliveryStatus === "sent";
    if (filter === "opened") return row.status === "opened" || row.status === "registered";
    if (filter === "not_opened") return row.status === "sent";
    if (filter === "registered") return row.status === "registered";
    if (filter === "not_registered")
      return row.deliveryStatus === "sent" && row.status !== "registered";
    if (filter === "failed") return row.status === "failed";
    if (filter === "queued") return row.status === "queued" || row.status === "sending";
    return true;
  });

  const stats = await getCampaignDeliveryStats(db, campaignId);
  return {
    stats,
    rows: filtered.slice(offset, offset + limit),
  };
}

/**
 * Prepara un recordatorio de verificación (claim + delivery) sin enviar.
 * Devuelve el payload listo para Resend Batch o un error.
 */
async function prepareCampaignVerificationReminder(
  db: Db,
  args: { deliveryKey?: string; email?: string; campaignId?: string },
): Promise<
  | { ok: true; email: string; ctaPathPreview: string; mail: SendEmailArgs }
  | { ok: false; error: string }
> {
  const deliveries = db.collection<DeliveryDoc>(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION);
  let doc: DeliveryDoc | null = null;

  if (args.deliveryKey) {
    doc = await deliveries.findOne({ deliveryKey: args.deliveryKey });
  } else if (args.email && args.campaignId) {
    doc = await deliveries.findOne({
      campaignId: args.campaignId,
      email: normalizeEmail(args.email),
    });
  }

  if (!doc) return { ok: false, error: "No encontramos ese envío en la campaña." };
  if (doc.status !== "sent") {
    return { ok: false, error: "Solo se reenvía a correos que ya se enviaron con éxito." };
  }

  const email = normalizeEmail(doc.email);
  const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    emailVerified: true,
  });
  if (member) {
    return { ok: false, error: "Ese correo ya está verificado y registrado. No hace falta reenviar." };
  }

  const campaign = await db.collection(EMAIL_CAMPAIGNS_COLLECTION).findOne({ id: doc.campaignId });
  const claim = await issueCampaignClaimLink(db, email);
  if (claim?.kind === "claim") {
    const token = extractCampaignRegistrationToken(claim.path);
    if (token) {
      const tokenHash = hashRegistrationToken(token);
      const pending = await db.collection(PENDING_REGISTRATIONS_COLLECTION).findOne({
        $or: [{ tokenHash }, { previousTokenHashes: tokenHash }],
      });
      if (!pending) {
        return { ok: false, error: "No se pudo guardar el enlace de verificación. Reintentá." };
      }
    }
  }

  const resolved = resolveCampaignCta({
    audience: String(campaign?.audience || "invite_recoverable"),
    campaignCtaPath: String(campaign?.ctaPath || "/registro/confirmar"),
    campaignCtaLabel: "Confirmar mis datos y crear PIN",
    claim,
  });
  const safety = assertSafeCampaignCta({
    ctaPath: resolved.ctaPath,
    linkKind: resolved.linkKind,
  });
  if (!safety.ok || resolved.linkKind !== "claim" || !isUsableCampaignClaimPath(resolved.ctaPath)) {
    return {
      ok: false,
      error: safety.ok
        ? "No se pudo generar un enlace personal válido para reenviar."
        : safety.reason,
    };
  }

  const now = new Date();
  await deliveries.updateOne(
    { deliveryKey: doc.deliveryKey },
    {
      $set: {
        ctaPath: resolved.ctaPath,
        linkKind: "claim",
        updatedAt: now,
        lastReminderAt: now,
      },
      $inc: { reminderCount: 1 },
    },
  );

  const trackPath = campaignClickPath(doc.deliveryKey);
  return {
    ok: true,
    email,
    ctaPathPreview: "/registro/confirmar?token=…",
    mail: buildCampaignEmail({
      to: email,
      subject: `Recordatorio: ${String(campaign?.subject || "activá tu acceso en Xtreme Gym")}`,
      title: "Todavía falta confirmar tu acceso",
      message:
        "Hola. Te reenviamos el enlace personal para activar tu cuenta en la app de Xtreme Gym (Ciudad Quesada).\n\n" +
        "Tocá el botón, revisá o completá tus datos y creá tu PIN de 4 dígitos. El enlace vence en 72 horas.\n\n" +
        "Si ya te registraste, podés ignorar este mensaje. Equipo Xtreme Gym.",
      ctaLabel: "Confirmar mis datos y crear PIN",
      ctaPath: trackPath,
      ref: `${doc.deliveryKey}:reminder`,
    }),
  };
}

/** Reenvía recordatorio de verificación con un magic link nuevo. */
export async function resendCampaignVerification(
  db: Db,
  args: { deliveryKey?: string; email?: string; campaignId?: string },
): Promise<{ ok: true; email: string; ctaPathPreview: string } | { ok: false; error: string }> {
  const prepared = await prepareCampaignVerificationReminder(db, args);
  if (!prepared.ok) return prepared;

  const result = await sendEmail(prepared.mail);
  if (!result.ok) {
    return { ok: false, error: result.error || "El proveedor rechazó el reenvío." };
  }

  return {
    ok: true,
    email: prepared.email,
    ctaPathPreview: prepared.ctaPathPreview,
  };
}

/** Reenvía recordatorio a varios no registrados de una campaña (Resend Batch). */
export async function resendCampaignRemindersBatch(
  db: Db,
  campaignId: string,
  limit = 25,
): Promise<{ attempted: number; sent: number; failed: number; errors: string[] }> {
  const { rows } = await listCampaignDeliveries(db, campaignId, {
    filter: "not_registered",
    limit,
    offset: 0,
  });
  const candidates = rows.filter((r) => r.canResend).slice(0, limit);
  let failed = 0;
  const errors: string[] = [];
  const mails: SendEmailArgs[] = [];

  for (const row of candidates) {
    const prepared = await prepareCampaignVerificationReminder(db, {
      deliveryKey: row.deliveryKey,
    });
    if (!prepared.ok) {
      failed += 1;
      if (errors.length < 8) errors.push(`${row.email}: ${prepared.error}`);
      continue;
    }
    mails.push(prepared.mail);
  }

  if (!mails.length) {
    return { attempted: candidates.length, sent: 0, failed, errors };
  }

  const batch = await sendBatchEmails(mails, {
    idempotencyKey: `campaign-reminder:${campaignId}:${Date.now()}`,
  });

  for (const result of batch.results) {
    if (!result.ok) {
      failed += 1;
      if (errors.length < 8) {
        const email = Array.isArray(mails[result.index]?.to)
          ? mails[result.index].to[0]
          : mails[result.index]?.to;
        errors.push(`${email || "?"}: ${result.error || "Error de envío"}`);
      }
    }
  }

  return {
    attempted: candidates.length,
    sent: batch.sent,
    failed,
    errors,
  };
}
