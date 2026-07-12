import {
  Activity,
  Dumbbell,
  QrCode,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { TourStep } from "../../OnboardingTour";

export const TOUR_STEPS: TourStep[] = [
  {
    target: "tab-resumen",
    tab: "resumen",
    title: "Tu resumen",
    body: "Aquí ves tu racha, tu nivel y tu próximo paso. Es tu punto de partida cada día que entrenás.",
    icon: Activity,
  },
  {
    target: "tab-entrenar",
    tab: "entrenar",
    title: "Marcá tu entreno",
    body: "Cada vez que entrenes, marcalo aquí. Así sumás tu racha 🔥 y desbloqueás logros.",
    icon: Dumbbell,
  },
  {
    target: "tab-maquinas",
    tab: "maquinas",
    title: "Guía de máquinas",
    body: "¿No sabés usar un equipo? Mirá la guía con videos y pasos para entrenar seguro.",
    icon: ShieldCheck,
  },
  {
    target: "tab-progreso",
    tab: "progreso",
    title: "Seguí tu progreso",
    body: "Registrá tu peso y medidas para ver tu avance en el tiempo, sesión tras sesión.",
    icon: TrendingUp,
  },
  {
    target: "tab-perfil",
    tab: "perfil",
    title: "Tu carné digital",
    body: "En tu perfil está tu carné con código de acceso. Mostralo en recepción para entrar. ¡Listo para arrancar!",
    icon: QrCode,
  },
];
