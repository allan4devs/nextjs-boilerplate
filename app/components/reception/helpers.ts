/**
 * Utilidades del panel de recepción: formato de hora y captura de la foto
 * de ficha desde el video de la cámara del mostrador.
 */

export function formatTime(value: string | Date) {
  try {
    return new Date(value).toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

/** Foto de ficha desde el video, reescalada para no mandar un JPEG enorme. */
export async function capturePhotoDataUrl(video: HTMLVideoElement, maxSide = 480) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return "";
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}
