/**
 * Cliente de la terminal física de rostro de la puerta. Habla el único endpoint
 * JSON del equipo (`POST /api`) y trae el realtime log de ingresos (`getrtlog`).
 *
 * Solo servidor: usa la contraseña de admin de `terminal.ts` (que sale de .env).
 * No hace suposiciones sobre a quién pertenece cada rostro: eso lo resuelve
 * `terminal-sync.ts` contra Mongo. Acá solo se lee del equipo.
 */
import {
  FACE_TERMINAL_API_URL,
  FACE_TERMINAL_PASSWORD,
  FACE_TERMINAL_REQUEST_TIMEOUT_MS,
  FACE_TERMINAL_RTLOG_CMD,
} from "./terminal";

/** Un rostro presentado a la terminal, tal cual lo emite el equipo. */
export type TerminalScan = {
  /** Id de enrolamiento del equipo. Puede ser la cédula o un número interno. */
  enrollid: string;
  /** Nombre que el equipo tiene guardado para ese enrollid (puede venir vacío). */
  name: string;
  /** Marca de tiempo del evento, como string del equipo. */
  time: string;
  /** Tipo de evento del equipo (0 = reconocimiento normal, etc.). */
  event: string;
  /** Ruta relativa de la foto del snapshot en el equipo, si vino. */
  photo: string;
};

/** Motivo por el que falló hablar con la terminal, para dar un mensaje claro. */
export type TerminalErrorReason = "not-configured" | "auth" | "network" | "device";

export class TerminalError extends Error {
  reason: TerminalErrorReason;
  constructor(reason: TerminalErrorReason, message: string) {
    super(message);
    this.name = "TerminalError";
    this.reason = reason;
  }
}

async function deviceApi(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FACE_TERMINAL_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(FACE_TERMINAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new TerminalError("device", `La terminal respondió HTTP ${res.status}.`);
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    if (err instanceof TerminalError) throw err;
    // Abort, DNS, ECONNREFUSED: la PC no ve el equipo.
    throw new TerminalError(
      "network",
      "No se pudo contactar la terminal (¿está en red y encendida?).",
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Trae todos los eventos pendientes del realtime log, resolviendo la paginación
 * del equipo (index/to/count). OJO: leer el rtlog avanza el puntero del equipo,
 * así que estos eventos no se vuelven a entregar. Debe haber un solo lector.
 */
export async function pullTerminalLog(): Promise<TerminalScan[]> {
  if (!FACE_TERMINAL_PASSWORD) {
    throw new TerminalError(
      "not-configured",
      "Falta la contraseña de la terminal (XTREME_FACE_TERMINAL_PASSWORD).",
    );
  }

  const scans: TerminalScan[] = [];
  let index = 0;
  let guard = 0;

  while (guard++ < 500) {
    const resp = await deviceApi({
      cmd: FACE_TERMINAL_RTLOG_CMD,
      index,
      password: FACE_TERMINAL_PASSWORD,
    });

    if (resp.result === false) {
      const msg = String(resp.msg ?? "").toLowerCase();
      if (msg.includes("password") || msg.includes("login") || msg.includes("auth")) {
        throw new TerminalError("auth", "La terminal rechazó la contraseña de admin.");
      }
      throw new TerminalError("device", `La terminal rechazó ${FACE_TERMINAL_RTLOG_CMD}: ${resp.msg ?? "sin detalle"}.`);
    }

    for (const raw of (resp.record as Record<string, unknown>[]) ?? []) {
      const enrollid = String(raw.enrollid ?? "").trim();
      if (!enrollid) continue;
      scans.push({
        enrollid,
        name: String(raw.name ?? "").trim(),
        time: String(raw.time ?? ""),
        event: String(raw.event ?? ""),
        photo: String(raw.photourl ?? ""),
      });
    }

    const count = Number(resp.count ?? 0);
    const to = Number(resp.to ?? 0);
    if (count > to) {
      index = to + 1;
      continue;
    }
    break;
  }

  return scans;
}
