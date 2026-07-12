import type { MembershipStatus } from "@/lib/xtreme/checkin/contracts";

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa",
  warning: "Por vencer",
  expired: "Vencida",
};
