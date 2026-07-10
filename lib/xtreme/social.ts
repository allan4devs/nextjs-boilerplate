/**
 * Xtreme Gym — Capa social (Fase 5): liga mensual, referidos y compas.
 * Funciones puras, sin dependencias de servidor: se puede importar
 * tanto desde rutas API como desde componentes cliente.
 */

import {
  WEEKLY_GOAL_DEFAULT,
  WEEKLY_GOAL_MAX,
  WEEKLY_GOAL_MIN,
  XP_RULES,
  isoToday,
  weekStartIso,
  type WorkoutLike,
} from "./gamification";

// ---------------------------------------------------------------------------
// XP mensual (insumo del leaderboard — se reinicia cada mes)
// ---------------------------------------------------------------------------

/** "YYYY-MM" del mes al que pertenece una fecha ISO. */
export function monthKeyOf(date = isoToday()) {
  return date.slice(0, 7);
}

/**
 * XP ganado dentro de un mes: entrenos + minutos + medidas + semanas con
 * meta cumplida (la semana cuenta en el mes donde cae su lunes). Es un
 * subconjunto del XP total: sin badges ni plan, para que la liga premie
 * actividad del mes y no antiguedad.
 */
export function computeMonthlyXp(args: {
  workouts: WorkoutLike[];
  metricDates: string[];
  weeklyGoal: number;
  monthKey?: string;
}) {
  const monthKey = args.monthKey ?? monthKeyOf();
  const goal = Math.max(
    WEEKLY_GOAL_MIN,
    Math.min(WEEKLY_GOAL_MAX, args.weeklyGoal || WEEKLY_GOAL_DEFAULT),
  );

  let xp = 0;
  const daysByWeek = new Map<string, Set<string>>();
  for (const w of args.workouts) {
    const date = w.completedDate;
    if (!date) continue;
    if (date.slice(0, 7) === monthKey) {
      xp += XP_RULES.perWorkout + Math.floor((w.minutes || 0) / 10) * XP_RULES.perTenMinutes;
    }
    const week = weekStartIso(date);
    if (week.slice(0, 7) !== monthKey) continue;
    if (!daysByWeek.has(week)) daysByWeek.set(week, new Set());
    daysByWeek.get(week)!.add(date);
  }
  for (const days of daysByWeek.values()) {
    if (days.size >= goal) xp += XP_RULES.perWeekMet;
  }
  for (const date of args.metricDates) {
    if (date.slice(0, 7) === monthKey) xp += XP_RULES.perMetric;
  }
  return xp;
}

// ---------------------------------------------------------------------------
// Ligas mensuales
// ---------------------------------------------------------------------------

export const LEAGUES = [
  { name: "Bronce", minXp: 0 },
  { name: "Plata", minXp: 300 },
  { name: "Oro", minXp: 800 },
  { name: "Diamante", minXp: 1600 },
] as const;

export type LeagueInfo = {
  index: number; // 1-based
  name: string;
  minXp: number;
  nextXp: number | null;
  progressPct: number;
};

export function leagueForMonthlyXp(xp: number): LeagueInfo {
  let index = 0;
  for (let i = 0; i < LEAGUES.length; i += 1) {
    if (xp >= LEAGUES[i].minXp) index = i;
  }
  const current = LEAGUES[index];
  const next = LEAGUES[index + 1] ?? null;
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
// Privacidad: en la liga solo se muestra el primer nombre
// ---------------------------------------------------------------------------

export function firstNameOf(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  if (!first) return "Socio";
  return first[0].toUpperCase() + first.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Referidos — "Trae un amigo: ambos ganan una semana"
// ---------------------------------------------------------------------------

export const REFERRAL_REWARD_DAYS = 7;
/** Ventana (dias desde createdAt) en la que un socio nuevo puede canjear. */
export const REFERRAL_REDEEM_WINDOW_DAYS = 30;

// ---------------------------------------------------------------------------
// Compas de entreno
// ---------------------------------------------------------------------------

export const BUDDIES_MAX = 12;
