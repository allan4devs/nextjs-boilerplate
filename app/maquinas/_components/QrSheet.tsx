"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Download, Eye, Loader2, Pencil, Printer } from "lucide-react";
import type { MachineLabel } from "@/app/lib/machines";
import { GameButton, GameModal } from "@/app/components/GameOS";
import MachineQr from "./MachineQr";

const QR_DARK = "#0a0a0a";
const QR_LIGHT = "#ffffff";
const LOGO_SRC = "/xtreme/logo.webp";

// Etiqueta rectangular (16:9) en alta resolución para imprimir en sala.
const LABEL_WIDTH = 1600;
const LABEL_HEIGHT = 900;
const LABEL_PADDING = 64;
const LABEL_BORDER = 16;

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
  if (!logoPromise) logoPromise = loadImage(LOGO_SRC);
  return logoPromise;
}

/** Envuelve `text` a `maxLines` líneas de máx. `maxWidth`px, reduciendo la fuente si hace falta. */
function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxFont: number,
  minFont: number,
  maxLines: number,
) {
  const words = text.split(" ");
  const wrap = (fontPx: number) => {
    ctx.font = `900 ${fontPx}px Arial`;
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const attempt = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(attempt).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = attempt;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  for (let size = maxFont; size >= minFont; size -= 2) {
    const lines = wrap(size);
    if (lines.length <= maxLines) return { size, lines };
  }

  const lines = wrap(minFont).slice(0, maxLines);
  ctx.font = `900 ${minFont}px Arial`;
  let last = lines[maxLines - 1] ?? "";
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1);
  }
  lines[maxLines - 1] = `${last}…`;
  return { size: minFont, lines };
}

/** Rectángulo sólido, con una copia offset detrás para el efecto "hard shadow" de la marca. */
function hardBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  offset: number,
  color = "#000000",
) {
  ctx.fillStyle = color;
  ctx.fillRect(x + offset, y + offset, w, h);
}

/**
 * Compone la etiqueta física de una máquina: logo + código arriba a la
 * izquierda, nombre centrado debajo, separados del QR (que respira solo
 * sobre blanco, sin marco) por una línea lima vertical que recorre toda la
 * tarjeta. Lista para imprimir y pegar en sala.
 */
async function composeLabel(item: MachineLabel): Promise<Blob> {
  const qrSize = 600;
  const [logo, qrCanvas] = await Promise.all([
    getLogo(),
    QRCode.toCanvas(item.url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: qrSize,
      color: { dark: QR_DARK, light: QR_LIGHT },
    }),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no soporta canvas.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = LABEL_BORDER;
  ctx.strokeRect(
    LABEL_BORDER / 2,
    LABEL_BORDER / 2,
    LABEL_WIDTH - LABEL_BORDER,
    LABEL_HEIGHT - LABEL_BORDER,
  );

  const contentX = LABEL_PADDING;
  const contentY = LABEL_PADDING;
  const contentW = LABEL_WIDTH - LABEL_PADDING * 2;
  const contentH = LABEL_HEIGHT - LABEL_PADDING * 2;

  // ── Retícula: columna izquierda | línea divisoria lima | columna QR. ──
  const dividerW = 6;
  const colGap = 48;
  const leftColW = contentW - qrSize - colGap * 2 - dividerW;
  const leftX = contentX;
  const dividerX = leftX + leftColW + colGap;
  const rightX = dividerX + dividerW + colGap;
  const qrY = contentY;

  ctx.fillStyle = "#d8ff3e";
  ctx.fillRect(dividerX, contentY, dividerW, contentH);

  // ── Columna izquierda: logo + código, mismo borde superior que el QR. ──
  const badgeH = 260;
  const logoSize = badgeH;
  hardBox(ctx, leftX, contentY, logoSize, logoSize, 12);
  ctx.drawImage(logo, leftX, contentY, logoSize, logoSize);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(leftX + 1.25, contentY + 1.25, logoSize - 2.5, logoSize - 2.5);

  if (item.code) {
    const codeX = leftX + logoSize + 32;
    const codeMaxW = leftColW - logoSize - 32;
    // Arranca cerca de la altura del badge (no de un tamaño fijo chico) para
    // que un código corto ("18") pese tanto como el logo, no menos.
    let codeFont = Math.round(badgeH * 0.74);
    ctx.font = `900 ${codeFont}px Arial`;
    while (codeFont > 70 && ctx.measureText(item.code).width > codeMaxW - 56) {
      codeFont -= 4;
      ctx.font = `900 ${codeFont}px Arial`;
    }
    const codePadX = 28;
    const codeW = Math.min(codeMaxW, ctx.measureText(item.code).width + codePadX * 2);
    hardBox(ctx, codeX, contentY, codeW, badgeH, 12);
    ctx.fillStyle = "#d8ff3e";
    ctx.fillRect(codeX, contentY, codeW, badgeH);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 5;
    ctx.strokeRect(codeX + 3, contentY + 3, codeW - 6, badgeH - 6);
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(item.code, codeX + codeW / 2, contentY + badgeH / 2 + 6);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  // ── Columna derecha: QR directo sobre blanco, con un hairline de contención. ──
  ctx.drawImage(qrCanvas, rightX, qrY, qrSize, qrSize);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(rightX + 1.25, qrY + 1.25, qrSize - 2.5, qrSize - 2.5);

  ctx.font = "900 34px Arial";
  const scanText = "ESCANEÁ AQUÍ";
  const scanPadX = 30;
  const scanW = ctx.measureText(scanText).width + scanPadX * 2;
  const scanH = 62;
  const scanX = rightX + (qrSize - scanW) / 2;
  const scanY = qrY + qrSize + 30;
  hardBox(ctx, scanX, scanY, scanW, scanH, 8, "#d8ff3e");
  ctx.fillStyle = "#000000";
  ctx.fillRect(scanX, scanY, scanW, scanH);
  ctx.strokeStyle = "#d8ff3e";
  ctx.lineWidth = dividerW;
  ctx.strokeRect(scanX + dividerW / 2, scanY + dividerW / 2, scanW - dividerW, scanH - dividerW);
  ctx.fillStyle = "#d8ff3e";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(scanText, scanX + scanW / 2, scanY + scanH / 2 + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const qrColumnBottom = scanY + scanH;

  // Nombre + categoría: el bloque completo (y el footer) se centra contra la
  // altura real del QR+CTA, no contra todo el alto de la tarjeta — para que
  // ambas columnas terminen a la misma altura en vez de dejar aire abajo a
  // la izquierda.
  const footerBaselineY = qrColumnBottom - 4;
  const regionTop = contentY + badgeH + 50;
  const regionBottom = footerBaselineY - 50;

  ctx.letterSpacing = "2px";
  const { size: nameSize, lines: nameLines } = fitLines(
    ctx,
    item.name.toUpperCase(),
    leftColW,
    86,
    36,
    3,
  );
  const nameLineHeight = nameSize * 1.1;
  const zoneGap = 30;
  const zoneTagH = 58;
  const textBlockH = nameLines.length * nameLineHeight + zoneGap + zoneTagH;
  const startY = regionTop + Math.max(0, (regionBottom - regionTop - textBlockH) / 2);

  ctx.font = `900 ${nameSize}px Arial`;
  ctx.fillStyle = "#000000";
  nameLines.forEach((line, i) => {
    ctx.fillText(line, leftX, startY + nameSize * 0.85 + i * nameLineHeight);
  });
  ctx.letterSpacing = "0px";

  // Categoría como tag (no texto suelto): más jerarquía que una línea gris chica.
  const zoneY = startY + nameLines.length * nameLineHeight + zoneGap;
  ctx.font = "900 32px Arial";
  const zoneText = item.units > 1 ? `${item.zone} · Unidad ${item.unit}/${item.units}` : item.zone;
  const zoneLabel = zoneText.toUpperCase();
  const zoneTagPadX = 22;
  const zoneTagW = ctx.measureText(zoneLabel).width + zoneTagPadX * 2;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.strokeRect(leftX + 1.5, zoneY + 1.5, zoneTagW - 3, zoneTagH - 3);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(zoneLabel, leftX + zoneTagW / 2, zoneY + zoneTagH / 2 + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.font = "800 24px Arial";
  ctx.fillStyle = "#000000";
  ctx.fillText("XTREME GYM · GUÍA DE MÁQUINAS", leftX, footerBaselineY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar el PNG."));
    }, "image/png");
  });
}

async function downloadLabel(item: MachineLabel) {
  const blob = await composeLabel(item);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `etiqueta-${fileStem(item)}-${slugify(item.name)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Hoja de QR para staff. En pantalla es una tabla con todos los códigos (uno por
 * unidad física); al imprimir salen las etiquetas recortables (código grande + QR).
 */
export default function QrSheet({ items }: { items: MachineLabel[] }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<{ item: MachineLabel; url: string } | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

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
      const blob = await composeLabel(item);
      const url = URL.createObjectURL(blob);
      setPreview({ item, url });
    } finally {
      setPreviewKey((k) => (k === key ? null : k));
    }
  }

  function closePreview() {
    setPreview(null);
  }

  async function downloadAll() {
    if (busy) return;
    setBusy(true);
    setProgress(0);
    try {
      await getLogo();
      for (let i = 0; i < items.length; i += 1) {
        await downloadLabel(items[i]);
        setProgress(i + 1);
        await wait(350);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Ajustes de impresión: solo salen las etiquetas, sin cromo del sitio. */}
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 border-2 border-black/30 bg-[#d8ff3e] px-4 text-[11px] font-black uppercase tracking-[0.1em] text-black shadow-[2px_2px_0_rgba(0,0,0,0.5)] transition hover:bg-white active:translate-x-px active:translate-y-px active:shadow-none"
        >
          <Printer className="h-4 w-4" />
          Imprimir hoja A4 compacta
        </button>
        <button
          type="button"
          onClick={downloadAll}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 border-2 border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-[#eaff93] transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/20 active:translate-x-px active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? `Descargando ${progress}/${items.length}` : "Descargar todas las etiquetas"}
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">
          {items.length} etiquetas físicas · {modelCount} fichas vinculadas
        </p>
      </div>

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
                  <p className="text-sm font-black uppercase leading-tight">{item.name}</p>
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
                      onClick={() => downloadLabel(item)}
                      className="inline-flex min-h-11 items-center gap-1.5 border-2 border-white/20 bg-black/30 px-3 text-[11px] font-black uppercase tracking-[0.1em] text-white/70 transition hover:border-[#d8ff3e] hover:text-[#d8ff3e] focus-visible:border-[#d8ff3e] focus-visible:outline-none"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PNG
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

      {/* Etiquetas recortables: ocultas en pantalla, esto es lo único que sale al imprimir. */}
      <div className="hidden print:grid print:grid-cols-2 print:gap-4">
        {items.map((item) => (
          <div
            key={unitKey(item)}
            className="flex break-inside-avoid flex-col items-center gap-2 border-2 border-black p-4 text-center text-black"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/50">
              Xtreme Gym · Guía de máquinas
            </p>
            {item.code ? (
              <p className="font-mono text-4xl font-black leading-none tracking-[0.06em] text-black">
                {item.code}
              </p>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                Sin código asignado
              </p>
            )}
            <p className="text-sm font-black uppercase leading-tight">{item.name}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/50">
              {item.zone}
              {item.units > 1 ? ` · Unidad ${item.unit}/${item.units}` : ""}
            </p>
            <MachineQr value={item.url} label={qrLabel(item)} size={150} showDownload={false} />
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/60">
              Escaneá para ver la guía
            </p>
          </div>
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
              <GameButton variant="lime" onClick={() => downloadLabel(preview.item)}>
                <Download className="h-4 w-4" />
                Descargar PNG
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
            className="w-full border-[3px] border-black"
          />
        )}
      </GameModal>
    </div>
  );
}
