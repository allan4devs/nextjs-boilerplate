/**
 * Priorizacion contextual del inicio de Member OS.
 *
 * Es deliberadamente determinista y explicable: no usa datos sensibles ni una
 * caja negra. La version se envia con analytics para comparar resultados antes
 * de cambiar pesos.
 */

export const MEMBER_HOME_ALGORITHM_VERSION = "context-v2";

export type MemberHomePanelId =
  | "visit"
  | "membership"
  | "training"
  | "classes"
  | "week"
  | "momentum"
  | "progress"
  | "occupancy"
  | "gym";

export type MemberHomePriorityInput = {
  activeVisit: boolean;
  membershipDaysRemaining: number | null;
  membershipActive: boolean;
  hasActiveWorkout: boolean;
  trainedToday: boolean;
  pendingPlanItems: number;
  hasReservedClassToday: boolean;
  hasAvailableClassToday: boolean;
  weekDone: number;
  weeklyGoal: number;
  streak: number;
};

export type MemberHomePriority = {
  id: MemberHomePanelId;
  score: number;
  reason: string;
};

export function rankMemberHomePanels(
  panelIds: MemberHomePanelId[],
  input: MemberHomePriorityInput,
): MemberHomePriority[] {
  const gap = Math.max(0, input.weeklyGoal - input.weekDone);

  const priorityFor = (id: MemberHomePanelId): MemberHomePriority => {
    switch (id) {
      case "visit":
        return { id, score: 1000, reason: "Tenés una visita activa; al salir, cerrá tu ingreso." };
      case "membership": {
        const days = input.membershipDaysRemaining ?? 999;
        if (!input.membershipActive || days <= 0) {
          return { id, score: 980, reason: "Tu membresía necesita renovación para mantener la continuidad." };
        }
        if (days <= 3) return { id, score: 910, reason: `Te quedan ${days} días de membresía.` };
        return { id, score: 790, reason: `Tu membresía vence en ${days} días.` };
      }
      case "training":
        if (input.hasActiveWorkout) {
          return { id, score: 900, reason: "Ya empezaste un entreno; continualo donde lo dejaste." };
        }
        if (!input.trainedToday && input.streak >= 3) {
          return { id, score: 820, reason: `Entrená hoy para cuidar tu racha de ${input.streak} días.` };
        }
        if (!input.trainedToday && gap === 1) {
          return { id, score: 780, reason: "Te falta un entreno para completar la meta semanal." };
        }
        return {
          id,
          score: input.pendingPlanItems > 0 ? 720 : 610,
          reason:
            input.pendingPlanItems > 0
              ? `Tenés ${input.pendingPlanItems} entreno${input.pendingPlanItems === 1 ? "" : "s"} pendiente${input.pendingPlanItems === 1 ? "" : "s"} en tu plan.`
              : "Registrá tu movimiento de hoy y seguí sumando.",
        };
      case "classes":
        if (input.hasReservedClassToday) {
          return { id, score: 850, reason: "Tenés una clase reservada para hoy." };
        }
        if (input.hasAvailableClassToday) {
          return { id, score: 640, reason: "Hay clases con cupo hoy. Reservá antes de que se llenen." };
        }
        return { id, score: 420, reason: "Revisá horarios y cupos de clases." };
      case "week":
        if (gap <= 0) return { id, score: 300, reason: "Meta semanal cumplida. ¡Pura vida!" };
        if (gap === 1) return { id, score: 700, reason: "Un entreno más y cerrás la meta de la semana." };
        return { id, score: 500, reason: `Vas ${input.weekDone} de ${input.weeklyGoal} esta semana.` };
      case "momentum":
        return {
          id,
          score: input.streak >= 3 ? 560 : 380,
          reason: input.streak > 0 ? `Racha de ${input.streak} días. Mantenela viva.` : "Empezá tu racha hoy.",
        };
      case "progress":
        return { id, score: 360, reason: "Mirando números se ve el avance real." };
      case "occupancy":
        return { id, score: 340, reason: "Mirá qué tan lleno está el gym ahora." };
      case "gym":
        return { id, score: 280, reason: "Zonas, VIP y todo lo que tenés en el gym." };
      default:
        return { id, score: 100, reason: "Abrí para ver más." };
    }
  };

  return panelIds
    .map((id) => priorityFor(id))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
