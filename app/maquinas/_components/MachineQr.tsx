"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2 } from "lucide-react";

type MachineQrProps = {
  /** Contenido del QR: la URL absoluta de la ficha. */
  value: string;
  /** Nombre de la máquina, para el aria-label y el archivo descargado. */
  label: string;
  /** Lado del QR en pantalla (px). El PNG descargado siempre sale en alta resolución. */
  size?: number;
  /** Muestra el botón "Descargar PNG". */
  showDownload?: boolean;
  className?: string;
};

const QR_DARK = "#0a0a0a";
const QR_LIGHT = "#ffffff";
const ACCENTS: Record<string, string> = {
  a: "[áàäâ]",
  e: "[éèëê]",
  i: "[íìïî]",
  o: "[óòöô]",
  u: "[úùüû]",
  n: "ñ",
};

function slugify(text: string) {
  let out = text.toLowerCase();
  for (const [plain, pattern] of Object.entries(ACCENTS)) {
    out = out.replace(new RegExp(pattern, "g"), plain);
  }
  return out.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** QR de una máquina para escanear en sala (payload = URL de la ficha). */
export default function MachineQr({
  value,
  label,
  size = 200,
  showDownload = true,
  className = "",
}: MachineQrProps) {
  const payload = useMemo(() => value.trim(), [value]);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    setError("");

    QRCode.toString(payload, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: size,
      color: { dark: QR_DARK, light: QR_LIGHT },
    })
      .then((next) => {
        if (!cancelled) setSvg(next);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo generar el QR.");
      });

    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 1024,
        color: { dark: QR_DARK, light: QR_LIGHT },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `qr-${slugify(label)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("No se pudo descargar el QR.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        className="grid place-items-center border-[3px] border-black bg-white p-2.5 shadow-[4px_4px_0_#000]"
        style={{ width: size + 20, height: size + 20 }}
        role="img"
        aria-label={`Código QR de ${label}`}
      >
        {error ? (
          <p className="px-2 text-center text-xs font-bold text-red-600">{error}</p>
        ) : svg ? (
          <div
            className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
            // SVG generado por la lib `qrcode`; el payload es una URL propia controlada.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-black/40" />
        )}
      </div>

      {showDownload && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || !svg}
          className="inline-flex min-h-11 items-center gap-2 border-2 border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-3 text-[11px] font-black uppercase tracking-[0.1em] text-[#eaff93] transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/20 focus-visible:border-[#d8ff3e] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Descargar PNG
        </button>
      )}
    </div>
  );
}
