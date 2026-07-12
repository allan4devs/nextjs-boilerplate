import { DEFAULT_NOTIF_PREFS } from "../config/profile";
import type { Member } from "../domain/member";
import { todayIso } from "./date";

export function initialMember(name = ""): Member {
  return {
    memberName: name,
    normalizedName: name.toUpperCase(),
    goal: "",
    favoriteTraining: "",
    phone: "",
    email: "",
    cedula: "",
    photoUrl: "",
    workouts: [],
    streak: 0,
    totalWorkouts: 0,
    totalMinutes: 0,
    lastWorkoutDate: null,
    membership: {
      plan: "Xtreme Mensual",
      status: "active",
      startedAt: todayIso(),
      nextBillingDate: todayIso(),
      daysRemaining: 30,
    },
    bodyMetrics: [],
    latestBodyMetric: null,
    trainingPlan: null,
    notificationPrefs: { ...DEFAULT_NOTIF_PREFS },
    pinnedBadges: [],
  };
}
