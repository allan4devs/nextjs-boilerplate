export type MembershipStatus = "active" | "warning" | "expired";

export type RecentCheckinSummary = {
  id: string;
  memberName: string;
  accessCode: string;
  membershipStatus: string;
  checkedInAt: string;
  method: string;
};

export type GymStatus = {
  date: string;
  capacity: number;
  currentPeople: number;
  occupancyPct: number;
  level: string;
  checkinsToday: number;
  uniqueCheckins: number;
  recent: RecentCheckinSummary[];
};

/**
 * Serialized member lookup for kiosk (reduced) and reception (full with admin header).
 * Public kiosk responses omit phone/email/cedula/accessCode.
 */
export type MemberHit = {
  memberName: string;
  normalizedName: string;
  goal?: string;
  accessCode?: string;
  plan: string;
  lastPaidAt?: string;
  nextBillingDate?: string;
  membershipStatus: MembershipStatus;
  daysRemaining: number;
  streak: number;
  totalWorkouts?: number;
  coach?: string;
  phone?: string;
  email?: string;
  cedula?: string;
  photoUrl?: string;
  hasPin?: boolean;
  hasFace?: boolean;
  /** Plantilla del reconocedor real (no solo foto o dHash heredado). */
  faceEnrolled?: boolean;
  /** Sistema anterior: distancia Hamming del dHash (más bajo = más parecido). */
  faceDistance?: number;
  /** Reconocedor real: similitud coseno 0..1 (más alto = más parecido). */
  faceSimilarity?: number;
  faceSamples?: number;
  levelName?: string;
};
