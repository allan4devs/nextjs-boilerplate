/**
 * Beneficios y áreas del gym para el Member OS.
 * Misma historia que el sitio público, en tono socio (voseo profesional).
 */
import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Car,
  Crown,
  Dumbbell,
  Flame,
  HeartPulse,
  Ruler,
  Sparkles,
  Users,
  Utensils,
  Zap,
} from "lucide-react";

export type GymZoneBenefit = {
  id: string;
  title: string;
  eyebrow: string;
  text: string;
  image: string;
  icon: LucideIcon;
  details: string[];
  tone: "lime" | "cyan" | "orange" | "yellow" | "white";
};

export type GymServiceBenefit = {
  id: string;
  title: string;
  text: string;
  icon: LucideIcon;
  highlights: string[];
  /** Tab del Member OS al que conviene ir. */
  ctaTab?: "entrenar" | "maquinas" | "progreso" | "perfil" | "vida";
  ctaLabel?: string;
  badge?: string;
  tone: "lime" | "cyan" | "orange" | "yellow";
};

export const GYM_ZONES: GymZoneBenefit[] = [
  {
    id: "calistenia",
    title: "Calistenia",
    eyebrow: "Barras · funcional",
    text: "Dominá tu cuerpo, movilidad y fuerza funcional con circuitos de todos los niveles.",
    image: "/xtreme/zona-funcional-turf.webp",
    icon: Zap,
    details: [
      "Barras y peso corporal",
      "Core, coordinación y control",
      "Circuitos para principiantes y avanzados",
    ],
    tone: "lime",
  },
  {
    id: "peso-libre",
    title: "Peso libre",
    eyebrow: "Mancuernas · barras",
    text: "Fuerza e hipertrofia en serio: discos, bancos y progresión de cargas.",
    image: "/xtreme/zona-mancuernas.webp",
    icon: Dumbbell,
    details: ["Mancuernas, barras y bancos", "De principiante a avanzado", "Hipertrofia y fuerza"],
    tone: "orange",
  },
  {
    id: "cardio",
    title: "Cardio",
    eyebrow: "Condición · salud",
    text: "Cinta, elíptica, bici y más para cuidar el corazón y quemar con control.",
    image: "/xtreme/zona-cardio.webp",
    icon: HeartPulse,
    details: ["Cintas, elípticas y escaladores", "Intervalos o ritmo continuo", "Salud y control de peso"],
    tone: "cyan",
  },
  {
    id: "pierna",
    title: "Pierna / glúteo",
    eyebrow: "Lower body",
    text: "Máquinas y estaciones para pierna, glúteo, estabilidad y potencia.",
    image: "/xtreme/maquinas-fuerza-xtreme.webp",
    icon: Flame,
    details: ["Sentadilla, hip thrust y accesorios", "Estabilidad de cadera y rodilla", "Progresiones seguras"],
    tone: "yellow",
  },
  {
    id: "tren-superior",
    title: "Tren superior",
    eyebrow: "Pecho · espalda · brazos",
    text: "Máquinas guiadas y peso libre para cada grupo del tren superior.",
    image: "/xtreme/maquinas-y-entrenador-xtreme.webp",
    icon: Dumbbell,
    details: ["Pecho, espalda, hombros y brazos", "Guiado + libre", "Rutinas completas"],
    tone: "lime",
  },
  {
    id: "vip",
    title: "Zona VIP",
    eyebrow: "Semi-privado",
    text: "Espacio más cercano para entrenar con foco, estructura y guía cercana.",
    image: "/xtreme/zona-entrenamiento-vip.webp",
    icon: Crown,
    details: [
      "Entrenamiento personalizado o semi-privado",
      "Más atención a tu técnica",
      "Ideal si querés un plan con coach",
    ],
    tone: "orange",
  },
];

export const GYM_SERVICES: GymServiceBenefit[] = [
  {
    id: "grupal",
    title: "Training semi-personalizado",
    text: "Grupos de hasta 6 personas con coach: corrección de técnica, seguimiento y motivación de equipo.",
    icon: Users,
    highlights: [
      "Máx. 6 personas por grupo",
      "Lun · Mié · Vie (mañana y tarde)",
      "Acceso al gym + supervisión",
      "₡45.000 al mes · cupo limitado",
    ],
    ctaTab: "entrenar",
    ctaLabel: "Ver clases y plan",
    badge: "Cupos limitados",
    tone: "orange",
  },
  {
    id: "medicion",
    title: "Medición corporal en la app",
    text: "Medite sin costo en el consultorio y registrá peso y cintura acá: la curva de progreso queda en tu perfil.",
    icon: Ruler,
    highlights: [
      "Medición sin costo para socios",
      "Peso y cintura en Progreso",
      "Historial y tendencias en la app",
      "Alineado a tu meta semanal",
    ],
    ctaTab: "progreso",
    ctaLabel: "Registrar medidas",
    badge: "Incluido",
    tone: "lime",
  },
  {
    id: "maquinas-guia",
    title: "Guía de máquinas",
    text: "Cada equipo con ajuste, tips y errores comunes. Entrená fuerte sin perder técnica.",
    icon: Sparkles,
    highlights: [
      "Guías por zona y nivel",
      "Tips y errores a evitar",
      "Rutinas rápidas por objetivo",
    ],
    ctaTab: "maquinas",
    ctaLabel: "Abrir guías",
    tone: "cyan",
  },
  {
    id: "comodidades",
    title: "Más que el piso de entreno",
    text: "Parqueo, espacio para merendar y área infantil para que venir al gym sea más fácil.",
    icon: Car,
    highlights: [
      "Parqueo para clientes",
      "Área para merendar",
      "Espacio infantil (bajo supervisión del adulto)",
      "Horario amplio entre semana",
    ],
    tone: "yellow",
  },
];

export const GYM_AMENITIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "parqueo", label: "Parqueo", icon: Car },
  { id: "merienda", label: "Área merienda", icon: Utensils },
  { id: "infantil", label: "Área infantil", icon: Baby },
  { id: "medicion", label: "Medición corporal", icon: Ruler },
  { id: "vip", label: "Zona VIP", icon: Crown },
  { id: "grupal", label: "Grupos x6", icon: Users },
];
