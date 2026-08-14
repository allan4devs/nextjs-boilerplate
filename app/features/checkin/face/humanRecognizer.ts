"use client";

/**
 * Reconocedor facial real, corriendo en el navegador de recepción:
 * detector BlazeFace → malla FaceMesh → embedding FaceRes (1024 dimensiones),
 * más antispoof y liveness para descartar una foto en una pantalla.
 *
 * El paquete pesa ~2 MB de código y ~10 MB de pesos, así que se carga con
 * `import()` dinámico: nadie que no abra el tab de rostro lo baja.
 */
import type { Human } from "@vladmandic/human";
import {
  FACE_MAX_ANGLE,
  FACE_MIN_COVERAGE,
  FACE_MIN_DETECTION_SCORE,
  FACE_MIN_LIVE_SCORE,
  FACE_MIN_REAL_SCORE,
  FACE_MODEL_BASE_PATH,
} from "@/lib/xtreme/face/config";
import { normalizeDescriptor, type FaceDescriptor } from "@/lib/xtreme/face/descriptor";

export type FaceReading = {
  descriptor: FaceDescriptor;
  detectionScore: number;
  realScore: number;
  liveScore: number;
  /** Proporción del ancho del cuadro que ocupa la cara. */
  coverage: number;
  quality: number;
  box: [number, number, number, number];
};

/** Rostro presente pero no usable: `issue` es el texto que ve recepción. */
export type FaceRejection = { issue: string; coverage: number; detectionScore: number };

export type FaceScan =
  | { kind: "face"; reading: FaceReading }
  | { kind: "rejected"; rejection: FaceRejection }
  | { kind: "none" };

let enginePromise: Promise<Human> | null = null;
let engine: Human | null = null;
let busy = false;

export function faceEngineReady() {
  return Boolean(engine);
}

/**
 * Carga (una sola vez) el motor. Reintenta desde cero si falló, para que un
 * corte de red al bajar los pesos no deje el tab muerto hasta recargar.
 */
export async function loadFaceEngine(): Promise<Human> {
  if (engine) return engine;
  if (!enginePromise) {
    enginePromise = (async () => {
      const { Human: HumanCtor } = await import("@vladmandic/human");
      const instance = new HumanCtor({
        backend: "webgl",
        modelBasePath: FACE_MODEL_BASE_PATH,
        cacheSensitivity: 0,
        debug: false,
        warmup: "face",
        filter: { enabled: true, equalization: false },
        face: {
          enabled: true,
          detector: { maxDetected: 1, minConfidence: 0.3, rotation: true, return: false },
          mesh: { enabled: true },
          attention: { enabled: false },
          iris: { enabled: false },
          description: { enabled: true },
          emotion: { enabled: false },
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
        segmentation: { enabled: false },
      });
      await instance.load();
      // El warmup deja lista la primera inferencia: sin esto el primer escaneo
      // real tarda uno o dos segundos con la persona parada frente a la cámara.
      await instance.warmup();
      engine = instance;
      return instance;
    })().catch((error) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

/**
 * Calidad combinada 0..1. Pesa más la detección y el encuadre, que es lo que
 * recepción puede corregir pidiéndole a la persona que se acomode.
 */
function scoreQuality(input: {
  detectionScore: number;
  coverage: number;
  realScore: number;
  liveScore: number;
}) {
  const coverageScore = Math.min(1, input.coverage / 0.34);
  const value =
    0.4 * input.detectionScore +
    0.3 * coverageScore +
    0.15 * input.realScore +
    0.15 * input.liveScore;
  return Math.min(1, Math.max(0, value));
}

/**
 * Un frame del video → lectura utilizable, rechazo explicado, o nada.
 * Las llamadas concurrentes se descartan: el bucle de escaneo corre más rápido
 * de lo que tarda una inferencia y encolarlas solo acumula latencia.
 */
export async function scanFaceFrame(video: HTMLVideoElement): Promise<FaceScan> {
  if (busy) return { kind: "none" };
  const human = engine ?? (await loadFaceEngine());
  if (!video.videoWidth || !video.videoHeight) return { kind: "none" };

  busy = true;
  try {
    const result = await human.detect(video);
    const face = result.face?.[0];
    if (!face) return { kind: "none" };

    const detectionScore = face.score || face.boxScore || 0;
    const coverage = video.videoWidth ? face.box[2] / video.videoWidth : 0;
    const realScore = typeof face.real === "number" ? face.real : 1;
    const liveScore = typeof face.live === "number" ? face.live : 1;
    const angle = face.rotation?.angle;

    const reject = (issue: string): FaceScan => ({
      kind: "rejected",
      rejection: { issue, coverage, detectionScore },
    });

    if (detectionScore < FACE_MIN_DETECTION_SCORE) return reject("Rostro poco claro · mejorá la luz");
    if (coverage < FACE_MIN_COVERAGE) return reject("Acercate un poco más a la cámara");
    if (coverage > 0.9) return reject("Alejate un poco de la cámara");
    if (
      angle &&
      (Math.abs(angle.yaw) > FACE_MAX_ANGLE || Math.abs(angle.pitch) > FACE_MAX_ANGLE)
    ) {
      return reject("Mirá de frente a la cámara");
    }
    if (realScore < FACE_MIN_REAL_SCORE) return reject("Parece una foto o una pantalla");
    if (liveScore < FACE_MIN_LIVE_SCORE) return reject("No se detecta una persona presente");

    const descriptor = face.embedding ? normalizeDescriptor(face.embedding) : null;
    if (!descriptor) return reject("No se pudo leer el rostro · repetí");

    return {
      kind: "face",
      reading: {
        descriptor,
        detectionScore,
        realScore,
        liveScore,
        coverage,
        quality: scoreQuality({ detectionScore, coverage, realScore, liveScore }),
        box: face.box,
      },
    };
  } finally {
    busy = false;
  }
}

/** Recorte del rostro para la ficha del socio, con margen para que no quede apretado. */
export function captureFaceCrop(
  video: HTMLVideoElement,
  box: [number, number, number, number],
  maxSide = 320,
): string {
  const [x, y, width, height] = box;
  const margin = Math.max(width, height) * 0.35;
  const side = Math.max(width, height) + margin;
  const sourceX = Math.max(0, x + width / 2 - side / 2);
  const sourceY = Math.max(0, y + height / 2 - side / 2);
  const clampedSide = Math.min(
    side,
    video.videoWidth - sourceX,
    video.videoHeight - sourceY,
  );
  if (clampedSide <= 0) return "";

  const canvas = document.createElement("canvas");
  canvas.width = maxSide;
  canvas.height = maxSide;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(
    video,
    sourceX,
    sourceY,
    clampedSide,
    clampedSide,
    0,
    0,
    maxSide,
    maxSide,
  );
  return canvas.toDataURL("image/jpeg", 0.82);
}
