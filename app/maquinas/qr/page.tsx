import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MACHINE_GUIDE, machineQrValue } from "@/app/lib/machines";
import QrSheet, { type QrSheetItem } from "../_components/QrSheet";

export const metadata: Metadata = {
  title: "Hoja de QR",
  description: "Descarga de los códigos QR de cada máquina para imprimir y pegar en sala.",
  robots: { index: false, follow: false },
};

export default function QrSheetPage() {
  const items: QrSheetItem[] = MACHINE_GUIDE.map((machine) => ({
    id: machine.id,
    name: machine.name,
    zone: machine.zone,
    url: machineQrValue(machine.id),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/maquinas"
        className="inline-flex min-h-11 items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/50 transition hover:text-[#d8ff3e] focus-visible:text-[#d8ff3e] focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <header className="mt-5 border-b-2 border-white/12 pb-6">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d8ff3e]">Solo staff</p>
        <h1 className="mt-3 text-[clamp(2rem,5.5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-[-0.03em]">
          Hoja de QR de máquinas
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/65 text-pretty">
          Cada QR abre la ficha pública de esa máquina ({MACHINE_GUIDE.length} en total). Descargá
          el PNG, pegálo en el equipo y quien lo escanee cae directo en la guía. Para imprimir
          varios de una, usá &quot;Descargar todos&quot; y armá la hoja en tu editor o mandálos a la
          imprenta.
        </p>
      </header>

      <div className="mt-8">
        <QrSheet items={items} />
      </div>
    </div>
  );
}
