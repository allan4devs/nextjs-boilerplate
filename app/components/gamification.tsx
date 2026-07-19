"use client";

/**
 * Xtreme Gym - Componentes de gamificacion (Fase 1).
 * Anillo de racha, XP/nivel, galeria de badges y celebraciones.
 */

import { createElement, useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarCheck,
  CalendarHeart,
  ClipboardCheck,
  Crown,
  Dumbbell,
  Flame,
  Gauge,
  Gift,
  Lock,
  Medal,
  Moon,
  PartyPopper,
  Rocket,
  Ruler,
  Shield,
  Snowflake,
  Star,
  Sunrise,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { pickPhrase, type PhraseContext } from "@/lib/xtreme/phrases";
import type { Gamification, PublicBadge } from "./member/domain";

// ---------------------------------------------------------------------------
// Tipos (estructuralmente compatibles con la respuesta del API)
// ---------------------------------------------------------------------------

export type { PublicBadge } from "./member/domain";
export type LevelPayload = Gamification["level"];

// ---------------------------------------------------------------------------
// Iconos y estilos por tier
// ---------------------------------------------------------------------------

const BADGE_ICONS: Record<string, typeof Flame> = {
  Star,
  Flame,
  Rocket,
  Crown,
  CalendarCheck,
  CalendarHeart,
  Dumbbell,
  Medal,
  Trophy,
  Timer,
  Gauge,
  Sunrise,
  Moon,
  Swords,
  Target,
  Zap,
  Shield,
  Ruler,
  TrendingUp,
  ClipboardCheck,
  Gift,
  PartyPopper,
};

export function badgeIcon(name: string) {
  return BADGE_ICONS[name] ?? Award;
}

export const TIER_STYLES: Record<
  string,
  { label: string; chip: string; icon: string; border: string }
> = {
  bronze: {
    label: "Bronce",
    chip: "bg-orange-300/15 text-orange-200 border-orange-300/40",
    icon: "bg-gradient-to-br from-orange-300 to-amber-600 text-black",
    border: "border-orange-300/40",
  },
  silver: {
    label: "Plata",
    chip: "bg-slate-200/10 text-slate-200 border-slate-200/40",
    icon: "bg-gradient-to-br from-slate-100 to-slate-400 text-black",
    border: "border-slate-200/40",
  },
  gold: {
    label: "Oro",
    chip: "bg-yellow-300/15 text-yellow-200 border-yellow-300/50",
    icon: "bg-gradient-to-br from-yellow-200 to-amber-400 text-black",
    border: "border-yellow-300/50",
  },
  platinum: {
    label: "Platino",
    chip: "bg-cyan-200/10 text-cyan-100 border-cyan-200/50",
    icon: "bg-gradient-to-br from-cyan-200 to-indigo-300 text-black",
    border: "border-cyan-200/50",
  },
};

export function tierStyle(tier: string) {
  return TIER_STYLES[tier] ?? TIER_STYLES.bronze;
}

// ---------------------------------------------------------------------------
// Contexto de frase segun el estado del socio
// ---------------------------------------------------------------------------

export function phraseContextFor(args: {
  trainedToday: boolean;
  streak: number;
  totalWorkouts: number;
  lastWorkoutDate: string | null;
}): PhraseContext {
  const hour = new Date().getHours();
  if (args.trainedToday) return "postWorkout";
  if (args.streak > 0) return "streakRisk";
  if (args.totalWorkouts > 0 && args.lastWorkoutDate) {
    const days = Math.floor(
      (Date.now() - new Date(`${args.lastWorkoutDate}T00:00:00Z`).getTime()) / 86_400_000,
    );
    if (days >= 3) return "comeback";
  }
  if (hour < 10) return "morning";
  if (hour >= 18) return "evening";
  return "welcome";
}

// ---------------------------------------------------------------------------
// Anillo de racha
// ---------------------------------------------------------------------------

export function StreakRing({
  streak,
  freezes,
  weekCount,
  weeklyGoal,
}: {
  streak: number;
  freezes: number;
  weekCount: number;
  weeklyGoal: number;
}) {
  const size = 180;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // El anillo se llena hacia el siguiente hito de racha.
  const milestones = [3, 7, 14, 30, 60, 100, 200, 365];
  const nextMilestone = milestones.find((m) => m > streak) ?? streak + 1;
  const prevMilestone = [...milestones].reverse().find((m) => m <= streak) ?? 0;
  const span = Math.max(1, nextMilestone - prevMilestone);
  const pct = streak <= 0 ? 0 : Math.min(1, (streak - prevMilestone) / span);
  const [offset, setOffset] = useState(c);

  useEffect(() => {
    // Anima el llenado al montar / cambiar.
    const id = window.setTimeout(() => setOffset(c - c * pct), 80);
    return () => window.clearTimeout(id);
  }, [c, pct]);

  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="xg-ring -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#xg-streak-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="xg-ring-progress"
        />
        <defs>
          <linearGradient id="xg-streak-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d8ff3e" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <Flame className={`mx-auto h-8 w-8 text-orange-400 ${streak > 0 ? "xg-flame" : "opacity-30"}`} />
          <p className="mt-1 text-5xl font-black leading-none text-white">{streak}</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
            {streak === 1 ? "dia de racha" : "dias de racha"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/35">
            {weekCount}/{weeklyGoal} esta semana
          </p>
        </div>
      </div>
      {freezes > 0 && (
        <div className="absolute -right-1 top-2 flex flex-col gap-1">
          {Array.from({ length: freezes }).map((_, i) => (
            <span
              key={i}
              title="Protector de racha: cubre un dia sin entrenar"
              className="grid h-7 w-7 place-items-center rounded-full border border-cyan-300/50 bg-cyan-300/15"
            >
              <Snowflake className="h-4 w-4 text-cyan-300" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barra de XP / nivel
// ---------------------------------------------------------------------------

export function XpBar({ xp, level }: { xp: number; level: LevelPayload }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
            Nivel {level.index}
          </p>
          <p className="text-2xl font-black uppercase leading-tight text-white">{level.name}</p>
        </div>
        <p className="pb-1 text-sm font-black text-white/55">
          {xp.toLocaleString()} XP
          {level.nextXp !== null && (
            <span className="text-white/35"> / {level.nextXp.toLocaleString()}</span>
          )}
        </p>
      </div>
      <div className="mt-3 h-3 border-[3px] border-white/15 bg-black/45">
        <div
          className="h-full bg-gradient-to-r from-cyan-300 to-[#d8ff3e] transition-all duration-700"
          style={{ width: `${level.progressPct}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-white/45">
        {level.nextXp !== null
          ? `${(level.nextXp - xp).toLocaleString()} XP para el siguiente nivel.`
          : "Nivel máximo. Sos Xtreme."}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjetas de badges
// ---------------------------------------------------------------------------

export function BadgeCard({ badge }: { badge: PublicBadge }) {
  const style = tierStyle(badge.tier);
  const Icon = badgeIcon(badge.icon);
  const pct = badge.progress
    ? Math.min(100, Math.round((badge.progress.current / Math.max(1, badge.progress.target)) * 100))
    : 0;

  return (
    <div
      className={`flex items-center gap-3 border-[3px] p-3 shadow-[3px_3px_0_rgba(0,0,0,.4)] ${
        badge.earned ? `${style.border} bg-white/[0.06]` : "border-white/15 bg-black/30"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center border-2 border-black/20 ${
          badge.earned ? style.icon : "bg-white/10 text-white/35"
        }`}
      >
        {badge.earned ? createElement(Icon, { className: "h-5 w-5" }) : <Lock className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-black uppercase ${badge.earned ? "text-white" : "text-white/55"}`}>
            {badge.name}
          </p>
          <span className={`shrink-0 border-2 px-1.5 py-0.5 text-[9px] font-black uppercase ${style.chip}`}>
            {style.label}
          </span>
        </div>
        <p className="truncate text-xs font-semibold text-white/40">{badge.desc}</p>
        {!badge.earned && badge.progress && badge.progress.current > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-white/10">
              <div className="h-full bg-[#d8ff3e]/70" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-black text-white/45">
              {badge.progress.current}/{badge.progress.target}
            </span>
          </div>
        )}
        {badge.earned && badge.earnedAt && (
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-[#eaff93]/70">
            {badge.earnedAt}
          </p>
        )}
      </div>
    </div>
  );
}

export function BadgeGallery({ badges }: { badges: PublicBadge[] }) {
  const earned = badges.filter((b) => b.earned);
  const pending = badges.filter((b) => !b.earned);
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...earned, ...pending].map((badge) => (
        <BadgeCard key={badge.id} badge={badge} />
      ))}
    </div>
  );
}

/** Badge no ganado mas cercano a completarse (para "te falta poco"). */
export function nextBadgeUp(badges: PublicBadge[]): PublicBadge | null {
  let best: PublicBadge | null = null;
  let bestPct = -1;
  for (const badge of badges) {
    if (badge.earned || badge.secret || !badge.progress) continue;
    const pct = badge.progress.current / Math.max(1, badge.progress.target);
    if (pct > bestPct) {
      bestPct = pct;
      best = badge;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Celebracion (confetti CSS + tarjeta)
// ---------------------------------------------------------------------------

export type CelebrationData = {
  title: string;
  subtitle: string;
  phraseContext: PhraseContext;
  badges: PublicBadge[];
};

const CONFETTI_COLORS = ["#d8ff3e", "#fbbf24", "#f97316", "#22d3ee", "#f472b6", "#ffffff"];

function ConfettiRain() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: `${(i * 13.7) % 100}%`,
        size: 6 + ((i * 7) % 8),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: `${((i * 37) % 140) / 100}s`,
        duration: `${2.2 + ((i * 53) % 180) / 100}s`,
        round: i % 3 === 0,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="xg-confetti"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * (p.round ? 1 : 1.8),
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : 0,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

export function CelebrationOverlay({
  data,
  memberName,
  streak,
  onClose,
}: {
  data: CelebrationData;
  memberName: string;
  streak: number;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const phrase = pickPhrase(data.phraseContext, memberName, { streak });

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-5 backdrop-blur-sm">
      <ConfettiRain />
      <div className="xg-pop relative w-full max-w-md border border-[#d8ff3e]/40 bg-[#0a0a0a] p-6 text-center shadow-[0_0_80px_rgba(216,255,62,0.15)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center border border-white/15 text-white/50 transition hover:border-white/40 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8ff3e]">{data.title}</p>
        <h2 className="mt-2 text-3xl font-black uppercase leading-tight text-white">{data.subtitle}</h2>

        {data.badges.length > 0 && (
          <div className="mt-5 grid gap-2">
            {data.badges.map((badge) => {
              const style = tierStyle(badge.tier);
              const Icon = badgeIcon(badge.icon);
              return (
                <div key={badge.id} className={`flex items-center gap-3 border p-3 text-left ${style.border} bg-white/[0.05]`}>
                  <span className={`grid h-12 w-12 shrink-0 place-items-center ${style.icon}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-black uppercase text-white">{badge.name}</p>
                    <p className="text-xs font-semibold text-white/50">{badge.desc}</p>
                  </div>
                  <span className={`ml-auto shrink-0 border px-2 py-1 text-[10px] font-black uppercase ${style.chip}`}>
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-5 text-sm font-semibold text-white/55">{phrase}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full bg-[#d8ff3e] px-4 py-3 font-black uppercase text-black transition hover:bg-white"
        >
          Seguimos
        </button>
      </div>
    </div>
  );
}
