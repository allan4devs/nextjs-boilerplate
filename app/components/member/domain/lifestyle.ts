export const HABIT_IDS = [
  "water",
  "protein",
  "produce",
  "mobility",
  "walk",
  "sleep",
] as const;

export type HabitId = (typeof HABIT_IDS)[number];
export type LifestyleChallengeId = "hydration-7" | "mobility-7" | "steps-5" | "sleep-7";

export type WellnessEntry = {
  date: string;
  energy: number;
  mood: number;
  soreness: number;
  sleepHours: number;
  waterCups: number;
  steps: number;
  habits: Partial<Record<HabitId, boolean>>;
  note: string;
  updatedAt: string;
};

export type LifestyleGoal = {
  id: string;
  title: string;
  target: number;
  progress: number;
  unit: string;
  deadline: string;
  createdAt: string;
};

export type PersonalRecord = {
  id: string;
  exercise: string;
  value: number;
  unit: string;
  achievedOn: string;
  createdAt: string;
};

export type VisitFeedback = {
  id: string;
  rating: number;
  category: string;
  message: string;
  createdAt: string;
};

export type MemberLifestyle = {
  today: WellnessEntry | null;
  recent: WellnessEntry[];
  goals: LifestyleGoal[];
  personalRecords: PersonalRecord[];
  joinedChallenges: LifestyleChallengeId[];
  feedback: VisitFeedback[];
};
