export type NextBestActionKind =
  | "train_today"
  | "protect_streak"
  | "renew_plan"
  | "book_class"
  | "coach_note"
  | "badge_progress"
  | "invite_buddy"
  | "second_visit"
  | "recovery";

export type NextBestAction = {
  kind: NextBestActionKind;
  title: string;
  body: string;
  cta: string;
  href: string;
  priority: number;
};
