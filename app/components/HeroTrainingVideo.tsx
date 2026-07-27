"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function HeroTrainingVideo({
  src = "/xtreme/scene-strength-pexels.mp4",
  poster = "/xtreme/zona-funcional-clases.webp",
  label = "Entrenamiento de fuerza en un gimnasio",
}: {
  src?: string;
  poster?: string;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      videoRef.current?.pause();
      setPaused(true);
    }
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  }

  return (
    <>
      <video
        ref={videoRef}
        className="cinema-hero-video h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        onPause={() => setPaused(true)}
        onPlay={() => setPaused(false)}
        aria-label={label}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="cinema-video-progress absolute inset-x-0 bottom-0 z-10 h-[3px] bg-white/10" aria-hidden>
        <span className="block h-full bg-[#f6c400]" />
      </div>
      <button
        type="button"
        onClick={togglePlayback}
        className="cinema-video-control absolute right-6 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-xl transition hover:border-[#f6c400] hover:bg-[#f6c400] hover:text-black"
        aria-label={paused ? "Reproducir video" : "Pausar video"}
      >
        {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
      </button>
    </>
  );
}
