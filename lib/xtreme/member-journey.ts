import type { WorkoutExerciseDetail } from "./shared/types";

export type JourneyWorkout = {
  id: string;
  visitId: string;
  trainingName: string;
  startedAt: string;
  exercises: WorkoutExerciseDetail[];
};
export type JourneyProof = { level: number; verifiedAt: string; workoutIds: string[]; visitIds: string[] };
export type JourneyState = {
  version: number;
  level: number;
  proofs: JourneyProof[];
  workout: JourneyWorkout | null;
  wellnessSkippedFor?: string;
};
export type JourneyRequirement = { id: string; label: string; current: number; target: number; done: boolean };
export type JourneyPayload = JourneyState & { nextLevel: number; requirements: JourneyRequirement[]; ready: boolean };

export const EMPTY_JOURNEY: JourneyState = { version: 0, level: 0, proofs: [], workout: null };

type EvidenceWorkout = { id?: string; completedDate?: string; exercises?: WorkoutExerciseDetail[] };
type EvidenceVisit = { id: string; date: string };

/** Progress is backed by distinct attendance days and explicitly completed exercise logs, never XP. */
export function assessJourney(state: JourneyState, goal: string, workouts: EvidenceWorkout[], visits: EvidenceVisit[]) {
  const attended = new Set(visits.map((visit) => visit.date));
  const qualifying = workouts.filter((workout) => workout.id && workout.completedDate && attended.has(workout.completedDate) &&
    workout.exercises?.some((exercise) => exercise.completed === true && exercise.exerciseName.trim() &&
      ((exercise.sets > 0 && exercise.reps > 0) || exercise.seconds > 0)));
  const uniqueDays = new Set(qualifying.map((workout) => workout.completedDate));
  const nextLevel = state.level + 1;
  const target = state.level === 0 ? 1 : state.level * 3;
  const requirements: JourneyRequirement[] = [
    { id: "goal", label: "Elegir hacia dónde querés avanzar", current: goal.trim() ? 1 : 0, target: 1, done: Boolean(goal.trim()) },
    { id: "visits", label: `Registrar ingreso en ${target} día${target === 1 ? "" : "s"} distinto${target === 1 ? "" : "s"}`, current: attended.size, target, done: attended.size >= target },
    { id: "workouts", label: `Completar y registrar ejercicios en ${target} día${target === 1 ? "" : "s"} con ingreso`, current: uniqueDays.size, target, done: uniqueDays.size >= target },
  ];
  return {
    ...state, nextLevel, requirements, ready: requirements.every((item) => item.done),
    evidence: { workoutIds: qualifying.map((workout) => workout.id!), visitIds: visits.filter((visit) => uniqueDays.has(visit.date)).map((visit) => visit.id) },
  };
}

export function journeyPhase(input: { inside: boolean; activeWorkout: boolean; completed: boolean; assessed: boolean; skipped: boolean }) {
  if (input.activeWorkout) return "training";
  if (input.completed) return "recovery";
  if (!input.inside) return "arrival";
  if (!input.assessed && !input.skipped) return "wellness";
  return "choose";
}
