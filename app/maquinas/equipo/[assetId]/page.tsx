import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { findMachineGuide, machinePath } from "@/app/lib/machines";
import { getPublicEquipment } from "@/lib/xtreme/public-equipment";

export const dynamic = "force-dynamic";

export default async function PhysicalMachinePage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const { inventory, source } = await getPublicEquipment();
  const asset = inventory.find((item) => item.id === assetId);
  if (source === "fallback") throw new Error("No se pudo consultar la ficha del equipo. Reintentá en unos momentos.");
  if (!asset) notFound();
  if (asset.machineGuideId && findMachineGuide(asset.machineGuideId)) {
    redirect(`${machinePath(asset.machineGuideId)}?asset=${encodeURIComponent(asset.id)}`);
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/maquinas" className="text-sm text-lime-300">Volver al catálogo</Link>
      <p className="mt-8 text-sm text-white/60">{asset.area} / Piso {asset.floor ?? 1}</p>
      <h1 className="mt-3 text-3xl font-black">{asset.name}</h1>
      {asset.code && <p className="mt-2 font-bold">{asset.code}</p>}
      <p className="mt-8 text-white/65">Este equipo no tiene fotos, videos ni una guía de uso asociados.</p>
      <details className="mt-8 rounded-xl border border-white/15 p-5">
        <summary className="cursor-pointer font-bold">Detalles del equipo</summary>
        <p className="mt-4">{asset.location || "Por identificar"}</p>
        {asset.description && <p className="mt-3">{asset.description}</p>}
        {asset.brand && <p className="mt-3">Marca: {asset.brand}</p>}
        {asset.year && <p className="mt-3">Año: {asset.year}</p>}
      </details>
    </main>
  );
}
