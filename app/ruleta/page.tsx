import type { Metadata } from "next";
import RuletaApp from "./RuletaApp";

export const metadata: Metadata = {
  title: "¿Qué comemos hoy en San Carlos?",
  description:
    "Armá tu platillo ideal por ingredientes y descubrí qué restaurante de San Carlos lo tiene. Incluye una ruleta opcional para decidir al azar.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RuletaPage() {
  return <RuletaApp />;
}
