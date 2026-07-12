import {
  formatAccessCode,
  memberAccessCode,
  mergeNotificationPrefs,
} from "@/lib/xtreme/shared";
import { buildMemberGamification } from "./gamification-service";
import { membershipWithStatus, toPublicTrainingPlan } from "./membership";
import type { XtremeMemberDoc } from "./types";

/** Maps persistence data to the Member OS response without reading or writing I/O. */
export function toPublicMember(
  doc: XtremeMemberDoc | null,
  today: string,
  entitlements: unknown[] = [],
) {
  const workouts = doc?.workouts ?? [];
  const bodyMetrics = [...(doc?.bodyMetrics ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const totalMinutes = workouts.reduce(
    (sum, workout) => sum + (workout.minutes || 0),
    0,
  );
  const favoriteTraining =
    doc?.favoriteTraining || workouts.at(-1)?.trainingName || "";
  const gamification = buildMemberGamification(doc, today);
  const lastWorkoutDate = workouts
    .map((workout) => workout.completedDate)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return {
    memberName: doc?.memberName ?? "",
    normalizedName: doc?.normalizedName ?? "",
    goal: doc?.goal ?? "",
    favoriteTraining,
    phone: doc?.phone ?? "",
    email: doc?.email ?? "",
    cedula: doc?.cedula ?? "",
    emailVerified: Boolean(doc?.emailVerified),
    photoUrl: doc?.photoUrl ?? "",
    accessCode: formatAccessCode(memberAccessCode(doc?.normalizedName ?? "")),
    workouts,
    streak: gamification.streak,
    totalWorkouts: workouts.length,
    totalMinutes,
    lastWorkoutDate,
    membership: membershipWithStatus(doc?.membership, today),
    bodyMetrics,
    latestBodyMetric: bodyMetrics.at(-1) ?? null,
    trainingPlan: toPublicTrainingPlan(doc?.trainingPlan),
    notificationPrefs: mergeNotificationPrefs(doc?.notificationPrefs),
    tourDone: Boolean(doc?.tourDoneAt),
    pinnedBadges: gamification.pinnedBadges,
    gamification,
    entitlements,
  };
}
