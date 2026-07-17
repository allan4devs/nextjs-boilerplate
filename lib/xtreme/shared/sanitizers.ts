import { isoDateOrEmpty } from "./dates";
import type {
  PlanExercisePrescription,
  PlanItem,
  TrainingPlan,
  WorkoutExerciseDetail,
} from "./types";

export function sanitizeWorkoutExercises(input: unknown): WorkoutExerciseDetail[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).map((entry, index) => {
    const raw = (entry ?? {}) as Record<string, unknown>;
    return {
      id: String(raw.id ?? "").trim().slice(0, 80) || `exercise-${index + 1}`,
      machineId: String(raw.machineId ?? "").trim().slice(0, 80),
      machineName: String(raw.machineName ?? "").trim().slice(0, 100),
      exerciseName: String(raw.exerciseName ?? raw.machineName ?? "Ejercicio").trim().slice(0, 100),
      sets: Math.max(0, Math.min(20, Math.round(Number(raw.sets) || 0))),
      reps: Math.max(0, Math.min(500, Math.round(Number(raw.reps) || 0))),
      weightKg: Math.max(0, Math.min(1000, Math.round((Number(raw.weightKg) || 0) * 10) / 10)),
      seconds: Math.max(0, Math.min(8 * 60 * 60, Math.round(Number(raw.seconds) || 0))),
      notes: String(raw.notes ?? "").trim().slice(0, 300),
    };
  });
}

function sanitizePrescriptions(input: unknown): PlanExercisePrescription[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 30).map((entry, index) => {
    const raw = (entry ?? {}) as Record<string, unknown>;
    return {
      id: String(raw.id ?? "").trim().slice(0, 80) || `prescription-${index + 1}`,
      machineId: String(raw.machineId ?? "").trim().slice(0, 80),
      machineName: String(raw.machineName ?? "").trim().slice(0, 100),
      exerciseName: String(raw.exerciseName ?? raw.machineName ?? "Ejercicio").trim().slice(0, 100),
      sets: Math.max(0, Math.min(20, Math.round(Number(raw.sets) || 0))),
      reps: Math.max(0, Math.min(500, Math.round(Number(raw.reps) || 0))),
      weightKg: Math.max(0, Math.min(1000, Math.round((Number(raw.weightKg) || 0) * 10) / 10)),
      targetSeconds: Math.max(0, Math.min(8 * 60 * 60, Math.round(Number(raw.targetSeconds) || 0))),
      notes: String(raw.notes ?? "").trim().slice(0, 300),
    };
  });
}

export function sanitizePlan(input: unknown): TrainingPlan {
  const raw = (input ?? {}) as Record<string, unknown>;
  const now = new Date();
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items: PlanItem[] = rawItems.slice(0, 30).map((entry, index) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    return {
      id: String(item.id ?? "").trim() || `plan-${now.getTime()}-${index}`,
      day: String(item.day ?? "").trim().slice(0, 40),
      focus: String(item.focus ?? "").trim().slice(0, 80),
      exercises: String(item.exercises ?? "").trim().slice(0, 500),
      targetMinutes: Math.max(0, Math.min(240, Number(item.targetMinutes) || 0)),
      done: Boolean(item.done),
      doneDate: isoDateOrEmpty(item.doneDate) || null,
      doneWorkoutId: String(item.doneWorkoutId ?? "").trim().slice(0, 120) || null,
      prescribedExercises: sanitizePrescriptions(item.prescribedExercises),
    };
  });
  return {
    title: String(raw.title ?? "").trim().slice(0, 80),
    objective: String(raw.objective ?? "").trim().slice(0, 160),
    coachNote: String(raw.coachNote ?? "").trim().slice(0, 500),
    startDate: isoDateOrEmpty(raw.startDate),
    endDate: isoDateOrEmpty(raw.endDate),
    weeklySessions: Math.max(0, Math.min(14, Number(raw.weeklySessions) || 0)),
    items,
    updatedAt: now,
  };
}
