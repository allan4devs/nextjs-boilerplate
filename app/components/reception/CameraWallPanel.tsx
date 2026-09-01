"use client";

/**
 * Muro de cámaras en vivo para recepción. Las cámaras Hikvision hablan RTSP, que
 * el navegador no reproduce; por eso el video pasa por un proxy local (go2rtc)
 * corriendo en la PC de recepción, que reexpone cada cámara como WebRTC.
 *
 * Este panel NO guarda IPs ni contraseñas de cámaras: sale todo del go2rtc de la
 * PC. Se autodescubren las cámaras llamando a su API `/api/streams`, así que
 * agregar o quitar cámaras se hace solo en `go2rtc.yaml`, no acá.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Maximize2, RefreshCw, Video } from "lucide-react";
import { GameButton, GameCallout, GameChip, GameLabel } from "../GameOS";

/** Proxy local go2rtc. Por defecto en la misma PC: http://localhost permite el
 *  iframe aunque la app esté en https (localhost está exento de mixed-content). */
const PROXY_URL = (
  process.env.NEXT_PUBLIC_CAMERA_PROXY_URL || "http://localhost:1984"
).replace(/\/$/, "");

type Phase = "loading" | "ready" | "offline";

export default function CameraWallPanel() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [cameras, setCameras] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch(`${PROXY_URL}/api/streams`, { cache: "no-store" });
      if (!res.ok) throw new Error("proxy");
      const json = (await res.json()) as Record<string, unknown>;
      setCameras(Object.keys(json).sort((a, b) => a.localeCompare(b, "es")));
      setPhase("ready");
    } catch {
      setCameras([]);
      setPhase("offline");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <GameLabel tone="lime">Cámaras · en vivo</GameLabel>
          <h2 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-black uppercase leading-[1.05] tracking-tight">
            Muro de cámaras
          </h2>
          <p className="mt-2 max-w-prose text-sm font-bold leading-6 text-white/45 text-pretty">
            Video en vivo del NVR, vía el proxy local. Las cámaras se configuran en el
            <code className="mx-1">go2rtc.yaml</code> de esta PC.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GameChip tone={phase === "ready" ? "lime" : phase === "offline" ? "red" : "default"}>
            {phase === "ready" ? `${cameras.length} cámaras` : phase === "offline" ? "Proxy caído" : "Cargando"}
          </GameChip>
          <GameButton onClick={() => void load()} disabled={phase === "loading"}>
            {phase === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refrescar
          </GameButton>
        </div>
      </div>

      {phase === "offline" && (
        <div className="mt-4">
          <GameCallout tone="orange" icon={AlertTriangle}>
            No se ve el proxy de cámaras en <code>{PROXY_URL}</code>. Arrancá <code>go2rtc</code> en
            esta PC (con el <code>go2rtc.yaml</code> apuntando al NVR 192.168.1.252) y refrescá.
          </GameCallout>
        </div>
      )}

      {phase === "ready" && !cameras.length && (
        <p className="mt-4 border-[3px] border-dashed border-white/10 py-8 text-center text-sm font-bold text-white/35">
          El proxy respondió pero no hay cámaras configuradas en <code>go2rtc.yaml</code>.
        </p>
      )}

      {phase === "ready" && cameras.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cameras.map((name) => (
            <CameraTile
              key={name}
              name={name}
              expanded={expanded === name}
              onToggle={() => setExpanded((cur) => (cur === name ? null : name))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CameraTile({
  name,
  expanded,
  onToggle,
}: {
  name: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`relative border-[3px] border-white/20 bg-black shadow-[4px_4px_0_rgba(0,0,0,.55)] ${
        expanded ? "sm:col-span-2 xl:col-span-3" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b-[3px] border-white/15 bg-black/70 px-3 py-2">
        <span className="inline-flex items-center gap-2 truncate text-xs font-black uppercase tracking-wide text-white/85">
          <Video className="h-4 w-4 text-[#d8ff3e]" /> {name}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Achicar" : "Agrandar"}
          className="grid h-8 w-8 place-items-center border-[3px] border-white/15 text-white/50 hover:border-[#d8ff3e] hover:text-[#d8ff3e]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      <div className={`relative w-full ${expanded ? "aspect-video" : "aspect-[4/3]"}`}>
        <iframe
          src={`${PROXY_URL}/webrtc.html?src=${encodeURIComponent(name)}&media=video`}
          title={`Cámara ${name}`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}
