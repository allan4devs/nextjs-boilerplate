/**
 * dHash perceptual de 64 bits: comparación local y barata sin modelo de ML.
 * Sistema anterior al reconocedor real (`humanRecognizer`); sigue vivo para el
 * kiosco y para los socios enrolados antes del cambio.
 */
export type FaceHashSource = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;

/** El hash compara cada píxel con el de su derecha: de ahí la columna extra. */
const GRID = 8;
const SAMPLE_WIDTH = GRID + 1;
const SAMPLE_HEIGHT = GRID;

/** Recorte central donde suele caer la cara frente a la cámara del mostrador. */
const CROP_RATIO = 0.72;
/** Divisor vertical < 2: sube el recorte, porque la cara queda sobre el centro. */
const CROP_VERTICAL_DIVISOR = 2.4;

/** Luminancia percibida (Rec. 601). */
const LUMA = { red: 0.299, green: 0.587, blue: 0.114 } as const;

function sourceSize(source: FaceHashSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  return { width: source.width, height: source.height };
}

export async function computeFaceHash(source: FaceHashSource): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "";

  const { width, height } = sourceSize(source);
  if (!width || !height) return "";

  const side = Math.min(width, height) * CROP_RATIO;
  const sourceX = (width - side) / 2;
  const sourceY = (height - side) / CROP_VERTICAL_DIVISOR;
  context.drawImage(source, sourceX, sourceY, side, side, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);

  const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  // Float64 y no Float32: mismos valores exactos que la versión previa, así los
  // hashes ya guardados en Mongo siguen coincidiendo bit a bit.
  const grayscale = new Float64Array(SAMPLE_WIDTH * SAMPLE_HEIGHT);
  for (let pixel = 0; pixel < grayscale.length; pixel += 1) {
    const offset = pixel * 4;
    grayscale[pixel] =
      LUMA.red * data[offset] + LUMA.green * data[offset + 1] + LUMA.blue * data[offset + 2];
  }

  // Un bit por comparación con el vecino de la derecha, empaquetado de a cuatro
  // en un dígito hexadecimal: 64 bits → 16 caracteres.
  let hash = "";
  let nibble = 0;
  let bitsInNibble = 0;
  for (let y = 0; y < SAMPLE_HEIGHT; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const index = y * SAMPLE_WIDTH + x;
      nibble = (nibble << 1) | (grayscale[index] < grayscale[index + 1] ? 1 : 0);
      bitsInNibble += 1;
      if (bitsInNibble === 4) {
        hash += nibble.toString(16);
        nibble = 0;
        bitsInNibble = 0;
      }
    }
  }
  return hash;
}
