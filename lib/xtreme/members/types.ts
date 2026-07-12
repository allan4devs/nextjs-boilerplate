import type { EarnedBadge } from "@/lib/xtreme/gamification";
import type { NotificationPrefs } from "@/lib/xtreme/shared";

export type WorkoutEntry = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: Date;
};

export type Membership = {
  plan: string;
  status: "active" | "warning" | "expired";
  nextBillingDate: string;
  startedAt: string;
};

export type BodyMetric = {
  id: string;
  date: string;
  weightKg: number;
  waistCm: number;
  note: string;
  createdAt: Date;
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

export type TrainingPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
};

export type XtremeMemberDoc = {
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
