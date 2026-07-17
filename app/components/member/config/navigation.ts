import {
  Activity,
  Dumbbell,
  HeartPulse,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from "lucide-react";

export const TABS = [
  { id: "resumen", label: "Resumen", icon: Activity },
  { id: "entrenar", label: "Entrenar", icon: Dumbbell },
  { id: "vida", label: "Vida", icon: HeartPulse },
  { id: "maquinas", label: "Maquinas", icon: ShieldCheck },
  { id: "progreso", label: "Progreso", icon: TrendingUp },
  { id: "perfil", label: "Perfil", icon: UserRound },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export const TAB_SUBTITLES: Record<TabId, string> = {
  vida: "Readiness, habitos, retos, metas y records",
  resumen: "Tu base de operaciones — toca los paneles",
  entrenar: "Plan, clases y check-in del día",
  maquinas: "Toca una máquina para abrir la guía",
  progreso: "Logros, medidas y ranking",
  perfil: "Carné, preferencias y seguridad",
};
