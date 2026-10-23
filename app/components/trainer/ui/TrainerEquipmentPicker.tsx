"use client";

import { useId, useState } from "react";
import { Check, Hash, Search, X } from "lucide-react";
import { isGroupEquipmentAvailable, type GroupEquipment } from "@/lib/xtreme/trainer-group-a-model";
import { equipmentGlyphKind, searchTrainerEquipment, type EquipmentFamily, type EquipmentGlyphKind } from "@/lib/xtreme/trainer-equipment-search";
import { EquipmentGlyph } from "./EquipmentGlyph";

const categories: { id: EquipmentFamily; label: string; icon: EquipmentGlyphKind }[] = [
  { id: "all", label: "Todas", icon: "rack" }, { id: "cardio", label: "Cardio", icon: "treadmill" },
  { id: "legs", label: "Piernas", icon: "leg-press" }, { id: "upper", label: "Tren superior", icon: "press" },
  { id: "cables", label: "Poleas", icon: "cable" }, { id: "free", label: "Bancos y pesas", icon: "dumbbell" },
];

export function TrainerEquipmentPicker({ inventory, value, disabled = false, onChange }: {
  inventory: GroupEquipment[]; value: string; disabled?: boolean; onChange: (asset: GroupEquipment | null) => void;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<EquipmentFamily>("all");
  const [expanded, setExpanded] = useState(!value);
  const [limit, setLimit] = useState(8);
  const selected = inventory.find((asset) => asset.id === value);
  const matches = searchTrainerEquipment(inventory, query, family);
  const single = query.trim() && matches.length === 1 && isGroupEquipmentAvailable(matches[0]) ? matches[0] : undefined;
  const choose = (asset: GroupEquipment | null) => {
    if (disabled || (asset && !isGroupEquipmentAvailable(asset))) return;
    onChange(asset); setQuery(""); setFamily("all"); setExpanded(false); setLimit(8);
  };

  return <section aria-label="Elegir máquina del inventario" className="min-w-0 border-2 border-cyan-300/30 bg-black/20 p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center border border-cyan-300/30 bg-cyan-300/10"><EquipmentGlyph kind={selected ? equipmentGlyphKind(selected) : "rack"} className="h-10 w-10" /></span>
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wide text-cyan-200">Máquina / equipo</p>
          {selected ? <><p className="break-words text-sm font-black text-white"><span className="text-cyan-200">{selected.code}</span> · {selected.name}</p><p className="mt-0.5 text-xs text-white/60">{isGroupEquipmentAvailable(selected) ? "Unidad seleccionada" : "Unidad no disponible: elegí otra"}</p></> : <p className="text-sm font-bold text-white/75">{value ? "Esta unidad ya no está en el inventario" : expanded ? "Encontrala por su número o nombre" : "Equipo libre / sin máquina seleccionada"}</p>}
        </div>
      </div>
      <div className="flex gap-2"><button type="button" disabled={disabled} aria-expanded={expanded} aria-controls={`${inputId}-search`} onClick={() => setExpanded(!expanded)} className="inline-flex min-h-11 items-center gap-2 border-2 border-cyan-300/40 px-3 text-xs font-black text-cyan-200 disabled:opacity-40"><Search className="h-4 w-4" />{expanded ? "Cerrar búsqueda" : selected ? "Cambiar máquina" : "Buscar máquina"}</button>{value && <button type="button" disabled={disabled} onClick={() => choose(null)} aria-label="Quitar máquina seleccionada" className="grid min-h-11 min-w-11 place-items-center border-2 border-white/20 text-white/60 disabled:opacity-40"><X className="h-4 w-4" /></button>}</div>
    </div>
    {expanded && <div id={`${inputId}-search`} className="mt-4 space-y-3">
      <label htmlFor={inputId} className="block text-xs font-black text-white/75">Escribí el # de máquina o su nombre</label>
      <div className="relative"><Hash className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-cyan-300" /><input id={inputId} type="search" autoComplete="off" value={query} disabled={disabled} onChange={(event) => { setQuery(event.target.value); setLimit(8); setFamily("all"); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (single) choose(single); } }} placeholder="Ej. 24, #24, PI-24 o caminadora" aria-describedby={`${inputId}-hint`} className="min-h-12 w-full min-w-0 border-2 border-white/25 bg-[#111] py-2 pl-10 pr-3 text-base font-bold text-white outline-none focus:border-cyan-300 disabled:opacity-40" /></div>
      <p id={`${inputId}-hint`} className="text-xs leading-5 text-white/60">Si aparece una sola máquina, tocá Enter para elegirla. Si el número se repite, elegí la tarjeta con el código y nombre correctos.</p>
      <div aria-label="Filtrar máquinas" className="flex flex-wrap gap-2">{categories.map((category) => <button key={category.id} type="button" disabled={disabled} aria-pressed={family === category.id} onClick={() => { setFamily(category.id); setLimit(8); }} className={`inline-flex min-h-11 items-center gap-1.5 border-2 px-2 text-[10px] font-black transition disabled:opacity-40 ${family === category.id ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 text-white/65 hover:border-cyan-300/50"}`}><EquipmentGlyph kind={category.icon} className="h-7 w-7" />{category.label}</button>)}</div>
      <p role="status" className="text-xs font-bold text-white/60">{matches.length} {matches.length === 1 ? "máquina encontrada" : "máquinas encontradas"}{matches.length > limit ? ` · Mostrando ${limit}` : ""}</p>
      <div className="grid max-h-80 gap-2 overflow-y-auto p-0.5 sm:grid-cols-2">{matches.slice(0, limit).map((asset) => {
        const available = isGroupEquipmentAvailable(asset);
        return <button key={asset.id} type="button" disabled={disabled || !available} aria-pressed={value === asset.id} onClick={() => choose(asset)} className={`flex min-h-24 min-w-0 items-center gap-3 border-2 p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-45 ${value === asset.id ? "border-cyan-300 bg-cyan-300/10" : "border-white/20 bg-[#0c0c0c] hover:border-cyan-300"}`}>
          <EquipmentGlyph kind={equipmentGlyphKind(asset)} className="h-14 w-14 shrink-0" />
          <span className="min-w-0 flex-1"><strong className="block text-lg font-black text-cyan-200">{asset.code || "Sin número"}</strong><span className="mt-0.5 block break-words text-sm font-bold text-white/85">{asset.name}</span><span className="mt-1 block text-[11px] text-white/60">{available ? [asset.location, asset.floor != null ? `Piso ${asset.floor}` : ""].filter(Boolean).join(" · ") || "Disponible para seleccionar" : "No disponible"}</span></span>
          {value === asset.id && <Check className="h-5 w-5 shrink-0 text-cyan-300" />}
        </button>;
      })}</div>
      {!matches.length && <p className="border border-dashed border-white/20 p-4 text-sm text-white/65">{inventory.length ? "No hay coincidencias. Probá solo el número o una parte del nombre." : "No hay máquinas cargadas en el inventario."}</p>}
      {matches.length > limit && <button type="button" disabled={disabled} onClick={() => setLimit(limit + 12)} className="min-h-11 w-full border-2 border-white/20 text-xs font-black text-white/75">Ver más máquinas</button>}
      <button type="button" disabled={disabled} onClick={() => choose(null)} className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-white/65 underline underline-offset-4 disabled:opacity-40"><EquipmentGlyph kind="dumbbell" className="h-8 w-8" />Equipo libre / sin máquina del inventario</button>
    </div>}
  </section>;
}
