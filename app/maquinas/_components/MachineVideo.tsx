import { ExternalLink } from "lucide-react";
import { youtubeVideoId } from "@/app/lib/machines";

type MachineVideoProps = {
  /** URL original del video (YouTube, o un archivo propio como /videos/algo.mp4). */
  url: string;
  /** Nombre de la máquina para el título accesible del reproductor. */
  name: string;
  /** Texto corto del enlace externo. */
  label?: string;
};

const DIRECT_VIDEO_FILE = /\.(mp4|webm|mov|m4v|ogv|ogg)(\?.*)?$/i;

/** Reproductor de video de técnica: YouTube embebido, o archivo propio (ej. subido a public/videos) con <video> nativo. */
export default function MachineVideo({ url, name, label }: MachineVideoProps) {
  const videoId = youtubeVideoId(url);
  const isDirectVideo = !videoId && DIRECT_VIDEO_FILE.test(url);

  return (
    <div className="space-y-2">
      {videoId ? (
        <div className="relative aspect-video overflow-hidden border-[3px] border-[#d8ff3e]/45 bg-black">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={`Video de técnica: ${name}`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : isDirectVideo ? (
        <div className="relative aspect-video overflow-hidden border-[3px] border-[#d8ff3e]/45 bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            className="absolute inset-0 h-full w-full object-contain"
            src={url}
            controls
            playsInline
            preload="metadata"
            aria-label={`Video de técnica: ${name}`}
          />
        </div>
      ) : null}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white/45 transition hover:text-[#d8ff3e] focus-visible:text-[#d8ff3e] focus-visible:outline-none"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {label ?? (isDirectVideo ? "Abrir video" : "Ver en YouTube")}
      </a>
    </div>
  );
}
