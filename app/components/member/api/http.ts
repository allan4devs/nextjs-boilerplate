import { MSG } from "../config/messages";

/** Error HTTP normalizado para las respuestas de `/api/xtreme/*`. */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    throw new ApiError(data.error ?? MSG.errors.server, response.status, data.code);
  }

  return data;
}

/** Fetch que nunca llego al servidor (sin internet, servidor caido, DNS). */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return err instanceof TypeError && /fetch|network|load failed|connection/i.test(err.message);
}

/**
 * Convierte cualquier error en un mensaje presentable al socio.
 * Nunca deja pasar mensajes tecnicos del navegador ("Failed to fetch",
 * "Unexpected token..."): los mapea a MSG.errors.offline o al fallback.
 */
export function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return MSG.errors.offline;
  if (err instanceof SyntaxError || err instanceof TypeError) return fallback;
  return err instanceof Error && err.message ? err.message : fallback;
}
