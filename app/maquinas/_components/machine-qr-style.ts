import QRCode from "qrcode";

export const MACHINE_QR_BACKGROUND = "#141414";

/** Shared artwork for the preview, standalone PNG and printed machine label. */
export async function createMachineQrImage(value: string, size: number): Promise<string> {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const modules = QRCode.create(value, { errorCorrectionLevel: "H" }).modules.size;
  const qr = new QRCodeStyling({
    width: size,
    height: size,
    type: "canvas",
    data: value,
    margin: Math.ceil((4 * size) / (modules + 8)),
    image: "/xtreme/qr-monogram.svg",
    qrOptions: { errorCorrectionLevel: "H" },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.22, margin: size * 0.012, saveAsBlob: true },
    dotsOptions: { type: "dots", color: "#ffffff" },
    cornersSquareOptions: { type: "extra-rounded", color: "#ffffff" },
    cornersDotOptions: { type: "extra-rounded", color: "#ffffff" },
    backgroundOptions: { color: MACHINE_QR_BACKGROUND },
  });
  const blob = await qr.getRawData("png");
  if (!(blob instanceof Blob)) throw new Error("No se pudo generar el QR.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el QR."));
    reader.readAsDataURL(blob);
  });
}
