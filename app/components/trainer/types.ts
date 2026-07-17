import type {
  PlanExercisePrescription,
  PlanItem,
  WorkoutExerciseDetail,
} from "@/app/components/member/types";

export type { PlanExercisePrescription, PlanItem, WorkoutExerciseDetail };

export type MembershipStatus = "active" | "warning" | "expired";

export type TrainerWorkout = {
  id?: string;
  completedDate?: string;
  trainingName?: string;
  minutes?: number;
  planItemId?: string;
  exercises?: WorkoutExerciseDetail[];
};

export type TrainerMetric = {
  date: string;
  weightKg: number;
  waistCm: number;
  note?: string;
};

export type TrainerPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
  doneItems?: number;
  totalItems?: number;
  progressPct?: number;
};

export type TrainerMember = {
  memberName: string;
  normalizedName: string;
  goal: string;
  coach: string;
  photoUrl: string;
  membershipStatus: MembershipStatus;
  trainingPlan: TrainerPlan | null;
  activePlanWorkout: {
    id?: string;
    planItemId: string;
    planTitle?: string;
    trainingName?: string;
    startedAt: string;
  } | null;
  recentWorkouts: TrainerWorkout[];
  latestMetrics: TrainerMetric[];
};

export type TrainerFilter = "all" | "attention" | "active" | "without-plan" | "completed";
export type TrainerTab = "overview" | "plan" | "history";

export type TrainerStats = {
  total: number;
  withPlan: number;
  withoutPlan: number;
  activeNow: number;
  needsAttention: number;
  averageProgress: number;
};

export type MemberSignal = {
  tone: "lime" | "cyan" | "orange" | "red" | "muted";
  label: string;
  detail: string;
  priority: number;
};

export type PlanTemplateId = "starter" | "strength" | "hypertrophy" | "conditioning";

export type PlanTemplate = {
  id: PlanTemplateId;
  name: string;
  description: string;
  weeklySessions: number;
  objective: string;
  sessions: Array<{
    day: string;
    focus: string;
    targetMinutes: number;
    exercises: string;
    machines: Array<{
      machineId: string;
      sets: number;
      reps: number;
      weightKg?: number;
      targetSeconds?: number;
      notes?: string;
    }>;
  }>;
};

export type TrainerNotice = { tone: "success" | "error"; text: string } | null;

export type SavePlanResponse = { ok?: boolean; member?: TrainerMember | null; error?: string };

