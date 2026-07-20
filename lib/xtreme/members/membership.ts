import { DAY_PASS_HOLD_DAYS } from "@/lib/xtreme/shared/config";
import type { Membership, TrainingPlan } from "./types";

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function addMonths(date: string, months: number) {
  const source = toUtcDate(date);
  const sourceDay = source.getUTCDate();
  source.setUTCDate(1);
  source.setUTCMonth(source.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 0),
  ).getUTCDate();
  source.setUTCDate(Math.min(sourceDay, lastDay));
  return source.toISOString().slice(0, 10);
}

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function isoOrEmpty(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return ISO_DATE.test(raw) ? raw : "";
}

function isInactivePlanLabel(plan: string) {
  const value = plan.trim();
  return !value || value === "-" || /^sin\s*plan/i.test(value);
}

/** Staff / unpaid account: no class booking access. */
export function createInactiveMembership(today: string): Membership {
  const yesterday = new Date(`${today}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return {
    plan: "Sin plan activo",
    status: "expired",
    startedAt: today,
    nextBillingDate: yesterday.toISOString().slice(0, 10),
  };
}

/** @deprecated Prefer createFreeFirstDayMembership for primer-día flows only. */
export function createDefaultMembership(today: string): Membership {
  return createInactiveMembership(today);
}

/** Self-serve first visit: held until first gym check-in, then one calendar day. */
export function createFreeFirstDayMembership(today: string): Membership {
  const holdEnd = new Date(`${today}T00:00:00.000Z`);
  holdEnd.setUTCDate(holdEnd.getUTCDate() + DAY_PASS_HOLD_DAYS);
  return {
    plan: "Primer día gratis",
    status: "active",
    startedAt: today,
    // Pending use window; snapped to the visit day on first reception/kiosk check-in.
    nextBillingDate: holdEnd.toISOString().slice(0, 10),
  };
}

export function membershipWithStatus(
  membership: Membership | undefined,
  today: string,
) {
  if (!membership) {
    return { ...createInactiveMembership(today), daysRemaining: -1 };
  }

  const plan = String(membership.plan ?? "").trim() || "Sin plan activo";
  const nextBillingDate = isoOrEmpty(membership.nextBillingDate);
  const startedAt = isoOrEmpty(membership.startedAt) || String(membership.startedAt ?? today);

  if (isInactivePlanLabel(plan) || !nextBillingDate) {
    return {
      plan: isInactivePlanLabel(plan) ? (plan === "-" ? "Sin plan activo" : plan) : plan,
      status: "expired" as const,
      startedAt,
      nextBillingDate: nextBillingDate || createInactiveMembership(today).nextBillingDate,
      daysRemaining: -1,
    };
  }

  const currentDate = toUtcDate(today);
  const nextBilling = toUtcDate(nextBillingDate);
  const daysRemaining = Math.ceil(
    (nextBilling.getTime() - currentDate.getTime()) / DAY_MS,
  );
  const status: Membership["status"] =
    daysRemaining < 0 ? "expired" : daysRemaining <= 5 ? "warning" : "active";

  return {
    plan,
    status,
    startedAt,
    nextBillingDate,
    daysRemaining,
  };
}

export function toPublicTrainingPlan(plan?: TrainingPlan) {
  if (!plan) return null;
  const items = plan.items ?? [];
  const doneItems = items.filter((item) => item.done).length;
  const totalItems = items.length;
  return {
    title: plan.title ?? "",
    objective: plan.objective ?? "",
    coachNote: plan.coachNote ?? "",
    startDate: plan.startDate ?? "",
    endDate: plan.endDate ?? "",
    weeklySessions: plan.weeklySessions ?? 0,
    items,
    doneItems,
    totalItems,
    progressPct: totalItems ? Math.round((doneItems / totalItems) * 100) : 0,
  };
}
