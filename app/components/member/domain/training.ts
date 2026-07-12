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
