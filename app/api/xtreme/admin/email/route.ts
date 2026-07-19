import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import {
  type EmailAudience,
  type EmailCampaignDoc,
  newEmailCampaignId,
} from "@/lib/xtreme/email-campaigns";
import { buildAudienceEmails, EMAIL_AUDIENCE_IDS } from "@/lib/xtreme/email-audiences";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
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
    return {
      name: String(member.memberName || member.normalizedName || "Sin nombre").trim(),
      email: normalizeEmail(member.email),
      emailVerified: member.emailVerified === true,
      plan: String(member.membership?.plan || "").trim(),
      rate: String(rate).trim(),
      sourceStatus: String(member.legacyImport?.canonicalSourceStatus || "").trim(),
      quarantineReason: String(member.emailQuarantine?.reason || "").trim(),
      quarantinedEmail: normalizeEmail(member.emailQuarantine?.previousEmail),
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
    const recipientList = AUDIENCES.has(requestedAudience)
      ? await buildRecipientList(db, audiences[requestedAudience] ?? [])
      : undefined;
    const memberCoverage = includeCoverage ? await buildMemberCoverage(db) : undefined;
    return NextResponse.json({
      ok: true,
      audiences: {
        ...counts,
        suppressed: audiences.suppressed,
      },
      diagnostics: audiences.diagnostics,
      campaigns: campaigns.map((campaign) => ({ ...campaign, _id: undefined })),
      unsubscribes: unsubscribes.map((item) => ({ ...item, _id: undefined })),
      ...(recipientList ? { recipientList, recipientAudience: requestedAudience } : {}),
      ...(memberCoverage ? { memberCoverage } : {}),
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
      const recipients = audiences[audience];
      if (!recipients?.length) {
        return NextResponse.json({ error: "La audiencia seleccionada está vacía." }, { status: 400 });
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
        summary: `Campaña en cola para ${recipients.length} destinatarios`,
        meta: { audience, subject },
      });
      return NextResponse.json({ ok: true, campaignId: id, recipients: recipients.length });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("XTREME ADMIN EMAIL POST", error);
    return NextResponse.json({ error: "No se pudo completar la operación de correo." }, { status: 500 });
  }
}
