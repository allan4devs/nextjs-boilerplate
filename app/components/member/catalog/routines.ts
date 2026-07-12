import type { Routine } from "../domain/training";

export const ROUTINES: Routine[] = [
  {
    name: "Base Fuerza Xtreme",
    level: "Intermedio",
    exercises: ["Sentadilla 4x8", "Press banca 4x8", "Remo 3x10"],
    video: "Video coach",
  },
  {
    name: "Quemador 30",
    level: "Alta intensidad",
    exercises: ["Air bike 8x30s", "Burpees 4x12", "Plancha 3x45s"],
    video: "Video HIIT",
  },
  {
    name: "Lower Lab",
    level: "Control",
    exercises: ["Hip thrust 4x10", "Peso muerto rumano 3x10", "Abduccion 3x15"],
    video: "Video tecnica",
  },
];
