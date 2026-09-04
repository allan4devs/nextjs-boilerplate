import type { StaffRole } from "./shared/config";

export type StaffId =
  | "allan"
  | "alejandro"
  | "eileen"
  | "victoria"
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
  { id: "victoria", name: "Victoria", role: "reception", title: "Recepción", area: "reception" },
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

/**
 * Quién puede operar el mostrador y con qué orden aparece en el selector de
 * recepción. Es una lista de autorización operativa, aparte del `role` del
 * directorio: incluye a Kengie (entrenador) y Allan (super admin), que atienden
 * recepción con su PIN propio de mostrador —nunca con el código de admin—.
 * Cada quien entra como `role: "reception"`, sin importar su rol en el directorio.
 */
export const RECEPTION_OPERATOR_IDS = [
  "valeska",
  "victoria",
  "kengie",
  "allan",
] as const satisfies readonly StaffId[];

export type ReceptionOperatorId = (typeof RECEPTION_OPERATOR_IDS)[number];

export const RECEPTION_OPERATORS: readonly StaffProfile[] = RECEPTION_OPERATOR_IDS.map(
  (id) => STAFF_DIRECTORY.find((person) => person.id === id)!,
);

export function isReceptionOperator(id: string): id is ReceptionOperatorId {
  return (RECEPTION_OPERATOR_IDS as readonly string[]).includes(id);
}

export function receptionOperatorProfile(id: string): StaffProfile | null {
  return isReceptionOperator(id) ? staffProfile(id) : null;
}
