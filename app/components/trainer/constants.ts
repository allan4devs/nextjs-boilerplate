import type { PlanTemplate, TrainerFilter, TrainerTab } from "./types";

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
  { id: "plan", label: "Plan de trabajo" },
  { id: "history", label: "Ejecución" },
];

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "starter",
    name: "Base técnica",
    description: "Adaptación de cuerpo completo y dominio de las máquinas.",
    weeklySessions: 3,
    objective: "Construir técnica, confianza y constancia sin fatiga excesiva.",
    sessions: [
      { day: "Día A", focus: "Full body base", targetMinutes: 45, exercises: "Tempo controlado y dos repeticiones en reserva.", machines: [{ machineId: "leg-press", sets: 3, reps: 10 }, { machineId: "chest-press", sets: 3, reps: 10 }, { machineId: "lat-pulldown", sets: 3, reps: 10 }] },
      { day: "Día B", focus: "Posterior y postura", targetMinutes: 45, exercises: "Priorizar rango completo y control escapular.", machines: [{ machineId: "leg-curl", sets: 3, reps: 12 }, { machineId: "seated-row", sets: 3, reps: 10 }, { machineId: "cable-station", sets: 3, reps: 12, notes: "Core en polea" }] },
      { day: "Día C", focus: "Full body progreso", targetMinutes: 50, exercises: "Repetir patrones y subir carga solo con técnica limpia.", machines: [{ machineId: "leg-press", sets: 3, reps: 12 }, { machineId: "chest-press", sets: 3, reps: 12 }, { machineId: "seated-row", sets: 3, reps: 12 }] },
    ],
  },
  {
    id: "strength",
    name: "Fuerza base",
    description: "Compuestos guiados, descansos amplios y progresión medible.",
    weeklySessions: 3,
    objective: "Aumentar fuerza general manteniendo ejecución estable.",
    sessions: [
      { day: "Fuerza 1", focus: "Pierna + empuje", targetMinutes: 60, exercises: "Descansar 90-120 segundos en series principales.", machines: [{ machineId: "leg-press", sets: 4, reps: 8 }, { machineId: "chest-press", sets: 4, reps: 8 }, { machineId: "leg-curl", sets: 3, reps: 10 }] },
      { day: "Fuerza 2", focus: "Espalda + core", targetMinutes: 55, exercises: "Pausa de un segundo en la contracción.", machines: [{ machineId: "lat-pulldown", sets: 4, reps: 8 }, { machineId: "seated-row", sets: 4, reps: 8 }, { machineId: "cable-station", sets: 3, reps: 10, notes: "Anti-rotación" }] },
      { day: "Fuerza 3", focus: "Full body", targetMinutes: 65, exercises: "Registrar cargas y buscar una mejora pequeña por semana.", machines: [{ machineId: "leg-press", sets: 5, reps: 6 }, { machineId: "chest-press", sets: 4, reps: 8 }, { machineId: "seated-row", sets: 4, reps: 8 }] },
    ],
  },
  {
    id: "hypertrophy",
    name: "Hipertrofia",
    description: "Volumen moderado, rangos de 8-15 y trabajo por zonas.",
    weeklySessions: 4,
    objective: "Ganar masa muscular con volumen progresivo y buena recuperación.",
    sessions: [
      { day: "Superior A", focus: "Pecho y espalda", targetMinutes: 65, exercises: "Alternar empuje y jalón.", machines: [{ machineId: "chest-press", sets: 4, reps: 10 }, { machineId: "lat-pulldown", sets: 4, reps: 10 }, { machineId: "seated-row", sets: 3, reps: 12 }] },
      { day: "Inferior A", focus: "Cuádriceps y femoral", targetMinutes: 60, exercises: "Controlar la fase excéntrica durante 3 segundos.", machines: [{ machineId: "leg-press", sets: 4, reps: 12 }, { machineId: "leg-curl", sets: 4, reps: 12 }] },
      { day: "Superior B", focus: "Espalda y brazos", targetMinutes: 60, exercises: "Mantener tensión continua.", machines: [{ machineId: "seated-row", sets: 4, reps: 10 }, { machineId: "lat-pulldown", sets: 3, reps: 12 }, { machineId: "cable-station", sets: 3, reps: 15, notes: "Bíceps y tríceps" }] },
      { day: "Inferior B", focus: "Glúteo y posterior", targetMinutes: 60, exercises: "Finalizar con core estable.", machines: [{ machineId: "leg-curl", sets: 4, reps: 10 }, { machineId: "leg-press", sets: 3, reps: 15 }, { machineId: "cable-station", sets: 3, reps: 12, notes: "Pull-through" }] },
    ],
  },
  {
    id: "conditioning",
    name: "Acondicionamiento",
    description: "Circuitos eficientes para capacidad de trabajo y adherencia.",
    weeklySessions: 3,
    objective: "Mejorar resistencia, movilidad y tolerancia al esfuerzo.",
    sessions: [
      { day: "Circuito A", focus: "Full body", targetMinutes: 40, exercises: "Tres vueltas; 45 segundos entre estaciones.", machines: [{ machineId: "leg-press", sets: 3, reps: 15 }, { machineId: "chest-press", sets: 3, reps: 12 }, { machineId: "seated-row", sets: 3, reps: 12 }] },
      { day: "Circuito B", focus: "Posterior + core", targetMinutes: 40, exercises: "Ritmo sostenible, sin perder postura.", machines: [{ machineId: "leg-curl", sets: 3, reps: 15 }, { machineId: "lat-pulldown", sets: 3, reps: 12 }, { machineId: "cable-station", sets: 3, reps: 12, notes: "Core dinámico" }] },
      { day: "Circuito C", focus: "Densidad", targetMinutes: 45, exercises: "Completar el trabajo con descansos de 30‑45 segundos.", machines: [{ machineId: "leg-press", sets: 4, reps: 12 }, { machineId: "chest-press", sets: 4, reps: 10 }, { machineId: "lat-pulldown", sets: 4, reps: 10 }] },
    ],
  },
];

