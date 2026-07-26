"use client";

import { useEffect, useRef } from "react";

type ScrollSceneVideoProps = {
  src: string;
  poster: string;
  label: string;
};

export default function ScrollSceneVideo({ src, poster, label }: ScrollSceneVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play();
        else video.pause();
      },
      { threshold: 0.18 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className="cinema-scene-video h-full w-full object-cover"
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-label={label}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
