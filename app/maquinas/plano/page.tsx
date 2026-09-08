import type { Metadata } from "next";
import { getPublicEquipment } from "@/lib/xtreme/public-equipment";
import FloorPlanEditor from "./FloorPlanEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Plano editable del gimnasio · Xtreme Gym" },
  description:
    "Editor local de un piso para ubicar las máquinas y estructuras de Xtreme Gym sobre una cuadrícula.",
  robots: { index: false, follow: false },
};

export default async function GymFloorPlanPage() {
  const { inventory, source } = await getPublicEquipment();
  return <><p className="px-4 text-xs text-amber-200">{source === "fallback" ? "Sin conexión al inventario: se muestra la copia inicial. Reintentá recargando." : "Inventario compartido · las posiciones y etiquetas sin publicar se guardan en este navegador."}</p><FloorPlanEditor inventory={inventory} /></>;
}
