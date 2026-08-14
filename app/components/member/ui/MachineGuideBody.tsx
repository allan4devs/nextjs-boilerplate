"use client";

import { useState } from "react";
import { Check, ExternalLink, Lock, Play, Timer } from "lucide-react";
import { GameCallout, GameChip, GamePanel } from "../../GameOS";
import { findMachineGuide } from "../constants";
import { youtubeThumb, youtubeVideoId } from "../catalog/machines";

export function MachineGuideBody({
  machine,
}: {
  machine: NonNullable<ReturnType<typeof findMachineGuide>>;
}) {
  const gallery = machine.images?.length
    ? machine.images
    : machine.image
      ? [machine.image]
      : [];
  const [activePhoto, setActivePhoto] = useState(gallery[0] ?? machine.image);
  const thumb = youtubeThumb(machine.videoUrl);
  const ytId = youtubeVideoId(machine.videoUrl);

  return (
    <div className="space-y-4">
      <div className={`h-3 border-2 border-black/20 bg-gradient-to-r ${machine.accent}`} />

      {activePhoto && (
        <div className="overflow-hidden border-[3px] border-white/15 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activePhoto}
            alt={machine.name}
            className="h-40 w-full object-cover sm:h-48"
          />
          {gallery.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto border-t-2 border-white/10 bg-black/60 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {gallery.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActivePhoto(src)}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden border-2 transition ${
                    activePhoto === src
                      ? "border-[#d8ff3e]"
                      : "border-white/20 opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {machine.muscles.map((m) => (
          <GameChip key={m} tone="lime">
            {m}
          </GameChip>
        ))}
      </div>

      {machine.videoUrl && (
        <a
          href={machine.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex min-h-[88px] overflow-hidden border-[3px] border-[#d8ff3e]/45 bg-black transition hover:border-[#d8ff3e]"
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-50 transition group-hover:opacity-65 group-hover:scale-105"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-r ${machine.accent} opacity-30`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
          <div className="relative flex w-full items-center gap-3 p-3 sm:p-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center border-2 border-black/40 bg-[#d8ff3e] text-black shadow-[3px_3px_0_rgba(0,0,0,.4)]">
              <Play className="h-6 w-6 fill-current" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">
                Video de técnica
              </p>
              <p className="truncate text-sm font-black uppercase text-white">
                {machine.videoLabel ?? `Cómo usar ${machine.name}`}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-white/45">
                {ytId ? "YouTube · se abre en pestaña nueva" : "Se abre en pestaña nueva"}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-white/40 group-hover:text-[#d8ff3e]" />
          </div>
        </a>
      )}

      <GamePanel title="Ajuste inicial" tone="cyan" compact>
        <p className="text-sm font-bold leading-6 text-white/70">{machine.setup}</p>
      </GamePanel>
      <div className="grid gap-3 sm:grid-cols-2">
        <GamePanel title="Tips" tone="lime" compact>
          <ul className="space-y-2 text-sm font-bold text-white/65">
            {machine.tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d8ff3e]" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </GamePanel>
        <GamePanel title="Evite" tone="orange" compact>
          <ul className="space-y-2 text-sm font-bold text-white/65">
            {machine.mistakes.map((mistake) => (
              <li key={mistake} className="flex gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </GamePanel>
      </div>
      <GameCallout tone="orange" icon={Timer}>
        <span className="font-black uppercase">Starter · </span>
        {machine.starter}
      </GameCallout>
    </div>
  );
}
