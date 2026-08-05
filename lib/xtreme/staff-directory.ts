import type { StaffRole } from "./shared/config";

export type StaffId =
  | "allan"
  | "alejandro"
  | "eileen"
  | "veronica"
  | "valeska"
  | "kengie"
  | "josue"
  | "alberto";

export type StaffProfile = {
  id: StaffId;
  name: string;
  role: StaffRole | "vip_admin";
  title: string;
  area: "gym" | "reception" | "training_floor" | "vip";
  shift?: "morning" | "afternoon";
};

/** Directorio oficial. Es identidad visible, nunca contiene PIN ni secretos. */
export const STAFF_DIRECTORY: readonly StaffProfile[] = [
  { id: "allan", name: "Allan", role: "super", title: "Super admin", area: "gym" },
  { id: "alejandro", name: "Alejandro", role: "super", title: "Super admin", area: "gym" },
  { id: "eileen", name: "Eileen", role: "super", title: "Super admin", area: "gym" },
  { id: "veronica", name: "Verónica", role: "reception", title: "Recepción", area: "reception" },
  { id: "valeska", name: "Valeska", role: "reception", title: "Recepción", area: "reception" },
  { id: "kengie", name: "Kengie", role: "trainer", title: "Entrenador de planta · mañana", area: "training_floor", shift: "morning" },
  { id: "josue", name: "Josué", role: "trainer", title: "Entrenador de planta · tarde", area: "training_floor", shift: "afternoon" },
  { id: "alberto", name: "Alberto", role: "vip_admin", title: "Administrador del área VIP", area: "vip" },
] as const;

export function staffProfile(id: string | null | undefined) {
  return STAFF_DIRECTORY.find((person) => person.id === id) ?? null;
}

export const FLOOR_TRAINERS = STAFF_DIRECTORY.filter((person) => person.role === "trainer");
export const SUPER_ADMINS = STAFF_DIRECTORY.filter((person) => person.role === "super");
export const RECEPTION_STAFF = STAFF_DIRECTORY.filter((person) => person.role === "reception");
export const VIP_MANAGER = STAFF_DIRECTORY.find((person) => person.id === "alberto")!;
