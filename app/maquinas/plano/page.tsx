import type { Metadata } from "next";
import { getPublicEquipment } from "@/lib/xtreme/public-equipment";
import FloorPlanEditor from "./FloorPlanEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Plano editable del gimnasio · Xtreme Gym" },
  description:
    "Plano de dos pisos con autoguardado en MongoDB para ubicar las máquinas y áreas de Xtreme Gym.",
  robots: { index: false, follow: false },
};

export default async function GymFloorPlanPage({ searchParams }: { searchParams: Promise<{ floor?: string }> }) {
  const floor = (await searchParams).floor === "2" ? 2 : 1;
  const { inventory: allInventory, source } = await getPublicEquipment();
  const inventory = allInventory.filter((asset) => (asset.floor ?? 1) === floor);
  return <>
    <nav aria-label="Pisos del gimnasio" className="flex gap-3 px-4 py-3">
      {[1, 2].map((level) => <a key={level} href={`/maquinas/plano?floor=${level}`} aria-current={floor === level ? "page" : undefined}
        className={`border-2 px-4 py-2 text-sm font-black ${floor === level ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/20 text-white"}`}>Piso {level}</a>)}
    </nav>
    <p className="px-4 text-xs text-amber-200">{source === "fallback" ? "Sin conexión al inventario: se muestra la copia inicial. Reintentá recargando." : floor === 2 ? "Piso 2: 3 bicicletas y 2 jalones con ficha y QR. Áreas de Calistenia y Peso libre listas para completar; posiciones editables." : "Inventario compartido · plano con autoguardado en MongoDB y respaldo local."}</p>
    <FloorPlanEditor key={floor} floor={floor} inventory={inventory} />
  </>;
}
