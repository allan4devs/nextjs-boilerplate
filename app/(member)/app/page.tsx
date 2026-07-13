import type { Metadata } from "next";
import ExtremeGymSite from "../../ExtremeGymSite";

export const metadata: Metadata = {
  title: "Xtreme Gym App | Streaks",
  description:
    "App de miembros de Xtreme Gym para registrar entrenamientos, rachas y progreso con PIN en Mongo.",
  robots: { index: false, follow: false },
};

export default function XtremeGymAppPage() {
  return <ExtremeGymSite />;
}
