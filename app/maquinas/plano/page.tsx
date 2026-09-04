import type { Metadata } from "next";
import { DEFAULT_EQUIPMENT_ASSETS } from "@/lib/xtreme/equipment";
import FloorPlanEditor, { type FloorInventoryItem } from "./FloorPlanEditor";

export const metadata: Metadata = {
  title: { absolute: "Plano editable del gimnasio · Xtreme Gym" },
  description:
    "Editor local de un piso para ubicar las máquinas y estructuras de Xtreme Gym sobre una cuadrícula.",
  robots: { index: false, follow: false },
};

export default function GymFloorPlanPage() {
  const inventory: FloorInventoryItem[] = DEFAULT_EQUIPMENT_ASSETS.map((asset) => ({
    id: asset.id,
    area: asset.area,
    kind: asset.kind,
    code: asset.code,
    name: asset.name,
    location: asset.location,
    status: asset.status,
    machineGuideId: asset.machineGuideId,
  }));

  return <FloorPlanEditor inventory={inventory} />;
}
