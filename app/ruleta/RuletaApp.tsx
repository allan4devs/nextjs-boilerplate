"use client";

import { useState } from "react";
import { Shuffle, UtensilsCrossed } from "lucide-react";
import { CATALOG_TOTALS } from "./foodData";
import PlateBuilder from "./PlateBuilder";
import RuletaClient from "./RuletaClient";

type Mode = "builder" | "roulette";

export default function RuletaApp() {
  const [mode, setMode] = useState<Mode>("builder");

  if (mode === "roulette") {
    return <RuletaClient onExit={() => setMode("builder")} />;
  }

  return (
    <main className="relative isolate min-h-[100dvh] w-full flex-1 overflow-x-hidden bg-[#fff8f3] text-[#38252d]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-[#ffb3c6]/35 blur-3xl" />
        <div className="absolute -bottom-36 -right-28 h-[34rem] w-[34rem] rounded-full bg-[#ffd6a5]/50 blur-3xl" />
        <div className="absolute left-[8%] top-[22%] text-4xl text-[#f4a261]/30">✦</div>
        <div className="absolute right-[8%] top-[12%] text-5xl text-[#ff8fab]/30">♡</div>
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <span className="flex items-center gap-3 text-left">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#3d2630] text-xl text-white shadow-[0_5px_0_#24151b]">♥</span>
          <span>
            <strong className="block text-sm font-black tracking-tight text-[#3d2630]">¿Qué comemos?</strong>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#b0798b]">Edición San Carlos</span>
          </span>
        </span>

        <div className="hidden items-center gap-2 rounded-full border border-[#7c4358]/10 bg-white/70 px-4 py-2 text-xs font-bold text-[#896b76] shadow-sm backdrop-blur sm:flex">
          <UtensilsCrossed className="h-3.5 w-3.5 text-[#ed4c78]" aria-hidden="true" />
          {CATALOG_TOTALS.restaurants} lugares · {CATALOG_TOTALS.dishes} platos
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 pb-14 pt-3 sm:px-6 lg:px-8">
        <PlateBuilder onSwitchToRoulette={() => setMode("roulette")} />

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] border border-dashed border-[#cfaeba] bg-white/45 px-5 py-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-sm font-black text-[#4d303b]">¿Preferís no pensar en ingredientes?</p>
            <p className="text-xs font-medium text-[#967580]">Probá el juego de la ruleta paso a paso: categoría, restaurante y plato.</p>
          </div>
          <button
            type="button"
            onClick={() => setMode("roulette")}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#d94d73] shadow-[0_5px_18px_rgba(75,35,50,0.1)] ring-1 ring-[#ed4c78]/15 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" /> Jugar la ruleta
          </button>
        </div>
      </section>
    </main>
  );
}
