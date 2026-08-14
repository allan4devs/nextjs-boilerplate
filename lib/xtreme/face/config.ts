/**
 * Configuración compartida del reconocimiento facial. Sin imports de servidor:
 * la leen el navegador de recepción, el kiosco de ingreso y los route handlers,
 * para que cliente y servidor apliquen exactamente los mismos umbrales.
 */

function envNumber(raw: string | undefined, fallback: number, min: number, max: number) {
  const value = Number.parseFloat(String(raw ?? ""));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

/** El ingreso por rostro sigue siendo opt-in mientras se calibra en mostrador. */
export const FACE_RECOGNITION_ENABLED =
  process.env.NEXT_PUBLIC_FACE_RECOGNITION === "1";

/**
 * Motor real: detector BlazeFace + malla FaceMesh + embeddings FaceRes (Human),
 * todo en el navegador de recepción. El id queda grabado en cada plantilla: si
 * algún día cambia el modelo, las plantillas viejas dejan de compararse solas
 * en vez de devolver coincidencias sin sentido.
 */
export const FACE_ENGINE_ID = "human-faceres-v1";

/** Pesos servidos desde el mismo origen (los copia scripts/sync-face-models.mjs). */
export const FACE_MODEL_BASE_PATH =
  process.env.NEXT_PUBLIC_FACE_MODEL_PATH || "/models/human/";

/**
 * Similitud coseno mínima para proponer a alguien como candidato.
 * Calibrable sin redeploy de código: NEXT_PUBLIC_FACE_MIN_SIMILARITY.
 */
export const FACE_MIN_SIMILARITY = envNumber(
  process.env.NEXT_PUBLIC_FACE_MIN_SIMILARITY,
  0.62,
  0.3,
  0.98,
);

/** Similitud para registrar el ingreso sin que recepción confirme a mano. */
export const FACE_AUTO_SIMILARITY = envNumber(
  process.env.NEXT_PUBLIC_FACE_AUTO_SIMILARITY,
  0.78,
  0.4,
  0.99,
);

/**
 * Margen mínimo entre el primer y el segundo candidato para auto-ingresar.
 * Sin esto, dos hermanos parecidos se turnan el primer puesto entre frames.
 */
export const FACE_AUTO_MARGIN = envNumber(
  process.env.NEXT_PUBLIC_FACE_AUTO_MARGIN,
  0.06,
  0,
  0.5,
);

/** Puertas de calidad antes de siquiera comparar un rostro. */
export const FACE_MIN_DETECTION_SCORE = 0.55;
/** Proporción mínima del ancho del cuadro que debe ocupar la cara. */
export const FACE_MIN_COVERAGE = 0.16;
/** Proporción máxima: más que esto y la cara ya sale recortada por el borde. */
export const FACE_MAX_COVERAGE = 0.9;
/** Encuadre a partir del cual la cobertura deja de sumar calidad. */
export const FACE_IDEAL_COVERAGE = 0.34;
/** Rotación máxima aceptada, en radianes (~34°). */
export const FACE_MAX_ANGLE = 0.6;
/** antispoof: 1 = rostro real, 0 = foto/pantalla. */
export const FACE_MIN_REAL_SCORE = 0.5;
/** liveness: 1 = persona presente. */
export const FACE_MIN_LIVE_SCORE = 0.5;
/** Calidad mínima combinada para guardar una plantilla de enrolamiento. */
export const FACE_MIN_ENROLL_QUALITY = 0.55;

/** Muestras que se piden al enrolar (frente, un perfil leve, otra expresión). */
export const FACE_ENROLL_SAMPLES = 3;
/** Tope de plantillas por socio; al pasarse se descarta la más vieja. */
export const FACE_TEMPLATES_PER_MEMBER = 5;

/** Candidatos que se muestran o devuelven por escaneo. */
export const FACE_MATCH_LIMIT = 5;
/**
 * Intentos por muestra al enrolar. Con la persona acomodándose frente a la
 * cámara, doce frames por muestra alcanzan; más que eso es una sesión trabada.
 */
export const FACE_ENROLL_ATTEMPTS_PER_SAMPLE = 12;
/** Espera tras un frame descartado durante el enrolamiento. */
export const FACE_ENROLL_RETRY_MS = 260;
/** Pausa entre muestras: sin ella se guardan tres capturas casi idénticas. */
export const FACE_ENROLL_POSE_PAUSE_MS = 900;

/** Cadencia del escaneo continuo en recepción. */
export const FACE_SCAN_INTERVAL_MS = 550;
/** Vigencia del paquete de plantillas cacheado en el navegador de recepción. */
export const FACE_BUNDLE_TTL_MS = 5 * 60 * 1000;
/** Espera antes de volver a auto-ingresar a la misma persona. */
export const FACE_AUTO_COOLDOWN_MS = 20_000;

/**
 * Sistema anterior (dHash perceptual de 64 bits). Se mantiene como fallback
 * para los socios enrolados antes del motor real; no reconoce identidad, solo
 * compara luminancia, así que su umbral es deliberadamente estricto.
 */
export const FACE_HASH_MAX_DISTANCE = 12;
export const FACE_HASH_CANDIDATES_LIMIT = 5;
