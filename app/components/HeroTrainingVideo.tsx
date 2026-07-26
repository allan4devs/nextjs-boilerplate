"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function HeroTrainingVideo() {
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
        preload="metadata"
        poster="/xtreme/piso-pesas-panoramica.webp"
        onPause={() => setPaused(true)}
        onPlay={() => setPaused(false)}
        aria-label="Entrenamiento con pesas y acompañamiento en un gimnasio"
      >
        <source src="/xtreme/hero-training-pexels.mp4" type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={togglePlayback}
        className="cinema-video-control absolute bottom-5 right-5 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/55 text-white backdrop-blur-md transition hover:border-[#f6c400] hover:bg-[#f6c400] hover:text-black"
        aria-label={paused ? "Reproducir video" : "Pausar video"}
      >
        {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
      </button>
    </>
  );
}
