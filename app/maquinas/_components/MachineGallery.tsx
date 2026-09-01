"use client";

import { useState } from "react";

type MachineGalleryProps = {
  name: string;
  image: string;
  images?: string[];
};

/** Galería de fotos del piso para la ficha de una máquina (adaptada del modal del Member OS). */
export default function MachineGallery({ name, image, images }: MachineGalleryProps) {
  const gallery = images?.length ? images : image ? [image] : [];
  const [active, setActive] = useState(gallery[0] ?? image);

  if (!active) return null;

  return (
    <figure className="overflow-hidden border-[3px] border-white/15 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={active}
        alt={`${name} — piso de Xtreme Gym`}
        className="h-56 w-full object-cover sm:h-72"
      />
      {gallery.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-t-2 border-white/10 bg-black/60 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {gallery.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(src)}
              aria-label={`Ver foto ${index + 1} de ${name}`}
              aria-pressed={active === src}
              className={`relative h-16 w-24 shrink-0 overflow-hidden border-2 transition focus-visible:outline-none ${
                active === src
                  ? "border-[#d8ff3e]"
                  : "border-white/20 opacity-70 hover:opacity-100 focus-visible:border-[#d8ff3e] focus-visible:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
