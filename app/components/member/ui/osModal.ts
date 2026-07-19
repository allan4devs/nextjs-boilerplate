import type { MachineGuide, Training } from "../domain/training";

export type AccessRequiredReason =
  | "payment_required"
  | "expired"
  | "limit_reached"
  | "no_member";

export type OsModal =
  | null
  | { kind: "machine"; machineId: MachineGuide["id"] }
  | { kind: "membership" }
  | { kind: "checkout"; planId: "week" | "fortnight" | "month" | "day-pass" }
  | {
      kind: "access-required";
      reason: AccessRequiredReason;
      message: string;
      trainingName?: string;
      checkoutOptionId?: string;
    }
  | { kind: "occupancy" }
  | { kind: "streak" }
  | { kind: "level" }
  | { kind: "week" }
  | { kind: "training"; trainingId: Training["id"] }
  | { kind: "badges" }
  | { kind: "quick-train" };
