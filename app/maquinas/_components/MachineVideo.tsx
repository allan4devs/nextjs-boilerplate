import { ExternalLink } from "lucide-react";
import { youtubeVideoId } from "@/app/lib/machines";

type MachineVideoProps = {
  /** URL original del video (YouTube). */
  url: string;
  /** Nombre de la máquina para el título accesible del reproductor. */
  name: string;
  /** Texto corto del enlace externo. */
  label?: string;
};

/** Reproductor de video de técnica embebido (youtube-nocookie) con enlace de respaldo. */
export default function MachineVideo({ url, name, label }: MachineVideoProps) {
  const videoId = youtubeVideoId(url);

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
      ) : null}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white/45 transition hover:text-[#d8ff3e] focus-visible:text-[#d8ff3e] focus-visible:outline-none"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {label ?? "Ver en YouTube"}
      </a>
    </div>
  );
}
