import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { machineQrValue } from "@/app/lib/machines";
import { DEFAULT_EQUIPMENT_ASSETS } from "@/lib/xtreme/equipment";
import EditableQrSheet, { type EditableQrItem } from "../_components/EditableQrSheet";

export const metadata: Metadata = {
  title: "Códigos y QR",
  description: "Editor y hoja imprimible de códigos QR para las máquinas físicas del gimnasio.",
  robots: { index: false, follow: false },
};

function physicalMachineLabels(): EditableQrItem[] {
  const machines = DEFAULT_EQUIPMENT_ASSETS.filter(
    (asset) => asset.kind === "machine" && Boolean(asset.machineGuideId),
  );
  const totals = new Map<string, number>();
  const seen = new Map<string, number>();

  for (const asset of machines) {
    const guideId = asset.machineGuideId as string;
    totals.set(guideId, (totals.get(guideId) ?? 0) + 1);
  }

  return machines.map((asset) => {
    const machineGuideId = asset.machineGuideId as string;
    const unit = (seen.get(machineGuideId) ?? 0) + 1;
    seen.set(machineGuideId, unit);
    return {
      assetId: asset.id,
      machineGuideId,
      id: machineGuideId,
      name: asset.name,
      zone: asset.area,
      code: asset.code,
      baseCode: asset.code,
      unitLetter: null,
      unit,
      units: totals.get(machineGuideId) ?? 1,
      url: machineQrValue(machineGuideId),
      status: asset.status,
    };
  });
}

export default function QrSheetPage() {
  const items = physicalMachineLabels();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/maquinas"
        className="inline-flex min-h-11 items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/50 transition hover:text-[#d8ff3e] focus-visible:text-[#d8ff3e] focus-visible:outline-none print:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <header className="mt-5 border-b-2 border-white/12 pb-6 print:hidden">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d8ff3e]">Herramienta de staff</p>
        <h1 className="mt-3 text-[clamp(2rem,5.5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-[-0.03em]">
          Códigos y QR de máquinas
        </h1>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/65 text-pretty">
          La hoja ahora sale del inventario físico: {items.length} equipos registrados, una etiqueta por máquina.
          Podés ordenar las etiquetas y editar el código de máquina o el nombre. El código QR no se
          edita y siempre continúa apuntando a la ficha pública correspondiente.
        </p>
      </header>

      <div className="mt-8">
        <EditableQrSheet initialItems={items} />
      </div>
    </div>
  );
}
