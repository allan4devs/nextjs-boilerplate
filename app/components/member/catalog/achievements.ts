import { Flame, Medal, Rocket, Star, Target, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Member } from "../domain/member";

export type Achievement = {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  test: (member: Member) => boolean;
};

/** Logros locales usados cuando el servidor todavía no envía badges. */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first",
    name: "Primer paso",
    desc: "Tu primer entreno marcado",
    icon: Star,
    test: (member) => member.totalWorkouts >= 1,
  },
  {
    id: "streak7",
    name: "En racha",
    desc: "7 dias seguidos, sin aflojar",
    icon: Flame,
    test: (member) => member.streak >= 7,
  },
  {
    id: "streak30",
    name: "Imparable",
    desc: "30 dias de racha pura vida",
    icon: Rocket,
    test: (member) => member.streak >= 30,
  },
  {
    id: "variety",
    name: "Todoterreno",
    desc: "Prueba las 4 clases",
    icon: Target,
    test: (member) => new Set(member.workouts.map((workout) => workout.trainingId)).size >= 4,
  },
  {
    id: "vet",
    name: "Veterano",
    desc: "50 entrenos",
    icon: Medal,
    test: (member) => member.totalWorkouts >= 50,
  },
  {
    id: "marathon",
    name: "Maratonico",
    desc: "1.000 minutos acumulados",
    icon: Timer,
    test: (member) => member.totalMinutes >= 1000,
  },
];
