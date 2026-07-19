import type { EarnedBadge } from "../gamification";
import type { StaffRole } from "./config";

export type Membership = {
  plan?: string;
  nextBillingDate?: string;
  startedAt?: string;
  status?: "active" | "warning" | "expired";
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

export type WorkoutEntry = {
  id?: string;
  trainingId?: string;
  trainingName?: string;
  intensity?: string;
  minutes?: number;
  completedDate?: string;
  completedAt?: Date | string;
  planItemId?: string;
  planTitle?: string;
  startedAt?: Date | string;
  endedAt?: Date | string;
  exercises?: WorkoutExerciseDetail[];
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
  startedAt: Date;
  exercises: WorkoutExerciseDetail[];
};

export type BodyMetric = {
  id?: string;
  date: string;
  weightKg: number;
  waistCm: number;
  note?: string;
};

export type WorkoutHistoryItem = {
  id?: string;
  completedDate: string;
  trainingName: string;
  minutes: number;
  intensity?: string;
  planItemId?: string;
  exercises?: WorkoutExerciseDetail[];
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

export type TrainingPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type NotificationPrefs = {
  streakRisk: boolean;
  milestones: boolean;
  renewalReminders: boolean;
  winBack: boolean;
  weeklyRecap: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  streakRisk: true,
  milestones: true,
  renewalReminders: true,
  winBack: true,
  weeklyRecap: true,
};

export type MemberDoc = {
  normalizedName?: string;
  memberName?: string;
  goal?: string;
  favoriteTraining?: string;
  phone?: string;
  email?: string;
  cedula?: string;
  emailVerified?: boolean;
  coach?: string;
  notes?: string;
  photoUrl?: string;
  faceHash?: string;
  workouts?: WorkoutEntry[];
  membership?: Membership;
  bodyMetrics?: BodyMetric[];
  trainingPlan?: TrainingPlan;
  activePlanWorkout?: ActivePlanWorkout;
  weeklyGoal?: number;
  earnedBadges?: EarnedBadge[];
  freezeHistory?: string[];
  xpBonus?: number;
  freezesBonus?: number;
  notificationPrefs?: Partial<NotificationPrefs>;
  emailUnsubscribe?: { reason: string; feedback?: string; at: Date };
  pinnedBadges?: string[];
  leaderboardOptIn?: boolean;
  buddies?: string[];
  referredBy?: string;
  referralCount?: number;
  seeded?: boolean;
  /** Snapshot del primer claim por magic link (correcciones al import). */
  profileClaim?: {
    claimedAt: Date;
    source?: string;
    previous?: {
      memberName?: string;
      cedula?: string;
      phone?: string;
      email?: string;
    };
  };
  emailQuarantine?: {
    previousEmail?: string;
    reason?: string;
    at?: Date;
    source?: string;
  };
  /** Datos conservados del Excel histórico. No son identidad verificada. */
  legacyImport?: {
    source?: string;
    importedAt?: Date;
    subscriptionVerification?: string;
    canonicalSourceStatus?: string;
    canonicalRate?: string;
    rowCount?: number;
    rows?: Array<{
      row?: number;
      sourceStatus?: string;
      rate?: string;
      rawEmail?: string;
      [key: string]: unknown;
    }>;
    emailAssignment?: Record<string, unknown>;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

export type OtpDoc = {
  normalizedName: string;
  /** pin_recovery = reset con PIN ya existente; pin_setup = primer PIN con correo verificado. */
  purpose: "pin_recovery" | "pin_setup";
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
};

export type PendingRegistrationDoc = {
  email: string;
  tokenHash: string;
  previousTokenHashes?: string[];
  expiresAt: Date;
  confirmedAt?: Date | null;
  memberNormalizedName?: string | null;
  expectedMemberKey?: string | null;
  expectedMemberName?: string | null;
  paymentId?: string | null;
  createdAt: Date;
  source: "primer-dia" | "app" | "paypal" | "reception" | "admin";
};

export type AuditDoc = {
  id: string;
  at: Date;
  actorRole: StaffRole;
  action: string;
  targetType: "member" | "badge" | "payment" | "system";
  targetId: string;
  summary: string;
  meta?: Record<string, unknown>;
};

export type BadgeDoc = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  source: "catalog" | "manual";
  active: boolean;
  secret?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
};

export type PaymentDoc = {
  id: string;
  memberName: string;
  normalizedName: string;
  customerName: string;
  phone: string;
  email: string;
  optionId: string;
  optionLabel: string;
  category: "Plan" | "Clase" | "Otro";
  amountCrc: number;
  amountUsd: number;
  currency: string;
  method: "paypal" | "cash" | "transfer" | "sinpe" | "other";
  status: "completed" | "pending" | "refunded";
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  note: string;
  date: string;
  createdAt: Date;
  recordedBy: "paypal" | "admin" | "seed";
};

export type CheckinDoc = {
  id: string;
  memberName: string;
  normalizedName: string;
  accessCode: string;
  method: "code" | "name" | "pin" | "admin" | "cedula" | "face";
  membershipStatus: "active" | "warning" | "expired" | "unknown";
  date: string;
  checkedInAt: Date;
  checkedOutAt?: Date | null;
  checkedOutBy?: StaffRole | "member";
  by: "kiosk" | "admin" | "reception";
  note?: string;
};
