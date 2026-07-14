export function membershipPlanDays(plan: string) {
  const normalized = plan.toLowerCase();
  if (normalized.includes("primer día") || normalized.includes("dia gratis")) return 1;
  if (normalized.includes("seman")) return 7;
  if (normalized.includes("quinc")) return 15;
  return 30;
}

export function membershipRemainingPct(daysRemaining: number, totalDays: number) {
  if (daysRemaining <= 0 || totalDays <= 0) return 0;
  return Math.min(100, Math.round((daysRemaining / totalDays) * 100));
}
