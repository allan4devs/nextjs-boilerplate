import { PDFDocument, PageSizes } from "pdf-lib";
import { LABEL_HEIGHT, LABEL_WIDTH } from "./machine-label-artwork";

const MM = 72 / 25.4;
const WIDTH = 90 * MM;
const HEIGHT = WIDTH * LABEL_HEIGHT / LABEL_WIDTH;
const GAP = 8 * MM;

/** Two actual-size labels fit on portrait A4; a remaining single label is centered. */
export function machineLabelPdfPositions(count: 1 | 2) {
  const [pageWidth, pageHeight] = PageSizes.A4;
  const left = (pageWidth - count * WIDTH - (count - 1) * GAP) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: left + index * (WIDTH + GAP),
    y: (pageHeight - HEIGHT) / 2,
    width: WIDTH,
    height: HEIGHT,
  }));
}

/** Render sequentially to keep memory bounded; return one completed file, never partial downloads. */
export async function createMachineLabelsPdf<T>(
  items: readonly T[],
  renderJpeg: (item: T) => Promise<Uint8Array>,
  onProgress?: (completed: number) => void,
): Promise<Uint8Array> {
  if (!items.length) throw new Error("No hay etiquetas para descargar.");
  const pdf = await PDFDocument.create();
  pdf.setTitle("Etiquetas de máquinas · Xtreme Gym");
  pdf.setAuthor("Xtreme Gym");
  pdf.setSubject("Etiquetas de 9 × 16 cm, dos por hoja A4");
  for (let offset = 0; offset < items.length; offset += 2) {
    const count = Math.min(2, items.length - offset) as 1 | 2;
    const page = pdf.addPage(PageSizes.A4);
    const positions = machineLabelPdfPositions(count);
    for (let index = 0; index < count; index++) {
      // High-quality JPEG avoids retaining decoded multi-megapixel PNGs for the whole inventory.
      const image = await pdf.embedJpg(await renderJpeg(items[offset + index]));
      page.drawImage(image, positions[index]);
      onProgress?.(offset + index + 1);
    }
    await pdf.flush();
  }
  return pdf.save();
}
