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
  level: {
    index: number;
    name: string;
    minXp: number;
    nextXp: number | null;
    progressPct: number;
  };
  badges: PublicBadge[];
  earnedBadgeCount: number;
  pinnedBadges: string[];
  unseenBadgeIds: string[];
};
