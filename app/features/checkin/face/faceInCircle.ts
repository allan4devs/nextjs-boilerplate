"use client";

/**
 * "¿Hay una cara dentro del óvalo guía?" para el kiosco de ingreso.
 *
 * Es la puerta barata que decide cuándo vale la pena disparar un escaneo: no
 * identifica a nadie, solo dice si hay alguien parado en el lugar correcto.
 * Usa la FaceDetector nativa cuando el navegador la trae (Chrome) y cae a un
 * heurístico de piel + textura cuando no, porque el kiosco tiene que funcionar
 * igual en la tablet vieja del mostrador.
 */

export type FaceDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

/** Geometría del óvalo de la UI, en proporción del frame nativo del video. */
const OVAL = {
  centerXRatio: 0.5,
  centerYRatio: 0.42,
  radiusXRatio: 0.26,
  radiusYRatio: 0.3,
} as const;

/** Un rostro más chico que esto es alguien de fondo, no quien va a ingresar. */
const MIN_FACE_RATIO = 0.12;
/** Tolerancia del centro: 1 = borde exacto del óvalo. */
const MAX_OVAL_DISTANCE = 1.2;

/** Resolución del muestreo del heurístico: suficiente para textura, casi gratis. */
const SAMPLE_SIZE = 48;
/** Mínimo de píxeles dentro del óvalo para que la medición signifique algo. */
const MIN_SAMPLED_PIXELS = 40;
/** Umbrales del heurístico: piel + textura + escena no plana. */
const MIN_SKIN_RATIO = 0.12;
const MIN_VARIANCE = 180;
const MIN_EDGE_RATIO = 0.08;
const MIN_MEAN_LUMA = 35;
const MAX_MEAN_LUMA = 230;
/** Gradiente que ya cuenta como borde. */
const EDGE_THRESHOLD = 18;
/** Los bordes se miden más adentro del óvalo, donde no entra el pelo ni el fondo. */
const EDGE_OVAL_TIGHTNESS = 0.85;

let faceDetectorSingleton: FaceDetectorLike | null | undefined;

/** Instancia única: construirla por frame es caro y el kiosco corre a ~8 fps. */
export function getFaceDetector(): FaceDetectorLike | null {
  if (faceDetectorSingleton !== undefined) return faceDetectorSingleton;
  try {
    const Ctor = (
      globalThis as unknown as {
        FaceDetector?: new (o?: {
          fastMode?: boolean;
          maxDetectedFaces?: number;
        }) => FaceDetectorLike;
      }
    ).FaceDetector;
    faceDetectorSingleton = Ctor ? new Ctor({ fastMode: true, maxDetectedFaces: 2 }) : null;
  } catch {
    faceDetectorSingleton = null;
  }
  return faceDetectorSingleton;
}

type Oval = { cx: number; cy: number; rx: number; ry: number };

function ovalFor(video: HTMLVideoElement): Oval {
  return {
    cx: video.videoWidth * OVAL.centerXRatio,
    cy: video.videoHeight * OVAL.centerYRatio,
    rx: video.videoWidth * OVAL.radiusXRatio,
    ry: video.videoHeight * OVAL.radiusYRatio,
  };
}

export async function isFaceInCircle(video: HTMLVideoElement): Promise<boolean> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height || video.readyState < 2) return false;

  const oval = ovalFor(video);
  const detector = getFaceDetector();

  if (detector) {
    try {
      const faces = await detector.detect(video);
      return faces.some((face) => {
        const box = face.boundingBox;
        if (box.width < width * MIN_FACE_RATIO || box.height < height * MIN_FACE_RATIO) {
          return false;
        }
        const dx = (box.x + box.width / 2 - oval.cx) / oval.rx;
        const dy = (box.y + box.height / 2 - oval.cy) / oval.ry;
        return dx * dx + dy * dy <= MAX_OVAL_DISTANCE;
      });
    } catch {
      // Cae al heurístico: mejor una detección aproximada que ninguna.
    }
  }

  return detectFaceHeuristic(video, oval);
}

/** Heurístico sin ML: piel + contraste/detalle dentro del óvalo. */
export function detectFaceHeuristic(video: HTMLVideoElement, oval: Oval): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;

  const sourceX = Math.max(0, oval.cx - oval.rx);
  const sourceY = Math.max(0, oval.cy - oval.ry);
  const sourceWidth = Math.min(video.videoWidth - sourceX, oval.rx * 2);
  const sourceHeight = Math.min(video.videoHeight - sourceY, oval.ry * 2);
  if (sourceWidth < 8 || sourceHeight < 8) return false;

  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    SAMPLE_SIZE,
    SAMPLE_SIZE,
  );
  const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  const gray = new Float32Array(SAMPLE_SIZE * SAMPLE_SIZE);
  let skin = 0;
  let total = 0;
  let sum = 0;
  let sumSquares = 0;

  for (let y = 0; y < SAMPLE_SIZE; y += 1) {
    for (let x = 0; x < SAMPLE_SIZE; x += 1) {
      if (!insideUnitOval(x, y, 1)) continue;

      const offset = (y * SAMPLE_SIZE + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const luma = 0.299 * red + 0.587 * green + 0.114 * blue;

      gray[y * SAMPLE_SIZE + x] = luma;
      sum += luma;
      sumSquares += luma * luma;
      total += 1;
      if (looksLikeSkin(red, green, blue)) skin += 1;
    }
  }

  if (total < MIN_SAMPLED_PIXELS) return false;

  const mean = sum / total;
  const variance = sumSquares / total - mean * mean;
  const skinRatio = skin / total;
  const edgeRatio = countEdges(gray) / total;

  return (
    skinRatio >= MIN_SKIN_RATIO &&
    variance >= MIN_VARIANCE &&
    edgeRatio >= MIN_EDGE_RATIO &&
    mean > MIN_MEAN_LUMA &&
    mean < MAX_MEAN_LUMA
  );
}

/** Coordenada del muestreo dentro del óvalo unitario, con `tightness` 0..1. */
function insideUnitOval(x: number, y: number, tightness: number): boolean {
  const nx = ((x + 0.5) / SAMPLE_SIZE) * 2 - 1;
  const ny = ((y + 0.5) / SAMPLE_SIZE) * 2 - 1;
  return nx * nx + ny * ny <= tightness;
}

/** Tono de piel aproximado en RGB, calibrado para luz de interior. */
function looksLikeSkin(red: number, green: number, blue: number): boolean {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return (
    red > 60 &&
    green > 30 &&
    blue > 15 &&
    red > green &&
    red > blue &&
    max - min > 12 &&
    Math.abs(red - green) > 8
  );
}

/** Una cara tiene textura; una pared no. */
function countEdges(gray: Float32Array): number {
  let edges = 0;
  for (let y = 1; y < SAMPLE_SIZE - 1; y += 1) {
    for (let x = 1; x < SAMPLE_SIZE - 1; x += 1) {
      if (!insideUnitOval(x, y, EDGE_OVAL_TIGHTNESS)) continue;
      const current = gray[y * SAMPLE_SIZE + x];
      if (!current) continue;
      const gx = Math.abs(current - gray[y * SAMPLE_SIZE + x + 1]);
      const gy = Math.abs(current - gray[(y + 1) * SAMPLE_SIZE + x]);
      if (gx + gy > EDGE_THRESHOLD) edges += 1;
    }
  }
  return edges;
}
