/** Reduce una foto a un cuadrado JPEG de 256 px para guardarla en el perfil. */
export async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la imagen.");

    const side = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - side) / 2;
    const sourceY = (bitmap.height - side) / 2;
    context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}
