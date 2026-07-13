"use client";

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

let nativeDetectorPromise: Promise<BarcodeDetectorLike | null> | null = null;
let zxingReaderPromise: Promise<{
  decode(canvas: HTMLCanvasElement): string;
} | null> | null = null;

async function nativeDetector() {
  if (nativeDetectorPromise) return nativeDetectorPromise;
  nativeDetectorPromise = (async () => {
    const Detector = (globalThis as typeof globalThis & {
      BarcodeDetector?: BarcodeDetectorConstructor;
    }).BarcodeDetector;
    if (!Detector) return null;
    try {
      const supported = Detector.getSupportedFormats
        ? await Detector.getSupportedFormats()
        : ["pdf417"];
      const formats = ["pdf417", "code_128", "code_39"].filter((format) =>
        supported.includes(format),
      );
      if (!formats.length) return null;
      return new Detector({ formats });
    } catch {
      return null;
    }
  })();
  return nativeDetectorPromise;
}

async function zxingReader() {
  if (zxingReaderPromise) return zxingReaderPromise;
  zxingReaderPromise = import("@zxing/library")
    .then(
      ({
        BarcodeFormat,
        BinaryBitmap,
        DecodeHintType,
        HybridBinarizer,
        MultiFormatReader,
        RGBLuminanceSource,
      }) => {
        const reader = new MultiFormatReader();
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.PDF_417,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        reader.setHints(hints);
        return {
          decode(canvas: HTMLCanvasElement) {
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context) return "";
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            const source = new RGBLuminanceSource(image.data, canvas.width, canvas.height);
            try {
              return reader
                .decodeWithState(new BinaryBitmap(new HybridBinarizer(source)))
                .getText();
            } catch {
              try {
                return reader
                  .decodeWithState(new BinaryBitmap(new HybridBinarizer(source.invert())))
                  .getText();
              } catch {
                return "";
              }
            } finally {
              reader.reset();
            }
          },
        };
      },
    )
    .catch(() => null);
  return zxingReaderPromise;
}

function videoFrame(video: HTMLVideoElement) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function decodeCedulaBarcode(video: HTMLVideoElement) {
  const detector = await nativeDetector();
  if (detector) {
    try {
      const detected = await detector.detect(video);
      const raw = detected.find((item) => item.rawValue)?.rawValue?.trim();
      if (raw) return raw;
    } catch {
      // ZXing below is the compatibility fallback.
    }
  }

  const canvas = videoFrame(video);
  if (!canvas) return "";
  const reader = await zxingReader();
  return reader?.decode(canvas).trim() || "";
}

/** Candidate numbers only; the raw barcode is never persisted or sent. */
export function cedulaCandidates(raw: string) {
  const candidates = new Set<string>();
  for (const match of raw.matchAll(/(?:^|\D)(\d)[ -]?(\d{4})[ -]?(\d{4})(?:\D|$)/g)) {
    candidates.add(match[1] + match[2] + match[3]);
  }
  for (const run of raw.match(/\d{9,12}/g) || []) {
    if (run.length === 9) candidates.add(run);
    if (run.length === 12 && run.startsWith("000")) candidates.add(run.slice(3));
  }
  return [...candidates];
}
