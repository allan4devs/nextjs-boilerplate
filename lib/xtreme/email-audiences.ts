/**
 * Audiencias del centro de correos (super admin).
 * Regla de negocio: el correo es la llave de contacto; la cédula del import
 * no es fuente de verdad (muchas vienen mal del reimport).
 *
 * Categorías de activación / confirmación:
 * - claim_profile / claim_recovered / claim_native: sin verificar y SIN plan
 *   activo (campañas de activación / primer día).
 * - claim_active_plan: sin verificar CON plan vigente del Excel (solo
 *   confirmar datos/PIN; no mezclar con activación de sin plan).
 * - invite_recoverable: TODOS los correos recuperables (contactos + fichas +
 *   cuarentena) sin exigir match de nombre. Invitación a registrarse.
 * - excel_recovered: todos con emailRecovery (historial de alineación)
 */
import type { Db } from "mongodb";
import { EVENTS_COLLECTION } from "@/lib/xtreme/events";
import {
  EMAIL_CAMPAIGN_DELIVERIES_COLLECTION,
  EMAIL_CONTACTS_COLLECTION,
  EMAIL_SUPPRESSIONS_COLLECTION,
  MEMBERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
} from "@/lib/xtreme/shared";
import { type EmailAudience } from "@/lib/xtreme/email-campaigns";
import { isSafeCampaignMemberEmail, memberEmailNameScore } from "@/lib/xtreme/email-identity";
import { membershipStatus } from "@/lib/xtreme/shared";

export const EMAIL_AUDIENCE_IDS = [
  "claim_recovered",
  "claim_native",
  "claim_profile",
  "claim_active_plan",
  "invite_recoverable",
  "unverified_not_sent",
  "excel_recovered",
  "imported",
  "unregistered",
  "never_registered",
  "pending",
  "never_opened",
  "inactive",
  "members",
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
  // Re-engagement / lifecycle
  "sent_not_registered",
  "opened_not_registered",
  "registered_never_app",
  "registered_inactive",
  "active_app",
  "plan_expiring",
  "plan_expired_recent",
  "free_day_convert",
] as const satisfies readonly EmailAudience[];

type ContactDoc = { email: string; status?: string; category?: string; safetyReason?: string };

export type EmailAudienceDiagnostics = {
  totalMembers: number;
  membersWithUsableEmail: number;
  membersWithoutUsableEmail: number;
  importedContactEmails: number;
  recoveredMembers: number;
  verifiedMembers: number;
  unverifiedMembers: number;
  quarantinedMembers: number;
  quarantinePlaceholder: number;
  quarantineShared: number;
  quarantineMismatch: number;
  unsafeIdentityMatches: number;
  /** Fichas sin correo usable que aún tienen previousEmail en cuarentena. */
  quarantineWithPreviousEmail: number;
  /** Recovery por categoría de script. */
  recoveredFromQuarantine: number;
  recoveredFromExcel: number;
  /** Correos recuperables sin verificar. */
  inviteRecoverableTotal: number;
  /** Invitables que aún no se registraron, aunque ya recibieran el magic link. */
  inviteRecoverableEmails: number;
  /** Sin verificar, incluidos envíos y clics anteriores. */
  unverifiedNotSentEmails: number;
  /** Correos que ya recibieron al menos un envío exitoso de campaña (magic link). */
  alreadyCampaignSentEmails: number;
  /** Destinatarios que aún faltan en audiencias de activación/invitación (suma lógica de trabajo). */
  remainingActivationEmails: number;
  /** Ya se les mandó y aún no se registraron (candidatos a re-engagement). */
  sentNotRegisteredEmails: number;
  /** Abrieron el enlace y no se registraron. */
  openedNotRegisteredEmails: number;
  /** Verificados activos en app (14 d). */
  activeAppEmails: number;
  /** Plan por vencer en 1–7 d. */
  planExpiringEmails: number;
};

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

/** Placeholders obvios del Excel histórico (no se invitan). */
export function isPlaceholderCampaignEmail(emailValue: unknown) {
  const email = normalizeAudienceEmail(emailValue);
  if (!email) return true;
  const [local = "", domain = ""] = email.split("@");
  return (
    /^(sin|no|nulo|nada|ningun|ninguno|prueba|test|noindica|noaplica)([._-]?(correo|email|mail|tiene|aplica))?\d*$/i.test(
      local,
    ) ||
    /sin(correo|email|mail)/i.test(local) ||
    /^(cliente|clientes|cleinte|cleintes|clinete|clinetes)[._-]?sin/i.test(local) ||
    /clientes?in/i.test(local) ||
    /^(correo|email|mail|sincorreo|nada)\.(com|net)$/i.test(domain) ||
    /^(a|x)@(a|x)\./i.test(email) ||
    local.length < 2
  );
}

function planAudience(planValue: unknown, rateValue?: unknown): PlanAudience {
  const normalize = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLocaleLowerCase("es-CR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const rate = normalize(rateValue);
  const planOnly = normalize(planValue);
  const plan = `${rate} ${planOnly}`.trim();
  if (!plan || plan === "-" || plan.includes("sin plan")) return "no_plan";
  if (rate.includes("matricula") || planOnly.includes("matricula")) return "plan_other";
  if (rate.includes("diario") || planOnly.includes("pase del dia")) return "plan_free_day";
  if (plan.includes("primer dia") || plan.includes("free day")) return "plan_free_day";
  if (plan.includes("adulto") || plan.includes("senior")) return "plan_senior";
  if (plan.includes("trimestr") || plan.includes("quarter")) return "plan_quarter";
  if (plan.includes("quincen") || plan.includes("fortnight")) return "plan_fortnight";
  if (plan.includes("seman") || plan.includes("week")) return "plan_week";
  if (plan.includes("mensual") || plan.includes("monthly") || plan.includes("month")) return "plan_month";
  // Regular / Regular1 del Excel histórico (antes de normalizar a Xtreme *).
  if (planOnly.includes("regular")) return "plan_month";
  return "plan_other";
}

/** Plan de membresía vigente hoy (no primer día gratis / sin plan). */
function hasActivePaidPlan(member: MemberDoc, todayIso: string) {
  const plan = String(member.membership?.plan || "").trim();
  if (!plan || plan === "-" || /sin plan/i.test(plan)) return false;
  if (/primer\s*d[ií]a/i.test(plan) || /free\s*day/i.test(plan)) return false;
  const endsOn = String(member.membership?.nextBillingDate || "").slice(0, 10);
  if (!endsOn) return false;
  return endsOn >= todayIso;
}

function legacyRate(member: MemberDoc) {
  if (member.legacyImport?.canonicalRate) return member.legacyImport.canonicalRate;
  return member.legacyImport?.rows?.find((row) => String(row.rate || "").trim())?.rate || "";
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
  if (d.length >= 10) return true;
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

function recoveryCategory(member: MemberDoc) {
  const method = String(member.emailRecovery?.method || "");
  const category = String(member.emailRecovery?.category || "");
  if (category === "quarantine_realign" || method.includes("quarantine")) return "quarantine";
  if (member.emailRecovery) return "excel";
  return "";
}

export type AudienceEmailMap = Record<EmailAudience, string[]> & {
  suppressed: number;
  diagnostics: EmailAudienceDiagnostics;
};

export async function buildAudienceEmails(db: Db): Promise<AudienceEmailMap> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [contacts, allContacts, allMembers, pending, suppressed, recentlyActive, everActive] =
    await Promise.all([
      db
        .collection<ContactDoc>(EMAIL_CONTACTS_COLLECTION)
        .find({ status: "active" })
        .project({ email: 1, category: 1, safetyReason: 1 })
        .toArray(),
      // Incluye active + quarantined del script de recovery (no unsubscribed).
      db
        .collection<ContactDoc>(EMAIL_CONTACTS_COLLECTION)
        .find({ status: { $ne: "unsubscribed" } })
        .project({ email: 1, status: 1 })
        .toArray(),
      db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .find({})
        .project({
          email: 1,
          emailVerified: 1,
          normalizedName: 1,
          membership: 1,
          memberName: 1,
          cedula: 1,
          emailQuarantine: 1,
          emailRecovery: 1,
          legacyImport: 1,
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

  const membersWithEmail = allMembers.filter((member) => normalizeAudienceEmail(member.email));
  const unsafeIdentityMembers = membersWithEmail.filter(
    (member) => !isSafeCampaignMemberEmail(member),
  );
  const allEmailedMembers = membersWithEmail.filter(isSafeCampaignMemberEmail);
  const verifiedMembers = allEmailedMembers.filter((member) => member.emailVerified === true);
  // Verificados de verdad (aunque el correo no pase el filtro de nombre).
  const verifiedEmailsStrict = new Set(
    allMembers
      .filter((member) => member.emailVerified === true)
      .map((member) => normalizeAudienceEmail(member.email))
      .filter(Boolean),
  );

  const blocked = new Set(suppressed.map(normalizeAudienceEmail).filter(Boolean));
  const clean = (values: unknown[]) => [
    ...new Set(values.map(normalizeAudienceEmail).filter((email) => email && !blocked.has(email))),
  ];

  const imported = clean(contacts.map((row) => row.email));
  const memberEmails = clean(verifiedMembers.map((row) => row.email));
  const pendingEmails = clean(pending.map((row) => row.email));
  const registered = new Set(memberEmails);
  const waiting = new Set(pendingEmails);

  /**
   * Lista masiva de invitación: todos los correos recuperables sin match de nombre.
   * Fuentes: contactos (active/quarantined), email en ficha, previousEmail en cuarentena.
   * Fuera: verificados, suppressions, placeholders.
   */
  const inviteRecoverableRaw: string[] = [];
  for (const row of allContacts) {
    const email = normalizeAudienceEmail(row.email);
    if (email) inviteRecoverableRaw.push(email);
  }
  for (const member of allMembers) {
    const email = normalizeAudienceEmail(member.email);
    if (email) inviteRecoverableRaw.push(email);
    const prev = normalizeAudienceEmail(member.emailQuarantine?.previousEmail);
    if (prev) inviteRecoverableRaw.push(prev);
  }
  const inviteRecoverable = clean(inviteRecoverableRaw).filter(
    (email) => !verifiedEmailsStrict.has(email) && !isPlaceholderCampaignEmail(email),
  );

  // Ya se les mandó al menos un correo de campaña con éxito (magic link / invitación).
  // Esas direcciones salen de las listas de primer contacto: solo quedan los que falta enviar.
  const alreadyCampaignSent = new Set(
    (
      await db.collection(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION).distinct("email", {
        status: "sent",
      })
    )
      .map((e) => normalizeAudienceEmail(e))
      .filter(Boolean),
  );

  // Deliveries de campaña para re-engagement (sent / opened / registered).
  const campaignDeliveryRows = await db
    .collection<{
      email?: string;
      status?: string;
      sentAt?: Date;
      openedAt?: Date;
      registeredAt?: Date;
      updatedAt?: Date;
    }>(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION)
    .find({ status: { $in: ["sent", "opened", "registered"] } })
    .project({ email: 1, status: 1, sentAt: 1, openedAt: 1, registeredAt: 1, updatedAt: 1 })
    .toArray();

  const sentNotRegisteredSet = new Set<string>();
  const openedNotRegisteredSet = new Set<string>();
  for (const row of campaignDeliveryRows) {
    const email = normalizeAudienceEmail(row.email);
    if (!email || blocked.has(email) || verifiedEmailsStrict.has(email)) continue;
    if (isPlaceholderCampaignEmail(email)) continue;
    if (row.registeredAt) continue;
    // Requiere al menos un envío exitoso (status sent/opened/registered en delivery).
    sentNotRegisteredSet.add(email);
    if (row.openedAt || row.status === "opened") {
      openedNotRegisteredSet.add(email);
    }
  }

  /** Quita a quien ya recibió invitación/magic link de campaña. */
  /** No verificados: un envío o clic anterior no los saca de la audiencia. */
  const inviteRecoverableRemaining = inviteRecoverable;
  const unverifiedNotSent = inviteRecoverable;

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
  const neverRegistered = clean([...imported, ...pendingEmails]).filter(
    (email) => !registered.has(email),
  );
  const pendingRemaining = pendingEmails.filter((email) => !registered.has(email));
  const importedRemaining = imported;
  const membersRemaining = memberEmails;

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
  for (const member of allEmailedMembers) {
    const email = normalizeAudienceEmail(member.email);
    if (email && !blocked.has(email)) {
      planBuckets[planAudience(member.membership?.plan, legacyRate(member))].push(email);
    }
  }

  const uniqueEmails = uniqueMemberEmails(allEmailedMembers, blocked);

  for (const key of Object.keys(planBuckets) as PlanAudience[]) {
    planBuckets[key] = planBuckets[key].filter((email) => uniqueEmails.has(email));
  }

  const claimProfile: string[] = [];
  const claimRecovered: string[] = [];
  const claimNative: string[] = [];
  const claimActivePlan: string[] = [];
  const excelRecovered: string[] = [];
  const winback90: string[] = [];
  const winback180: string[] = [];
  const winback365: string[] = [];
  const possibleForeign: string[] = [];

  let recoveredFromQuarantine = 0;
  let recoveredFromExcel = 0;

  for (const member of allEmailedMembers) {
    const email = normalizeAudienceEmail(member.email);
    if (!email || !uniqueEmails.has(email) || blocked.has(email)) continue;

    const hasRecovery = Boolean(member.emailRecovery);
    const recCat = recoveryCategory(member);
    // Diagnóstico de recovery: cuenta toda la base (aunque ya se les haya invitado).
    if (hasRecovery) {
      if (recCat === "quarantine") recoveredFromQuarantine += 1;
      else recoveredFromExcel += 1;
    }

    if (hasRecovery) {
      excelRecovered.push(email);
    }

    if (member.emailVerified !== true) {
      // Con plan vigente del Excel → lista aparte (confirmación de datos, no activación).
      if (hasActivePaidPlan(member, todayIso)) {
        claimActivePlan.push(email);
      } else {
        claimProfile.push(email);
        if (hasRecovery) claimRecovered.push(email);
        else claimNative.push(email);
      }
    }

    if (isPossibleForeignMember(member)) {
      possibleForeign.push(email);
    }

    const daysExpired = daysSinceIso(member.membership?.nextBillingDate, todayIso);
    // Win-back solo si realmente está vencido por fecha (no por status stale).
    if (daysExpired != null && daysExpired > 0) {
      if (daysExpired >= 365) winback365.push(email);
      else if (daysExpired >= 180) winback180.push(email);
      else if (daysExpired >= 90) winback90.push(email);
    }
  }

  const quarantineWithPreviousEmail = allMembers.filter((member) => {
    if (!member.emailQuarantine) return false;
    return Boolean(normalizeAudienceEmail(member.emailQuarantine.previousEmail));
  }).length;

  const claimRecoveredRemaining = clean(claimRecovered);
  const claimNativeRemaining = clean(claimNative);
  const claimProfileRemaining = clean(claimProfile);
  const claimActivePlanRemaining = clean(claimActivePlan);

  const remainingActivationEmails = new Set([
    ...claimProfileRemaining,
    ...claimActivePlanRemaining,
    ...inviteRecoverableRemaining,
  ]).size;

  // ── Re-engagement / lifecycle ──
  const registeredNeverApp: string[] = [];
  const registeredInactive: string[] = [];
  const activeApp: string[] = [];
  const planExpiring: string[] = [];
  const planExpiredRecent: string[] = [];
  const freeDayConvert: string[] = [];

  for (const member of allEmailedMembers) {
    const email = normalizeAudienceEmail(member.email);
    if (!email || !uniqueEmails.has(email) || blocked.has(email)) continue;

    const verified = member.emailVerified === true;
    const nameKey = String(member.normalizedName || "").trim();
    const openedRecently = Boolean(nameKey && activeKeys.has(nameKey));
    const openedEver = Boolean(nameKey && everActiveKeys.has(nameKey));
    const ms = membershipStatus(member.membership);
    const planLabel = String(member.membership?.plan || "");

    if (verified) {
      if (!openedEver) registeredNeverApp.push(email);
      else if (!openedRecently) registeredInactive.push(email);
      else activeApp.push(email);

      // Plan por vencer: 1–7 días restantes (incluye “vence hoy” = 0).
      if (
        ms.daysRemaining >= 0 &&
        ms.daysRemaining <= 7 &&
        !isPlaceholderCampaignEmail(email) &&
        planLabel &&
        !/sin plan/i.test(planLabel) &&
        !/primer\s*d[ií]a/i.test(planLabel) &&
        !/free\s*day/i.test(planLabel)
      ) {
        planExpiring.push(email);
      }

      // Vencido hace 1–29 días (win-back corto; winback_90+ es el de primer contacto).
      const daysExpired = daysSinceIso(member.membership?.nextBillingDate, todayIso);
      if (daysExpired != null && daysExpired >= 1 && daysExpired < 90) {
        planExpiredRecent.push(email);
      }
    }

    // Primer día / pase diario — invitar a pasar a un plan de pago.
    const freeDayBucket = planAudience(member.membership?.plan, legacyRate(member));
    if (freeDayBucket === "plan_free_day") {
      freeDayConvert.push(email);
    }
  }

  const sentNotRegistered = clean([...sentNotRegisteredSet]);
  const openedNotRegistered = clean([...openedNotRegisteredSet]);

  return {
    claim_recovered: claimRecoveredRemaining,
    claim_native: claimNativeRemaining,
    claim_profile: claimProfileRemaining,
    claim_active_plan: claimActivePlanRemaining,
    // Solo quienes aún no se registraron; los envíos y clics previos permanecen.
    invite_recoverable: inviteRecoverableRemaining,
    unverified_not_sent: unverifiedNotSent,
    excel_recovered: clean(excelRecovered),
    imported: importedRemaining,
    unregistered,
    never_registered: neverRegistered,
    pending: pendingRemaining,
    never_opened: neverOpened,
    inactive,
    members: membersRemaining,
    winback_90: clean(winback90),
    winback_180: clean(winback180),
    winback_365: clean(winback365),
    possible_foreign: clean(possibleForeign),
    ...(Object.fromEntries(
      Object.entries(planBuckets).map(([key, emails]) => [key, clean(emails)]),
    ) as Record<PlanAudience, string[]>),
    all: clean([
      ...imported,
      ...pendingEmails,
      ...memberEmails,
      ...claimProfile,
      ...claimActivePlan,
      ...inviteRecoverable,
      ...excelRecovered,
    ]),
    // Re-engagement, sin excluir por fecha del último envío.
    sent_not_registered: sentNotRegistered,
    opened_not_registered: openedNotRegistered,
    registered_never_app: clean(registeredNeverApp),
    registered_inactive: clean(registeredInactive),
    active_app: clean(activeApp),
    plan_expiring: clean(planExpiring),
    plan_expired_recent: clean(planExpiredRecent),
    free_day_convert: clean(freeDayConvert),
    suppressed: blocked.size,
    diagnostics: {
      totalMembers: allMembers.length,
      membersWithUsableEmail: allEmailedMembers.length,
      membersWithoutUsableEmail: allMembers.length - allEmailedMembers.length,
      importedContactEmails: imported.length,
      recoveredMembers: allMembers.filter((member) => member.emailRecovery).length,
      verifiedMembers: verifiedMembers.length,
      unverifiedMembers: allEmailedMembers.length - verifiedMembers.length,
      quarantinedMembers: allMembers.filter((member) => member.emailQuarantine).length,
      quarantinePlaceholder: allMembers.filter(
        (member) => member.emailQuarantine?.reason === "placeholder",
      ).length,
      quarantineShared: allMembers.filter(
        (member) => member.emailQuarantine?.reason === "shared_across_members",
      ).length,
      quarantineMismatch: allMembers.filter(
        (member) =>
          member.emailQuarantine?.reason === "aggressive_name_mismatch" ||
          member.emailQuarantine?.reason === "name_email_mismatch",
      ).length,
      unsafeIdentityMatches: unsafeIdentityMembers.length,
      quarantineWithPreviousEmail,
      recoveredFromQuarantine,
      recoveredFromExcel,
      inviteRecoverableTotal: inviteRecoverable.length,
      inviteRecoverableEmails: inviteRecoverableRemaining.length,
      unverifiedNotSentEmails: unverifiedNotSent.length,
      alreadyCampaignSentEmails: alreadyCampaignSent.size,
      remainingActivationEmails,
      sentNotRegisteredEmails: sentNotRegistered.length,
      openedNotRegisteredEmails: openedNotRegistered.length,
      activeAppEmails: clean(activeApp).length,
      planExpiringEmails: clean(planExpiring).length,
    },
  };
}

/** Score helper re-export for admin coverage. */
export { memberEmailNameScore };
