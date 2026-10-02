import type { EarnedBadge } from "@/lib/xtreme/gamification";
import type {
  ActivePlanWorkout,
  ExercisePreference,
  NotificationPrefs,
  PlanExercisePrescription,
  TrainingProgramAssignment,
  WorkoutExerciseDetail,
} from "@/lib/xtreme/shared";

export type WorkoutEntry = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: Date;
  planItemId?: string;
  planTitle?: string;
  startedAt?: Date;
  endedAt?: Date;
  exercises?: WorkoutExerciseDetail[];
};

export type Membership = {
  plan: string;
  status: "active" | "warning" | "expired";
  nextBillingDate: string;
  startedAt: string;
};

export type BodyMetric = {
  inbody?: import("../body-composition").InBodyReport;
  id: string;
  date: string;
  weightKg: number;
  waistCm: number;
  note: string;
  createdAt: Date;
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

export type TrainingPlan = {
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
};

export type XtremeMemberDoc = {
  journey?: import("../member-journey").JourneyState;
  normalizedName: string;
  memberName: string;
  goal: string;
  favoriteTraining: string;
  phone?: string;
  email?: string;
  cedula?: string;
  emailVerified?: boolean;
  photoUrl?: string;
  workouts: WorkoutEntry[];
  membership?: Membership;
  bodyMetrics?: BodyMetric[];
  trainingPlan?: TrainingPlan;
  trainingProgramAssignment?: TrainingProgramAssignment;
  activePlanWorkout?: ActivePlanWorkout;
  exercisePreferences?: ExercisePreference[];
  weeklyGoal?: number;
  earnedBadges?: EarnedBadge[];
  freezeHistory?: string[];
  xpBonus?: number;
  freezesBonus?: number;
  notificationPrefs?: Partial<NotificationPrefs>;
  pinnedBadges?: string[];
  buddies?: string[];
  referredBy?: string;
  referralCount?: number;
  tourDoneAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
