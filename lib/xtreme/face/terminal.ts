/**
 * Configuración de la terminal física de rostro de la puerta (control de acceso
 * en el ingreso del gimnasio). Es un equipo OEM que expone una sola API JSON:
 *
 *     POST http://<host>/api   con cuerpos { cmd: "<comando>", ... }
 *
 * Se autentica con usuario + contraseña de admin (los mismos del panel web del
 * equipo) y el feed de ingresos en vivo sale con el comando `getrtlog`, que
 * devuelve una fila por cada rostro presentado: hora, id de usuario, nombre,
 * tipo de evento y una URL de foto (`photouri`).
 *
 * Esto es SOLO de servidor: la contraseña nunca debe llegar al navegador, así
 * que no hay ningún `NEXT_PUBLIC_*` acá. Es la fuente de verdad de "cómo hablarle
 * al equipo"; quien haga el poller (un route handler o un job) importa de acá y
 * no vuelve a escribir el host ni los comandos a mano.
 *
 * Reverse-engineered del panel web del equipo (serie AXTE22057608). El realtime
 * log es exactamente lo que consume su página `rtlogview.html`.
 */

function envText(raw: string | undefined, fallback: string): string {
  const value = String(raw ?? "").trim();
  return value || fallback;
}

function envNumber(raw: string | undefined, fallback: number, min: number, max: number) {
  const value = Number.parseFloat(String(raw ?? ""));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

/**
 * Ingesta desde la terminal física apagada por defecto: se prende recién cuando
 * hay credenciales cargadas y alguien la habilita a propósito, para que un deploy
 * sin el equipo en red no se quede reintentando contra una IP muerta.
 */
export const FACE_TERMINAL_ENABLED = process.env.XTREME_FACE_TERMINAL_ENABLED === "1";

/** IP o host del equipo en la LAN del gimnasio. */
export const FACE_TERMINAL_HOST = envText(process.env.XTREME_FACE_TERMINAL_HOST, "192.168.1.20");

/** Único endpoint JSON del equipo; se le mandan comandos con `cmd`. */
export const FACE_TERMINAL_API_PATH = envText(process.env.XTREME_FACE_TERMINAL_API_PATH, "/api");

/** URL completa ya armada, para no repetir el `http://host + path` en cada llamada. */
export const FACE_TERMINAL_API_URL = `http://${FACE_TERMINAL_HOST}${FACE_TERMINAL_API_PATH}`;

/** Usuario de admin del panel del equipo (casi siempre "admin"). */
export const FACE_TERMINAL_USER = envText(process.env.XTREME_FACE_TERMINAL_USER, "admin");

/**
 * Contraseña de admin del equipo. Secreto: SIN default, se pone en `.env`. Si
 * está vacía, la integración se considera no configurada (ver el helper abajo).
 */
export const FACE_TERMINAL_PASSWORD = String(process.env.XTREME_FACE_TERMINAL_PASSWORD ?? "");

/** Serie del equipo instalado; útil para logs y para detectar si cambian el hardware. */
export const FACE_TERMINAL_SERIAL = envText(process.env.XTREME_FACE_TERMINAL_SERIAL, "AXTE22057608");

/** Comando del feed de ingresos en vivo. */
export const FACE_TERMINAL_RTLOG_CMD = "getrtlog";

/**
 * Cadencia del poll al realtime log, en milisegundos. El equipo entrega los
 * eventos nuevos desde el último corte, así que sondear cada ~1.5 s alcanza para
 * que el ingreso se sienta inmediato sin martillar el equipo.
 */
export const FACE_TERMINAL_POLL_INTERVAL_MS = envNumber(
  process.env.XTREME_FACE_TERMINAL_POLL_MS,
  1500,
  400,
  60_000,
);

/** Tope de espera por request al equipo: si no responde, se corta y se reintenta. */
export const FACE_TERMINAL_REQUEST_TIMEOUT_MS = envNumber(
  process.env.XTREME_FACE_TERMINAL_TIMEOUT_MS,
  4000,
  1000,
  30_000,
);

/**
 * La integración solo está lista si además de habilitada tiene con qué
 * autenticarse. Se chequea antes de arrancar cualquier poller.
 */
export function isFaceTerminalConfigured(): boolean {
  return FACE_TERMINAL_ENABLED && FACE_TERMINAL_PASSWORD.length > 0;
}
