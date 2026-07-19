import {
  Activity,
  CalendarDays,
  Dumbbell,
  HeartPulse,
  QrCode,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { TourStep } from "../../OnboardingTour";

/**
 * Tour del Member OS (mobile-first).
 * Los targets deben existir en el dock (lg:hidden) o en el TopHud / contenido visible.
 * No anclar a ítems del SideNav: en mobile está fuera de pantalla y rompe el spotlight.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    target: "tour-welcome",
    tab: "resumen",
    title: "¡Pura vida! Este es tu Member OS",
    body: "Acá reservás clases, marcás entrenos, cuidás tu racha y llevás tu carné digital. Te mostramos lo nuevo en un minuto.",
    icon: Sparkles,
  },
  {
    target: "tab-resumen",
    tab: "resumen",
    title: "Resumen",
    body: "Tu base del día: membresía, racha, nivel y el siguiente paso. Empezá siempre por acá.",
    icon: Activity,
  },
  {
    target: "tab-entrenar",
    tab: "entrenar",
    title: "Entrenar",
    body: "Plan del coach, clases del día y check-in. Tocá una clase para reservar cupo antes de que empiece.",
    icon: Dumbbell,
  },
  {
    target: "tour-clases",
    tab: "entrenar",
    title: "Reservas de clase",
    body: "Si no tenés plan activo, la app te invita a un pase o membresía. Con acceso vigente, Reservar + check-in 30 min antes.",
    icon: CalendarDays,
  },
  {
    target: "tab-vida",
    tab: "vida",
    title: "Vida (nuevo)",
    body: "Hábitos fuera del gym: agua, sueño, pasos, ánimo y retos semanales. Suma constancia más allá del entreno.",
    icon: HeartPulse,
  },
  {
    target: "tab-progreso",
    tab: "progreso",
    title: "Progreso",
    body: "Peso, medidas, logros y ranking. Registrá tus números para ver el cambio sesión a sesión.",
    icon: TrendingUp,
  },
  {
    target: "tab-perfil",
    tab: "perfil",
    title: "Perfil y carné",
    body: "Arriba a la derecha está tu perfil: carné con código, PIN, avisos y ayuda. ¡Listo para entrenar!",
    icon: QrCode,
  },
];
