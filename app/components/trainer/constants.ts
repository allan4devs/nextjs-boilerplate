import type { TrainerFilter, TrainerTab } from "./types";

export const DEFAULT_COACH_NAME = "Entrenador Xtreme";

export const TRAINER_FILTERS: Array<{ id: TrainerFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "attention", label: "Atención" },
  { id: "active", label: "Entrenando" },
  { id: "without-plan", label: "Sin plan" },
  { id: "completed", label: "Completados" },
];

export const TRAINER_TABS: Array<{ id: TrainerTab; label: string }> = [
  { id: "overview", label: "Radiografía" },
  { id: "health", label: "Ficha personal y salud" },
  { id: "plan", label: "Plan de trabajo" },
  { id: "history", label: "Ejecución" },
];
