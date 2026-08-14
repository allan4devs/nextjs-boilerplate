import type { MembershipStatus } from "@/lib/xtreme/checkin/contracts";

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa",
  warning: "Por vencer",
  expired: "Vencida",
};

/** Atajos de socios recientes que muestra el kiosco de ingreso. */
export const MAX_RECENT_PROFILES = 4;

/** Frames con rostro dentro del óvalo antes de escanear (~0.7 s). */
export const FACE_HOLD_MS = 700;
/** Pausa tras un escaneo, para no re-disparar con la misma persona. */
export const FACE_COOLDOWN_MS = 3500;
/** Cadencia del loop de detección del kiosco. */
export const FACE_POLL_MS = 120;
