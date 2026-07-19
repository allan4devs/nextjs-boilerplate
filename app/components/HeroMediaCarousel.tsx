"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SLIDES = [
  {
    src: "/xtreme/piso-maquinas-panoramica.webp",
    alt: "Vista panorámica del piso principal de máquinas de Xtreme Gym",
    label: "Piso principal",
    title: "Todo listo para vos.",
    detail: "Fuerza · máquinas · peso libre",
    position: "50% 52%",
  },
  {
    src: "/xtreme/zona-entrenamiento-vip.webp",
    alt: "Zona de entrenamiento VIP de Xtreme Gym",
    label: "Entrenamiento VIP",
    title: "Entrená con intención.",
    detail: "Dirección · enfoque · progreso",
    position: "50% 48%",
  },
  {
    src: "/xtreme/zona-funcional-turf.webp",
    alt: "Zona funcional con turf de Xtreme Gym",
    label: "Zona funcional",
    title: "Espacio para moverte.",
    detail: "Funcional · potencia · movilidad",
    position: "50% 58%",
  },
  {
    src: "/xtreme/zona-cardio.webp",
    alt: "Zona de cardio de Xtreme Gym",
    label: "Cardio",
    title: "Subí el ritmo.",
    detail: "Resistencia · energía · constancia",
    position: "50% 52%",
  },
] as const;

const AUTOPLAY_MS = 5600;

export default function HeroMediaCarousel() {
  const [active, setActive] = useState(0);
  const [manualPaused, setManualPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const paused = manualPaused || interacting;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setTimeout(
      () => setActive((current) => (current + 1) % SLIDES.length),
      AUTOPLAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [active, paused, reducedMotion]);

  function go(direction: -1 | 1) {
    setActive((current) => (current + direction + SLIDES.length) % SLIDES.length);
  }

  return (
    <div
      className="hero-media-carousel relative aspect-[16/11] overflow-hidden sm:aspect-[16/10] lg:aspect-[4/5]"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") pointerStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (pointerStart.current == null) return;
        const distance = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(distance) > 45) go(distance > 0 ? -1 : 1);
      }}
      aria-roledescription="carrusel"
      aria-label="Conocé las zonas de Xtreme Gym"
    >
      {SLIDES.map((slide, index) => (
        <div
          key={slide.src}
          className={`hero-carousel-slide absolute inset-0 transition-[opacity,transform] duration-1000 ease-[cubic-bezier(.2,.75,.2,1)] ${
            index === active ? "z-[1] scale-100 opacity-100" : "z-0 scale-[1.045] opacity-0"
          }`}
          aria-hidden={index !== active}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === 0}
            quality={88}
            sizes="(max-width: 1023px) calc(100vw - 40px), 430px"
            className="cinema-live-photo object-cover"
            style={{ objectPosition: slide.position }}
          />
        </div>
      ))}

      <div className="absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(0,0,0,.42)_0%,transparent_38%,rgba(0,0,0,.96)_100%)]" />
      <div className="absolute inset-0 z-[2] ring-1 ring-inset ring-white/10" />

      <div className="absolute left-4 right-4 top-4 z-[4] flex items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-white">
          <ScanLine className="h-4 w-4 shrink-0 text-[#f6c400]" />
          <span className="truncate">{SLIDES[active].label}</span>
        </span>
        <span className="shrink-0 text-[9px] font-black uppercase tracking-[.18em] text-[#f6c400]">
          {String(active + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
      </div>

      <div className="absolute inset-x-4 bottom-4 z-[4]">
        <div key={active} className="hero-carousel-copy">
          <p className="cinema-display text-[clamp(1.55rem,2.2vw,2.15rem)] font-black uppercase leading-[.92] tracking-[-.035em]">
            {SLIDES[active].title}
          </p>
          <p className="mt-3 text-[9px] font-bold uppercase tracking-[.16em] text-white/52">
            {SLIDES[active].detail}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-white/18 pt-3">
          <button
            type="button"
            onClick={() => go(-1)}
            className="hero-carousel-control"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1.5" aria-label={`Imagen ${active + 1} de ${SLIDES.length}`}>
            {SLIDES.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => setActive(index)}
                className={`relative h-8 min-w-0 flex-1 overflow-hidden border transition ${
                  index === active ? "border-[#f6c400]/80" : "border-white/15 opacity-55 hover:opacity-90"
                }`}
                aria-label={`Ver ${slide.label}`}
                aria-current={index === active ? "true" : undefined}
              >
                <Image src={slide.src} alt="" fill sizes="80px" className="object-cover" style={{ objectPosition: slide.position }} />
                <span className="absolute inset-0 bg-black/28" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setManualPaused((current) => !current)}
            className="hero-carousel-control"
            aria-label={manualPaused ? "Reanudar carrusel" : "Pausar carrusel"}
          >
            {manualPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="hero-carousel-control"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {!paused && !reducedMotion && (
          <span key={`progress-${active}`} className="hero-carousel-progress mt-2 block h-px bg-[#f6c400]" />
        )}
      </div>
    </div>
  );
}
