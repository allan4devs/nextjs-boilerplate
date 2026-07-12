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
    throw new ApiError(
      data.error ?? "No se pudo conectar con Mongo.",
      response.status,
      data.code,
    );
  }

  return data;
}
