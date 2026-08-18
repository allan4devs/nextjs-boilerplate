import type { Metadata } from "next";
import RuletaClient from "./RuletaClient";

export const metadata: Metadata = {
  title: "¿Qué comemos hoy en San Carlos?",
  description:
    "Tres ruletas con restaurantes de San Carlos para decidir qué comer hoy.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RuletaPage() {
  return <RuletaClient />;
}
