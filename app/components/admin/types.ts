/**
 * Tipos del Admin OS: espejo de lo que devuelve `/api/xtreme/admin` más los
 * borradores que la UI edita antes de mandarlos de vuelta.
 *
 * Viven fuera de la página para que cualquier panel, modal o hook del admin
 * pueda tiparse contra el mismo contrato sin importar la pantalla entera.
 */

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
  doneItems: number;
  totalItems: number;
  progressPct: number;
  updatedAt: string | null;
};

export type MembershipStatus = "active" | "warning" | "expired";

export type AdminMember = {
  memberName: string;
  normalizedName: string;
  goal: string;
  favoriteTraining: string;
  phone: string;
  email: string;
  emailVerified?: boolean;
  /** Confirmó/corrigió datos de ficha (profileClaim o correo verificado). */
  profileClaimed?: boolean;
  profileClaimedAt?: string | null;
  hasEmailRecovery?: boolean;
  /** Tiene PIN en la app. */
  hasPin?: boolean;
  /** Recibió al menos un correo de campaña (magic link) con status sent. */
  campaignInviteSent?: boolean;
  cedula?: string;
  coach: string;
  notes: string;
  photoUrl: string;
  accessCode: string;
  streak: number;
  totalWorkouts: number;
  totalMinutes: number;
  lastWorkoutDate: string | null;
  plan: string;
  membershipStatus: MembershipStatus;
  daysRemaining: number;
  /** Fecha del último pago; si el import de Latinsoft no la trajo, cae a `startedAt`. */
  lastPaidAt: string;
  nextBillingDate: string;
  startedAt: string;
  latestWeight: number | null;
  latestWaist: number | null;
  trainingPlan: TrainingPlan | null;
  seeded: boolean;
  /** Cuándo se tocó la ficha por última vez (ej. import de Latinsoft, cobro, edición). */
  updatedAt?: string | null;
  // Rich info for personal trainer detailed view
  bodyMetrics?: Array<{
    id?: string;
    date: string;
    weightKg: number;
    waistCm: number;
    note?: string;
  }>;
  recentWorkouts?: Array<{
    id?: string;
    completedDate: string;
    trainingName: string;
    minutes: number;
    intensity?: string;
  }>;
};

export type MemberSortKey =
  | "member"
  | "contact"
  | "streak"
  | "coach"
  | "membership"
  | "code"
  | "plan";

export type SortDirection = "asc" | "desc";

export type MemberSort = { key: MemberSortKey; direction: SortDirection };

export type CheckinRow = {
  id: string;
  memberName: string;
  /** Llave del socio para cruzar el ingreso con su ficha viva en `members`. */
  normalizedName: string;
  accessCode: string;
  method: string;
  membershipStatus: string;
  checkedInAt: string;
  by: string;
  note: string;
};

export type PaymentRow = {
  id: string;
  customerName: string;
  memberName: string;
  optionLabel: string;
  category: string;
  amountCrc: number;
  amountUsd: number;
  method: string;
  status: string;
  date: string;
  note: string;
  paypalCaptureId: string | null;
  recordedBy: string;
};

export type RevenueBucket = { count: number; crc: number; usd: number };

export type Revenue = {
  today: RevenueBucket;
  week: RevenueBucket;
  month: RevenueBucket;
  all: RevenueBucket;
  daily: { date: string; crc: number; count: number }[];
  byOption: { optionId: string; label: string; count: number; crc: number }[];
  byMethod: { method: string; count: number; crc: number }[];
  recent: PaymentRow[];
};

export type AdminRole = "admin" | "super";

export type AdminData = {
  role: AdminRole;
  members: AdminMember[];
  totals: {
    memberCount: number;
    seededCount: number;
    activeToday: number;
    totalWorkouts: number;
    totalMinutes: number;
    avgStreak: number;
    withPlan: number;
    expiringSoon: number;
    expired: number;
    activeMemberships: number;
  };
  today: {
    date: string;
    capacity: number;
    currentPeople: number;
    occupancyPct: number;
    level: string;
    checkinsToday: number;
    uniqueCheckins: number;
    reservationsToday: number;
    classes: { trainingId: string; trainingName: string; capacity: number; reserved: number }[];
  };
  checkins: CheckinRow[];
  checkinSeries: { date: string; checkins: number; unique: number }[];
  /** Solo super: sesiones de staff abiertas (admin/recepción/ingreso/trainer). */
  staffSecurity?: {
    total: number;
    bySurface: {
      reception: number;
      ingreso: number;
      trainer: number;
      admin: number;
    };
  };
  /** Socios con el Member OS abierto / sesión PIN reciente. */
  onlineMembers?: {
    count: number;
    windowMinutes: number;
    members: Array<{
      memberKey: string;
      memberName: string;
      lastSeenAt: string;
      via: "session" | "usage" | "both";
      source?: string;
      path?: string;
    }>;
  };
  revenue?: Revenue;
  growth?: {
    windowDays: number;
    fromDate: string;
    toDate: string;
    dayPasses: number;
    plansSold: number;
    checkoutsStarted: number;
    paymentsCompleted: number;
    firstCheckins: number;
    membershipsStarted: number;
    renewalsCompleted: number;
    referralsRedeemed: number;
    referralsRewarded: number;
    appOpens: number;
    appOpenMembers: number;
    accountFunnel: {
      lookups: number;
      loginSuccess: number;
      loginFailed: number;
      loginBlocked: number;
      registrationsStarted: number;
      registrationsCompleted: number;
      registrationFailed: number;
      freeFirstDays: number;
      pinsCreated: number;
    };
    reservations: { attempted: number; completed: number; failed: number; cancelled: number };
    monthly: { checkoutsStarted: number; paymentsCompleted: number };
    recentAccessAttempts: Array<{
      stage: string;
      outcome: string;
      memberId?: string;
      identityHint?: string;
      requestFingerprint?: string;
      occurredAt: string;
    }>;
    appOpenSeries: Array<{ date: string; opens: number; unique: number }>;
    dayPassToVisit: { dayPasses: number; visited: number; ratePct: number };
    dayPassToPlan: {
      dayPasses: number;
      converted1d: number;
      converted3d: number;
      converted7d: number;
      rate7dPct: number;
    };
    d7Retention: { newMembers: number; returned: number; ratePct: number };
    recentEvents: Array<{
      type: string;
      memberId?: string;
      occurredAt: string;
      properties: Record<string, string | number | boolean | null>;
    }>;
  } | null;
  usage?: {
    windowDays: number;
    fromDate: string;
    toDate: string;
    sessions: number;
    memberSessions: number;
    anonSessions: number;
    excludedInternalSessions?: number;
    uniqueMembers: number;
    avgDurationMs: number;
    medianDurationMs: number;
    totalPageViews: number;
    totalClicks: number;
    totalActions: number;
    topPages: Array<{ path: string; views: number; sessions: number }>;
    topTabs: Array<{ tab: string; views: number }>;
    topActions: Array<{ action: string; count: number }>;
    bySource: Array<{ source: string; sessions: number }>;
    recentSessions: Array<{
      id: string;
      source: string;
      memberName?: string;
      memberId?: string;
      startedAt: string;
      lastSeenAt: string;
      durationMs: number;
      pageViews: number;
      clicks: number;
      actions: number;
      entryPath?: string;
      exitPath?: string;
      topPaths: Array<{ path: string; count: number }>;
      topTabs: Array<{ tab: string; count: number }>;
      topActions: Array<{ action: string; count: number }>;
      timeline: Array<{
        at: string;
        type: string;
        path?: string;
        tab?: string;
        action?: string;
        label?: string;
        meta?: Record<string, string | number | boolean | null>;
      }>;
    }>;
  } | null;
  system?: {
    lifecycle: { status: string; startedAt: Date; finishedAt?: Date; summary?: unknown } | null;
    lifecycleStale?: boolean;
    checkedAt: string;
  } | null;
  opsAlerts?: Array<{
    fingerprint: string;
    kind: string;
    severity: "warning" | "critical";
    title: string;
    detail: string;
    count: number;
    createdAt: string;
    lastSeenAt: string;
    context?: Record<string, string | number | boolean | null>;
  }>;
};

export type PlanDraft = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
};

export type MemberDraft = {
  displayName: string;
  goal: string;
  favoriteTraining: string;
  phone: string;
  email: string;
  cedula: string;
  coach: string;
  notes: string;
  plan: string;
  nextBillingDate: string;
  startedAt: string;
};

export type QuickPlanOptionId = "week" | "fortnight" | "month" | "quarter";

export type AdminTabId =
  | "resumen"
  | "socios"
  | "accesos"
  | "pagos"
  | "ingresos"
  | "gamificacion"
  | "correos"
  | "bitacora";

export type GamiBadge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  source: "catalog" | "manual";
  active: boolean;
  secret: boolean;
};

export type GamiMember = {
  memberName: string;
  normalizedName: string;
  streak: number;
  weeksStreak: number;
  weeklyGoal: number;
  freezesBanked: number;
  freezesBonus: number;
  xp: number;
  xpBonus: number;
  levelName: string;
  levelIndex: number;
  earnedBadgeCount: number;
  earnedBadges: { badgeId: string; earnedAt: string; seen: boolean }[];
  totalWorkouts: number;
  lastWorkoutDate: string | null;
};

export type GamiData = {
  badges: GamiBadge[];
  analytics: {
    memberCount: number;
    weeklyActiveMembers: number;
    avgStreak: number;
    totalBadgesEarned: number;
    streakDistribution: Record<string, number>;
    badgeEarnCounts: { badgeId: string; name: string; tier: string; count: number }[];
  };
  members: GamiMember[];
  audit: {
    id: string;
    at: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    summary: string;
  }[];
};

/** Membresía (plan vigente / por vencer / vencida). */
export type MembershipFilter = "all" | "active" | "warning" | "expired";
/** Registro en la app (correo verificado). */
export type RegistrationFilter = "all" | "registered" | "not_registered" | "no_email";
/** Auditaron / confirmaron datos de la ficha (profileClaim o registro). */
export type ProfileFilter = "all" | "audited" | "pending";
/** Se les mandó invitación/magic link de campaña. */
export type InviteFilter = "all" | "sent" | "not_sent";

/** Conteos que alimentan los chips de filtro del padrón. */
export type MemberLifecycleCounts = Partial<
  Record<
    Exclude<MembershipFilter | RegistrationFilter | ProfileFilter | InviteFilter, "all">,
    number
  >
>;
