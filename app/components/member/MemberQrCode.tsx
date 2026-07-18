"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

/** QR real del carné digital (payload = código de acceso sin espacios). */
export default function MemberQrCode({
  value,
  size = 220,
  label,
}: {
  value: string;
  size?: number;
  label?: string;
}) {
  const payload = useMemo(() => value.replace(/\s/g, "").trim(), [value]);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!payload) {
      setSvg("");
      setError("");
      return;
    }

    let cancelled = false;
    setError("");

    void QRCode.toString(payload, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: size,
      color: {
        dark: "#0a0a0a",
        light: "#ffffff",
      },
    })
      .then((next) => {
        if (!cancelled) setSvg(next);
      })
      .catch(() => {
        if (!cancelled) {
          setSvg("");
          setError("No se pudo generar el QR.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  if (!payload) {
    return (
      <div
        className="flex items-center justify-center bg-white text-center text-xs font-bold text-black/50"
        style={{ width: size, height: size }}
      >
        Sin código
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-white px-3 text-center text-xs font-bold text-red-600"
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="overflow-hidden border-[3px] border-black bg-white p-2 shadow-[4px_4px_0_#000]"
        style={{ width: size + 16, height: size + 16 }}
        role="img"
        aria-label={label ? `Código QR: ${label}` : `Código QR: ${payload}`}
      >
        {svg ? (
          <div
            className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
            // SVG generado por la lib qrcode (payload controlado: access code).
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-black/40">
            Generando…
          </div>
        )}
      </div>
    </div>
  );
}
