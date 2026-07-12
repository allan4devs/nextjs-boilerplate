import { createElement } from "react";
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
  Star,
  Sunrise,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import type { PublicBadge } from "../member/domain";

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

export function BadgeCard({ badge }: { badge: PublicBadge }) {
  const style = tierStyle(badge.tier);
  const Icon = badgeIcon(badge.icon);
  const progressPercentage = badge.progress
    ? Math.min(
        100,
        Math.round(
          (badge.progress.current / Math.max(1, badge.progress.target)) * 100,
        ),
      )
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
        {badge.earned ? (
          createElement(Icon, { className: "h-5 w-5" })
        ) : (
          <Lock className="h-4 w-4" />
        )}
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
              <div className="h-full bg-[#d8ff3e]/70" style={{ width: `${progressPercentage}%` }} />
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
  const earned = badges.filter((badge) => badge.earned);
  const pending = badges.filter((badge) => !badge.earned);
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...earned, ...pending].map((badge) => (
        <BadgeCard key={badge.id} badge={badge} />
      ))}
    </div>
  );
}

export function nextBadgeUp(badges: PublicBadge[]): PublicBadge | null {
  let best: PublicBadge | null = null;
  let bestPercentage = -1;
  for (const badge of badges) {
    if (badge.earned || badge.secret || !badge.progress) continue;
    const percentage = badge.progress.current / Math.max(1, badge.progress.target);
    if (percentage > bestPercentage) {
      bestPercentage = percentage;
      best = badge;
    }
  }
  return best;
}
