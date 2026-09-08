import { notFound, redirect } from "next/navigation";
import { findMachineGuide, machinePath } from "@/app/lib/machines";
import { getPublicEquipment } from "@/lib/xtreme/public-equipment";

export const dynamic = "force-dynamic";

export default async function PhysicalMachinePage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const { inventory, source } = await getPublicEquipment();
  const asset = inventory.find((item) => item.id === assetId);
  if (source === "fallback") throw new Error("No se pudo consultar la ficha del equipo. Reintentá en unos momentos.");
  if (!asset?.machineGuideId || !findMachineGuide(asset.machineGuideId)) notFound();
  redirect(`${machinePath(asset.machineGuideId)}?asset=${encodeURIComponent(asset.id)}`);
}
