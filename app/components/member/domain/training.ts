import type { LucideIcon } from "lucide-react";

export type Training = {
  id: string;
  name: string;
  coach: string;
  time: string;
  minutes: number;
  intensity: string;
  slots: number;
  focus: string;
  color: string;
  icon: LucideIcon;
};

export type MachineGuide = {
  id: string;
  name: string;
  zone: string;
  level: string;
  muscles: string[];
  setup: string;
  tips: string[];
  mistakes: string[];
  starter: string;
  accent: string;
  /** Foto principal del equipo / zona (path en /public). */
  image: string;
  /** Fotos extra para la galería del modal. */
  images?: string[];
  /** Enlace a video de técnica (YouTube u otro). */
  videoUrl?: string;
  /** Título corto del botón de video. */
  videoLabel?: string;
  /** Frase de una línea: para qué sirve. Se usa en el catálogo /maquinas y en el metadata. */
  summary?: string;
  /** Dónde está en el piso del gym (ej. "Zona de pierna, pared norte"). */
  location?: string;
  /** Distingue una máquina concreta de una zona/estación. Por defecto se trata como máquina. */
  kind?: "maquina" | "zona";
};

export type Routine = {
  name: string;
  level: string;
  exercises: string[];
  video: string;
};

export type GuideWorkout = {
  goal: string;
  steps: string[];
};
