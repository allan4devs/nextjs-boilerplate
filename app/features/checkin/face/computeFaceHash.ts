export type FaceHashSource = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;

/** dHash 64-bit (hex 16) for fast, local face matching without an ML model. */
export async function computeFaceHash(source: FaceHashSource): Promise<string> {
  const size = 9;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size - 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "";

  let width = 0;
  let height = 0;
  if (source instanceof HTMLVideoElement) {
    width = source.videoWidth;
    height = source.videoHeight;
  } else if (source instanceof HTMLImageElement) {
    width = source.naturalWidth || source.width;
    height = source.naturalHeight || source.height;
  } else {
    width = source.width;
    height = source.height;
  }
  if (!width || !height) return "";

  const side = Math.min(width, height) * 0.72;
  const sourceX = (width - side) / 2;
  const sourceY = (height - side) / 2.4;
  context.drawImage(source, sourceX, sourceY, side, side, 0, 0, size, size - 1);

  const { data } = context.getImageData(0, 0, size, size - 1);
  const grayscale: number[] = [];
  for (let index = 0; index < data.length; index += 4) {
    grayscale.push(
      0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2],
    );
  }

  let bits = "";
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const left = grayscale[y * size + x];
      const right = grayscale[y * size + x + 1];
      bits += left < right ? "1" : "0";
    }
  }

  let hash = "";
  for (let index = 0; index < 64; index += 4) {
    hash += Number.parseInt(bits.slice(index, index + 4), 2).toString(16);
  }
  return hash;
}
