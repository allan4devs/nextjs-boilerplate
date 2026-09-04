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

// Paleta del rótulo físico: negro + dorado + acento morado (sigue el diseño
// de señalización ya impreso en sala, distinto del lima del Member OS).
const INK_BLACK = "#0a0a0c";
const PAPER = "#fbf9f4";
const GOLD = "#f0b429";
const GOLD_SOFT = "#ffe08a";
const GOLD_DEEP = "#a9741c";
const PURPLE = "#5b2a86";
const PURPLE_DEEP = "#33144d";

const PAD_X = 70;
const PAD_TOP = 56;
const PAD_BOTTOM = 56;
const SPLIT_TOP_X = 985;
const SPLIT_BOTTOM_X = 1052;

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

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Insignia tipo "boleto": esquina superior derecha cortada a 45°. */
function cutCornerPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cut: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

type IconOp =
  | { k: "path"; d: string }
  | { k: "rect"; x: number; y: number; w: number; h: number; r: number }
  | { k: "circle"; x: number; y: number; r: number };

/** Dibuja un ícono de 24x24 (paths de lucide) centrado en (cx, cy) a `size`px. */
function drawIcon(
  ctx: CanvasRenderingContext2D,
  ops: IconOp[],
  cx: number,
  cy: number,
  size: number,
  color: string,
  weight = 2,
) {
  const scale = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = weight;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const op of ops) {
    if (op.k === "path") {
      ctx.stroke(new Path2D(op.d));
    } else if (op.k === "circle") {
      ctx.beginPath();
      ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      roundedRectPath(ctx, op.x, op.y, op.w, op.h, op.r);
      ctx.fill();
    }
  }
  ctx.restore();
}

const DUMBBELL: IconOp[] = [
  {
    k: "path",
    d: "M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z",
  },
  { k: "path", d: "m2.5 21.5 1.4-1.4" },
  { k: "path", d: "m20.1 3.9 1.4-1.4" },
  {
    k: "path",
    d: "M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z",
  },
  { k: "path", d: "m9.6 14.4 4.8-4.8" },
];
const TARGET: IconOp[] = [
  { k: "circle", x: 12, y: 12, r: 10 },
  { k: "circle", x: 12, y: 12, r: 6 },
  { k: "circle", x: 12, y: 12, r: 2 },
];
const LAYOUT_GRID: IconOp[] = [
  { k: "rect", x: 3, y: 3, w: 7, h: 7, r: 1 },
  { k: "rect", x: 14, y: 3, w: 7, h: 7, r: 1 },
  { k: "rect", x: 14, y: 14, w: 7, h: 7, r: 1 },
  { k: "rect", x: 3, y: 14, w: 7, h: 7, r: 1 },
];
const SHIELD_CHECK: IconOp[] = [
  {
    k: "path",
    d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
  },
  { k: "path", d: "m9 12 2 2 4-4" },
];
const HEART_PULSE: IconOp[] = [
  {
    k: "path",
    d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
  },
  { k: "path", d: "M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" },
];
const ZAP: IconOp[] = [
  {
    k: "path",
    d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
  },
];
const FLAME: IconOp[] = [
  {
    k: "path",
    d: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",
  },
];
const SCAN_LINE: IconOp[] = [
  { k: "path", d: "M3 7V5a2 2 0 0 1 2-2h2" },
  { k: "path", d: "M17 3h2a2 2 0 0 1 2 2v2" },
  { k: "path", d: "M21 17v2a2 2 0 0 1-2 2h-2" },
  { k: "path", d: "M7 21H5a2 2 0 0 1-2-2v-2" },
  { k: "path", d: "M7 12h10" },
];
const BOOK_OPEN: IconOp[] = [
  { k: "path", d: "M12 7v14" },
  {
    k: "path",
    d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
  },
];

/** Espejo de ZONE_ICONS (app/components/member/tabs/MaquinasTab.tsx) para el rótulo impreso. */
const ZONE_ICON_OPS: Record<string, IconOp[]> = {
  Pierna: DUMBBELL,
  Pecho: TARGET,
  Espalda: LAYOUT_GRID,
  Hombro: SHIELD_CHECK,
  Brazo: ZAP,
  Core: FLAME,
  "Full body": SHIELD_CHECK,
  Cardio: HEART_PULSE,
};

/** Trama de puntos dorados, recortada a una caja (esquinas del panel claro). */
function drawDotGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  const step = 26;
  const dotR = 2.6;
  for (let py = y - step; py < y + h + step; py += step) {
    for (let px = x - step; px < x + w + step; px += step) {
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Trama de hexágonos, muy sutil, recortada a una caja (esquina del panel oscuro). */
function drawHexPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const size = 26;
  const hexH = Math.sqrt(3) * size;
  const stepX = size * 1.5;
  for (let col = 0, cx = x; cx < x + w + stepX; col += 1, cx = x + col * stepX) {
    const offsetY = col % 2 === 0 ? 0 : hexH / 2;
    for (let cy = y - hexH + offsetY; cy < y + h + hexH; cy += hexH) {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i;
        const px = cx + size * Math.cos(angle);
        const py = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Compone la etiqueta física de una máquina siguiendo el rótulo de señalización
 * ya impreso en sala: panel negro con el logo, el nombre y la zona a la
 * izquierda, cortado en diagonal (con costura dorada) contra un panel claro
 * a la derecha donde respira el QR. Lista para imprimir y pegar en sala.
 */
async function composeLabel(item: MachineLabel): Promise<Blob> {
  const qrSize = 380;
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

  // ── Fondo: panel claro completo, panel negro recortado en diagonal encima. ──
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);

  ctx.fillStyle = INK_BLACK;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(SPLIT_TOP_X, 0);
  ctx.lineTo(SPLIT_BOTTOM_X, LABEL_HEIGHT);
  ctx.lineTo(0, LABEL_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Costura dorada sobre la diagonal (mitad en negro, mitad en claro).
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(SPLIT_TOP_X, 0);
  ctx.lineTo(SPLIT_BOTTOM_X, LABEL_HEIGHT);
  ctx.stroke();

  // Tramas decorativas, muy sutiles: hexágonos en la esquina negra, puntos dorados en la clara.
  drawHexPattern(ctx, 0, 0, 460, 300, "rgba(255,255,255,0.05)");
  drawDotGrid(ctx, LABEL_WIDTH - 260, 0, 260, 210, "rgba(240,180,41,0.35)");
  drawDotGrid(ctx, LABEL_WIDTH - 260, LABEL_HEIGHT - 210, 260, 210, "rgba(240,180,41,0.3)");

  // Marco dorado de cierre.
  ctx.strokeStyle = GOLD_DEEP;
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, LABEL_WIDTH - 10, LABEL_HEIGHT - 10);

  const leftColRight = SPLIT_TOP_X - 44;
  const leftColW = leftColRight - PAD_X;

  // ── Logo + tagline, arriba a la izquierda sobre el panel negro. ──
  const logoSize = 148;
  ctx.drawImage(logo, PAD_X, PAD_TOP, logoSize, logoSize);

  const taglineY = PAD_TOP + logoSize + 32;
  ctx.font = "700 15px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  const tagline = "CIUDAD QUESADA";
  const taglineW = ctx.measureText(tagline).width;
  const taglineCx = PAD_X + logoSize / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tagline, taglineCx, taglineY);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(taglineCx - taglineW / 2 - 34, taglineY);
  ctx.lineTo(taglineCx - taglineW / 2 - 10, taglineY);
  ctx.moveTo(taglineCx + taglineW / 2 + 10, taglineY);
  ctx.lineTo(taglineCx + taglineW / 2 + 34, taglineY);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // ── Insignia dorada con el código: "boleto" cruzando la costura. ──
  if (item.code) {
    const badgeH = 176;
    const badgeCut = 32;
    const maxBadgeW = 340;
    let codeFont = 132;
    ctx.font = `900 ${codeFont}px Arial`;
    while (codeFont > 56 && ctx.measureText(item.code).width > maxBadgeW - 64) {
      codeFont -= 4;
      ctx.font = `900 ${codeFont}px Arial`;
    }
    const badgePadX = 32;
    const badgeW = Math.min(maxBadgeW, ctx.measureText(item.code).width + badgePadX * 2);
    const badgeX2 = SPLIT_TOP_X + 56;
    const badgeX1 = badgeX2 - badgeW;
    const badgeY1 = PAD_TOP - 6;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    cutCornerPath(ctx, badgeX1 + 10, badgeY1 + 10, badgeW, badgeH, badgeCut);
    ctx.fill();

    const gradient = ctx.createLinearGradient(badgeX1, badgeY1, badgeX1 + badgeW, badgeY1 + badgeH);
    gradient.addColorStop(0, GOLD_SOFT);
    gradient.addColorStop(1, GOLD_DEEP);
    ctx.fillStyle = gradient;
    cutCornerPath(ctx, badgeX1, badgeY1, badgeW, badgeH, badgeCut);
    ctx.fill();
    ctx.strokeStyle = GOLD_DEEP;
    ctx.lineWidth = 3;
    cutCornerPath(ctx, badgeX1 + 1.5, badgeY1 + 1.5, badgeW - 3, badgeH - 3, badgeCut);
    ctx.stroke();

    ctx.fillStyle = PURPLE_DEEP;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(item.code, badgeX1 + badgeW / 2 - badgeCut / 4, badgeY1 + badgeH / 2 + 6);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  // ── Nombre de la máquina, grande y en blanco. ──
  const nameTop = taglineY + 56;
  ctx.letterSpacing = "1px";
  const { size: nameSize, lines: nameLines } = fitLines(
    ctx,
    item.name.toUpperCase(),
    leftColW,
    84,
    40,
    3,
  );
  const nameLineHeight = nameSize * 1.08;
  ctx.font = `900 ${nameSize}px Arial`;
  ctx.fillStyle = "#ffffff";
  nameLines.forEach((line, i) => {
    ctx.fillText(line, PAD_X, nameTop + nameSize * 0.85 + i * nameLineHeight);
  });
  ctx.letterSpacing = "0px";

  // ── Línea divisoria + zona con ícono en círculo morado. ──
  const dividerY = nameTop + nameLines.length * nameLineHeight + 30;
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD_X, dividerY);
  ctx.lineTo(PAD_X + leftColW, dividerY);
  ctx.stroke();

  const circleR = 38;
  const circleCx = PAD_X + circleR;
  const circleCy = dividerY + 26 + circleR;
  ctx.fillStyle = PURPLE;
  ctx.beginPath();
  ctx.arc(circleCx, circleCy, circleR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawIcon(ctx, ZONE_ICON_OPS[item.zone] ?? DUMBBELL, circleCx, circleCy, 40, "#ffffff", 2);

  const zoneText = item.units > 1 ? `${item.zone} · Unidad ${item.unit}/${item.units}` : item.zone;
  ctx.font = "900 30px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(zoneText.toUpperCase(), circleCx + circleR + 22, circleCy + 2);
  ctx.textBaseline = "alphabetic";

  // ── Pastilla de pie de página, abajo a la izquierda. ──
  const pillH = 54;
  const pillIconSize = 22;
  const pillPadX = 22;
  const pillGap = 12;
  const footerText = "XTREME GYM · GUÍA DE MÁQUINAS";
  ctx.font = "800 16px Arial";
  const footerTextW = ctx.measureText(footerText).width;
  const pillW = pillPadX * 2 + pillIconSize + pillGap + footerTextW;
  const pillX = PAD_X;
  const pillY = LABEL_HEIGHT - PAD_BOTTOM - pillH;
  ctx.fillStyle = INK_BLACK;
  roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  roundedRectPath(ctx, pillX + 1.25, pillY + 1.25, pillW - 2.5, pillH - 2.5, pillH / 2 - 1);
  ctx.stroke();
  drawIcon(
    ctx,
    BOOK_OPEN,
    pillX + pillPadX + pillIconSize / 2,
    pillY + pillH / 2,
    pillIconSize,
    GOLD,
    2.2,
  );
  ctx.font = "800 16px Arial";
  ctx.fillStyle = GOLD;
  ctx.textBaseline = "middle";
  ctx.fillText(footerText, pillX + pillPadX + pillIconSize + pillGap, pillY + pillH / 2 + 1);
  ctx.textBaseline = "alphabetic";

  // ── Columna derecha: tarjeta blanca con el QR + CTA "Escaneá aquí". ──
  const rcLeft = SPLIT_BOTTOM_X + 40;
  const rcRight = LABEL_WIDTH - PAD_X;
  const rcCenterX = (rcLeft + rcRight) / 2;
  const cardPad = 22;
  const cardSize = qrSize + cardPad * 2;
  const cardX = rcCenterX - cardSize / 2;
  const cardY = PAD_TOP + 6;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.2)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#ffffff";
  roundedRectPath(ctx, cardX, cardY, cardSize, cardSize, 20);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, cardX + 0.75, cardY + 0.75, cardSize - 1.5, cardSize - 1.5, 20);
  ctx.stroke();
  ctx.drawImage(qrCanvas, cardX + cardPad, cardY + cardPad, qrSize, qrSize);

  const ctaText = "ESCANEÁ AQUÍ";
  const ctaIconSize = 26;
  const ctaGap = 14;
  const ctaPadX = 28;
  ctx.font = "900 30px Arial";
  const ctaTextW = ctx.measureText(ctaText).width;
  const ctaH = 60;
  const ctaW = ctaPadX * 2 + ctaIconSize + ctaGap + ctaTextW;
  const ctaX = rcCenterX - ctaW / 2;
  const ctaY = cardY + cardSize + 30;
  ctx.fillStyle = INK_BLACK;
  roundedRectPath(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  roundedRectPath(ctx, ctaX + 1.5, ctaY + 1.5, ctaW - 3, ctaH - 3, ctaH / 2 - 1.5);
  ctx.stroke();
  drawIcon(ctx, SCAN_LINE, ctaX + ctaPadX + ctaIconSize / 2, ctaY + ctaH / 2, ctaIconSize, GOLD, 2.2);
  ctx.font = "900 30px Arial";
  ctx.fillStyle = GOLD;
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, ctaX + ctaPadX + ctaIconSize + ctaGap, ctaY + ctaH / 2 + 2);
  ctx.textBaseline = "alphabetic";

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
