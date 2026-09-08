"use client";

import Link from "next/link";
import { useState } from "react";
import { findMachineGuide, MACHINE_GUIDE } from "@/app/lib/machines";
import { physicalMachinePath, physicalMachineQrValue } from "@/app/lib/physical-machine-links";
import MachineQr from "../_components/MachineQr";
import type { FloorInventoryItem } from "./plan-model";

export default function AssetConnectionPanel({ asset, name, code, duplicateCode, onCode }: {
  asset: FloorInventoryItem; name: string; code: string; duplicateCode: boolean; onCode: (code: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [guideId, setGuideId] = useState(asset.machineGuideId ?? "");
  const [publishedGuideId, setPublishedGuideId] = useState(asset.machineGuideId ?? "");
  const guide = findMachineGuide(publishedGuideId);
  async function publish() {
    if (!name.trim() || duplicateCode || (asset.kind === "machine" && !code.trim())) return;
    setSaving(true);
    setNotice("");
    try {
      const patch: { id: string; name?: string; code?: string; machineGuideId?: string } = { id: asset.id };
      if (name.trim() !== asset.name) patch.name = name.trim();
      if (code.trim() !== asset.code) patch.code = code.trim();
      if (guideId && guideId !== publishedGuideId) patch.machineGuideId = guideId;
      if (!patch.name && patch.code === undefined && !patch.machineGuideId) { setNotice("El nombre, código y ficha ya coinciden con el inventario."); return; }
      const response = await fetch("/api/xtreme/admin/equipment", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar. Reintentá.");
      setPublishedGuideId(guideId);
      setNotice("Nombre, código y ficha guardados en el inventario compartido. Las fichas y QR los usarán al abrirse.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar. El borrador sigue en el plano.");
    } finally { setSaving(false); }
  }
  return <div className="mt-4 space-y-3 border-y border-white/15 py-4 text-xs">
    <p className="text-white/60">{asset.location}</p>
    <label className="block font-bold">Código físico
      <input value={code} onChange={(event) => onCode(event.target.value)} maxLength={32} disabled={saving} className="mt-2 min-h-11 w-full border-2 border-white/20 bg-black px-3 text-white" />
    </label>
    {(duplicateCode || !code.trim()) && <p className="text-amber-200">{duplicateCode ? "Código repetido: revisá la otra unidad antes de guardar." : "Esta unidad no tiene código físico."}</p>}
    {asset.kind === "machine" && <label className="block font-bold">Ficha de técnica vinculada
      <select value={guideId} onChange={(event) => setGuideId(event.target.value)} disabled={saving} className="mt-2 min-h-11 w-full border-2 border-white/20 bg-black px-2 text-white">
        <option value="" disabled>Seleccioná una ficha</option>
        {MACHINE_GUIDE.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {guideId !== publishedGuideId && <span className="mt-2 block font-normal text-amber-200">Conexión pendiente de guardar. El QR abrirá la ficha elegida después de guardar.</span>}
    </label>}
    <button type="button" onClick={publish} disabled={saving || duplicateCode || !name.trim() || (asset.kind === "machine" && (!code.trim() || !guideId))} className="min-h-11 w-full border-2 border-[#d8ff3e]/50 px-2 font-bold text-[#d8ff3e] disabled:opacity-40">{saving ? "Guardando…" : "Guardar nombre, código y conexión"}</button>
    <p className="text-white/45">Requiere sesión de admin. Las posiciones del plano siguen siendo locales.</p>
    {notice && <p role="status" className="text-amber-100">{notice}</p>}
    {guide ? <>
      <Link className="block font-bold text-[#d8ff3e] underline" href={physicalMachinePath(asset.id)}>Ver ficha: {guide.name}</Link>
      <MachineQr value={physicalMachineQrValue(asset.id)} label={`${asset.id} ${code} ${name}`} size={150} />
      <Link className="block text-[#d8ff3e] underline" href={`/maquinas/qr?asset=${encodeURIComponent(asset.id)}`}>Imprimir etiqueta de esta unidad</Link>
    </> : <p className="text-amber-200">Sin ficha vinculada.</p>}
    <Link className="block underline" href="/maquinas#inventario-plano">Comparar todas las máquinas</Link>
  </div>;
}
