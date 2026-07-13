import type { Gamification } from "./gamification";

export type Workout = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: string;
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
  notificationPrefs?: NotificationPrefs;
  tourDone?: boolean;
  pinnedBadges?: string[];
  gamification?: Gamification;
};
