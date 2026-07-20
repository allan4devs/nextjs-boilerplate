import type { Membership } from "../domain/member";

export function isOneDayPlanLabel(plan: string | undefined | null) {
  const value = String(plan ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!value) return false;
  return (
    value.includes("primer dia") ||
    value.includes("pase del dia") ||
    value === "pase dia" ||
    value === "day-pass" ||
    value === "day pass"
  );
}

export function membershipPlanDays(plan: string) {
  if (isOneDayPlanLabel(plan)) return 1;
  const normalized = plan.toLowerCase();
  if (normalized.includes("seman")) return 7;
  if (normalized.includes("quinc")) return 15;
  return 30;
}

export function membershipRemainingPct(daysRemaining: number, totalDays: number) {
  if (daysRemaining <= 0 || totalDays <= 0) return 0;
  return Math.min(100, Math.round((daysRemaining / totalDays) * 100));
}

function isInactivePlanLabel(plan: string) {
  const value = plan.trim();
  return !value || value === "-" || /^sin\s*plan/i.test(value);
}

/**
 * ¿Puede reservar clases según la ficha de membresía del Member OS?
 * Plan activo / warning con días >= 0 (semanal, quincenal, mensual).
 * El pase de 1 día / primer día gratis no permite suscribirse a clases grupales.
 * Vencido o "Sin plan activo" → no.
 */
export function membershipAllowsClassBooking(membership: Membership | null | undefined) {
  if (!membership) return false;
  const plan = String(membership.plan || "").trim();
  if (isInactivePlanLabel(plan)) return false;
  if (membership.daysRemaining < 0 || membership.status === "expired") return false;
  if (isOneDayPlanLabel(plan)) return false;
  return true;
}
