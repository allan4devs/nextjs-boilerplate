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
  assetId?: string;
  tracking?: {
    elapsedSeconds: number;
    startedAt: string | null;
    restUntil: string | null;
    logs: { reps: number; seconds: number; weightKg: number }[];
  };
  completed?: boolean;
  id: string;
  assetId?: string;
  machineId: string;
  machineName: string;
  machineCode?: string;
  machineArea?: string;
  machineLocation?: string;
  machineFloor?: number;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
  seconds: number;
  targetSeconds?: number;
  notes: string;
};

export type ExercisePreference = {
  key: string;
  assetId?: string;
  machineId: string;
  favoriteWeightKg?: number;
  lastWeightKg?: number;
  favoriteSeconds?: number;
  lastSeconds?: number;
  updatedAt: string;
};

export type PlanExercisePrescription = {
  id: string;
  programExerciseId?: string;
  assetId?: string;
  machineId: string;
  machineName: string;
  machineCode?: string;
  machineArea?: string;
  machineLocation?: string;
  machineFloor?: number;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
  targetSeconds: number;
  notes: string;
};

export type ActivePlanWorkout = {
  revision?: number;
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
  inbody?: import("@/lib/xtreme/body-composition").InBodyReport;
  id: string;
  date: string;
  weightKg: number;
  waistCm: number;
  note: string;
};

export type PlanItem = {
  id: string;
  programSessionId?: string;
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
  programId?: string;
  programName?: string;
  programRevision?: number;
  groupId?: string;
  assignmentSource?: "group" | "custom";
  cycle?: number;
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

export type TrainingProgramAssignment = {
  programId: string;
  programName: string;
  programRevision: number;
  groupId: string;
  cohort: string;
  source: "auto_default" | "trainer_group" | "trainer_custom";
  cycle: number;
  assignedBy: string;
  assignedAt: string;
};

export type Membership = {
  plan: string;
  status: "active" | "warning" | "expired";
  nextBillingDate: string;
  startedAt: string;
  daysRemaining: number;
};

export type ActiveVisit = {
  id: string;
  checkedInAt: string;
  elapsedMinutes: number;
  reminderAfterMinutes: number;
};

/** Registro de ingreso al gym (check-in) para el historial del socio. */
export type VisitHistoryRecord = {
  id: string;
  date: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  durationMinutes: number | null;
  open: boolean;
  method: "code" | "name" | "pin" | "admin" | "cedula" | "face" | string;
  by: "kiosk" | "admin" | "reception" | string;
};

export type VisitHistoryResponse = {
  activeVisit: ActiveVisit | null;
  visits: VisitHistoryRecord[];
  totalVisits: number;
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
  /** Correo confirmado por enlace mágico / invitación. */
  emailVerified?: boolean;
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
  trainingProgramAssignment: TrainingProgramAssignment | null;
  activePlanWorkout: ActivePlanWorkout | null;
  exercisePreferences: ExercisePreference[];
  notificationPrefs?: NotificationPrefs;
  tourDone?: boolean;
  pinnedBadges?: string[];
  gamification?: Gamification;
};
