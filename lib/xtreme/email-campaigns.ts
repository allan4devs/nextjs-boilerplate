import { randomUUID } from "crypto";
import type { Db } from "mongodb";
import { emailConfigurationError, emailEnabled, sendCampaignEmail } from "@/lib/helpers/email";
import {
  CLAIM_LINK_AUDIENCES,
  issueCampaignClaimLink,
  type CampaignClaimLink,
} from "@/lib/xtreme/campaign-claim-link";
import { hashRegistrationToken } from "@/lib/xtreme/registration-token";
import { campaignClickPath } from "@/lib/xtreme/campaign-click";
import {
  EMAIL_CAMPAIGN_DELIVERIES_COLLECTION,
  EMAIL_CAMPAIGNS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
} from "@/lib/xtreme/shared/config";

/** Ruta de confirmación sin ?token= no es un enlace seguro usable. */
export function isBareRegistroConfirmarPath(path: string | undefined | null) {
  const raw = String(path || "").trim();
  if (!raw.startsWith("/registro/confirmar")) return false;
  return !/[?&]token=/.test(raw);
}

/**
 * Token de registro: createRegistrationToken() = 32 bytes → 64 hex.
 * Solo aceptamos ese formato para no mandar ?token= basura o truncado.
 */
export function extractCampaignRegistrationToken(path: string | undefined | null): string | null {
  const raw = String(path || "").trim();
  const match = raw.match(/[?&]token=([^&#]+)/);
  if (!match?.[1]) return null;
  try {
    const token = decodeURIComponent(match[1]).trim();
    return /^[a-f0-9]{64}$/i.test(token) ? token : null;
  } catch {
    return null;
  }
}

export function isUsableCampaignClaimPath(path: string | undefined | null) {
  const raw = String(path || "").trim();
  if (!raw.startsWith("/registro/confirmar")) return false;
  return Boolean(extractCampaignRegistrationToken(raw));
}

/**
 * True si el path NO debe salir en un correo (código inválido / sin token).
 * - /registro/confirmar sin token válido
 * - ?token= que no sea hex de 64 (plantilla admin, basura, truncado)
 */
export function isUnsafeCampaignCtaPath(path: string | undefined | null) {
  const raw = String(path || "").trim();
  if (!raw.startsWith("/registro/confirmar")) return false;
  return !isUsableCampaignClaimPath(raw);
}

/**
 * Resuelve el CTA del correo masivo:
 * - claim → /registro/confirmar?token=… SOLO si el token es el emitido (64 hex)
 * - app → /app (ya verificó y tiene PIN)
 * - fallback → nunca manda /registro/confirmar de plantilla ni con token inventado
 */
export function resolveCampaignCta(args: {
  audience: string;
  campaignCtaPath?: string;
  campaignCtaLabel?: string;
  claim: CampaignClaimLink | null;
}): { ctaPath: string; ctaLabel: string; linkKind: "claim" | "app" | "fallback" } {
  const claim = args.claim;
  if (claim?.kind === "claim" && isUsableCampaignClaimPath(claim.path)) {
    return {
      ctaPath: claim.path,
      ctaLabel:
        args.campaignCtaLabel ||
        (CLAIM_LINK_AUDIENCES.has(args.audience) ? "Activar mi acceso" : "Completar mi registro"),
      linkKind: "claim",
    };
  }
  if (claim?.kind === "app") {
    return {
      ctaPath: "/app",
      ctaLabel: args.campaignCtaLabel || "Entrar a la app",
      linkKind: "app",
    };
  }

  const raw =
    args.campaignCtaPath &&
    args.campaignCtaPath.startsWith("/") &&
    !args.campaignCtaPath.startsWith("//")
      ? args.campaignCtaPath
      : "/app";

  // Nunca reutilizar ctaPath de plantilla hacia /registro/confirmar
  // (con o sin ?token=): ese token no es el personal del destinatario.
  if (
    raw.startsWith("/registro/confirmar") ||
    CLAIM_LINK_AUDIENCES.has(args.audience) ||
    isUnsafeCampaignCtaPath(raw)
  ) {
    return {
      ctaPath: "/primer-dia#registro",
      ctaLabel: args.campaignCtaLabel || "Iniciar registro seguro",
      linkKind: "fallback",
    };
  }

  return {
    ctaPath: raw,
    ctaLabel: args.campaignCtaLabel || "Abrir Xtreme Gym",
    linkKind: "fallback",
  };
}

/**
 * Gate final antes de llamar a Resend: no mandar enlaces de confirmación inválidos.
 * - claim exige path usable con token de 64 hex
 * - nunca /registro/confirmar sin token válido
 */
export function assertSafeCampaignCta(args: {
  ctaPath: string;
  linkKind: "claim" | "app" | "fallback";
}): { ok: true } | { ok: false; reason: string } {
  const path = String(args.ctaPath || "").trim();
  if (args.linkKind === "claim") {
    if (!isUsableCampaignClaimPath(path)) {
      return {
        ok: false,
        reason: "Magic link sin token válido (64 hex); no se envía el correo.",
      };
    }
    return { ok: true };
  }
  // linkKind app | fallback: no se permite token de registro en el path.
  if (
    isUnsafeCampaignCtaPath(path) ||
    isBareRegistroConfirmarPath(path) ||
    /[?&]token=/.test(path)
  ) {
    return {
      ok: false,
      reason: "CTA con token o /registro/confirmar sin magic link personal; no se envía el correo.",
    };
  }
  return { ok: true };
}

export type EmailAudience =
  | "imported"
  | "unregistered"
  | "never_registered"
  | "pending"
  | "never_opened"
  | "inactive"
  | "members"
  /** Todos los sin verificar SIN plan activo (seguros para activación). */
  | "claim_profile"
  /** Sin verificar + recovery Excel/cuarentena, SIN plan activo. */
  | "claim_recovered"
  /** Sin verificar con correo nativo, SIN plan activo. */
  | "claim_native"
  /**
   * Sin verificar + plan vigente (semanal/quincenal/mensual/senior).
   * Separados de activación: ya tienen membresía; solo confirman datos/PIN.
   */
  | "claim_active_plan"
  /**
   * Invitación masiva: todos los correos recuperables del Excel/contactos/fichas
   * sin exigir match de nombre. Excluye verificados, bajas y placeholders.
   * Para ver quién entra y se registra con correo + cédula.
   */
  | "invite_recoverable"
  /** Cualquier ficha con emailRecovery (verificado o no). */
  | "excel_recovered"
  | "winback_90"
  | "winback_180"
  | "winback_365"
  | "possible_foreign"
  | "plan_week"
  | "plan_fortnight"
  | "plan_month"
  | "plan_quarter"
  | "plan_free_day"
  | "plan_senior"
  | "plan_other"
  | "no_plan"
  | "all";

export type EmailCampaignDoc = {
  id: string;
  subject: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaPath?: string;
  audience: EmailAudience;
  status: "queued" | "processing" | "completed";
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  /** Último intento de procesamiento (cron o admin). */
  lastProcessedAt?: Date;
  /** Motivo legible si no se pudo procesar (config, etc.). */
  lastError?: string;
};

type EmailDeliveryDoc = {
  deliveryKey: string;
  campaignId: string;
  email: string;
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  /** Ruta CTA real del envío (con token si fue magic link). */
  ctaPath?: string;
  linkKind?: "claim" | "app" | "fallback";
  sentAt?: Date;
  openedAt?: Date;
  registeredAt?: Date;
  lastReminderAt?: Date;
  reminderCount?: number;
};

export type ProcessCampaignsResult = {
  configured: boolean;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  campaignId?: string;
  error?: string;
  rounds?: number;
};

export function newEmailCampaignId() {
  return `email-${randomUUID()}`;
}

async function processOneCampaignBatch(db: Db, limit: number): Promise<ProcessCampaignsResult> {
  if (!emailEnabled()) {
    const configError =
      emailConfigurationError() || "Configuración de correo incompleta en el servidor.";
    // Marca la campaña más antigua para que el admin vea por qué no avanza.
    const stuck = await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).findOne(
      { status: { $in: ["queued", "processing"] } },
      { sort: { createdAt: 1 } },
    );
    if (stuck) {
      await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).updateOne(
        { id: stuck.id },
        {
          $set: {
            lastError: configError,
            lastProcessedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );
    }
    return {
      configured: false,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      campaignId: stuck?.id,
      error: configError,
    };
  }

  const campaign = await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).findOne(
    { status: { $in: ["queued", "processing"] } },
    { sort: { createdAt: 1 } },
  );
  if (!campaign) {
    return { configured: true, processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).updateOne(
    { id: campaign.id },
    {
      $set: {
        status: "processing",
        lastProcessedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { lastError: "" },
    },
  );

  const deliveries = db.collection<EmailDeliveryDoc>(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION);
  // Recupera un lote si la función terminó después de reclamarlo y antes de guardar el resultado.
  await deliveries.updateMany(
    {
      campaignId: campaign.id,
      status: "sending",
      updatedAt: { $lt: new Date(Date.now() - 10 * 60_000) },
    },
    { $set: { status: "queued", updatedAt: new Date() } },
  );
  const batch = await deliveries
    .find({ campaignId: campaign.id, status: "queued" })
    .limit(limit)
    .toArray();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of batch) {
    const claimed = await deliveries.updateOne(
      { deliveryKey: item.deliveryKey, status: "queued" },
      { $set: { status: "sending", updatedAt: new Date() }, $inc: { attempts: 1 } },
    );
    if (!claimed.modifiedCount) continue;

    // Magic link personal por destinatario (reintento 1x si falla).
    // Solo se envía si el token queda persistido en pending_registrations.
    let claim: CampaignClaimLink | null = null;
    for (let attempt = 0; attempt < 2 && !claim; attempt += 1) {
      try {
        const issued = await issueCampaignClaimLink(db, item.email);
        if (issued?.kind === "app") {
          claim = issued;
          break;
        }
        if (issued?.kind === "claim") {
          const token = extractCampaignRegistrationToken(issued.path);
          if (!token) {
            console.error("CAMPAIGN CLAIM PATH SIN TOKEN", item.email, issued.path);
          } else {
            const tokenHash = hashRegistrationToken(token);
            const pending = await db
              .collection<{ tokenHash?: string; previousTokenHashes?: string[]; expiresAt?: Date }>(
                PENDING_REGISTRATIONS_COLLECTION,
              )
              .findOne({
                $or: [{ tokenHash }, { previousTokenHashes: tokenHash }],
              });
            if (!pending) {
              console.error("CAMPAIGN CLAIM NO PERSISTIDO", item.email);
            } else if (
              pending.expiresAt &&
              new Date(pending.expiresAt).getTime() < Date.now()
            ) {
              console.error("CAMPAIGN CLAIM EXPIRADO AL EMITIR", item.email);
            } else {
              claim = issued;
              break;
            }
          }
        }
      } catch (err) {
        console.error("CAMPAIGN CLAIM LINK", item.email, attempt, err);
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }
    }

    const resolved = resolveCampaignCta({
      audience: campaign.audience,
      campaignCtaPath: campaign.ctaPath,
      campaignCtaLabel: campaign.ctaLabel,
      claim,
    });
    const { ctaPath, ctaLabel, linkKind } = resolved;
    const safety = assertSafeCampaignCta({ ctaPath, linkKind });

    // Invitación / activación masiva: SOLO sale con magic link real o /app.
    // Nunca manda la plantilla bare "/registro/confirmar" ni un token inventado.
    const isInviteOrClaimAudience = CLAIM_LINK_AUDIENCES.has(campaign.audience);
    const needsSecureClaim =
      isInviteOrClaimAudience && linkKind !== "claim" && linkKind !== "app";
    const unsafeCta = !safety.ok;
    // Para invite_recoverable y claim_*: exigir claim con token (app solo si ya tiene cuenta).
    const inviteNeedsToken =
      (campaign.audience === "invite_recoverable" ||
        campaign.audience.startsWith("claim_")) &&
      linkKind !== "claim" &&
      linkKind !== "app";

    if (needsSecureClaim || inviteNeedsToken || unsafeCta) {
      const now = new Date();
      const errorMsg = !safety.ok
        ? safety.reason
        : "No se pudo generar el enlace seguro con token válido; reintento automático.";
      if (unsafeCta || inviteNeedsToken) {
        console.error(
          "CAMPAIGN CTA BLOQUEADO",
          item.email,
          campaign.audience,
          linkKind,
          ctaPath,
          errorMsg,
        );
      }
      if (item.attempts + 1 < 4) {
        await deliveries.updateOne(
          { deliveryKey: item.deliveryKey },
          {
            $set: {
              status: "queued",
              updatedAt: now,
              ctaPath,
              linkKind,
              error: errorMsg,
            },
          },
        );
      } else {
        failed += 1;
        await deliveries.updateOne(
          { deliveryKey: item.deliveryKey },
          {
            $set: {
              status: "failed",
              updatedAt: now,
              ctaPath,
              linkKind,
              error:
                errorMsg ||
                "No se pudo generar el enlace seguro de registro tras varios intentos.",
            },
          },
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }

    // Doble chequeo: si es claim, el path del correo debe llevar el token de 64 hex.
    if (linkKind === "claim" && !isUsableCampaignClaimPath(ctaPath)) {
      console.error("CAMPAIGN ABORT SEND — claim path inválido", item.email, ctaPath);
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        {
          $set: {
            status: "queued",
            updatedAt: new Date(),
            ctaPath,
            linkKind,
            error: "Path claim inválido antes de enviar; reintento.",
          },
        },
      );
      continue;
    }

    // Guardamos el magic link real en delivery; en el correo va el wrapper de click
    // para saber cuándo abrieron (sin exponer el token en analytics del mail).
    const emailCtaPath =
      linkKind === "claim" && isUsableCampaignClaimPath(ctaPath)
        ? campaignClickPath(item.deliveryKey)
        : ctaPath;

    // Persistir ctaPath ANTES del envío para que el click redirect ya encuentre el token.
    await deliveries.updateOne(
      { deliveryKey: item.deliveryKey },
      { $set: { ctaPath, linkKind, updatedAt: new Date() } },
    );

    const result = await sendCampaignEmail({
      to: item.email,
      subject: campaign.subject,
      title: campaign.title,
      message: campaign.message,
      ctaLabel,
      ctaPath: emailCtaPath,
      idempotencyKey: item.deliveryKey,
    });
    const now = new Date();
    if (result.ok) {
      sent += 1;
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        {
          $set: {
            status: "sent",
            updatedAt: now,
            sentAt: now,
            ctaPath,
            linkKind,
          },
          $unset: { error: "" },
        },
      );
      // Ritmo estable bajo Resend (~4 envíos/s de margen).
      await new Promise((resolve) => setTimeout(resolve, 260));
    } else if (result.skipped) {
      skipped += 1;
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        {
          $set: {
            status: "skipped",
            updatedAt: now,
            ctaPath,
            linkKind,
            error: result.error || "Envío omitido sin detalle.",
          },
        },
      );
    } else if (result.code === "rate_limit" || result.status === 429) {
      // No quemar reintentos: reencolar y enfriar el lote.
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        {
          $set: {
            status: "queued",
            updatedAt: now,
            ctaPath,
            linkKind,
            error: result.error || "Rate limit Resend",
          },
          // Devolver el attempt para no castigar por 429 del proveedor.
          $inc: { attempts: -1 },
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 1200));
      // Cortar el lote actual: el cron siguiente continúa sin saturar.
      break;
    } else if (item.attempts + 1 < 4) {
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        {
          $set: {
            status: "queued",
            updatedAt: now,
            ctaPath,
            linkKind,
            error: result.error || "Error de envío",
          },
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 400));
    } else {
      failed += 1;
      await deliveries.updateOne(
        { deliveryKey: item.deliveryKey },
        {
          $set: {
            status: "failed",
            updatedAt: now,
            ctaPath,
            linkKind,
            error: result.error || "Error de envío",
          },
        },
      );
    }
  }

  const counts = await deliveries
    .aggregate<{ _id: EmailDeliveryDoc["status"]; count: number }>([
      { $match: { campaignId: campaign.id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();
  const byStatus = Object.fromEntries(counts.map((row) => [row._id, row.count]));
  const remaining = (byStatus.queued || 0) + (byStatus.sending || 0);
  const completed = remaining === 0;
  await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).updateOne(
    { id: campaign.id },
    {
      $set: {
        status: completed ? "completed" : "processing",
        sent: byStatus.sent || 0,
        failed: byStatus.failed || 0,
        skipped: byStatus.skipped || 0,
        lastProcessedAt: new Date(),
        updatedAt: new Date(),
        ...(completed ? { completedAt: new Date() } : {}),
      },
      $unset: { lastError: "" },
    },
  );

  return {
    configured: true,
    campaignId: campaign.id,
    processed: batch.length,
    sent,
    failed,
    skipped,
  };
}

/**
 * Procesa destinos en cola. Por defecto un solo lote (cron ligero).
 * Con `maxRounds` > 1 y `deadlineMs`, vacía varios lotes en la misma invocación
 * (job dedicado / botón admin) sin pasarse del timeout de Vercel.
 */
export async function processQueuedEmailCampaigns(
  db: Db,
  limit = 20,
  options?: { maxRounds?: number; deadlineMs?: number },
): Promise<ProcessCampaignsResult> {
  const maxRounds = Math.max(1, options?.maxRounds ?? 1);
  const deadlineMs = options?.deadlineMs ?? 0;
  const started = Date.now();

  let totalProcessed = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let lastCampaignId: string | undefined;
  let configured = true;
  let error: string | undefined;
  let rounds = 0;

  for (let round = 0; round < maxRounds; round += 1) {
    if (deadlineMs > 0 && Date.now() - started > deadlineMs) break;

    const result = await processOneCampaignBatch(db, limit);
    rounds += 1;
    configured = result.configured;
    if (result.campaignId) lastCampaignId = result.campaignId;
    if (result.error) error = result.error;
    totalProcessed += result.processed;
    totalSent += result.sent;
    totalFailed += result.failed;
    totalSkipped += result.skipped;

    // Sin configuración o sin trabajo pendiente: no tiene sentido seguir.
    if (!result.configured) break;
    if (result.processed === 0) break;
  }

  return {
    configured,
    processed: totalProcessed,
    sent: totalSent,
    failed: totalFailed,
    skipped: totalSkipped,
    campaignId: lastCampaignId,
    error,
    rounds,
  };
}
