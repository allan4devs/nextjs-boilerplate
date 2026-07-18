/**
 * Audiencias del centro de correos (super admin).
 * Regla de negocio: el correo es la llave de contacto; la cédula del import
 * no es fuente de verdad (muchas vienen mal del reimport).
 */
import type { Db } from "mongodb";
import { EVENTS_COLLECTION } from "@/lib/xtreme/events";
import {
  EMAIL_CONTACTS_COLLECTION,
  EMAIL_SUPPRESSIONS_COLLECTION,
  MEMBERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
} from "@/lib/xtreme/shared";
import type { EmailAudience } from "@/lib/xtreme/email-campaigns";

export const EMAIL_AUDIENCE_IDS = [
  "imported",
  "unregistered",
  "never_registered",
  "pending",
  "never_opened",
  "inactive",
  "members",
  "claim_profile",
  "winback_90",
  "winback_180",
  "winback_365",
  "possible_foreign",
  "plan_week",
  "plan_fortnight",
  "plan_month",
  "plan_quarter",
  "plan_free_day",
  "plan_senior",
  "plan_other",
  "no_plan",
  "all",
] as const satisfies readonly EmailAudience[];

type ContactDoc = { email: string; status?: string };

type PlanAudience =
  | "plan_week"
  | "plan_fortnight"
  | "plan_month"
  | "plan_quarter"
  | "plan_free_day"
  | "plan_senior"
  | "plan_other"
  | "no_plan";

export function normalizeAudienceEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

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

function daysSinceIso(iso: string | undefined, todayIso: string) {
  if (!iso) return null;
  const t = Date.parse(`${String(iso).slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.parse(`${todayIso}T00:00:00.000Z`) - t) / 86_400_000);
}

function cedulaDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 20);
}

/** Señales de posible extranjero (no usa cédula como identidad, solo segmentación blanda). */
export function isPossibleForeignMember(member: {
  memberName?: string;
  normalizedName?: string;
  cedula?: string;
}) {
  const name = String(member.memberName || member.normalizedName || "").toLocaleUpperCase("es-CR");
  const d = cedulaDigits(member.cedula);
  // DIMEX / documentos largos
  if (d.length >= 10) return true;
  // 8 dígitos frecuentes en docs no-nacionales mal capturados
  if (d.length === 8) return true;
  if (
    /\b(HOFFMEISTER|JOHANSSON|SCHMIDT|SCHNEIDER|MULLER|SMITH|JONES|WILLIAMS|BROWN|MILLER|WILSON|THOMAS|JACKSON|ANDERSON|TAYLOR|MOORE|MCCOY|LOGAN|GRIMM|STAELE|YOANGEL|ENGELS|BISMARK|ARAFAT|KEILYN|KEYLOR|YERLIN|YENDRY|MAIKEL|MAYKEL|NGUYEN|KIM)\b/i.test(
      name,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Correos usables para campañas de reenganche/claim:
 * - con email en ficha
 * - solo correos que no estén en 2+ fichas (evita el desastre del import cruzado)
 * - no suprimidos
 * - preferimos incluir no verificados (el correo es la vía para que reclamen y corrijan cédula)
 */
function uniqueMemberEmails(
  members: Array<{ email?: string; emailVerified?: boolean; normalizedName?: string }>,
  blocked: Set<string>,
) {
  const byEmail = new Map<string, number>();
  for (const m of members) {
    const email = normalizeAudienceEmail(m.email);
    if (!email || blocked.has(email)) continue;
    byEmail.set(email, (byEmail.get(email) || 0) + 1);
  }
  const unique = new Set<string>();
  for (const [email, count] of byEmail) {
    if (count === 1) unique.add(email);
  }
  return unique;
}

export type AudienceEmailMap = Record<EmailAudience, string[]> & { suppressed: number };

export async function buildAudienceEmails(db: Db): Promise<AudienceEmailMap> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [contacts, verifiedMembers, allEmailedMembers, pending, suppressed, recentlyActive, everActive] =
    await Promise.all([
      db
        .collection<ContactDoc>(EMAIL_CONTACTS_COLLECTION)
        .find({ status: "active" })
        .project({ email: 1 })
        .toArray(),
      db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find({ email: { $exists: true, $ne: "" }, emailVerified: true })
        .project({ email: 1, normalizedName: 1, membership: 1, memberName: 1, cedula: 1 })
        .toArray(),
      // Claim / win-back: correo en ficha (verificado o no). La cédula del import no manda.
      db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find({ email: { $exists: true, $type: "string", $ne: "" } })
        .project({
          email: 1,
          emailVerified: 1,
          normalizedName: 1,
          membership: 1,
          memberName: 1,
          cedula: 1,
        })
        .toArray(),
      db
        .collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION)
        .find({ confirmedAt: null })
        .project({ email: 1 })
        .toArray(),
      db.collection(EMAIL_SUPPRESSIONS_COLLECTION).distinct<string>("email"),
      db.collection(EVENTS_COLLECTION).distinct<string>("memberId", {
        type: "app_opened",
        occurredAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60_000) },
      }),
      db.collection(EVENTS_COLLECTION).distinct<string>("memberId", { type: "app_opened" }),
    ]);

  const blocked = new Set(suppressed.map(normalizeAudienceEmail).filter(Boolean));
  const clean = (values: unknown[]) => [
    ...new Set(values.map(normalizeAudienceEmail).filter((email) => email && !blocked.has(email))),
  ];

  const imported = clean(contacts.map((row) => row.email));
  const memberEmails = clean(verifiedMembers.map((row) => row.email));
  const pendingEmails = clean(pending.map((row) => row.email));
  const registered = new Set(memberEmails);
  const waiting = new Set(pendingEmails);
  const activeKeys = new Set(recentlyActive);
  const everActiveKeys = new Set(everActive);

  const inactive = clean(
    verifiedMembers
      .filter((row) => !row.normalizedName || !activeKeys.has(row.normalizedName))
      .map((row) => row.email),
  );
  const neverOpened = clean(
    verifiedMembers
      .filter((row) => !row.normalizedName || !everActiveKeys.has(row.normalizedName))
      .map((row) => row.email),
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
  for (const member of verifiedMembers) {
    const email = normalizeAudienceEmail(member.email);
    if (email && !blocked.has(email)) planBuckets[planAudience(member.membership?.plan)].push(email);
  }

  const uniqueEmails = uniqueMemberEmails(allEmailedMembers, blocked);

  const claimProfile: string[] = [];
  const winback90: string[] = [];
  const winback180: string[] = [];
  const winback365: string[] = [];
  const possibleForeign: string[] = [];

  for (const member of allEmailedMembers) {
    const email = normalizeAudienceEmail(member.email);
    if (!email || !uniqueEmails.has(email) || blocked.has(email)) continue;

    // Nunca activaron correo → deben reclamar ficha y corregir nombre/cédula.
    if (member.emailVerified !== true) {
      claimProfile.push(email);
    }

    if (isPossibleForeignMember(member)) {
      possibleForeign.push(email);
    }

    const status = member.membership?.status || "";
    const daysExpired = daysSinceIso(member.membership?.nextBillingDate, todayIso);
    if (status === "expired" && daysExpired != null) {
      if (daysExpired >= 365) winback365.push(email);
      else if (daysExpired >= 180) winback180.push(email);
      else if (daysExpired >= 90) winback90.push(email);
    }
  }

  return {
    imported,
    unregistered,
    never_registered: neverRegistered,
    pending: pendingEmails,
    never_opened: neverOpened,
    inactive,
    members: memberEmails,
    claim_profile: clean(claimProfile),
    winback_90: clean(winback90),
    winback_180: clean(winback180),
    winback_365: clean(winback365),
    possible_foreign: clean(possibleForeign),
    ...(Object.fromEntries(
      Object.entries(planBuckets).map(([key, emails]) => [key, clean(emails)]),
    ) as Record<PlanAudience, string[]>),
    all: clean([...imported, ...pendingEmails, ...memberEmails, ...claimProfile]),
    suppressed: blocked.size,
  };
}
