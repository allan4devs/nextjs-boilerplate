/**
 * Funciones puras del Admin OS: formato, borradores y paginación.
 *
 * Ninguna toca estado ni el DOM, así que viven fuera del componente: se pueden
 * reutilizar desde cualquier panel y no se vuelven a crear en cada render.
 */
import { MEMBER_PAGE_WINDOW } from "./constants";
import type { AdminMember, MemberDraft, PlanDraft, PlanItem } from "./types";

export function money(crc: number) {
  return `CRC ${crc.toLocaleString("es-CR")}`;
}

/** Fecha de hoy en formato `YYYY-MM-DD`, que es como viajan las fechas del admin. */
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function makeItem(): PlanItem {
  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    day: "",
    focus: "",
    exercises: "",
    targetMinutes: 45,
    done: false,
    doneDate: null,
  };
}

/** Borrador de plan: el vigente del socio, o uno nuevo de tres sesiones. */
export function draftFromMember(member: AdminMember): PlanDraft {
  const plan = member.trainingPlan;
  if (!plan) {
    return {
      title: `Plan de ${member.memberName.split(" ")[0]}`,
      objective: member.goal || "",
      coachNote: "",
      startDate: todayIso(),
      endDate: "",
      weeklySessions: 3,
      items: [makeItem(), makeItem(), makeItem()],
    };
  }
  return {
    title: plan.title,
    objective: plan.objective,
    coachNote: plan.coachNote,
    startDate: plan.startDate,
    endDate: plan.endDate,
    weeklySessions: plan.weeklySessions,
    items: plan.items.length ? plan.items.map((item) => ({ ...item })) : [makeItem()],
  };
}

export function memberDraftFrom(member: AdminMember): MemberDraft {
  return {
    displayName: member.memberName,
    goal: member.goal,
    favoriteTraining: member.favoriteTraining,
    phone: member.phone,
    email: member.email,
    cedula: member.cedula ?? "",
    coach: member.coach,
    notes: member.notes,
    plan: member.plan === "-" ? "Xtreme Mensual" : member.plan,
    nextBillingDate: member.nextBillingDate,
    startedAt: member.startedAt || todayIso(),
  };
}

export function formatDurationMs(ms: number) {
  if (!ms || ms < 0) return "0s";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec ? `${min}m ${sec}s` : `${min}m`;
  const hours = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/**
 * Números de página a mostrar: siempre la primera, la última y la vecindad de
 * la actual. Con pocas páginas se listan todas; con muchas, el consumidor
 * dibuja la elipsis donde la secuencia salta.
 */
export function memberPageWindow(current: number, total: number): number[] {
  if (total <= MEMBER_PAGE_WINDOW) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }
  return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
}
