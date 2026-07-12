import type { PhraseContext } from "@/lib/xtreme/phrases";

type PhraseContextInput = {
  trainedToday: boolean;
  streak: number;
  totalWorkouts: number;
  lastWorkoutDate: string | null;
};

export function phraseContextFor(input: PhraseContextInput): PhraseContext {
  const hour = new Date().getHours();
  if (input.trainedToday) return "postWorkout";
  if (input.streak > 0) return "streakRisk";
  if (input.totalWorkouts > 0 && input.lastWorkoutDate) {
    const days = Math.floor(
      (Date.now() - new Date(`${input.lastWorkoutDate}T00:00:00Z`).getTime()) /
        86_400_000,
    );
    if (days >= 3) return "comeback";
  }
  if (hour < 10) return "morning";
  if (hour >= 18) return "evening";
  return "welcome";
}
