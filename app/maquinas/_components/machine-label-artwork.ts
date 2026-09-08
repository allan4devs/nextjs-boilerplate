/** One canvas composition for preview, PNG and print. Coordinates follow the 9:16 reference. */
export const LABEL_WIDTH = 1200;
export const LABEL_HEIGHT = 2133;
const YELLOW = "#ffed00";
const PURPLE = "#a600ec";
const INK = "#090909";
const CENTER_X = LABEL_WIDTH / 2;
const CONTENT_WIDTH = 838;

type Artwork = { code: string; title: string; subtitle: string; zone: string; logo: CanvasImageSource; qr: CanvasImageSource };

function polygon(ctx: CanvasRenderingContext2D, points: number[][], fill: string) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number, fill: string, stroke?: string, lineWidth = 4) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function font(size: number, italic = true) {
  return `${italic ? "italic " : ""}900 ${size}px "Arial Black", Arial, sans-serif`;
}

function textWidth(ctx: CanvasRenderingContext2D, text: string) {
  const metrics = ctx.measureText(text);
  return Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
}

/** Center visible glyphs, including italic overhang and accents. */
function centeredText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const metrics = ctx.measureText(text);
  ctx.fillText(text,
    x + (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2,
    y + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
}

/** Fits all wording, including single long codes, without ellipses or cropping. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number, height: number, maxSize: number, italic = true) {
  for (let size = maxSize; size >= 12; size--) {
    ctx.font = font(size, italic);
    const lines: string[] = [];
    let line = "";
    for (const word of text.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && textWidth(ctx, candidate) > width) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    if (lines.length * size * 1.05 <= height && lines.every((value) => textWidth(ctx, value) <= width)) return { lines, size };
  }
  return { lines: [text], size: 12 };
}

/** Prefer one line for short names, allowing a modest reduction before wrapping. */
function fitTitle(ctx: CanvasRenderingContext2D, text: string, height: number) {
  const title = text.trim().replace(/\s+/g, " ").toUpperCase();
  for (let size = 126; size >= 96; size--) {
    ctx.font = font(size);
    const metrics = ctx.measureText(title);
    const width = Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
    if (width <= CONTENT_WIDTH) return { lines: [title], size };
  }
  return fit(ctx, title, CONTENT_WIDTH, height, 126);
}

function scanIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x - 25, y - 38, 50, 76, 8);
  ctx.stroke();
  for (const [dx, dy] of [[-15, -21], [15, -21], [-15, 21], [15, 21]]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy - Math.sign(dy) * 10);
    ctx.lineTo(x + dx, y + dy);
    ctx.lineTo(x + dx - Math.sign(dx) * 9, y + dy);
    ctx.stroke();
  }
  ctx.fillStyle = YELLOW;
  ctx.fillRect(x - 12, y - 2, 24, 4);
}

function bookIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = PURPLE;
  ctx.lineWidth = 4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y + 27); ctx.lineTo(x, y - 22);
    ctx.quadraticCurveTo(x + side * 20, y - 34, x + side * 43, y - 26);
    ctx.lineTo(x + side * 43, y + 22);
    ctx.quadraticCurveTo(x + side * 20, y + 14, x, y + 27);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x + side * 10, y - 12 + i * 10); ctx.lineTo(x + side * 32, y - 16 + i * 10); ctx.stroke();
    }
  }
}

export function drawMachineLabel(ctx: CanvasRenderingContext2D, data: Artwork) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "0px";
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);

  // Honeycomb fades into black at the upper left.
  ctx.save();
  ctx.lineWidth = 2;
  for (let col = 0; col < 7; col++) for (let row = 0; row < 9; row++) {
    const x = col * 68 - 8;
    const y = row * 78 + (col % 2) * 39;
    ctx.strokeStyle = `rgba(255,237,0,${Math.max(0, 0.42 - col * 0.055 - row * 0.045)})`;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const px = x + Math.cos(a) * 45; const py = y + Math.sin(a) * 45; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.stroke();
  }
  ctx.restore();

  // Athletic diagonal side stripes, outside the text and QR quiet zone.
  polygon(ctx, [[1200, 230], [1200, 2133], [1175, 2133], [1140, 1510], [1035, 1390]], YELLOW);
  polygon(ctx, [[1200, 575], [1200, 685], [964, 1445], [980, 1320]], "#ffffff");
  polygon(ctx, [[1196, 270], [1200, 275], [920, 1440], [916, 1432]], YELLOW);
  polygon(ctx, [[0, 910], [118, 1650], [8, 2133], [0, 2133]], YELLOW);
  polygon(ctx, [[0, 1150], [90, 1700], [74, 1795], [0, 1320]], "#ffffff");
  polygon(ctx, [[26, 2133], [130, 1690], [134, 1696], [32, 2133]], YELLOW);
  for (let y = 1170; y < LABEL_HEIGHT; y += 21) for (let x = 0; x <= LABEL_WIDTH; x += 21) {
    const edge = Math.min(x, LABEL_WIDTH - x);
    const spread = 80 + (y - 1170) * 0.15;
    if (edge > spread) continue;
    ctx.fillStyle = x > 1160 || x < 30 ? "#ffffff" : YELLOW;
    ctx.beginPath(); ctx.arc(x, y, Math.max(1, 6.8 * (1 - edge / spread)), 0, Math.PI * 2); ctx.fill();
  }

  // Existing gym logo stays intact; the number belongs to the physical unit.
  const brandCenter = 380;
  const codeCenter = 820;
  ctx.drawImage(data.logo, brandCenter - 164, 24, 328, 328);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 23px Arial";
  ctx.letterSpacing = "4px";
  centeredText(ctx, "CIUDAD QUESADA", brandCenter, 375);
  const cityWidth = textWidth(ctx, "CIUDAD QUESADA");
  ctx.letterSpacing = "0px";
  ctx.fillStyle = PURPLE;
  ctx.fillRect(brandCenter - cityWidth / 2 - 35, 373, 24, 4);
  ctx.fillRect(brandCenter + cityWidth / 2 + 11, 373, 24, 4);
  polygon(ctx, [[656, 82], [1019, 82], [990, 320], [936, 389], [620, 389]], PURPLE);
  polygon(ctx, [[664, 91], [1009, 91], [981, 316], [931, 380], [632, 380]], YELLOW);
  const code = data.code.trim() || "SIN CÓDIGO";
  const codeText = fit(ctx, code, 325, 239, 246, false);
  ctx.fillStyle = "#3f106a"; ctx.font = font(codeText.size, false);
  codeText.lines.forEach((line, i) => centeredText(ctx, line, codeCenter, 236 + (i - (codeText.lines.length - 1) / 2) * codeText.size * 1.05));

  // Large square black-on-white QR. Four-module margin is part of the QR image.
  pill(ctx, 181, 412, 838, 838, 59, "#ffffff");
  pill(ctx, 196, 427, 808, 808, 45, PURPLE);
  pill(ctx, 212, 443, 776, 776, 31, "#ffffff");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(data.qr, 225, 456, 750, 750);
  ctx.imageSmoothingEnabled = true;

  pill(ctx, 205, 1269, 790, 137, 69, "#000000", YELLOW, 5);
  ctx.font = font(58);
  const scanWidth = textWidth(ctx, "ESCANEÁ");
  const hereWidth = textWidth(ctx, "AQUÍ");
  const ctaLeft = CENTER_X - (108 + 28 + scanWidth + 20 + hereWidth) / 2;
  pill(ctx, ctaLeft, 1283, 108, 108, 54, "#000000", YELLOW, 3);
  scanIcon(ctx, ctaLeft + 54, 1337);
  ctx.fillStyle = YELLOW;
  centeredText(ctx, "ESCANEÁ", ctaLeft + 136 + scanWidth / 2, 1337);
  ctx.fillStyle = "#ffffff";
  centeredText(ctx, "AQUÍ", ctaLeft + 136 + scanWidth + 20 + hereWidth / 2, 1337);

  // Keep every editable word. Long descriptions reduce in size within a fixed block.
  const subtitle = data.subtitle ? fit(ctx, data.subtitle.toUpperCase(), CONTENT_WIDTH, 84, 37) : null;
  const subtitleHeight = subtitle ? subtitle.lines.length * subtitle.size * 1.05 : 0;
  const detailGap = subtitle ? 24 : 0;
  const title = fitTitle(ctx, data.title, 386 - subtitleHeight - detailGap);
  const titleHeight = title.lines.length * title.size * 1.05;
  const textTop = 1450 + (386 - titleHeight - detailGap - subtitleHeight) / 2;
  ctx.font = font(title.size); ctx.fillStyle = "#ffffff";
  title.lines.forEach((line, i) => centeredText(ctx, line, CENTER_X, textTop + (i + 0.5) * title.size * 1.05));
  if (subtitle) {
    ctx.font = font(subtitle.size); ctx.fillStyle = "#e2e2e2";
    subtitle.lines.forEach((line, i) => centeredText(ctx, line, CENTER_X, textTop + titleHeight + detailGap + (i + 0.5) * subtitle.size * 1.05));
  }
  ctx.fillStyle = PURPLE; ctx.fillRect(CENTER_X - 295, 1859, 590, 8);
  const zone = fit(ctx, (data.zone === "Pierna" ? "Piernas" : data.zone).toUpperCase(), CONTENT_WIDTH - 136, 93, 70);
  ctx.font = font(zone.size);
  const zoneWidth = Math.max(...zone.lines.map((line) => textWidth(ctx, line)));
  const zoneLeft = CENTER_X - (108 + 28 + zoneWidth) / 2;
  pill(ctx, zoneLeft, 1885, 108, 108, 54, "#000000", PURPLE, 4);
  // Simple muscle/leg outline, echoing the reference's zone icon.
  ctx.save();
  ctx.translate(zoneLeft + 54 - 220, 0);
  ctx.strokeStyle = YELLOW; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(226, 1909); ctx.bezierCurveTo(260, 1934, 231, 1955, 218, 1940); ctx.lineTo(208, 1970); ctx.lineTo(222, 1975); ctx.lineTo(199, 1979); ctx.lineTo(188, 1950); ctx.bezierCurveTo(178, 1925, 207, 1925, 226, 1909); ctx.stroke();
  ctx.restore();
  ctx.font = font(zone.size); ctx.fillStyle = YELLOW;
  zone.lines.forEach((line, i) => centeredText(ctx, line, zoneLeft + 136 + zoneWidth / 2, 1940 + (i - (zone.lines.length - 1) / 2) * zone.size * 1.05));

  pill(ctx, CENTER_X - CONTENT_WIDTH / 2, 2013, CONTENT_WIDTH, 101, 51, "#000000", YELLOW, 4);
  let footerSize = 32;
  ctx.font = font(footerSize);
  while (footerSize > 20 && 154 + textWidth(ctx, "XTREME GYM") + textWidth(ctx, "GUÍA DE MÁQUINAS") > CONTENT_WIDTH - 48) {
    ctx.font = font(--footerSize);
  }
  const brandWidth = textWidth(ctx, "XTREME GYM");
  const guideWidth = textWidth(ctx, "GUÍA DE MÁQUINAS");
  const footerLeft = CENTER_X - (154 + brandWidth + guideWidth) / 2;
  bookIcon(ctx, footerLeft + 43, 2063);
  ctx.fillStyle = "#ffffff";
  centeredText(ctx, "XTREME GYM", footerLeft + 108 + brandWidth / 2, 2063);
  ctx.fillStyle = YELLOW; ctx.beginPath(); ctx.arc(footerLeft + 131 + brandWidth, 2063, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffffff";
  centeredText(ctx, "GUÍA DE MÁQUINAS", footerLeft + 154 + brandWidth + guideWidth / 2, 2063);
}
