import type { Membership, TrainingPlan } from "./types";

const DAY_MS = 86_400_000;

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

/** @deprecated Prefer createFreeFirstDayMembership for self-serve alta. */
export function createDefaultMembership(today: string): Membership {
  return createFreeFirstDayMembership(today);
}

/** Self-serve first visit: one calendar day of access (not a paid monthly plan). */
export function createFreeFirstDayMembership(today: string): Membership {
  return {
    plan: "Primer día gratis",
    status: "active",
    startedAt: today,
    nextBillingDate: today,
  };
}

export function membershipWithStatus(
  membership: Membership | undefined,
  today: string,
) {
  const current = membership ?? createDefaultMembership(today);
  const currentDate = toUtcDate(today);
  const nextBilling = toUtcDate(current.nextBillingDate);
  const daysRemaining = Math.ceil(
    (nextBilling.getTime() - currentDate.getTime()) / DAY_MS,
  );
  const status: Membership["status"] =
    daysRemaining < 0 ? "expired" : daysRemaining <= 5 ? "warning" : "active";

  return { ...current, status, daysRemaining };
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
