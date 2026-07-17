/**
 * Xtreme Gym — Motor de gamificacion (Fase 1).
 * Funciones puras, sin dependencias de servidor: se puede importar
 * tanto desde rutas API como desde componentes cliente.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type WorkoutLike = {
  trainingId?: string;
  trainingName?: string;
  minutes?: number;
  completedDate?: string;
  completedAt?: Date | string;
};

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export type BadgeDef = {
  id: string;
  name: string;
  desc: string;
  /** Nombre de icono (el cliente lo mapea a lucide). */
  icon: string;
  tier: BadgeTier;
  /** Oculto hasta ganarlo (recompensa variable). */
  secret?: boolean;
  /** Progreso hacia la meta, si aplica (para "te faltan 2"). */
  progress?: (v: MemberView) => { current: number; target: number } | null;
  test: (v: MemberView) => boolean;
};

export type EarnedBadge = {
  badgeId: string;
  earnedAt: string; // ISO date
  seen: boolean;
};

export type MemberView = {
  workouts: WorkoutLike[];
  totalWorkouts: number;
  totalMinutes: number;
  /** Racha efectiva (con protectores aplicados). */
  streak: number;
  /** Semanas consecutivas cumpliendo la meta semanal. */
  weeksStreak: number;
  /** Total historico de semanas con meta cumplida. */
  totalWeeksMet: number;
  metricsCount: number;
  planProgressPct: number;
  trainingIdCounts: Record<string, number>;
  distinctTrainings: number;
  earlyWorkouts: number; // antes de 7am
  lateWorkouts: number; // 8pm o despues
  mondayWorkouts: number;
  workoutMonthDays: Set<string>; // "MM-DD"
};

// ---------------------------------------------------------------------------
// Utilidades de fecha (UTC, mismas convenciones que shared.ts)
// ---------------------------------------------------------------------------

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(date: string, days: number) {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Lunes (ISO) de la semana a la que pertenece la fecha. */
export function weekStartIso(date: string) {
  const d = new Date(`${date}T00:00:00.000Z`);
  const day = d.getUTCDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Rachas 2.0 — protectores de racha
// ---------------------------------------------------------------------------

export const FREEZE_EARN_EVERY = 7; // 1 protector por cada 7 entrenos
export const FREEZE_MAX_BANK = 2; // maximo acumulable

export function freezesEarned(totalWorkouts: number) {
  return Math.floor(totalWorkouts / FREEZE_EARN_EVERY);
}

export function freezesAvailable(
  totalWorkouts: number,
  freezeHistory: string[],
  freezesBonus = 0,
) {
  return Math.max(
    0,
    Math.min(
      FREEZE_MAX_BANK,
      freezesEarned(totalWorkouts) + Math.max(0, freezesBonus) - freezeHistory.length,
    ),
  );
}

/**
 * Decide que dias sin entreno se cubren con protectores para no romper la
 * racha. Solo cubre huecos de 1 dia que conecten con la cadena; huecos de
 * 2+ dias matan la racha (asi los protectores no se desperdician).
 * Devuelve las fechas nuevas a cubrir (persistir en freezeHistory).
 */
export function planFreezeUsage(
  workoutDates: Set<string>,
  freezeHistory: string[],
  totalWorkouts: number,
  today = isoToday(),
  freezesBonus = 0,
): string[] {
  let available = freezesAvailable(totalWorkouts, freezeHistory, freezesBonus);
  if (!available) return [];
  const covered = new Set(freezeHistory);
  const used: string[] = [];
  const has = (d: string) => workoutDates.has(d) || covered.has(d);

  // Camina hacia atras desde ayer (hoy nunca necesita protector).
  let cursor = addDaysIso(today, -1);
  for (let guard = 0; guard < 400 && available > 0; guard += 1) {
    if (has(cursor)) {
      cursor = addDaysIso(cursor, -1);
      continue;
    }
    const prev = addDaysIso(cursor, -1);
    if (!has(prev)) break; // hueco de 2+ dias: racha rota, no gastar
    used.push(cursor);
    covered.add(cursor);
    available -= 1;
    cursor = prev;
  }
  return used;
}

/** Racha diaria contando dias protegidos como cumplidos. */
export function computeStreakWithFreezes(
  workoutDates: Set<string>,
  freezeHistory: string[],
  today = isoToday(),
) {
  const has = (d: string) => workoutDates.has(d) || freezeHistory.includes(d);
  let cursor = today;
  if (!has(cursor)) {
    cursor = addDaysIso(cursor, -1);
    if (!has(cursor)) return 0;
  }
  let streak = 0;
  while (has(cursor)) {
    streak += 1;
    cursor = addDaysIso(cursor, -1);
  }
  return streak;
}

/** Hitos de racha que merecen celebracion. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

// ---------------------------------------------------------------------------
// Meta semanal
// ---------------------------------------------------------------------------

export const WEEKLY_GOAL_DEFAULT = 4;
export const WEEKLY_GOAL_MIN = 2;
export const WEEKLY_GOAL_MAX = 7;

export type WeeklyStats = {
  weekStart: string;
  weekCount: number; // entrenos esta semana (dias distintos)
  weeklyGoal: number;
  weekMet: boolean;
  weeksStreak: number; // semanas consecutivas cumpliendo (sin contar la actual si va en progreso)
  totalWeeksMet: number;
};

export function computeWeeklyStats(
  workouts: WorkoutLike[],
  weeklyGoal: number,
  today = isoToday(),
): WeeklyStats {
  const goal = Math.max(WEEKLY_GOAL_MIN, Math.min(WEEKLY_GOAL_MAX, weeklyGoal || WEEKLY_GOAL_DEFAULT));
  const daysByWeek = new Map<string, Set<string>>();
  for (const w of workouts) {
    const date = w.completedDate;
    if (!date) continue;
    const week = weekStartIso(date);
    if (!daysByWeek.has(week)) daysByWeek.set(week, new Set());
    daysByWeek.get(week)!.add(date);
  }

  const currentWeek = weekStartIso(today);
  const weekCount = daysByWeek.get(currentWeek)?.size ?? 0;
  const weekMet = weekCount >= goal;

  let totalWeeksMet = 0;
  for (const [week, days] of daysByWeek) {
    if (days.size >= goal && week !== currentWeek) totalWeeksMet += 1;
  }
  if (weekMet) totalWeeksMet += 1;

  // Racha de semanas: hacia atras desde la semana pasada; la actual suma si ya cumplio.
  let weeksStreak = weekMet ? 1 : 0;
  let cursor = addDaysIso(currentWeek, -7);
  for (let guard = 0; guard < 260; guard += 1) {
    const days = daysByWeek.get(cursor);
    if (days && days.size >= goal) {
      weeksStreak += 1;
      cursor = addDaysIso(cursor, -7);
    } else {
      break;
    }
  }

  return { weekStart: currentWeek, weekCount, weeklyGoal: goal, weekMet, weeksStreak, totalWeeksMet };
}

// ---------------------------------------------------------------------------
// XP y niveles
// ---------------------------------------------------------------------------

export const XP_RULES = {
  perWorkout: 25,
  perTenMinutes: 1,
  perMetric: 10,
  perPlanItemDone: 15,
  perWeekMet: 100,
  badgeBonus: { bronze: 50, silver: 100, gold: 200, platinum: 400 } as Record<BadgeTier, number>,
};

export const LEVELS = [
  { name: "Novato", minXp: 0 },
  { name: "Regular", minXp: 250 },
  { name: "Comprometido", minXp: 1000 },
  { name: "Bestia", minXp: 3000 },
  { name: "Xtreme", minXp: 8000 },
  { name: "Leyenda", minXp: 20000 },
] as const;

export type LevelInfo = {
  index: number; // 1-based
  name: string;
  minXp: number;
  nextXp: number | null;
  progressPct: number;
};

export function computeXp(args: {
  totalWorkouts: number;
  totalMinutes: number;
  metricsCount: number;
  planItemsDone: number;
  totalWeeksMet: number;
  earnedBadgeIds: string[];
  /** Ajuste manual admin (Fase 3). */
  xpBonus?: number;
  /** Tiers de badges manuales/custom no listados en catalogo. */
  extraBadgeTiers?: BadgeTier[];
}) {
  let xp =
    args.totalWorkouts * XP_RULES.perWorkout +
    Math.floor(args.totalMinutes / 10) * XP_RULES.perTenMinutes +
    args.metricsCount * XP_RULES.perMetric +
    args.planItemsDone * XP_RULES.perPlanItemDone +
    args.totalWeeksMet * XP_RULES.perWeekMet;
  for (const id of args.earnedBadgeIds) {
    const def = BADGE_MAP.get(id);
    if (def) xp += XP_RULES.badgeBonus[def.tier];
  }
  for (const tier of args.extraBadgeTiers ?? []) {
    xp += XP_RULES.badgeBonus[tier] ?? 0;
  }
  return xp + (Number(args.xpBonus) || 0);
}

export function levelForXp(xp: number): LevelInfo {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].minXp) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progressPct = next
    ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100))
    : 100;
  return {
    index: index + 1,
    name: current.name,
    minXp: current.minXp,
    nextXp: next?.minXp ?? null,
    progressPct,
  };
}

// ---------------------------------------------------------------------------
// Vista de miembro (insumo para badges)
// ---------------------------------------------------------------------------

export function buildMemberView(args: {
  workouts: WorkoutLike[];
  weeklyGoal: number;
  freezeHistory: string[];
  metricsCount: number;
  planProgressPct: number;
  today?: string;
}): MemberView {
  const today = args.today ?? isoToday();
  const workouts = args.workouts ?? [];
  const workoutDates = new Set(workouts.map((w) => w.completedDate).filter(Boolean) as string[]);
  const weekly = computeWeeklyStats(workouts, args.weeklyGoal, today);

  const trainingIdCounts: Record<string, number> = {};
  let earlyWorkouts = 0;
  let lateWorkouts = 0;
  let mondayWorkouts = 0;
  const workoutMonthDays = new Set<string>();
  let totalMinutes = 0;

  for (const w of workouts) {
    totalMinutes += w.minutes || 0;
    if (w.trainingId) trainingIdCounts[w.trainingId] = (trainingIdCounts[w.trainingId] ?? 0) + 1;
    if (w.completedDate) {
      workoutMonthDays.add(w.completedDate.slice(5)); // MM-DD
      const day = new Date(`${w.completedDate}T00:00:00.000Z`).getUTCDay();
      if (day === 1) mondayWorkouts += 1;
    }
    if (w.completedAt) {
      const hour = new Date(w.completedAt).getHours();
      if (Number.isFinite(hour)) {
        if (hour < 7) earlyWorkouts += 1;
        if (hour >= 20) lateWorkouts += 1;
      }
    }
  }

  return {
    workouts,
    totalWorkouts: workouts.length,
    totalMinutes,
    streak: computeStreakWithFreezes(workoutDates, args.freezeHistory, today),
    weeksStreak: weekly.weeksStreak,
    totalWeeksMet: weekly.totalWeeksMet,
    metricsCount: args.metricsCount,
    planProgressPct: args.planProgressPct,
    trainingIdCounts,
    distinctTrainings: Object.keys(trainingIdCounts).length,
    earlyWorkouts,
    lateWorkouts,
    mondayWorkouts,
    workoutMonthDays,
  };
}

// ---------------------------------------------------------------------------
// Catalogo de badges
// ---------------------------------------------------------------------------

const count = (v: MemberView, id: string) => v.trainingIdCounts[id] ?? 0;

export const BADGES: BadgeDef[] = [
  // — Constancia —
  { id: "primer-paso", name: "Primer Paso", desc: "Su primer entreno marcado", icon: "Star", tier: "bronze",
    progress: (v) => ({ current: Math.min(1, v.totalWorkouts), target: 1 }), test: (v) => v.totalWorkouts >= 1 },
  { id: "racha-3", name: "Encendido", desc: "3 dias de racha", icon: "Flame", tier: "bronze",
    progress: (v) => ({ current: Math.min(3, v.streak), target: 3 }), test: (v) => v.streak >= 3 },
  { id: "racha-7", name: "En Racha", desc: "7 dias seguidos sin aflojar", icon: "Flame", tier: "silver",
    progress: (v) => ({ current: Math.min(7, v.streak), target: 7 }), test: (v) => v.streak >= 7 },
  { id: "racha-30", name: "Imparable", desc: "30 dias de racha pura vida", icon: "Rocket", tier: "gold",
    progress: (v) => ({ current: Math.min(30, v.streak), target: 30 }), test: (v) => v.streak >= 30 },
  { id: "racha-100", name: "Leyenda Viva", desc: "100 dias de racha", icon: "Crown", tier: "platinum",
    progress: (v) => ({ current: Math.min(100, v.streak), target: 100 }), test: (v) => v.streak >= 100 },
  { id: "semana-perfecta", name: "Semana Perfecta", desc: "Cumplio su meta semanal", icon: "CalendarCheck", tier: "bronze",
    progress: (v) => ({ current: Math.min(1, v.totalWeeksMet), target: 1 }), test: (v) => v.totalWeeksMet >= 1 },
  { id: "mes-perfecto", name: "Mes Perfecto", desc: "4 semanas seguidas cumpliendo la meta", icon: "CalendarHeart", tier: "gold",
    progress: (v) => ({ current: Math.min(4, v.weeksStreak), target: 4 }), test: (v) => v.weeksStreak >= 4 },
  { id: "entrenos-10", name: "Calentando", desc: "10 entrenos totales", icon: "Dumbbell", tier: "bronze",
    progress: (v) => ({ current: Math.min(10, v.totalWorkouts), target: 10 }), test: (v) => v.totalWorkouts >= 10 },
  { id: "entrenos-50", name: "Veterano", desc: "50 entrenos totales", icon: "Medal", tier: "silver",
    progress: (v) => ({ current: Math.min(50, v.totalWorkouts), target: 50 }), test: (v) => v.totalWorkouts >= 50 },
  { id: "entrenos-100", name: "Centurion", desc: "100 entrenos totales", icon: "Trophy", tier: "gold",
    progress: (v) => ({ current: Math.min(100, v.totalWorkouts), target: 100 }), test: (v) => v.totalWorkouts >= 100 },
  { id: "entrenos-250", name: "Maquina Xtreme", desc: "250 entrenos totales", icon: "Crown", tier: "platinum",
    progress: (v) => ({ current: Math.min(250, v.totalWorkouts), target: 250 }), test: (v) => v.totalWorkouts >= 250 },
  { id: "maratonico", name: "Maratonico", desc: "1.000 minutos acumulados", icon: "Timer", tier: "silver",
    progress: (v) => ({ current: Math.min(1000, v.totalMinutes), target: 1000 }), test: (v) => v.totalMinutes >= 1000 },
  { id: "ultra", name: "Ultra", desc: "5.000 minutos acumulados", icon: "Gauge", tier: "gold",
    progress: (v) => ({ current: Math.min(5000, v.totalMinutes), target: 5000 }), test: (v) => v.totalMinutes >= 5000 },

  // — Horario —
  { id: "madrugador", name: "Madrugador", desc: "10 entrenos antes de las 7 am", icon: "Sunrise", tier: "silver",
    progress: (v) => ({ current: Math.min(10, v.earlyWorkouts), target: 10 }), test: (v) => v.earlyWorkouts >= 10 },
  { id: "buho", name: "Buho de Hierro", desc: "10 entrenos despues de las 8 pm", icon: "Moon", tier: "silver",
    progress: (v) => ({ current: Math.min(10, v.lateWorkouts), target: 10 }), test: (v) => v.lateWorkouts >= 10 },
  { id: "guerrero-lunes", name: "Guerrero de Lunes", desc: "8 lunes entrenados", icon: "Swords", tier: "silver",
    progress: (v) => ({ current: Math.min(8, v.mondayWorkouts), target: 8 }), test: (v) => v.mondayWorkouts >= 8 },

  // — Clases —
  { id: "todoterreno", name: "Todoterreno", desc: "Probo los 4 entrenamientos", icon: "Target", tier: "silver",
    progress: (v) => ({ current: Math.min(4, v.distinctTrainings), target: 4 }), test: (v) => v.distinctTrainings >= 4 },
  { id: "fuerza-fan", name: "Casa de Fuerza", desc: "10 sesiones de Fuerza Total", icon: "Dumbbell", tier: "silver",
    progress: (v) => ({ current: Math.min(10, count(v, "fuerza-total")), target: 10 }), test: (v) => count(v, "fuerza-total") >= 10 },
  { id: "hiit-fan", name: "Quemador Serial", desc: "10 sesiones de HIIT", icon: "Zap", tier: "silver",
    progress: (v) => ({ current: Math.min(10, count(v, "hiit-quemador")), target: 10 }), test: (v) => count(v, "hiit-quemador") >= 10 },
  { id: "core-master", name: "Core de Acero", desc: "10 sesiones de Xtreme Core", icon: "Shield", tier: "silver",
    progress: (v) => ({ current: Math.min(10, count(v, "xtreme-core")), target: 10 }), test: (v) => count(v, "xtreme-core") >= 10 },

  // — Progreso —
  { id: "primera-medida", name: "Punto de Partida", desc: "Registraste tu primera medida", icon: "Ruler", tier: "bronze",
    progress: (v) => ({ current: Math.min(1, v.metricsCount), target: 1 }), test: (v) => v.metricsCount >= 1 },
  { id: "medidas-12", name: "Cientifico del Progreso", desc: "12 medidas registradas", icon: "TrendingUp", tier: "gold",
    progress: (v) => ({ current: Math.min(12, v.metricsCount), target: 12 }), test: (v) => v.metricsCount >= 12 },
  { id: "plan-completado", name: "Plan Cumplido", desc: "Completaste el plan de tu coach", icon: "ClipboardCheck", tier: "gold",
    progress: (v) => ({ current: v.planProgressPct, target: 100 }), test: (v) => v.planProgressPct >= 100 },

  // — Secretos —
  { id: "navidad", name: "Regalo de Hierro", desc: "Entreno un 25 de diciembre", icon: "Gift", tier: "gold", secret: true,
    test: (v) => v.workoutMonthDays.has("12-25") },
  { id: "ano-nuevo", name: "Proposito Real", desc: "Entreno un 1 de enero", icon: "PartyPopper", tier: "gold", secret: true,
    test: (v) => v.workoutMonthDays.has("01-01") },
];

export const BADGE_MAP = new Map(BADGES.map((b) => [b.id, b]));

/** Evalua el catalogo y devuelve ids ganados. */
export function evaluateBadges(view: MemberView): string[] {
  return BADGES.filter((b) => b.test(view)).map((b) => b.id);
}

/**
 * Mezcla lo ganado con lo persistido: devuelve la lista actualizada y los
 * badges nuevos (para celebrar y persistir con seen:false).
 */
export function reconcileBadges(
  earnedIds: string[],
  persisted: EarnedBadge[],
  today = isoToday(),
): { all: EarnedBadge[]; newlyEarned: string[] } {
  const known = new Set(persisted.map((b) => b.badgeId));
  const newlyEarned = earnedIds.filter((id) => !known.has(id));
  const all = [
    ...persisted,
    ...newlyEarned.map((badgeId) => ({ badgeId, earnedAt: today, seen: false })),
  ];
  return { all, newlyEarned };
}
