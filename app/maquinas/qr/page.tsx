import { getPublicQrGroups } from "@/lib/xtreme/public-qr-groups";
import { qrGroupPath } from "@/lib/xtreme/qr-groups";
import { absoluteAppUrl } from "@/lib/constants/app-url";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isPrintableEquipment, physicalMachineQrValue } from "@/app/lib/physical-machine-links";
import { getPublicEquipment, type PublicEquipment } from "@/lib/xtreme/public-equipment";
import EditableQrSheet, { type EditableQrItem } from "../_components/EditableQrSheet";

export const metadata: Metadata = {
  title: "Códigos y QR",
  description: "Editor y hoja imprimible de códigos QR para las máquinas físicas del gimnasio.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function physicalMachineLabels(inventory: PublicEquipment[]): EditableQrItem[] {
  const machines = inventory.filter(
    isPrintableEquipment,
  );
  const totals = new Map<string, number>();
  const seen = new Map<string, number>();

  for (const asset of machines) {
    const guideId = asset.machineGuideId || asset.id;
    totals.set(guideId, (totals.get(guideId) ?? 0) + 1);
  }

  const machineItems = machines.map((asset) => {
    const machineGuideId = asset.machineGuideId || asset.id;
    const unit = (seen.get(machineGuideId) ?? 0) + 1;
    seen.set(machineGuideId, unit);
    return {
      assetId: asset.id,
      floor: asset.floor ?? 1,
      machineGuideId,
      id: machineGuideId,
      name: asset.name,
      zone: asset.area,
      code: asset.code,
      baseCode: asset.code,
      unitLetter: null,
      unit,
      units: totals.get(machineGuideId) ?? 1,
      url: physicalMachineQrValue(asset.id),
      status: asset.status,
    };
  });
  return machineItems;
}

export default async function QrSheetPage() {
  const { inventory, source } = await getPublicEquipment();
  const groups = await getPublicQrGroups();
  const groupItems: EditableQrItem[] = groups.map(group => ({
    assetId: group.id, floor: 1, machineGuideId: group.id, id: group.id,
    name: group.name, zone: group.area, code: group.code, baseCode: group.code,
    unitLetter: null, unit: 1, units: 1, status: "sin_dato",
    url: absoluteAppUrl(qrGroupPath(group.id)),
  }));
  const items = [...physicalMachineLabels(inventory), ...groupItems];

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
          La hoja sale del inventario físico: {items.length} equipos registrados, una etiqueta por equipo. Incluye bancos; discos y mancuernas llevan dos etiquetas grupales de cada tipo, y curl con barra lleva una.
          Descargá un solo PDF con dos etiquetas de 9×16 cm por hoja A4, centradas y listas
          para recortar y pegar en el costado del aparato. Podés ordenar las etiquetas y editar el código de
          máquina o el nombre; el código QR no se edita y siempre apunta a la ficha pública.
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/50">
          Para la impresión final: solicitá laminado mate, esquinas redondeadas y adhesivo apto
          para humedad y limpieza frecuente. Probá el escaneo de una muestra con la iluminación
          del gimnasio antes de imprimir el lote.
        </p>
      </header>

      <div className="mt-8">
        {source === "fallback" && <p role="status" className="mb-4 text-sm text-amber-200">Sin conexión al inventario: se muestra la copia inicial. Reintentá antes de imprimir.</p>}
        <EditableQrSheet initialItems={items} inventory={inventory} />
      </div>
    </div>
  );
}
