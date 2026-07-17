import { MACHINE_GUIDE } from "@/app/components/member/catalog/machines";
import { DEFAULT_COACH_NAME, PLAN_TEMPLATES } from "./constants";
import type {
  MemberSignal,
  PlanExercisePrescription,
  PlanItem,
  PlanTemplateId,
  TrainerFilter,
  TrainerMember,
  TrainerPlan,
  TrainerStats,
} from "./types";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyPlan(): TrainerPlan {
  return { title: "Plan personalizado", objective: "", coachNote: "", startDate: todayIso(), endDate: "", weeklySessions: 3, items: [] };
}

export function clonePlan(plan: TrainerPlan): TrainerPlan {
  return structuredClone(plan);
}

export function createPlanItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    day: "Sesión nueva", focus: "", exercises: "", targetMinutes: 45,
    done: false, doneDate: null, doneWorkoutId: null, prescribedExercises: [], ...overrides, id: uid("plan"),
  };
}

export function createPrescription(machineId: string, overrides: Partial<PlanExercisePrescription> = {}): PlanExercisePrescription {
  const machine = MACHINE_GUIDE.find((entry) => entry.id === machineId) ?? MACHINE_GUIDE[0];
  return {
    machineId: machine?.id ?? "", machineName: machine?.name ?? "Ejercicio libre",
    exerciseName: machine?.name ?? "Ejercicio", sets: 3, reps: 10, weightKg: 0, targetSeconds: 0, notes: "", ...overrides, id: uid("exercise"),
  };
}

export function planFromTemplate(templateId: PlanTemplateId): TrainerPlan {
  const template = PLAN_TEMPLATES.find((entry) => entry.id === templateId) ?? PLAN_TEMPLATES[0];
  return {
    title: template.name,
    objective: template.objective,
    coachNote: "Revisar cargas y técnica al finalizar la primera semana.",
    startDate: todayIso(),
    endDate: "",
    weeklySessions: template.weeklySessions,
    items: template.sessions.map((session) => createPlanItem({
      day: session.day,
      focus: session.focus,
      targetMinutes: session.targetMinutes,
      exercises: session.exercises,
      prescribedExercises: session.machines.map((machine) => createPrescription(machine.machineId, machine)),
    })),
  };
}

export function normalizeDraft(plan: TrainerPlan): TrainerPlan {
  return { ...plan, weeklySessions: Math.min(7, Math.max(1, plan.weeklySessions)), items: plan.items.map((item) => ({ ...item, prescribedExercises: item.prescribedExercises ?? [] })) };
}

export function validatePlan(plan: TrainerPlan) {
  if (!plan.title.trim()) return "Ponéle un nombre al plan.";
  if (!plan.objective.trim()) return "Definí el objetivo para que el socio entienda el enfoque.";
  if (!plan.items.length) return "Agregá al menos una sesión.";
  if (plan.items.some((item) => !item.day.trim() || !item.focus.trim())) return "Cada sesión necesita nombre y enfoque.";
  if (plan.endDate && plan.endDate < plan.startDate) return "La fecha final no puede ser anterior al inicio.";
  return null;
}

export function daysSince(date?: string | null) {
  if (!date) return null;
  const value = new Date(`${date}T12:00:00Z`).getTime();
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.floor((Date.now() - value) / 86_400_000));
}

export function memberSignal(member: TrainerMember): MemberSignal {
  if (member.activePlanWorkout) return { tone: "cyan", label: "Entrenando ahora", detail: "Tiene una sesión activa", priority: 100 };
  if (!member.trainingPlan) return { tone: "red", label: "Sin plan", detail: "Necesita prescripción", priority: 90 };
  const total = member.trainingPlan.totalItems ?? member.trainingPlan.items.length;
  const done = member.trainingPlan.doneItems ?? member.trainingPlan.items.filter((item) => item.done).length;
  if (total > 0 && done >= total) return { tone: "lime", label: "Plan completado", detail: "Listo para progresión", priority: 80 };
  const inactivity = daysSince(member.recentWorkouts[0]?.completedDate);
  if (inactivity !== null && inactivity >= 10) return { tone: "orange", label: "Sin actividad", detail: `${inactivity} días sin entrenar`, priority: 70 };
  if (member.membershipStatus === "expired") return { tone: "muted", label: "Membresía vencida", detail: "Seguimiento pausado", priority: 30 };
  return { tone: "lime", label: "En curso", detail: `${done}/${Math.max(1, total)} sesiones`, priority: 10 };
}

export function trainerStats(members: TrainerMember[]): TrainerStats {
  const plans = members.filter((member) => member.trainingPlan);
  const progress = plans.reduce((sum, member) => sum + (member.trainingPlan?.progressPct ?? 0), 0);
  return {
    total: members.length,
    withPlan: plans.length,
    withoutPlan: members.length - plans.length,
    activeNow: members.filter((member) => member.activePlanWorkout).length,
    needsAttention: members.filter((member) => memberSignal(member).priority >= 70).length,
    averageProgress: plans.length ? Math.round(progress / plans.length) : 0,
  };
}

export function filterTrainerMembers(members: TrainerMember[], query: string, filter: TrainerFilter) {
  const needle = query.trim().toLocaleUpperCase("es");
  return members
    .filter((member) => {
      const signal = memberSignal(member);
      if (filter === "attention" && signal.priority < 70) return false;
      if (filter === "active" && !member.activePlanWorkout) return false;
      if (filter === "without-plan" && member.trainingPlan) return false;
      if (filter === "completed" && signal.label !== "Plan completado") return false;
      return !needle || `${member.memberName} ${member.goal} ${member.coach}`.toLocaleUpperCase("es").includes(needle);
    })
    .sort((a, b) => memberSignal(b).priority - memberSignal(a).priority || a.memberName.localeCompare(b.memberName));
}

export function coachFor(member: TrainerMember | null) {
  return member?.coach?.trim() || DEFAULT_COACH_NAME;
}
