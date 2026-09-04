"use client";

import { useEffect, useState } from "react";
import { zoneSlug } from "@/app/lib/machines";

type ZoneNavProps = {
  /** Zonas en el mismo orden en que se renderizan las secciones. */
  zones: string[];
};

/** Chips fijos que saltan a la sección de cada zona del catálogo. */
export default function ZoneNav({ zones }: ZoneNavProps) {
  const [active, setActive] = useState<string | null>(zones[0] ?? null);

  useEffect(() => {
    const targets = zones
      .map((zone) => document.getElementById(zoneSlug(zone)))
      .filter((el): el is HTMLElement => el !== null);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActive(visible.target.id.replace(/^zona-/, ""));
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [zones]);

  function jumpTo(zone: string) {
    const el = document.getElementById(zoneSlug(zone));
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="sticky top-[59px] z-20 border-y border-white/10 bg-[#070707]/92 backdrop-blur sm:top-[63px]">
      <div
        className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {zones.map((zone) => {
          const isActive = active
            ? zoneSlug(zone) === zoneSlug(active) || zone.toLowerCase() === active.toLowerCase()
            : false;
          return (
            <button
              key={zone}
              type="button"
              onClick={() => jumpTo(zone)}
              className={`shrink-0 border-2 px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] transition focus-visible:outline-none ${
                isActive
                  ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                  : "border-white/15 text-white/55 hover:border-white/35 hover:text-white/80 focus-visible:border-[#d8ff3e]"
              }`}
            >
              {zone}
            </button>
          );
        })}
      </div>
    </div>
  );
}
