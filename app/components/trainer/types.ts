import type {
  PlanExercisePrescription,
  PlanItem,
  WorkoutExerciseDetail,
} from "@/app/components/member/types";
import type {
  DefaultTrainingProgramId,
  TrainingProgramTemplate,
} from "@/lib/xtreme/training-program-catalog";

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
  doneItems?: number;
  totalItems?: number;
  progressPct?: number;
};

export type TrainerProgramAssignment = {
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

export type TrainerProgram = TrainingProgramTemplate & {
  revision: number;
  memberCount: number;
};

export type TrainingMachine = {
  assetId: string;
  machineGuideId?: string;
  code: string;
  name: string;
  area: string;
  location: string;
  floor: number;
  status: "bueno" | "fuera_de_servicio" | "pendiente" | "sin_dato";
};

export type TrainerMember = {
  memberName: string;
  normalizedName: string;
  goal: string;
  coach: string;
  photoUrl: string;
  membershipStatus: MembershipStatus;
  trainingPlan: TrainerPlan | null;
  trainingProgramAssignment: TrainerProgramAssignment | null;
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

export type TrainerClassAttendee = {
  bookingId: string;
  memberKey: string;
  memberName: string;
  photoUrl: string;
  goal: string;
  membershipStatus: MembershipStatus;
  bookingStatus: "reserved" | "attended";
};

export type TrainerTodayClass = {
  id: string;
  trainingId: string;
  trainingName: string;
  startAt: string;
  endAt: string;
  coach: string;
  capacity: number;
  status: "scheduled" | "cancelled" | "completed";
  attendees: TrainerClassAttendee[];
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

export type PlanTemplateId = DefaultTrainingProgramId;
export type PlanTemplate = TrainingProgramTemplate;

export type TrainerNotice = { tone: "success" | "error"; text: string } | null;

export type SavePlanResponse = { ok?: boolean; member?: TrainerMember | null; error?: string };

export type TrainerDashboardResponse = {
  date: string;
  members: TrainerMember[];
  todayClasses: TrainerTodayClass[];
  equipment: TrainingMachine[];
  programs: TrainerProgram[];
};
