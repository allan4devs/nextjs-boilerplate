/**
 * Xtreme Gym - Phase 3 growth metrics from the event ledger.
 * Crude but honest aggregates for the admin Growth strip.
 */
import type { Db } from "mongodb";
import {
  isInternalAnalyticsSubject,
  loadInternalAnonymousIds,
} from "./analytics-exclusions";
import { EVENTS_COLLECTION, type ProductEvent } from "./events";
import { CHECKINS_COLLECTION, PAYMENTS_COLLECTION, todayIso, type CheckinDoc, type PaymentDoc } from "./shared";
import { addDaysIso } from "./entitlements";

function daysAgo(days: number, from = todayIso()) {
  return addDaysIso(from, -days);
}

export type GrowthSnapshot = {
  windowDays: number;
  fromDate: string;
  toDate: string;
  dayPasses: number;
  plansSold: number;
  checkoutsStarted: number;
  paymentsCompleted: number;
  firstCheckins: number;
  membershipsStarted: number;
  renewalsCompleted: number;
  referralsRedeemed: number;
  referralsRewarded: number;
  appOpens: number;
  appOpenMembers: number;
  accountFunnel: {
    lookups: number;
    loginSuccess: number;
    loginFailed: number;
    loginBlocked: number;
    registrationsStarted: number;
    registrationsCompleted: number;
    registrationFailed: number;
    freeFirstDays: number;
    pinsCreated: number;
  };
  reservations: { attempted: number; completed: number; failed: number; cancelled: number };
  monthly: { checkoutsStarted: number; paymentsCompleted: number };
  recentAccessAttempts: Array<{
    stage: string;
    outcome: string;
    memberId?: string;
    identityHint?: string;
    requestFingerprint?: string;
    occurredAt: string;
  }>;
  appOpenSeries: Array<{ date: string; opens: number; unique: number }>;
  dayPassToVisit: {
    dayPasses: number;
    visited: number;
    ratePct: number;
  };
  dayPassToPlan: {
    dayPasses: number;
    converted1d: number;
    converted3d: number;
    converted7d: number;
    rate7dPct: number;
  };
  d7Retention: {
    newMembers: number;
    returned: number;
    ratePct: number;
  };
  recentEvents: Array<{
    type: string;
    memberId?: string;
    occurredAt: string;
    properties: Record<string, string | number | boolean | null>;
  }>;
};

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

export async function computeGrowthSnapshot(db: Db, windowDays = 30): Promise<GrowthSnapshot> {
  const toDate = todayIso();
  const fromDate = daysAgo(windowDays - 1, toDate);
  const from = new Date(`${fromDate}T00:00:00.000Z`);

  const knownAnons = await loadInternalAnonymousIds(db);
  const rawEvents = await db
    .collection<ProductEvent>(EVENTS_COLLECTION)
    .find({ occurredAt: { $gte: from } })
    .sort({ occurredAt: -1 })
    .limit(5000)
    .toArray();

  // Fuera: Allan Rojas (y anons de sus browsers) — no inflar funnel/app opens.
  const events = rawEvents.filter(
    (e) =>
      !isInternalAnalyticsSubject(
        { memberId: e.memberId, anonymousId: e.anonymousId },
        knownAnons,
      ),
  );

  const countType = (type: string) => events.filter((e) => e.type === type).length;
  const countOutcome = (type: string, outcome: string) =>
    events.filter((e) => e.type === type && e.properties?.outcome === outcome).length;

  // Entradas al app de socios (evento app_opened del Member OS)
  const appOpenEvents = events.filter((e) => e.type === "app_opened");
  const eventDay = (e: ProductEvent) =>
    (e.occurredAt instanceof Date ? e.occurredAt.toISOString() : String(e.occurredAt)).slice(0, 10);
  const appOpenSeries: Array<{ date: string; opens: number; unique: number }> = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = daysAgo(i, toDate);
    const dayEvents = appOpenEvents.filter((e) => eventDay(e) === day);
    appOpenSeries.push({
      date: day,
      opens: dayEvents.length,
      unique: new Set(dayEvents.map((e) => e.memberId).filter(Boolean)).size,
    });
  }

  const payments = await db
    .collection<PaymentDoc>(PAYMENTS_COLLECTION)
    .find({ status: "completed", date: { $gte: fromDate } })
    .toArray();

  const dayPassPayments = payments.filter((p) => p.optionId === "day-pass");
  const planPayments = payments.filter((p) =>
    ["week", "fortnight", "month"].includes(p.optionId),
  );
  const accessEventTypes = new Set([
    "login_lookup_attempted",
    "login_attempted",
    "registration_attempted",
    "registration_confirmation_attempted",
    "registration_started",
    "registration_completed",
  ]);

  // Day-pass → first visit within 2 days (using checkins collection)
  let dayPassVisited = 0;
  for (const p of dayPassPayments) {
    const visit = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne({
      normalizedName: p.normalizedName,
      date: { $gte: p.date, $lte: addDaysIso(p.date, 2) },
    });
    if (visit) dayPassVisited += 1;
  }

  // Day-pass → plan within 1/3/7 days
  let converted1d = 0;
  let converted3d = 0;
  let converted7d = 0;
  for (const p of dayPassPayments) {
    const plan = planPayments.find(
      (pl) =>
        pl.normalizedName === p.normalizedName &&
        pl.date >= p.date &&
        pl.date <= addDaysIso(p.date, 7),
    );
    if (!plan) continue;
    const gap =
      (Date.parse(`${plan.date}T00:00:00.000Z`) - Date.parse(`${p.date}T00:00:00.000Z`)) /
      86_400_000;
    if (gap <= 1) converted1d += 1;
    if (gap <= 3) converted3d += 1;
    if (gap <= 7) converted7d += 1;
  }

  // Crude D7: members with membership_started or first payment in window, check-in again within 7d of first check-in
  const starters = events.filter(
    (e) => e.type === "membership_started" || e.type === "first_checkin",
  );
  const starterKeys = [
    ...new Set(starters.map((e) => e.memberId).filter(Boolean) as string[]),
  ];
  let d7Returned = 0;
  for (const key of starterKeys.slice(0, 200)) {
    const first = await db
      .collection<CheckinDoc>(CHECKINS_COLLECTION)
      .find({ normalizedName: key })
      .sort({ checkedInAt: 1 })
      .limit(1)
      .toArray();
    if (!first[0]) continue;
    const firstDate = first[0].date;
    const second = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne({
      normalizedName: key,
      date: { $gt: firstDate, $lte: addDaysIso(firstDate, 7) },
    });
    if (second) d7Returned += 1;
  }

  return {
    windowDays,
    fromDate,
    toDate,
    dayPasses: dayPassPayments.length,
    plansSold: planPayments.length,
    checkoutsStarted: countType("checkout_started"),
    paymentsCompleted: countType("payment_completed"),
    firstCheckins: countType("first_checkin"),
    membershipsStarted: countType("membership_started"),
    renewalsCompleted: countType("renewal_completed"),
    referralsRedeemed: countType("referral_redeemed"),
    referralsRewarded: countType("referral_rewarded"),
    appOpens: appOpenEvents.length,
    appOpenMembers: new Set(appOpenEvents.map((e) => e.memberId).filter(Boolean)).size,
    accountFunnel: {
      lookups: countType("login_lookup_attempted"),
      loginSuccess: countOutcome("login_attempted", "success"),
      loginFailed: countOutcome("login_attempted", "failed"),
      loginBlocked: countOutcome("login_attempted", "blocked"),
      registrationsStarted: countType("registration_started"),
      registrationsCompleted: countType("registration_completed"),
      registrationFailed: countOutcome("registration_confirmation_attempted", "failed"),
      freeFirstDays: countType("free_first_day_granted"),
      pinsCreated: countType("pin_created"),
    },
    reservations: {
      attempted: countType("reservation_attempted") + countType("reservation_created"),
      completed: events.filter(
        (e) => e.type === "reservation_created" && e.properties?.outcome === "success",
      ).length,
      failed: countOutcome("reservation_attempted", "failed"),
      cancelled: countType("reservation_cancelled"),
    },
    monthly: {
      checkoutsStarted: events.filter(
        (e) => e.type === "checkout_started" && e.properties?.optionId === "month",
      ).length,
      paymentsCompleted: payments.filter((p) => p.optionId === "month").length,
    },
    recentAccessAttempts: events
      .filter((e) => accessEventTypes.has(e.type))
      .slice(0, 30)
      .map((e) => ({
        stage: e.type,
        outcome: String(e.properties?.outcome ?? (e.type.endsWith("_completed") ? "success" : "started")),
        memberId: e.memberId,
        identityHint:
          typeof e.properties?.identityHint === "string" ? e.properties.identityHint : undefined,
        requestFingerprint:
          typeof e.properties?.requestFingerprint === "string"
            ? e.properties.requestFingerprint
            : undefined,
        occurredAt:
          e.occurredAt instanceof Date ? e.occurredAt.toISOString() : String(e.occurredAt),
      })),
    appOpenSeries,
    dayPassToVisit: {
      dayPasses: dayPassPayments.length,
      visited: dayPassVisited,
      ratePct: pct(dayPassVisited, dayPassPayments.length),
    },
    dayPassToPlan: {
      dayPasses: dayPassPayments.length,
      converted1d,
      converted3d,
      converted7d,
      rate7dPct: pct(converted7d, dayPassPayments.length),
    },
    d7Retention: {
      newMembers: starterKeys.length,
      returned: d7Returned,
      ratePct: pct(d7Returned, starterKeys.length),
    },
    recentEvents: events.slice(0, 20).map((e) => ({
      type: e.type,
      memberId: e.memberId,
      occurredAt: e.occurredAt instanceof Date ? e.occurredAt.toISOString() : String(e.occurredAt),
      properties: e.properties ?? {},
    })),
  };
}
