import { NextRequest, NextResponse } from "next/server";
import { emailConfigurationError, emailEnabled, sendCampaignEmail } from "@/lib/helpers/email";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import {
  assertSafeCampaignCta,
  extractCampaignRegistrationToken,
  listAlreadyCampaignSentEmails,
  type EmailAudience,
  type EmailCampaignDoc,
  newEmailCampaignId,
  processQueuedEmailCampaigns,
  reclaimStuckCampaignDeliveries,
  resolveCampaignCta,
  skipAlreadySentInQueue,
} from "@/lib/xtreme/email-campaigns";
import { buildAudienceEmails, EMAIL_AUDIENCE_IDS } from "@/lib/xtreme/email-audiences";
import { isSafeCampaignMemberEmail, memberEmailNameScore } from "@/lib/xtreme/email-identity";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { issueCampaignClaimLink } from "@/lib/xtreme/campaign-claim-link";
import { hashRegistrationToken } from "@/lib/xtreme/registration-token";
import {
  getCampaignDeliveryStats,
  listCampaignDeliveries,
  resendCampaignRemindersBatch,
  resendCampaignVerification,
} from "@/lib/xtreme/campaign-delivery-status";
import {
  EMAIL_CAMPAIGN_DELIVERIES_COLLECTION,
  EMAIL_CAMPAIGNS_COLLECTION,
  EMAIL_CONTACTS_COLLECTION,
  MEMBERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  EMAIL_SUPPRESSIONS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
} from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";
/** process_queue y campaign (primer lote) pueden enviar varios correos con claim links. */
export const maxDuration = 60;

type ContactInput = { email?: unknown; name?: unknown; phone?: unknown };
type ContactDoc = {
  email: string;
  name?: string;
  phone?: string;
  status: "active" | "unsubscribed";
  source: "spreadsheet";
  consentSource: string;
  importCount: number;
  createdAt: Date;
  updatedAt: Date;
};
type SuppressionDoc = {
  email: string;
  reason?: string;
  feedback?: string;
  unsubscribedAt?: Date;
  createdAt?: Date;
};

type RecipientContactDoc = { email: string; name?: string };

async function buildMemberCoverage(db: Awaited<ReturnType<typeof getDb>>) {
  const members = await db.collection<MemberDoc>(MEMBERS_COLLECTION)
    .find({})
    .project({
      memberName: 1,
      normalizedName: 1,
      email: 1,
      emailVerified: 1,
      membership: 1,
      emailQuarantine: 1,
      emailRecovery: 1,
      legacyImport: 1,
    })
    .toArray();

  return members.map((member) => {
    const rate =
      member.legacyImport?.canonicalRate ||
      member.legacyImport?.rows?.find((row: { rate?: string }) => String(row.rate || "").trim())
        ?.rate ||
      "";
    const rawEmail = normalizeEmail(member.email);
    const quarantinedCandidate = normalizeEmail(member.emailQuarantine?.previousEmail);
    const emailSafe = Boolean(rawEmail && isSafeCampaignMemberEmail(member));
    const inferredUnsafeReason = rawEmail && !emailSafe ? "name_email_mismatch" : "";
    return {
      name: String(member.memberName || member.normalizedName || "Sin nombre").trim(),
      email: emailSafe ? rawEmail : "",
      emailSafe,
      emailNameScore: rawEmail || quarantinedCandidate
        ? memberEmailNameScore(rawEmail || quarantinedCandidate, member.memberName || member.normalizedName)
        : 0,
      emailVerified: member.emailVerified === true,
      plan: String(member.membership?.plan || "").trim(),
      rate: String(rate).trim(),
      sourceStatus: String(member.legacyImport?.canonicalSourceStatus || "").trim(),
      quarantineReason: String(member.emailQuarantine?.reason || inferredUnsafeReason).trim(),
      quarantinedEmail: emailSafe
        ? quarantinedCandidate
        : rawEmail || quarantinedCandidate,
      recoveryMethod: String(member.emailRecovery?.method || "").trim(),
      recoveredAt: member.emailRecovery?.at ? new Date(member.emailRecovery.at).toISOString() : "",
    };
  }).sort((left, right) => left.name.localeCompare(right.name, "es-CR", { sensitivity: "base" }));
}

function recipientSource(options: { member: boolean; pending: boolean; imported: boolean }) {
  return [
    options.member ? "Socio" : "",
    options.pending ? "Registro pendiente" : "",
    options.imported ? "Lista importada" : "",
  ].filter(Boolean).join(" + ") || "Correo sin ficha";
}

async function buildRecipientList(db: Awaited<ReturnType<typeof getDb>>, emails: string[]) {
  if (!emails.length) return [];
  const [members, pending, contacts] = await Promise.all([
    db.collection<MemberDoc>(MEMBERS_COLLECTION)
      .find({ email: { $in: emails } })
      .project({ email: 1, memberName: 1, emailVerified: 1, membership: 1 })
      .toArray(),
    db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION)
      .find({ email: { $in: emails }, confirmedAt: null })
      .project({ email: 1, expectedMemberName: 1 })
      .toArray(),
    db.collection<RecipientContactDoc>(EMAIL_CONTACTS_COLLECTION)
      .find({ email: { $in: emails }, status: "active" })
      .project({ email: 1, name: 1 })
      .toArray(),
  ]);

  const membersByEmail = new Map<string, MemberDoc[]>();
  for (const member of members) {
    const email = normalizeEmail(member.email);
    if (!email) continue;
    const list = membersByEmail.get(email) ?? [];
    list.push(member);
    membersByEmail.set(email, list);
  }
  const pendingByEmail = new Map(
    pending.map((item) => [normalizeEmail(item.email), String(item.expectedMemberName || "").trim()]),
  );
  const contactsByEmail = new Map(
    contacts.map((item) => [normalizeEmail(item.email), String(item.name || "").trim()]),
  );

  return emails.map((email) => {
    const memberHits = membersByEmail.get(email) ?? [];
    const memberNames = [...new Set(memberHits.map((item) => String(item.memberName || "").trim()).filter(Boolean))];
    const pendingName = pendingByEmail.get(email) || "";
    const contactName = contactsByEmail.get(email) || "";
    const primaryMember = memberHits[0];
    return {
      email,
      name: memberNames.join(" / ") || pendingName || contactName || "Sin nombre",
      source: recipientSource({
        member: memberHits.length > 0,
        pending: pendingByEmail.has(email),
        imported: contactsByEmail.has(email),
      }),
      emailVerified: memberHits.some((item) => item.emailVerified === true),
      duplicateProfiles: memberHits.length > 1,
      plan: String(primaryMember?.membership?.plan || "").trim(),
      nextBillingDate: String(primaryMember?.membership?.nextBillingDate || "").slice(0, 10),
    };
  }).sort((left, right) =>
    left.name.localeCompare(right.name, "es-CR", { sensitivity: "base" }) || left.email.localeCompare(right.email),
  );
}

const AUDIENCES = new Set<EmailAudience>(EMAIL_AUDIENCE_IDS);

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

async function requireSuper(req: NextRequest) {
  const session = await resolveStaffSession(req, "admin");
  return session?.role === "super";
}

export async function GET(req: NextRequest) {
  if (!(await requireSuper(req))) return NextResponse.json({ error: "Solo super admin." }, { status: 403 });
  try {
    const db = await getDb();
    const [audiences, campaigns, unsubscribes] = await Promise.all([
      buildAudienceEmails(db),
      db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).find({}).sort({ createdAt: -1 }).limit(12).toArray(),
      db.collection<SuppressionDoc>(EMAIL_SUPPRESSIONS_COLLECTION)
        .find({ reason: { $exists: true } })
        .project({ email: 1, reason: 1, feedback: 1, unsubscribedAt: 1, createdAt: 1 })
        .sort({ unsubscribedAt: -1, createdAt: -1 })
        .limit(20)
        .toArray(),
    ]);
    const counts = Object.fromEntries(
      EMAIL_AUDIENCE_IDS.map((id) => [id, audiences[id]?.length ?? 0]),
    ) as Record<EmailAudience, number>;
    const requestedAudience = String(req.nextUrl.searchParams.get("audience") || "") as EmailAudience;
    const includeCoverage = req.nextUrl.searchParams.get("coverage") === "1";
    const campaignId = String(req.nextUrl.searchParams.get("campaignId") || "").trim();
    const deliveryFilter = String(req.nextUrl.searchParams.get("deliveryFilter") || "all");
    const recipientList = AUDIENCES.has(requestedAudience)
      ? await buildRecipientList(db, audiences[requestedAudience] ?? [])
      : undefined;
    const memberCoverage = includeCoverage ? await buildMemberCoverage(db) : undefined;

    // Detalle de seguimiento por campaña (enviado / click / registrado).
    let campaignTracking:
      | {
          campaignId: string;
          stats: Awaited<ReturnType<typeof getCampaignDeliveryStats>>;
          rows: Awaited<ReturnType<typeof listCampaignDeliveries>>["rows"];
        }
      | undefined;
    if (campaignId) {
      const listed = await listCampaignDeliveries(db, campaignId, {
        filter: deliveryFilter,
        limit: 400,
        offset: 0,
      });
      campaignTracking = {
        campaignId,
        stats: listed.stats,
        rows: listed.rows,
      };
    }

    // Stats ligeras para la lista de campañas recientes.
    const campaignStats = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const stats = await getCampaignDeliveryStats(db, campaign.id);
          return { id: campaign.id, stats };
        } catch {
          return { id: campaign.id, stats: null };
        }
      }),
    );
    const statsById = Object.fromEntries(campaignStats.map((row) => [row.id, row.stats]));

    return NextResponse.json({
      ok: true,
      emailConfigured: emailEnabled(),
      emailConfigError: emailConfigurationError(),
      audiences: {
        ...counts,
        suppressed: audiences.suppressed,
      },
      diagnostics: audiences.diagnostics,
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        _id: undefined,
        tracking: statsById[campaign.id] || undefined,
      })),
      unsubscribes: unsubscribes.map((item) => ({ ...item, _id: undefined })),
      ...(recipientList ? { recipientList, recipientAudience: requestedAudience } : {}),
      ...(memberCoverage ? { memberCoverage } : {}),
      ...(campaignTracking ? { campaignTracking } : {}),
    });
  } catch (error) {
    console.error("XTREME ADMIN EMAIL GET", error);
    return NextResponse.json({ error: "No se pudo cargar el centro de correos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireSuper(req))) return NextResponse.json({ error: "Solo super admin." }, { status: 403 });
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const db = await getDb();

    if (action === "import") {
      if (body.consentConfirmed !== true) {
        return NextResponse.json({ error: "Confirmá que estas personas autorizaron el contacto." }, { status: 400 });
      }
      const rows = Array.isArray(body.contacts) ? (body.contacts as ContactInput[]).slice(0, 5000) : [];
      const unique = new Map<string, ContactInput>();
      let invalid = 0;
      for (const row of rows) {
        const email = normalizeEmail(row.email);
        if (!email) invalid += 1;
        else unique.set(email, row);
      }
      if (!unique.size) return NextResponse.json({ error: "No encontramos correos válidos." }, { status: 400 });
      const now = new Date();
      const result = await db.collection<ContactDoc>(EMAIL_CONTACTS_COLLECTION).bulkWrite(
        [...unique.entries()].map(([email, row]) => ({
          updateOne: {
            filter: { email },
            update: {
              $set: {
                name: String(row.name ?? "").trim().slice(0, 120),
                phone: String(row.phone ?? "").trim().slice(0, 40),
                source: "spreadsheet" as const,
                consentSource: String(body.consentSource ?? "Lista histórica del gimnasio").trim().slice(0, 160),
                updatedAt: now,
              },
              $setOnInsert: { status: "active" as const, createdAt: now },
              $inc: { importCount: 1 },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
      await writeAudit(db, {
        actorRole: "super",
        action: "email_contacts.import",
        targetType: "system",
        targetId: `import-${now.getTime()}`,
        summary: `${unique.size} correos procesados desde hoja de cálculo`,
        meta: { inserted: result.upsertedCount, updated: result.modifiedCount, invalid },
      });
      return NextResponse.json({
        ok: true,
        processed: unique.size,
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        invalid,
      });
    }

    if (action === "campaign") {
      if (body.consentConfirmed !== true) {
        return NextResponse.json({ error: "Confirmá el permiso y la revisión de la audiencia." }, { status: 400 });
      }
      const audience = String(body.audience ?? "") as EmailAudience;
      const subject = String(body.subject ?? "").trim().slice(0, 140);
      const title = String(body.title ?? "").trim().slice(0, 100);
      const message = String(body.message ?? "").trim().slice(0, 4000);
      const ctaLabel = String(body.ctaLabel ?? "").trim().slice(0, 50);
      const ctaPath = String(body.ctaPath ?? "").trim().slice(0, 160);
      if (!AUDIENCES.has(audience) || !subject || !title || !message) {
        return NextResponse.json({ error: "Audiencia, asunto, título y mensaje son requeridos." }, { status: 400 });
      }
      if (ctaPath && !ctaPath.startsWith("/")) {
        return NextResponse.json({ error: "El enlace debe ser una ruta interna que empiece con /." }, { status: 400 });
      }
      const audiences = await buildAudienceEmails(db);
      const rawRecipients = audiences[audience] ?? [];
      // Nunca re-encolar a quien ya recibió un envío exitoso de campaña.
      const alreadySent = await listAlreadyCampaignSentEmails(db);
      const recipients = rawRecipients.filter((email) => !alreadySent.has(email));
      const excludedAlreadySent = rawRecipients.length - recipients.length;
      if (!recipients.length) {
        return NextResponse.json(
          {
            error: alreadySent.size
              ? `No hay destinatarios nuevos: los ${rawRecipients.length} de esta audiencia ya recibieron un correo de campaña. Usá la audiencia «No verificados · no enviados».`
              : "La audiencia seleccionada está vacía.",
            excludedAlreadySent,
          },
          { status: 400 },
        );
      }
      const id = newEmailCampaignId();
      const now = new Date();
      const campaign: EmailCampaignDoc = {
        id,
        subject,
        title,
        message,
        ctaLabel: ctaLabel || undefined,
        ctaPath: ctaPath || undefined,
        audience,
        status: "queued",
        total: recipients.length,
        sent: 0,
        failed: 0,
        skipped: 0,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).insertOne(campaign);
      await db.collection(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION).insertMany(
        recipients.map((email) => ({
          deliveryKey: `${id}:${email}`,
          campaignId: id,
          email,
          status: "queued",
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        })),
        { ordered: false },
      );
      await writeAudit(db, {
        actorRole: "super",
        action: "email_campaign.queue",
        targetType: "system",
        targetId: id,
        summary: `Campaña en cola para ${recipients.length} destinatarios (${excludedAlreadySent} ya enviados excluidos)`,
        meta: { audience, subject, excludedAlreadySent },
      });

      // Primer lote + desbloqueo; el cron */5 min termina el resto.
      const process = await processQueuedEmailCampaigns(db, 15, {
        maxRounds: 2,
        deadlineMs: 45_000,
        forceUnstick: true,
      });

      return NextResponse.json({
        ok: true,
        campaignId: id,
        recipients: recipients.length,
        excludedAlreadySent,
        process,
      });
    }

    if (action === "test_campaign") {
      const email = normalizeEmail(body.email);
      const subject = String(body.subject ?? "").trim().slice(0, 140);
      const title = String(body.title ?? "").trim().slice(0, 100);
      const message = String(body.message ?? "").trim().slice(0, 4000);
      const requestedLabel = String(body.ctaLabel ?? "").trim().slice(0, 50);
      const requestedPath = String(body.ctaPath ?? "").trim().slice(0, 160);
      if (!email || !subject || !title || !message) {
        return NextResponse.json({ error: "Correo, asunto, título y mensaje son requeridos." }, { status: 400 });
      }

      let claim = await issueCampaignClaimLink(db, email);
      // Misma regla que el lote: claim solo cuenta si el token está en Mongo.
      if (claim?.kind === "claim") {
        const token = extractCampaignRegistrationToken(claim.path);
        if (!token) {
          claim = null;
        } else {
          const tokenHash = hashRegistrationToken(token);
          const pending = await db.collection(PENDING_REGISTRATIONS_COLLECTION).findOne({
            $or: [{ tokenHash }, { previousTokenHashes: tokenHash }],
          });
          if (!pending) claim = null;
        }
      }
      const audience = String(body.audience ?? "invite_recoverable");
      const resolved = resolveCampaignCta({
        audience,
        campaignCtaPath: requestedPath || "/registro/confirmar",
        campaignCtaLabel:
          claim?.kind === "app"
            ? requestedLabel || "Entrar a mi cuenta"
            : requestedLabel || undefined,
        claim,
      });

      // Misma regla que el lote masivo: no mandar prueba con código inválido.
      const safety = assertSafeCampaignCta({
        ctaPath: resolved.ctaPath,
        linkKind: resolved.linkKind,
      });
      if (!safety.ok) {
        return NextResponse.json(
          {
            error: safety.reason,
            linkKind: resolved.linkKind,
            ctaPathPreview: resolved.ctaPath.startsWith("/registro/confirmar")
              ? "/registro/confirmar?token=…"
              : resolved.ctaPath,
          },
          { status: 409 },
        );
      }
      // Prueba de invitación: exigir magic link (no fallback a plantilla bare).
      if (
        (audience === "invite_recoverable" || String(audience).startsWith("claim_")) &&
        resolved.linkKind !== "claim" &&
        resolved.linkKind !== "app"
      ) {
        return NextResponse.json(
          {
            error:
              "No se pudo generar un enlace personal con token válido para la prueba. Revisá el correo o reintentá.",
            linkKind: resolved.linkKind,
          },
          { status: 409 },
        );
      }

      const result = await sendCampaignEmail({
        to: email,
        subject,
        title,
        message,
        ctaLabel: resolved.ctaLabel,
        ctaPath: resolved.ctaPath,
        idempotencyKey: `email-template-test:${email}:${Date.now()}`,
      });
      await writeAudit(db, {
        actorRole: "super",
        action: "email_campaign.test",
        targetType: "system",
        targetId: email,
        summary: result.ok ? "Prueba individual de campaña enviada" : "Falló la prueba individual de campaña",
        meta: {
          subject,
          ok: result.ok,
          skipped: Boolean(result.skipped),
          code: result.code || "",
          linkKind: resolved.linkKind,
          ctaPath: resolved.ctaPath.includes("token=")
            ? "/registro/confirmar?token=…"
            : resolved.ctaPath,
        },
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error || "El proveedor rechazó la prueba." }, { status: 502 });
      }
      return NextResponse.json({
        ok: true,
        email,
        linkKind: resolved.linkKind,
        // No devolver el token crudo al admin en el JSON (queda en el correo).
        ctaHasToken: resolved.ctaPath.includes("token="),
        ctaPathPreview: resolved.ctaPath.includes("token=")
          ? "/registro/confirmar?token=…"
          : resolved.ctaPath,
      });
    }

    if (action === "process_queue") {
      // Admin: forzar desbloqueo de "sending" colgados + saltear ya enviados.
      const reclaimed = await reclaimStuckCampaignDeliveries(db, { forceAll: true });
      const alreadySkipped = await skipAlreadySentInQueue(db);
      const process = await processQueuedEmailCampaigns(db, 25, {
        maxRounds: 8,
        deadlineMs: 50_000,
        forceUnstick: true,
      });
      await writeAudit(db, {
        actorRole: "super",
        action: "email_campaign.process",
        targetType: "system",
        targetId: process.campaignId || "queue",
        summary: process.configured
          ? `Cola: ${process.sent} enviados, ${process.failed} fallidos, ${process.skipped} omitidos, ${reclaimed} desbloqueados, ${alreadySkipped} ya-enviados sacados`
          : `Cola no procesada: ${process.error || "correo no configurado"}`,
        meta: { ...process, reclaimed, alreadySkipped },
      });
      return NextResponse.json({
        ok: true,
        emailConfigured: process.configured,
        process: {
          ...process,
          reclaimed: (process.reclaimed || 0) + reclaimed,
          alreadySentSkipped: (process.alreadySentSkipped || 0) + alreadySkipped,
        },
      });
    }

    if (action === "unstick_queue") {
      const reclaimed = await reclaimStuckCampaignDeliveries(db, { forceAll: true });
      const alreadySkipped = await skipAlreadySentInQueue(db);
      // Recalcular contadores de campañas abiertas.
      const open = await db
        .collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION)
        .find({ status: { $in: ["queued", "processing"] } })
        .toArray();
      for (const campaign of open) {
        const counts = await db
          .collection(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION)
          .aggregate<{ _id: string; count: number }>([
            { $match: { campaignId: campaign.id } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ])
          .toArray();
        const byStatus = Object.fromEntries(counts.map((row) => [row._id, row.count]));
        const remaining = (byStatus.queued || 0) + (byStatus.sending || 0);
        await db.collection(EMAIL_CAMPAIGNS_COLLECTION).updateOne(
          { id: campaign.id },
          {
            $set: {
              status: remaining === 0 ? "completed" : "processing",
              sent: byStatus.sent || 0,
              failed: byStatus.failed || 0,
              skipped: byStatus.skipped || 0,
              lastProcessedAt: new Date(),
              updatedAt: new Date(),
              ...(remaining === 0 ? { completedAt: new Date() } : {}),
            },
            $unset: { lastError: "" },
          },
        );
      }
      return NextResponse.json({
        ok: true,
        reclaimed,
        alreadySkipped,
        openCampaigns: open.length,
      });
    }

    if (action === "resend_reminder") {
      const deliveryKey = String(body.deliveryKey ?? "").trim();
      const campaignId = String(body.campaignId ?? "").trim();
      const email = normalizeEmail(body.email);
      if (!deliveryKey && !(campaignId && email)) {
        return NextResponse.json(
          { error: "Indicá el envío (deliveryKey) o campaña + correo." },
          { status: 400 },
        );
      }
      const result = await resendCampaignVerification(db, {
        deliveryKey: deliveryKey || undefined,
        campaignId: campaignId || undefined,
        email: email || undefined,
      });
      await writeAudit(db, {
        actorRole: "super",
        action: "email_campaign.resend_reminder",
        targetType: "system",
        targetId: deliveryKey || email || campaignId,
        summary: result.ok
          ? `Recordatorio de verificación reenviado a ${result.email}`
          : `Falló reenvío: ${result.error}`,
        meta: result,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      return NextResponse.json({
        ok: true,
        email: result.email,
        ctaPathPreview: result.ctaPathPreview,
      });
    }

    if (action === "resend_reminders_batch") {
      const campaignId = String(body.campaignId ?? "").trim();
      const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 50);
      if (!campaignId) {
        return NextResponse.json({ error: "campaignId es requerido." }, { status: 400 });
      }
      const result = await resendCampaignRemindersBatch(db, campaignId, limit);
      await writeAudit(db, {
        actorRole: "super",
        action: "email_campaign.resend_batch",
        targetType: "system",
        targetId: campaignId,
        summary: `Lote recordatorios: ${result.sent} enviados, ${result.failed} fallidos de ${result.attempted}`,
        meta: result,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("XTREME ADMIN EMAIL POST", error);
    return NextResponse.json({ error: "No se pudo completar la operación de correo." }, { status: 500 });
  }
}
