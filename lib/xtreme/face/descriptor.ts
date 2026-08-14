/**
 * Codificación y comparación de descriptores faciales. Módulo isomorfo: lo usa
 * el navegador de recepción (que compara localmente contra el paquete de
 * plantillas) y los route handlers (que comparan del lado del servidor). Una
 * sola implementación evita que ambos lados discrepen sobre quién es quién.
 */
import { FACE_MATCH_LIMIT } from "./config";

export type FaceDescriptor = number[];

export type FaceTemplateEntry = {
  normalizedName: string;
  memberName?: string;
  dim: number;
  /** Vector cuantizado, ver encodeDescriptor. */
  encoded: string;
};

export type FaceMatch = {
  normalizedName: string;
  memberName: string;
  similarity: number;
  samples: number;
};

export const FACE_DESCRIPTOR_MIN_DIM = 64;
export const FACE_DESCRIPTOR_MAX_DIM = 4096;

/**
 * Normaliza a norma L2 = 1. Con vectores unitarios la similitud coseno es un
 * producto punto, y el umbral no depende de la escala que devuelva el modelo.
 */
export function normalizeDescriptor(values: ArrayLike<number>): FaceDescriptor | null {
  const dim = values.length;
  if (dim < FACE_DESCRIPTOR_MIN_DIM || dim > FACE_DESCRIPTOR_MAX_DIM) return null;

  let sumSquares = 0;
  const vector = new Array<number>(dim);
  for (let index = 0; index < dim; index += 1) {
    const value = Number(values[index]);
    if (!Number.isFinite(value)) return null;
    vector[index] = value;
    sumSquares += value * value;
  }

  const norm = Math.sqrt(sumSquares);
  if (!norm) return null;
  for (let index = 0; index < dim; index += 1) vector[index] /= norm;
  return vector;
}

/** Valida y normaliza un descriptor recibido por JSON. */
export function parseDescriptor(raw: unknown): FaceDescriptor | null {
  if (!Array.isArray(raw)) return null;
  return normalizeDescriptor(raw as ArrayLike<number>);
}

/** Ambos vectores deben venir normalizados; devuelve 0..1 (los negativos son "nada que ver"). */
export function cosineSimilarity(a: FaceDescriptor, b: FaceDescriptor): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let index = 0; index < a.length; index += 1) dot += a[index] * b[index];
  if (!Number.isFinite(dot)) return 0;
  return Math.min(1, Math.max(0, dot));
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"));
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Cuantiza a int8 con escala por vector: `<escala>:<base64>`.
 * Un embedding de 1024 dimensiones pasa de ~8 KB (dobles) a ~1.4 KB, que es lo
 * que hace viable mandarle a recepción el padrón entero de rostros. La escala
 * por vector conserva la resolución: sin ella, componentes del orden de 0,03
 * caerían en apenas 4 niveles de los 127 disponibles.
 */
export function encodeDescriptor(descriptor: FaceDescriptor): string {
  let scale = 0;
  for (const value of descriptor) scale = Math.max(scale, Math.abs(value));
  if (!scale) return "";
  const bytes = new Uint8Array(descriptor.length);
  for (let index = 0; index < descriptor.length; index += 1) {
    const quantized = Math.round((descriptor[index] / scale) * 127);
    bytes[index] = Math.min(127, Math.max(-127, quantized)) & 0xff;
  }
  return `${scale.toPrecision(7)}:${bytesToBase64(bytes)}`;
}

export function decodeDescriptor(encoded: string, dim?: number): FaceDescriptor | null {
  const separator = String(encoded ?? "").indexOf(":");
  if (separator <= 0) return null;
  const scale = Number.parseFloat(encoded.slice(0, separator));
  if (!Number.isFinite(scale) || scale <= 0) return null;

  const bytes = base64ToBytes(encoded.slice(separator + 1));
  if (!bytes || (dim && bytes.length !== dim)) return null;

  const vector = new Array<number>(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    // int8 con signo desde el byte sin signo.
    const signed = bytes[index] > 127 ? bytes[index] - 256 : bytes[index];
    vector[index] = (signed / 127) * scale;
  }
  // Re-normalizar absorbe el error de cuantización antes de comparar.
  return normalizeDescriptor(vector);
}

/** Plantilla ya decodificada, lista para comparar sin volver a parsear base64. */
export type PreparedFaceTemplate = {
  normalizedName: string;
  memberName: string;
  vector: FaceDescriptor;
};

/**
 * Decodifica el paquete una sola vez. Recepción escanea ~2 veces por segundo
 * contra el padrón entero: decodificar en cada frame es el trabajo repetido más
 * caro del mostrador, y el resultado es siempre el mismo hasta que cambia el
 * paquete. Las plantillas ilegibles se descartan acá y no en el bucle.
 */
export function prepareFaceTemplates(
  templates: readonly FaceTemplateEntry[],
): PreparedFaceTemplate[] {
  return templates.flatMap((template) => {
    const vector = decodeDescriptor(template.encoded, template.dim);
    if (!vector) return [];
    return [
      {
        normalizedName: template.normalizedName,
        memberName: template.memberName || template.normalizedName,
        vector,
      },
    ];
  });
}

/**
 * Rankea socios contra un descriptor. Cada socio puede tener varias plantillas
 * (ángulos y días distintos): vale la mejor de las suyas, no el promedio, para
 * que una muestra vieja o mala no hunda un reconocimiento correcto.
 */
export function rankPreparedFaceMatches(
  prepared: readonly PreparedFaceTemplate[],
  descriptor: FaceDescriptor,
  options: { minSimilarity: number; limit?: number },
): FaceMatch[] {
  const best = new Map<string, FaceMatch>();

  for (const template of prepared) {
    if (template.vector.length !== descriptor.length) continue;

    const similarity = cosineSimilarity(descriptor, template.vector);
    const current = best.get(template.normalizedName);
    if (!current) {
      best.set(template.normalizedName, {
        normalizedName: template.normalizedName,
        memberName: template.memberName,
        similarity,
        samples: 1,
      });
      continue;
    }
    current.samples += 1;
    if (similarity > current.similarity) current.similarity = similarity;
  }

  return [...best.values()]
    .filter((match) => match.similarity >= options.minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, options.limit ?? FACE_MATCH_LIMIT);
}

/**
 * Atajo para quien compara una sola vez (el servidor, que decodifica y olvida).
 * El bucle de recepción usa `prepareFaceTemplates` + `rankPreparedFaceMatches`.
 */
export function rankFaceMatches(
  templates: readonly FaceTemplateEntry[],
  descriptor: FaceDescriptor,
  options: { minSimilarity: number; limit?: number },
): FaceMatch[] {
  return rankPreparedFaceMatches(prepareFaceTemplates(templates), descriptor, options);
}

/** Diferencia entre el mejor candidato y el siguiente: mide qué tan sola quedó la primera opción. */
export function matchMargin(matches: readonly FaceMatch[]): number {
  if (!matches.length) return 0;
  if (matches.length === 1) return matches[0].similarity;
  return matches[0].similarity - matches[1].similarity;
}
