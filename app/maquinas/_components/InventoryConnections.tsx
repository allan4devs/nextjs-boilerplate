"use client";

import Link from "next/link";
import { useState } from "react";
import { STATUS_LABELS, type FloorInventoryItem } from "../plano/plan-model";
import { useFloorPlan } from "./useFloorPlan";
import { physicalMachinePath } from "@/app/lib/physical-machine-links";

type Guide = { id: string; name: string };

/** Match physical units by stable identity, never by editable labels or printed codes. */
export default function InventoryConnections({ inventory, guides, source, guideId, selectedAssetId }: { inventory: FloorInventoryItem[]; guides: Guide[]; source: "shared" | "fallback"; guideId?: string; selectedAssetId?: string }) {
  const { plan, labels, error } = useFloorPlan(inventory);
  const [query, setQuery] = useState("");

  const guideById = new Map(guides.map((guide) => [guide.id, guide]));
  const machines = inventory.filter((asset) => asset.kind === "machine" && (!guideId || asset.machineGuideId === guideId));
  const linked = new Set(machines.map((asset) => asset.machineGuideId));
  const unlinkedGuides = guideId ? [] : guides.filter((guide) => !linked.has(guide.id));
  const customMachines = guideId ? [] : plan?.customElements.filter((element) => element.type === "equipment") ?? [];
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const rows = machines.filter((asset) => normalize(`${asset.id} ${labels[asset.id]?.code ?? plan?.placements[asset.id]?.code ?? asset.code} ${asset.area} ${asset.name} ${labels[asset.id]?.name ?? plan?.placements[asset.id]?.label ?? ""} ${guideById.get(asset.machineGuideId ?? "")?.name ?? ""}`).includes(normalize(query)));

  return (
    <section id="inventario-plano" className="scroll-mt-32 border-2 border-white/15 bg-[#0c0c0c] p-4 sm:p-6">
      <h2 className="text-2xl font-black uppercase">{guideId ? "Unidades en el gimnasio" : "Máquinas del plano y sus fichas"}</h2>
      <p className="mt-2 text-sm text-white/65">{machines.length} máquinas físicas · {machines.filter((asset) => guideById.has(asset.machineGuideId ?? "")).length} con ficha vinculada. Varias unidades pueden compartir una ficha.</p>
      <p className="mt-2 text-sm text-white/65">El plano y las etiquetas comparten el mismo nombre y código por unidad. Las correcciones se sincronizan en este navegador; guardá el inventario para compartirlas con otros dispositivos.</p>
      {source === "fallback" && <p role="status" className="mt-3 text-sm text-amber-200">Sin conexión al inventario compartido. Se muestra la copia inicial; recargá para reintentar.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <label className="mt-5 block text-sm font-bold">
        Buscar por nombre, código o zona
        <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" className="mt-2 block min-h-11 w-full border-2 border-white/25 bg-black px-3 text-white" />
      </label>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-white/25"><th className="p-3">Unidad</th><th className="p-3">Nombre en plano</th><th className="p-3">Ficha en máquinas</th></tr></thead>
          <tbody>{rows.map((asset) => {
            const guide = guideById.get(asset.machineGuideId ?? "");
            const label = labels[asset.id]?.name ?? plan?.placements[asset.id]?.label ?? asset.name;
            return <tr key={asset.id} className={`border-b border-white/10 align-top ${asset.id === selectedAssetId ? "bg-[#d8ff3e]/10" : ""}`}>
              <td className="p-3"><Link className="font-bold text-[#d8ff3e] underline" href={`/maquinas/plano?asset=${encodeURIComponent(asset.id)}`}>{(labels[asset.id]?.code ?? plan?.placements[asset.id]?.code ?? asset.code) || asset.id}</Link><span className="mt-1 block text-xs text-white/45">{asset.area} · {asset.id}</span><span className="mt-1 block text-xs text-white/55">{STATUS_LABELS[asset.status]} · {asset.location}</span></td>
              <td className="p-3 font-bold">{label}{label !== asset.name && <span className="mt-1 block text-xs font-normal text-white/45">Inventario: {asset.name}</span>}</td>
              <td className="p-3">{guide ? <Link className="text-[#d8ff3e] underline" href={physicalMachinePath(asset.id)}>{guide.name}</Link> : <span className="text-amber-300">Sin ficha vinculada</span>}<Link className="mt-2 block text-xs text-[#d8ff3e] underline" href={`/maquinas/qr?asset=${encodeURIComponent(asset.id)}`}>Ver código y QR de esta unidad</Link></td>
            </tr>;
          })}</tbody>
        </table>
        {!rows.length && <p className="p-3 text-white/60">No hay máquinas que coincidan.</p>}
      </div>
      {!!unlinkedGuides.length && <p className="mt-4 text-sm text-amber-200">Fichas sin unidad física asociada: {unlinkedGuides.map((guide, index) => <span key={guide.id}>{index > 0 && ", "}<Link className="underline" href={`/maquinas/${guide.id}`}>{guide.name}</Link></span>)}.</p>}
      {!!customMachines.length && <p className="mt-4 text-sm text-amber-200">Equipos agregados al plano que necesitan asociación: {customMachines.map((element) => element.label).join(", ")}.</p>}
    </section>
  );
}
