"use client";

import {
  Camera,
  CheckCircle2,
  Loader2,
  ScanFace,
  XCircle,
} from "lucide-react";
import {
  MEMBERSHIP_STATUS_LABELS,
} from "@/app/features/checkin/constants";
import {
  initialsOf,
} from "@/app/lib/memberName";
import type {
  MemberHit,
} from "@/lib/xtreme/checkin/contracts";
import type {
  FaceGuideStatus,
} from "../types";

export function FaceCard({
  videoRef,
  cameraOn,
  cameraError,
  isScanning,
  isCheckingIn,
  faceGuide,
  holdProgress,
  error,
  matches,
  onStartCamera,
  onScan,
  onPickMatch,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraOn: boolean;
  cameraError: string;
  isScanning: boolean;
  isCheckingIn: boolean;
  faceGuide: FaceGuideStatus;
  holdProgress: number;
  error: string;
  matches: MemberHit[];
  onStartCamera: () => void;
  onScan: () => void;
  onPickMatch: (m: MemberHit) => void;
}) {
  const ringColor =
    faceGuide === "waiting"
      ? "border-[#d8ff3e]/55"
      : faceGuide === "detected" || faceGuide === "locking"
        ? "border-[#d8ff3e]"
        : faceGuide === "scanning"
          ? "border-cyan-300"
          : "border-white/40";

  const statusCopy: Record<FaceGuideStatus, string> = {
    waiting: "Colocá tu rostro en el círculo",
    detected: "Rostro detectado - mantené la posición",
    locking: "Perfecto... identificando",
    scanning: isCheckingIn ? "Registrando ingreso..." : "Analizando rostro...",
    cooldown: "Listo para el siguiente socio",
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-black/[0.04] text-black/70">
        <ScanFace className="h-7 w-7" />
      </div>
      <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">Reconocimiento facial</h2>
      <p className="mt-1 text-sm font-bold text-black/45">
        Ponga la cara en el círculo. Se detecta y registra solo.
      </p>

      <div className="relative mt-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-black/10 bg-black shadow-lg">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full scale-x-[-1] object-cover"
        />

        {/* Face guide overlay + progress ring */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative flex h-[58%] w-[48%] items-center justify-center">
            {/* Progress arc (CSS con conic-gradient) */}
            {(faceGuide === "detected" || faceGuide === "locking") && (
              <div
                className="absolute -inset-2 rounded-full opacity-90 transition-all"
                style={{
                  background: `conic-gradient(#d8ff3e ${Math.round(holdProgress * 360)}deg, transparent 0deg)`,
                  WebkitMask:
                    "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))",
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))",
                }}
              />
            )}
            <div
              className={`h-full w-full rounded-full border-[3px] border-dashed shadow-[0_0_0_999px_rgba(0,0,0,0.32)] transition-colors duration-200 ${ringColor} ${
                faceGuide === "detected" || faceGuide === "locking"
                  ? "border-solid shadow-[0_0_0_999px_rgba(0,0,0,0.28),0_0_28px_rgba(216,255,62,0.45)]"
                  : ""
              } ${faceGuide === "scanning" ? "animate-pulse border-solid" : ""}`}
            />
          </div>
        </div>

        {/* Live status chip */}
        {cameraOn && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-10">
            <p
              className={`flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wide ${
                faceGuide === "waiting" || faceGuide === "cooldown"
                  ? "text-white/80"
                  : "text-[#d8ff3e]"
              }`}
            >
              {(faceGuide === "scanning" || isScanning || isCheckingIn) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {(faceGuide === "detected" || faceGuide === "locking") && (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {statusCopy[faceGuide]}
            </p>
            {(faceGuide === "detected" || faceGuide === "locking") && (
              <div className="mx-auto mt-2 h-1.5 w-2/3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-[#d8ff3e] transition-[width] duration-100"
                  style={{ width: `${Math.round(holdProgress * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {!cameraOn && (
          <div className="absolute inset-0 grid place-items-center bg-black/75 p-4">
            <div className="text-center">
              <Camera className="mx-auto h-8 w-8 text-white/50" />
              <p className="mt-2 text-sm font-bold text-white/70">
                {cameraError || "Camara apagada"}
              </p>
              <button
                type="button"
                onClick={onStartCamera}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#d8ff3e] px-4 py-2 text-xs font-black uppercase text-black"
              >
                Activar camara
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex w-full items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-left text-sm font-bold text-red-600">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Manual fallback - la detección es automática */}
      <button
        type="button"
        onClick={onScan}
        disabled={!cameraOn || isScanning || isCheckingIn}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black/15 px-6 py-3 text-sm font-black uppercase tracking-wide text-black/55 transition hover:border-black/30 hover:text-black disabled:opacity-50"
      >
        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
        Escanear ahora (manual)
      </button>

      {matches.length > 1 && (
        <div className="mt-5 w-full text-left">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/40">
            Varias coincidencias - elegí la tuya
          </p>
          <div className="mt-2 space-y-2">
            {matches.map((m) => (
              <button
                key={m.normalizedName || m.memberName}
                type="button"
                onClick={() => onPickMatch(m)}
                disabled={isCheckingIn}
                className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2.5 text-left transition hover:border-[#8fbf00]/50 hover:bg-[#d8ff3e]/10 disabled:opacity-50"
              >
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoUrl}
                    alt={m.memberName}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0b0b0b] text-sm font-black text-[#d8ff3e]">
                    {initialsOf(m.memberName)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black uppercase">{m.memberName}</span>
                  <span className="text-[11px] font-bold text-black/40">
                    Match {m.faceDistance ?? "-"} · {MEMBERSHIP_STATUS_LABELS[m.membershipStatus]}
                  </span>
                </span>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#8fbf00]" />
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-center text-[11px] font-bold text-black/35">
        Detección automática al centrar la cara. Enrolar rostro en recepción si es la primera vez.
      </p>
    </div>
  );
}
