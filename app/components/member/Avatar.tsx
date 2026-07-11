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
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`${className} shrink-0 rounded-full border border-[#d8ff3e]/40 object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className} grid shrink-0 place-items-center rounded-full bg-[#d8ff3e] font-black text-black ${textClass}`}
    >
      {initialsOf(name)}
    </span>
  );
}
