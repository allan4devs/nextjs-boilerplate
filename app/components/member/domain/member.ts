import type { Gamification } from "./gamification";

export type Workout = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: string;
  planItemId?: string;
  planTitle?: string;
  startedAt?: string;
  endedAt?: string;
  exercises?: WorkoutExerciseDetail[];
};

export type WorkoutExerciseDetail = {
  id: string;
  machineId: string;
  machineName: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
  seconds: number;
  notes: string;
};

export type PlanExercisePrescription = {
  id: string;
  machineId: string;
  machineName: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
  targetSeconds: number;
  notes: string;
};

export type ActivePlanWorkout = {
  id: string;
  planItemId: string;
  planTitle: string;
  trainingName: string;
  startedAt: string;
  exercises: WorkoutExerciseDetail[];
};

export type NotificationPrefs = {
  streakRisk: boolean;
  milestones: boolean;
  renewalReminders: boolean;
  winBack: boolean;
  weeklyRecap: boolean;
};

export type BodyMetric = {
  id: string;
  date: string;
  weightKg: number;
  waistCm: number;
  note: string;
};

export type PlanItem = {
  id: string;
  day: string;
  focus: string;
  exercises: string;
  targetMinutes: number;
  done: boolean;
  doneDate: string | null;
  doneWorkoutId?: string | null;
  prescribedExercises?: PlanExercisePrescription[];
};

export type MemberPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
  doneItems: number;
  totalItems: number;
  progressPct: number;
};

export type Membership = {
  plan: string;
  status: "active" | "warning" | "expired";
  nextBillingDate: string;
  startedAt: string;
  daysRemaining: number;
};

export type Member = {
  memberName: string;
  normalizedName: string;
  /** Código de 8 dígitos para check-in en recepción (viene del API). */
  accessCode?: string;
  goal: string;
  favoriteTraining: string;
  phone: string;
  email: string;
  cedula?: string;
  photoUrl: string;
  workouts: Workout[];
  streak: number;
  totalWorkouts: number;
  totalMinutes: number;
  lastWorkoutDate: string | null;
  membership: Membership;
  bodyMetrics: BodyMetric[];
  latestBodyMetric: BodyMetric | null;
  trainingPlan: MemberPlan | null;
  activePlanWorkout: ActivePlanWorkout | null;
  notificationPrefs?: NotificationPrefs;
  tourDone?: boolean;
  pinnedBadges?: string[];
  gamification?: Gamification;
};
