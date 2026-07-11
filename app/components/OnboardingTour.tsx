"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Tour de bienvenida para socios nuevos: burbujas ancladas a elementos reales
 * (marcados con `data-tour="<target>"`) con spotlight, indicador "Paso X de N"
 * y navegación Anterior / Siguiente / Saltar. Se muestra una sola vez por socio.
 */

export type TourStep = {
  /** Coincide con el atributo data-tour del elemento a resaltar. */
  target: string;
  title: string;
  body: string;
  icon?: LucideIcon;
  /** Tab que debe estar activo para que el elemento sea visible. */
  tab?: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8; // aire alrededor del elemento resaltado
const BUBBLE_WIDTH = 320;
const GAP = 14; // separación entre elemento y burbuja

function readRect(target: string): Rect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function Tour({
  steps,
  onClose,
  onGoToTab,
}: {
  steps: TourStep[];
  onClose: () => void;
  /** Cambia de tab antes de resaltar un elemento que vive en otra pestaña. */
  onGoToTab?: (tab: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  // Cambiar de tab si el paso lo necesita.
  useEffect(() => {
    if (!step?.tab) return;
    onGoToTab?.(step.tab);
  }, [step?.tab, onGoToTab]);

  // Medir el elemento anclado; reintentar brevemente por si el tab recién cambió.
  useLayoutEffect(() => {
    if (!step) return;
    let frame = 0;
    let tries = 0;
    const measure = () => {
      const next = readRect(step.target);
      if (next) {
        setRect(next);
        return;
      }
      // El elemento puede no existir aún (tab cambiando): reintentar unos frames.
      if (tries < 20) {
        tries += 1;
        frame = requestAnimationFrame(measure);
      } else {
        setRect(null);
      }
    };
    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [step, index]);

  // Reposicionar en scroll / resize.
  useEffect(() => {
    if (!step) return;
    const update = () => setRect(readRect(step.target));
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [step]);

  const finish = useCallback(() => onClose(), [onClose]);

  // Teclado: Escape salta, flechas navegan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" && !isLast) setIndex((i) => i + 1);
      if (e.key === "ArrowLeft" && !isFirst) setIndex((i) => i - 1);
      if (e.key === "ArrowRight" && isLast) finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFirst, isLast, finish]);

  if (!step) return null;

  const Icon = step.icon ?? Sparkles;

  // Geometría del spotlight y la burbuja (con fallback centrado si no hay elemento).
  const spot = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  let bubbleStyle: React.CSSProperties;
  let placement: "bottom" | "top" | "center" = "center";
  if (spot) {
    const vw = window.innerWidth;
    const spaceBelow = window.innerHeight - (spot.top + spot.height);
    placement = spaceBelow > 210 ? "bottom" : "top";
    const rawLeft = spot.left + spot.width / 2 - BUBBLE_WIDTH / 2;
    const left = Math.max(12, Math.min(rawLeft, vw - BUBBLE_WIDTH - 12));
    bubbleStyle =
      placement === "bottom"
        ? { top: spot.top + spot.height + GAP, left }
        : { top: Math.max(12, spot.top - GAP), left, transform: "translateY(-100%)" };
  } else {
    bubbleStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Tutorial de bienvenida">
      {/* Overlay: spotlight recortado con box-shadow gigante, o velo simple sin ancla. */}
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-[#d8ff3e] transition-all duration-300"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(3,3,3,0.82)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/82" />
      )}

      {/* Capa para cerrar tocando el velo (fuera de la burbuja). */}
      <button
        type="button"
        aria-label="Saltar tutorial"
        onClick={() => finish()}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div
        className="absolute w-[320px] max-w-[calc(100vw-24px)] border border-[#d8ff3e]/40 bg-[#0b0b0b] p-5 shadow-2xl"
        style={bubbleStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#d8ff3e] text-black">
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8ff3e]">
              Paso {index + 1} de {steps.length}
            </p>
          </div>
          <button
            type="button"
            onClick={() => finish()}
            aria-label="Cerrar"
            className="text-white/40 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mt-4 text-xl font-black uppercase leading-tight text-white">{step.title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/70">{step.body}</p>

        {/* Puntos de progreso */}
        <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <span
              key={s.target + i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-[#d8ff3e]" : i < index ? "w-1.5 bg-[#d8ff3e]/50" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {isFirst ? (
            <button
              type="button"
              onClick={() => finish()}
              className="text-xs font-bold uppercase tracking-[0.12em] text-white/45 transition hover:text-white"
            >
              Saltar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => i - 1)}
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-white/60 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>
          )}

          <button
            type="button"
            onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
            className="inline-flex items-center gap-2 bg-[#d8ff3e] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-white"
          >
            {isLast ? (
              <>
                Entendido <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Siguiente <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Envoltorio: monta el tour solo cuando `open` es true. Como el árbol se
 * desmonta al cerrar, cada apertura arranca con el estado interno en el primer
 * paso — sin necesidad de reiniciar índices con efectos.
 */
export default function OnboardingTour({
  steps,
  open,
  onClose,
  onGoToTab,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  onGoToTab?: (tab: string) => void;
}) {
  if (!open) return null;
  return <Tour steps={steps} onClose={onClose} onGoToTab={onGoToTab} />;
}
