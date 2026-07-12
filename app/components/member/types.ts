/**
 * Barrel de compatibilidad del Member OS.
 * Los contratos viven en domain/, api/ y ui/; los imports históricos
 * desde `./types` siguen siendo válidos durante la migración.
 */

export type {
  BodyMetric,
  Gamification,
  GuideWorkout,
  MachineGuide,
  Member,
  MemberPlan,
  Membership,
  NextBestAction,
  NextBestActionKind,
  NotificationPrefs,
  PlanItem,
  PublicBadge,
  Reservation,
  ReservationState,
  Routine,
  Training,
  Workout,
} from "./domain";
export type {
  GymStatus,
  MemberLookupResponse,
  MemberProfilePatch,
  MembersResponse,
  ReservationMutationResponse,
  ReservationsResponse,
} from "./api";
export type { OsModal } from "./ui";
