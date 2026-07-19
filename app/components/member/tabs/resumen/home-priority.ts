/**
 * Priorizacion contextual del inicio de Member OS.
 *
 * Es deliberadamente determinista y explicable: no usa datos sensibles ni una
 * caja negra. La version se envia con analytics para comparar resultados antes
 * de cambiar pesos.
 */

export const MEMBER_HOME_ALGORITHM_VERSION = "context-v1";

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
        return { id, score: 1000, reason: "TenÃ©s una visita activa; al salir, cerrÃ¡ tu ingreso." };
      case "membership": {
        const days = input.membershipDaysRemaining ?? 999;
        if (!input.membershipActive || days <= 0) {
          return { id, score: 980, reason: "Tu membresÃ­a necesita renovaciÃ³n para mantener la continuidad." };
        }
        if (days <= 3) return { id, score: 910, reason: `Te quedan ${days} dÃ­as de membresÃ­a.` };
        return { id, score: 790, reason: `Tu membresÃ­a vence en ${days} dÃ­as.` };
      }
      case "training":
        if (input.hasActiveWorkout) {
          return { id, score: 900, reason: "Ya empezaste un entreno; continualo donde lo dejaste." };
        }
        if (!input.trainedToday && input.streak >= 3) {
          return { id, score: 820, reason: `EntrenÃ¡ hoy para cuidar tu racha de ${input.streak} dÃ­as.` };
        }
        if (!input.trainedToday && gap === 1) {
          return { id, score: 780, reason: "Te falta un entreno para completar la meta semanal." };
        }
        return {
          id,
          score: input.pendingPlanItems > 0 ? 720 : 610,
          reason: input.pendingPlanItems > 0
            ? `TenÃ©s ${input.pendingPlanItems} entreno${input.pendingPlanItems === 1 ? "" : "s"} pendiente${input.pendingPlanItems === 1 ? "" : "s"} en tu plan.`
            : "RegistrÃ¡ tu movimiento de hoy y seguÃ­ sumando.",
        };
      case "classes":
        if (input.hasReservedClassToday) {
          return { id, score: 850, reason: "TenÃ©s una clase reservada para hoy." };
        }
        return input.hasAvailableClassToday
          ? { id, score: 640, reason: "TodavÃ­a hay clases y cupos disponibles hoy." }
          : { id, score: 500, reason: "RevisÃ¡ el estado de tus clases de hoy." };
      case "week":
        return {
          id,
          score: gap === 1 ? 740 : 570,
          reason: gap === 1 ? "EstÃ¡s a un entreno de completar tu semana." : `Te faltan ${gap} entrenos para tu meta semanal.`,
        };
      case "occupancy":
        return {
          id,
          score: input.activeVisit ? 260 : 520,
          reason: input.activeVisit ? "RevisÃ¡ cÃ³mo estÃ¡ el gym mientras entrenÃ¡s." : "MirÃ¡ la ocupaciÃ³n antes de salir hacia el gym.",
        };
      case "progress":
        return { id, score: 390, reason: "RevisÃ¡ tus entrenos, medidas y tendencia reciente." };
      case "momentum":
        return { id, score: 350, reason: "ConsultÃ¡ tu racha, nivel y XP acumulado." };
      case "gym":
        return { id, score: 180, reason: "DescubrÃ­ zonas, beneficios y servicios incluidos." };
    }
  };

  return panelIds
    .map(priorityFor)
    .sort((a, b) => b.score - a.score || panelIds.indexOf(a.id) - panelIds.indexOf(b.id));
}
