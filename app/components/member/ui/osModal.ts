import type { MachineGuide, Training } from "../domain/training";

export type OsModal =
  | null
  | { kind: "machine"; machineId: MachineGuide["id"] }
  | { kind: "membership" }
  | { kind: "occupancy" }
  | { kind: "streak" }
  | { kind: "level" }
  | { kind: "week" }
  | { kind: "training"; trainingId: Training["id"] }
  | { kind: "badges" }
  | { kind: "quick-train" };
