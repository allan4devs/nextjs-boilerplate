import { DEFAULT_NOTIF_PREFS } from "../config/profile";
import type { Member } from "../domain/member";
import { todayIso } from "./date";
import { memberCode } from "./identity";

export function initialMember(name = ""): Member {
  const normalizedName = name.trim().toUpperCase();
  return {
    memberName: name,
    normalizedName,
    accessCode: normalizedName ? memberCode(normalizedName) : "",
    goal: "",
    favoriteTraining: "",
    phone: "",
    email: "",
    cedula: "",
    emailVerified: false,
    photoUrl: "",
    workouts: [],
    streak: 0,
    totalWorkouts: 0,
    totalMinutes: 0,
    lastWorkoutDate: null,
    membership: {
      plan: "Sin plan activo",
      status: "expired",
      startedAt: todayIso(),
      nextBillingDate: todayIso(),
      daysRemaining: -1,
    },
    bodyMetrics: [],
    latestBodyMetric: null,
    trainingPlan: null,
    activePlanWorkout: null,
    notificationPrefs: { ...DEFAULT_NOTIF_PREFS },
    pinnedBadges: [],
  };
}
