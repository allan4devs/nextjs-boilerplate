"use client";

/** Avatar del socio: foto redonda o iniciales sobre fondo lima. */

import { initialsOf } from "./utils";

export default function Avatar({
  name,
  photoUrl,
  className = "h-10 w-10",
  textClass = "text-sm",
}: {
  name: string;
  photoUrl?: string;
  className?: string;
  textClass?: string;
}) {
  // Caja con tamaño fijo + overflow: la foto nunca se “sale” del círculo
  // (imgs grandes en flex min-width:auto suelen romper layouts estrechos).
  const boxClass = `${className} relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full`;

  if (photoUrl) {
    return (
      <span className={`${boxClass} border border-[#d8ff3e]/40 bg-black/50`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={name}
          className="absolute inset-0 block h-full w-full max-h-full max-w-full object-cover"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      className={`${boxClass} bg-[#d8ff3e] font-black text-black ${textClass}`}
      aria-label={name}
    >
      {initialsOf(name)}
    </span>
  );
}
