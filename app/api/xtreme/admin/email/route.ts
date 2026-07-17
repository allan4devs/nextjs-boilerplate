import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import {
  type EmailAudience,
  type EmailCampaignDoc,
  newEmailCampaignId,
} from "@/lib/xtreme/email-campaigns";
import { EVENTS_COLLECTION } from "@/lib/xtreme/events";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import {
  EMAIL_CAMPAIGN_DELIVERIES_COLLECTION,
  EMAIL_CAMPAIGNS_COLLECTION,
  EMAIL_CONTACTS_COLLECTION,
  EMAIL_SUPPRESSIONS_COLLECTION,
  MEMBERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
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

const AUDIENCES = new Set<EmailAudience>([
  "imported",
  "unregistered",
  "never_registered",
  "pending",
  "never_opened",
  "inactive",
  "members",
  "plan_week",
  "plan_fortnight",
  "plan_month",
  "plan_quarter",
  "plan_free_day",
  "plan_senior",
  "plan_other",
  "no_plan",
  "all",
]);

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

async function requireSuper(req: NextRequest) {
  const session = await resolveStaffSession(req, "admin");
  return session?.role === "super";
}

type PlanAudience =
  | "plan_week"
  | "plan_fortnight"
  | "plan_month"
  | "plan_quarter"
  | "plan_free_day"
  | "plan_senior"
  | "plan_other"
  | "no_plan";

function planAudience(value: unknown): PlanAudience {
  const plan = String(value ?? "")
    .trim()
    .toLocaleLowerCase("es-CR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!plan || plan === "—" || plan.includes("sin plan")) return "no_plan";
  if (plan.includes("primer dia") || plan.includes("free day")) return "plan_free_day";
  if (plan.includes("adulto") || plan.includes("senior")) return "plan_senior";
  if (plan.includes("trimestr") || plan.includes("quarter")) return "plan_quarter";
  if (plan.includes("quincen") || plan.includes("fortnight")) return "plan_fortnight";
  if (plan.includes("seman") || plan.includes("week")) return "plan_week";
  if (plan.includes("mensual") || plan.includes("monthly") || plan.includes("month")) return "plan_month";
  return "plan_other";
}

async function audienceEmails(db: Awaited<ReturnType<typeof getDb>>) {
  const [contacts, members, pending, suppressed, recentlyActive, everActive] = await Promise.all([
    db.collection<ContactDoc>(EMAIL_CONTACTS_COLLECTION).find({ status: "active" }).project({ email: 1 }).toArray(),
    // Solo correos verificados en audiencia de socios (import legacy está cruzado).
    db.collection<MemberDoc>(MEMBERS_COLLECTION).find({ email: { $exists: true, $ne: "" }, emailVerified: true }).project({ email: 1, normalizedName: 1, membership: 1 }).toArray(),
    db.collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION).find({ confirmedAt: null }).project({ email: 1 }).toArray(),
    db.collection(EMAIL_SUPPRESSIONS_COLLECTION).distinct<string>("email"),
    db.collection(EVENTS_COLLECTION).distinct<string>("memberId", {
      type: "app_opened",
      occurredAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60_000) },
    }),
    db.collection(EVENTS_COLLECTION).distinct<string>("memberId", { type: "app_opened" }),
  ]);

  const blocked = new Set(suppressed.map(normalizeEmail).filter(Boolean));
  const clean = (values: unknown[]) => [...new Set(values.map(normalizeEmail).filter((email) => email && !blocked.has(email)))];
  const imported = clean(contacts.map((row) => row.email));
  const memberEmails = clean(members.map((row) => row.email));
  const pendingEmails = clean(pending.map((row) => row.email));
  const registered = new Set(memberEmails);
  const waiting = new Set(pendingEmails);
  const activeKeys = new Set(recentlyActive);
  const everActiveKeys = new Set(everActive);
  const inactive = clean(
    members.filter((row) => !row.normalizedName || !activeKeys.has(row.normalizedName)).map((row) => row.email),
  );
  const neverOpened = clean(
    members.filter((row) => !row.normalizedName || !everActiveKeys.has(row.normalizedName)).map((row) => row.email),
  );
  const unregistered = imported.filter((email) => !registered.has(email) && !waiting.has(email));
  const neverRegistered = clean([...imported, ...pendingEmails]).filter((email) => !registered.has(email));
  const planBuckets: Record<PlanAudience, string[]> = {
    plan_week: [],
    plan_fortnight: [],
    plan_month: [],
    plan_quarter: [],
    plan_free_day: [],
    plan_senior: [],
    plan_other: [],
    no_plan: [],
  };
  for (const member of members) {
    const email = normalizeEmail(member.email);
    if (email && !blocked.has(email)) planBuckets[planAudience(member.membership?.plan)].push(email);
  }
  return {
    imported,
    unregistered,
    never_registered: neverRegistered,
    pending: pendingEmails,
    never_opened: neverOpened,
    inactive,
    members: memberEmails,
    ...(Object.fromEntries(
      Object.entries(planBuckets).map(([key, emails]) => [key, clean(emails)]),
    ) as Record<PlanAudience, string[]>),
    all: clean([...imported, ...pendingEmails, ...memberEmails]),
    suppressed: blocked.size,
  };
}

export async function GET(req: NextRequest) {
  if (!(await requireSuper(req))) return NextResponse.json({ error: "Solo super admin." }, { status: 403 });
  try {
    const db = await getDb();
    const [audiences, campaigns] = await Promise.all([
      audienceEmails(db),
      db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).find({}).sort({ createdAt: -1 }).limit(12).toArray(),
    ]);
    return NextResponse.json({
      ok: true,
      audiences: {
        imported: audiences.imported.length,
        unregistered: audiences.unregistered.length,
        never_registered: audiences.never_registered.length,
        pending: audiences.pending.length,
        never_opened: audiences.never_opened.length,
        inactive: audiences.inactive.length,
        members: audiences.members.length,
        plan_week: audiences.plan_week.length,
        plan_fortnight: audiences.plan_fortnight.length,
        plan_month: audiences.plan_month.length,
        plan_quarter: audiences.plan_quarter.length,
        plan_free_day: audiences.plan_free_day.length,
        plan_senior: audiences.plan_senior.length,
        plan_other: audiences.plan_other.length,
        no_plan: audiences.no_plan.length,
        all: audiences.all.length,
        suppressed: audiences.suppressed,
      },
      campaigns: campaigns.map((campaign) => ({ ...campaign, _id: undefined })),
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
      return NextResponse.json({ ok: true, processed: unique.size, inserted: result.upsertedCount, updated: result.modifiedCount, invalid });
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
      const audiences = await audienceEmails(db);
      const recipients = audiences[audience];
      if (!recipients.length) return NextResponse.json({ error: "La audiencia seleccionada está vacía." }, { status: 400 });
      const id = newEmailCampaignId();
      const now = new Date();
      const campaign: EmailCampaignDoc = {
        id, subject, title, message, ctaLabel: ctaLabel || undefined, ctaPath: ctaPath || undefined,
        audience, status: "queued", total: recipients.length, sent: 0, failed: 0, skipped: 0,
        createdAt: now, updatedAt: now,
      };
      await db.collection<EmailCampaignDoc>(EMAIL_CAMPAIGNS_COLLECTION).insertOne(campaign);
      await db.collection(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION).insertMany(
        recipients.map((email) => ({
          deliveryKey: `${id}:${email}`, campaignId: id, email, status: "queued", attempts: 0,
          createdAt: now, updatedAt: now,
        })),
        { ordered: false },
      );
      await writeAudit(db, {
        actorRole: "super", action: "email_campaign.queue", targetType: "system", targetId: id,
        summary: `Campaña en cola para ${recipients.length} destinatarios`, meta: { audience, subject },
      });
      return NextResponse.json({ ok: true, campaignId: id, recipients: recipients.length });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("XTREME ADMIN EMAIL POST", error);
    return NextResponse.json({ error: "No se pudo completar la operación de correo." }, { status: 500 });
  }
}
