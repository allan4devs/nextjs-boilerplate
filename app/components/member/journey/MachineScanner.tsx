"use client";
import { useEffect, useRef, useState } from "react";
import { scannedAsset } from "@/lib/xtreme/workout-tracking";
export type ScannedMachine = { id: string; name: string; code: string; machineGuideId: string };
export default function MachineScanner({ onSelect }: { onSelect: (asset: ScannedMachine) => Promise<void> }) {
  const [camera, setCamera] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const resolveRef = useRef<(value: string) => void>(() => {});
  async function resolve(input: string) {
    setCamera(false); setBusy(true); setError("");
    try {
      const query = scannedAsset(input) ?? (/^[\w-]+$/.test(input.trim()) ? input.trim() : "");
      if (!query) throw new Error("Us? el QR individual de una m?quina o su c?digo impreso.");
      const response = await fetch(`/api/xtreme/workout-machine?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await onSelect(data.asset);
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo leer la m?quina."); }
    finally { setBusy(false); }
  }
  useEffect(() => { resolveRef.current = (input) => { void resolve(input); }; });
  useEffect(() => {
    if (!camera) return;
    let cancelled = false;
    let reader: import("@zxing/library").BrowserQRCodeReader | undefined;
    void import("@zxing/library").then(async ({ BrowserQRCodeReader }) => {
      if (cancelled) return;
      reader = new BrowserQRCodeReader();
      await reader.decodeFromVideoDevice(null, video.current, (result) => {
        if (!result || cancelled) return;
        cancelled = true; reader?.reset(); resolveRef.current(result.getText());
      });
      if (cancelled) reader.reset();
    }).catch(() => { if (!cancelled) { setCamera(false); setError("No se pudo abrir la c?mara. Permit? el acceso o digit? el c?digo impreso."); } });
    return () => { cancelled = true; reader?.reset(); };
  }, [camera]);
  return <section className="space-y-3 rounded-xl border border-[#d8ff3e]/30 p-4">
    <p className="font-black">Tu pr?xima m?quina</p>
    <button type="button" disabled={busy} onClick={() => setCamera(!camera)} className="min-h-12 w-full rounded-lg bg-[#d8ff3e] px-4 font-black text-black">{camera ? "Cerrar c?mara" : "Escanear QR de la m?quina"}</button>
    {camera && <video ref={video} muted playsInline className="aspect-square w-full rounded-xl object-cover" />}
    <div className="flex gap-2"><input aria-label="C?digo impreso o enlace QR" value={value} onChange={(event) => setValue(event.target.value)} placeholder="O digit? el c?digo impreso" className="min-h-11 min-w-0 flex-1 rounded-lg bg-white/10 px-3" /><button type="button" disabled={busy || !value.trim()} onClick={() => void resolve(value)} className="min-h-11 px-3 font-bold">Buscar</button></div>
    {busy && <p role="status">Buscando m?quina?</p>}{error && <p role="alert" className="text-sm text-orange-200">{error}</p>}
  </section>;
}
