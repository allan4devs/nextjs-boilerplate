"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { drawMachineLabel, LABEL_WIDTH, LABEL_HEIGHT } from "./machine-label-artwork";
import { Download, Eye, Loader2, Pencil, Printer } from "lucide-react";
import type { MachineLabel } from "@/app/lib/machines";
import { GameButton, GameModal } from "@/app/components/GameOS";
import MachineQr from "./MachineQr";
import { getMachineLabelContent } from "./machine-label-content";

const LOGO_SRC = "/xtreme/logo.webp";

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

/** Clave estable por unidad física (el código puede venir vacío o repetirse entre modelos). */
function unitKey(item: MachineLabel & { assetId?: string }) {
  return item.assetId ?? `${item.id}-${item.unit}`;
}

/** Nombre de archivo único por activo, aunque el código físico esté vacío o repetido. */
function fileStem(item: MachineLabel & { assetId?: string }) {
  const identity = slugify(item.assetId ?? `${item.id}-${item.unit}`);
  return item.code ? `${identity}-${slugify(item.code)}` : identity;
}

/** Etiqueta accesible del QR (el código puede venir vacío). */
function qrLabel(item: MachineLabel) {
  return item.code ? `${item.code} ${item.name}` : item.name;
}

function LabelName({ item }: { item: MachineLabel }) {
  const { title, subtitle } = getMachineLabelContent(item);
  return (
    <>
      <p className="text-pretty text-base font-black uppercase leading-[1.1]">{title}</p>
      {subtitle && <p className="mt-1 text-xs font-medium leading-snug opacity-70">{subtitle}</p>}
    </>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

// El logo es el mismo para las 90+ etiquetas: se carga una sola vez por sesión.
let logoPromise: Promise<HTMLImageElement> | null = null;
function getLogo() {
  if (!logoPromise) logoPromise = loadImage(LOGO_SRC).catch((error) => { logoPromise = null; throw error; });
  return logoPromise;
}

/** Render the same reference artwork for preview, download and print. */
async function composeLabel(item: MachineLabel, format: "image/png" | "image/jpeg" = "image/png"): Promise<Blob> {
  const content = getMachineLabelContent(item);
  const [logo, qr] = await Promise.all([
    getLogo(),
    QRCode.toDataURL(item.url, { width: 1500, margin: 4, errorCorrectionLevel: "H", color: { dark: "#000000", light: "#ffffff" } }).then(loadImage),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  drawMachineLabel(ctx, { ...content, code: item.code, logo, qr });
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo generar la etiqueta.")), format, 0.98));
}

/**
 * Hoja de QR para staff. En pantalla es una tabla con todos los códigos (uno por
 * unidad física); al imprimir salen las etiquetas verticales recortables (código
 * grande + QR). El PNG de alta resolución se genera aparte, con `composeLabel`.
 */
export default function QrSheet({ items }: { items: MachineLabel[] }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportCount, setExportCount] = useState(0);
  const exportingRef = useRef(false);
  const [preview, setPreview] = useState<{ item: MachineLabel; url: string } | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [printLabels, setPrintLabels] = useState<{ key: string; name: string; url: string }[]>([]);
  const [printPreparing, setPrintPreparing] = useState(false);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!printLabels.length) return;
    let cancelled = false;
    Promise.all(Array.from(printRef.current?.querySelectorAll("img") ?? []).map((img) => img.decode()))
      .then(() => { if (!cancelled) window.print(); })
      .catch(() => { if (!cancelled) setError("No se pudieron preparar las etiquetas. Reintentá la impresión."); })
      .finally(() => { if (!cancelled) setPrintPreparing(false); });
    return () => { cancelled = true; printLabels.forEach((label) => URL.revokeObjectURL(label.url)); };
  }, [printLabels]);

  async function printSheet() {
    if (printPreparing || exportingRef.current || !items.length) return;
    setPrintPreparing(true);
    setError("");
    const labels: typeof printLabels = [];
    try {
      for (const item of items) {
        labels.push({ key: unitKey(item), name: qrLabel(item), url: URL.createObjectURL(await composeLabel(item)) });
      }
      setPrintLabels(labels);
    } catch {
      labels.forEach((label) => URL.revokeObjectURL(label.url));
      setError("No se pudieron generar las etiquetas. Reintentá.");
      setPrintPreparing(false);
    }
  }

  const modelCount = useMemo(() => new Set(items.map((i) => i.id)).size, [items]);

  // Libera el object URL de la etiqueta al cerrar el modal o salir de la página.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function openPreview(item: MachineLabel) {
    const key = unitKey(item);
    setPreviewKey(key);
    try {
      setError("");
      const blob = await composeLabel(item);
      const url = URL.createObjectURL(blob);
      setPreview({ item, url });
    } catch {
      setError("No se pudo generar la vista previa. Reintentá.");
    } finally {
      setPreviewKey((k) => (k === key ? null : k));
    }
  }

  function closePreview() {
    setPreview(null);
  }

  async function downloadPdf(selectedItems: MachineLabel[]) {
    if (exportingRef.current || printPreparing || !selectedItems.length) return;
    exportingRef.current = true;
    setBusy(true);
    setProgress(0);
    setExportCount(selectedItems.length);
    setError("");
    try {
      const { createMachineLabelsPdf } = await import("./machine-label-pdf");
      const bytes = await createMachineLabelsPdf(selectedItems, async (item) => {
        const image = await composeLabel(item, "image/jpeg");
        return new Uint8Array(await image.arrayBuffer());
      }, setProgress);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = selectedItems.length === 1
        ? `etiqueta-${fileStem(selectedItems[0])}.pdf`
        : `xtreme-etiquetas-${selectedItems.length}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo generar el PDF. Reintentá.");
    } finally {
      exportingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Ajustes de impresión: solo salen las etiquetas, sin cromo del sitio. */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: #fff !important; }
          body:has(.machine-label-print) * { visibility: hidden; }
          .machine-label-print, .machine-label-print * { visibility: visible !important; }
          .machine-label-print { display: grid !important; grid-template-columns: 90mm 90mm; gap: 8mm; position: absolute; top: 0; left: 0; }
          .machine-label-print img { display: block; width: 90mm; height: 160mm; break-inside: avoid; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={printSheet}
          disabled={printPreparing || busy || !items.length}
          className="inline-flex min-h-11 items-center gap-2 border-2 border-black/30 bg-[#d8ff3e] px-4 text-[11px] font-black uppercase tracking-[0.1em] text-black shadow-[2px_2px_0_rgba(0,0,0,0.5)] transition hover:bg-white active:translate-x-px active:translate-y-px active:shadow-none"
        >
          <Printer className="h-4 w-4" />
          {printPreparing ? "Preparando etiquetas…" : "Imprimir etiquetas en A4"}
        </button>
        <button
          type="button"
          onClick={() => downloadPdf(items)}
          disabled={busy || printPreparing || !items.length}
          className="inline-flex min-h-11 items-center gap-2 border-2 border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-[#eaff93] transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/20 active:translate-x-px active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? `Generando PDF ${progress}/${exportCount}` : "Descargar un PDF con las etiquetas"}
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">
          {items.length} etiquetas físicas · {modelCount} fichas vinculadas
        </p>
      </div>
      <p className="text-sm text-white/60 print:hidden">Un solo PDF de {Math.ceil(items.length / 2)} hojas A4: dos etiquetas de 9 × 16 cm por hoja, centradas. Si queda una sola, va centrada en su hoja.</p>
      {error && <p role="alert" className="text-sm text-red-300 print:hidden">{error}</p>}

      {/* Tabla en pantalla: un renglón por código. */}
      <div className="overflow-x-auto border-[3px] border-white/15 bg-[#0c0c0c] shadow-[4px_4px_0_rgba(0,0,0,0.6)] print:hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-white/15 bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
              <th className="px-3 py-3 sm:px-4">Código</th>
              <th className="px-3 py-3 sm:px-4">Máquina</th>
              <th className="hidden px-3 py-3 sm:table-cell sm:px-4">Zona</th>
              <th className="hidden px-3 py-3 md:table-cell md:px-4">Unidad</th>
              <th className="px-3 py-3 text-center sm:px-4">QR</th>
              <th className="px-3 py-3 text-right sm:px-4">Etiqueta</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={unitKey(item)}
                className="border-b border-white/8 align-middle transition last:border-b-0 hover:bg-white/[0.03]"
              >
                <td className="px-3 py-3 sm:px-4">
                  {item.code ? (
                    <span className="inline-flex items-center border-2 border-[#d8ff3e] bg-[#d8ff3e] px-2 py-1 font-mono text-sm font-black tracking-[0.08em] text-black">
                      {item.code}
                    </span>
                  ) : (
                    <span className="inline-flex items-center border-2 border-white/20 px-2 py-1 font-mono text-[11px] font-black uppercase tracking-[0.1em] text-white/40">
                      s/código
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <LabelName item={item} />
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 sm:hidden">
                    {item.zone}
                  </p>
                </td>
                <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-white/55">
                    {item.zone}
                  </span>
                </td>
                <td className="hidden px-3 py-3 md:table-cell md:px-4">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-white/45">
                    {item.units > 1 ? `${item.unit} de ${item.units}` : "Única"}
                  </span>
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <div className="mx-auto w-fit">
                    <MachineQr value={item.url} label={qrLabel(item)} size={64} showDownload={false} />
                  </div>
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openPreview(item)}
                      disabled={previewKey === unitKey(item)}
                      className="inline-flex min-h-11 items-center gap-1.5 border-2 border-white/20 bg-black/30 px-3 text-[11px] font-black uppercase tracking-[0.1em] text-white/70 transition hover:border-[#d8ff3e] hover:text-[#d8ff3e] focus-visible:border-[#d8ff3e] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {previewKey === unitKey(item) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      Vista previa
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPdf([item])}
                      disabled={busy || printPreparing}
                      className="inline-flex min-h-11 items-center gap-1.5 border-2 border-white/20 bg-black/30 px-3 text-[11px] font-black uppercase tracking-[0.1em] text-white/70 transition hover:border-[#d8ff3e] hover:text-[#d8ff3e] focus-visible:border-[#d8ff3e] focus-visible:outline-none"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <Link
                      href={`/admin/equipo?machine=${item.id}`}
                      target="_blank"
                      className="inline-flex min-h-11 items-center gap-1.5 border-2 border-[#d8ff3e]/40 bg-[#d8ff3e]/10 px-3 text-[11px] font-black uppercase tracking-[0.1em] text-[#eaff93] transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/20 focus-visible:border-[#d8ff3e] focus-visible:outline-none"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Video y fotos
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div ref={printRef} className="machine-label-print hidden">
        {printLabels.map((label) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={label.key} src={label.url} alt={label.name} />
        ))}
      </div>

      {/* Vista previa de la etiqueta PNG: el mismo canvas que se descarga, a tamaño real. */}
      <GameModal
        open={!!preview}
        onClose={closePreview}
        title="Vista previa de etiqueta"
        subtitle={
          preview
            ? [preview.item.code, preview.item.name, preview.item.zone].filter(Boolean).join(" · ")
            : undefined
        }
        icon={Eye}
        tone="lime"
        size="full"
        footer={
          preview && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <GameButton variant="lime" disabled={busy || printPreparing} onClick={() => downloadPdf([preview.item])}>
                <Download className="h-4 w-4" />
                {busy ? "Generando PDF…" : "Descargar PDF"}
              </GameButton>
            </div>
          )
        }
      >
        {preview && (
          // Blob local generado en canvas; next/image no admite este ciclo de vida.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.url}
            alt={`Etiqueta de ${preview.item.name}`}
            className="mx-auto block max-h-[70vh] w-auto max-w-full border-[3px] border-black"
          />
        )}
      </GameModal>
    </div>
  );
}
