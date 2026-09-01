"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2 } from "lucide-react";
import MachineQr from "./MachineQr";

export type QrSheetItem = {
  id: string;
  name: string;
  zone: string;
  url: string;
};

const QR_DARK = "#0a0a0a";
const QR_LIGHT = "#ffffff";
const ACCENTS: Array<[RegExp, string]> = [
  [/[áàä]/g, "a"],
  [/[éèë]/g, "e"],
  [/[íìï]/g, "i"],
  [/[óòö]/g, "o"],
  [/[úùü]/g, "u"],
  [/ñ/g, "n"],
];

function slugify(text: string) {
  let out = text.toLowerCase();
  for (const [pattern, plain] of ACCENTS) out = out.replace(pattern, plain);
  return out.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadPng(url: string, name: string) {
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 1024,
    color: { dark: QR_DARK, light: QR_LIGHT },
  });
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `qr-${slugify(name)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Hoja de QR para staff: una etiqueta por máquina, con descarga individual o en lote. */
export default function QrSheet({ items }: { items: QrSheetItem[] }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function downloadAll() {
    if (busy) return;
    setBusy(true);
    setProgress(0);
    try {
      for (let i = 0; i < items.length; i += 1) {
        await downloadPng(items[i].url, items[i].name);
        setProgress(i + 1);
        await wait(350);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={downloadAll}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 border-2 border-black/30 bg-[#d8ff3e] px-4 text-[11px] font-black uppercase tracking-[0.1em] text-black shadow-[2px_2px_0_rgba(0,0,0,0.5)] transition hover:bg-white active:translate-x-px active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? `Descargando ${progress}/${items.length}` : "Descargar todos los PNG"}
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">
          El navegador puede pedir permiso para descargar varios archivos.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col items-center gap-3 border-[3px] border-white/15 bg-white p-4 text-center text-black shadow-[4px_4px_0_rgba(0,0,0,0.6)]"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/50">
              {item.zone}
            </p>
            <p className="text-base font-black uppercase leading-tight text-balance">{item.name}</p>
            <MachineQr value={item.url} label={item.name} size={168} showDownload={false} />
            <p className="break-all text-[10px] font-bold text-black/40">{item.url}</p>
            <button
              type="button"
              onClick={() => downloadPng(item.url, item.name)}
              className="inline-flex min-h-11 items-center gap-2 border-2 border-black/25 bg-black/[0.03] px-3 text-[11px] font-black uppercase tracking-[0.1em] text-black/70 transition hover:border-black/60 hover:text-black focus-visible:border-black focus-visible:outline-none"
            >
              <Download className="h-3.5 w-3.5" />
              PNG
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
