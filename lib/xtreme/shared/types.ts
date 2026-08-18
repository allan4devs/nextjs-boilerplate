import type { EarnedBadge } from "../gamification";
import type { StaffRole } from "./config";

export type Membership = {
  plan?: string;
  lastPaidAt?: string;
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
  /** Sistema anterior: dHash perceptual. Se conserva como fallback de los enrolados viejos. */
  faceHash?: string;
  /** Reconocedor real: las plantillas viven en FACE_TEMPLATES_COLLECTION. */
  faceEnrolledAt?: Date;
  faceEngine?: string;
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
    sourceRow?: number;
    score?: number;
  };
  /** Trazabilidad de una recuperacion conservadora desde el Excel historico. */
  emailRecovery?: {
    at: Date;
    source: string;
    sourceRow?: number;
    method?: string;
    score?: number;
    previousEmail?: string | null;
    domainChange?: string | null;
    matchMethod?: string;
    /** excel_align | quarantine_realign */
    category?: string;
  };
  /** Datos conservados del Excel histórico. No son identidad verificada. */
  legacyImport?: {
    source?: string;
    importedAt?: Date;
    subscriptionVerification?: string;
    canonicalSourceStatus?: string;
    /** x Tarifa del Excel (Semanal / Quincenal / Mensual / ...). */
    canonicalRate?: string;
    /** Plan crudo del Excel (Regular / Regular1 / Adulto Mayor). */
    canonicalExcelPlan?: string;
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
  /**
   * Ficha extendida que administra el super admin desde el Admin OS. Vive
   * aparte de los campos que el socio edita en la app para que una edición del
   * socio nunca pise lo que registró la administración.
   */
  adminProfile?: AdminMemberProfile;
  /**
   * Precio pactado con el socio. Regla del gym: hay socios con montos distintos
   * al precio público según su historial o su última factura de Latinsoft.
   */
  customPricing?: CustomPricing;
  createdAt?: Date;
  updatedAt?: Date;
};

/** Sexo/identidad tal como la registra recepción; libre para no encasillar. */
export type AdminMemberProfile = {
  birthDate?: string;
  gender?: string;
  address?: string;
  occupation?: string;
  /** Cómo llegó al gym (referido, redes, pasó por el local...). */
  acquisitionSource?: string;
  /** Horario habitual: mañana / tarde / noche / mixto. */
  preferredSchedule?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  /** Lesiones, condiciones, medicación relevante para entrenar. */
  medicalNotes?: string;
  /** Etiquetas libres para segmentar (ej. "adulto mayor", "rehabilitación"). */
  tags?: string[];
  /** El VIP se administra aparte: marcarlo no otorga acceso a zonas regulares. */
  vipAccess?: boolean;
  vipNote?: string;
  /** Identificador del cliente en Latinsoft (fuente operativa de facturación). */
  latinsoftId?: string;
  updatedAt?: Date;
  updatedBy?: string | null;
};

export type CustomPricing = {
  /** Monto pactado en colones. 0 / ausente = usa el precio público. */
  amountCrc?: number;
  /** Plan al que aplica el monto (mensual, quincenal...). */
  planLabel?: string;
  reason?: string;
  /** Factura o referencia de Latinsoft que respalda el monto. */
  latinsoftInvoice?: string;
  setAt?: Date;
  setBy?: string | null;
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
  /** Último correo de registro solicitado; evita usar el formulario como relay. */
  lastSentAt?: Date;
  /**
   * campaign = magic link de campañas admin.
   * email_change = actualizar correo de cuenta ya registrada (cédula + PIN).
   */
  source: "primer-dia" | "app" | "paypal" | "reception" | "admin" | "campaign" | "email_change";
};

export type AuditDoc = {
  id: string;
  at: Date;
  actorRole: StaffRole;
  /** Identidad del colaborador que ejecutó la acción (Allan, Eileen, Verónica...). */
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  targetType: "member" | "badge" | "payment" | "system";
  targetId: string;
  summary: string;
  meta?: Record<string, unknown>;
  /**
   * Campos que cambiaron, con valor anterior y nuevo. Es lo que convierte la
   * bitácora en un historial de cambios auditable y no solo en un log de texto.
   */
  changes?: AuditChange[];
};

export type AuditChange = {
  field: string;
  label?: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
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
  method: "paypal" | "cash" | "transfer" | "sinpe" | "card" | "mixed" | "other";
  paymentBreakdown?: { cash: number; sinpe: number; card: number };
  status: "completed" | "pending" | "refunded";
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  note: string;
  date: string;
  createdAt: Date;
  recordedBy: "paypal" | "admin" | "reception" | "seed";
  recordedByStaffId?: string | null;
  recordedByStaffName?: string | null;
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
