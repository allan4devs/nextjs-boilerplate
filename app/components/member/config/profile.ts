import type { NotificationPrefs } from "../domain/member";

export const GOALS = [
  "Ganar fuerza",
  "Bajar grasa",
  "Ser constante",
  "Volver al ritmo",
];

export const REMINDERS = [
  "Tu clase reservada es en 1 hora.",
  "No rompas la racha: hoy toca aunque sea suave.",
  "Tu membresia vence pronto, pasate por recepcion.",
];

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  streakRisk: true,
  milestones: true,
  renewalReminders: true,
  winBack: true,
  weeklyRecap: true,
};
