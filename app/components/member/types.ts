/**
 * Member OS — tipos de dominio compartidos entre el hook de estado,
 * los tabs y las respuestas del API /api/xtreme/*.
 */

import type { MachineGuide } from "./constants";

export type OsModal =
  | null
  | { kind: "machine"; machine: MachineGuide }
  | { kind: "membership" }
  | { kind: "occupancy" }
  | { kind: "streak" }
  | { kind: "week" }
  | { kind: "training"; trainingId: string }
  | { kind: "badges" }
  | { kind: "quick-train" };

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

export type PublicBadge = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: string;
  secret: boolean;
  earned: boolean;
  earnedAt: string | null;
  seen: boolean;
  progress: { current: number; target: number } | null;
};

export type Gamification = {
  streak: number;
  weeklyGoal: number;
  weekCount: number;
  weekMet: boolean;
  weeksStreak: number;
  freezesAvailable: number;
  xp: number;
  level: { index: number; name: string; minXp: number; nextXp: number | null; progressPct: number };
  badges: PublicBadge[];
  earnedBadgeCount: number;
  pinnedBadges: string[];
  unseenBadgeIds: string[];
};

export type Member = {
  memberName: string;
  normalizedName: string;
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
  membership: {
    plan: string;
    status: "active" | "warning" | "expired";
    nextBillingDate: string;
    startedAt: string;
    daysRemaining: number;
  };
  bodyMetrics: BodyMetric[];
  latestBodyMetric: BodyMetric | null;
  trainingPlan: MemberPlan | null;
  notificationPrefs?: NotificationPrefs;
  pinnedBadges?: string[];
  gamification?: Gamification;
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

export type NextBestAction = {
  kind: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  priority: number;
};

export type MembersResponse = {
  member: Member | null;
  leaderboard: Member[];
  exists?: boolean;
  nextBestAction?: NextBestAction | null;
  error?: string;
  duplicate?: {
    memberName: string;
    phone: string;
    email: string;
  };
};

export type ReservationState = Record<
  string,
  {
    reserved: number;
    capacity: number;
    remaining: number;
    isMine: boolean;
  }
>;

export type ReservationsResponse = {
  date: string;
  reservations: ReservationState;
  error?: string;
};

export type GymStatus = {
  capacity: number;
  currentPeople: number;
  occupancyPct: number;
  level: string;
  checkinsToday: number;
  reservationsToday: number;
  updatedAt: string;
};
