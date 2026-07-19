"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Tour de bienvenida: spotlight anclado a `data-tour`, mobile-first.
 * En pantallas chicas la burbuja va abajo (sobre el dock) para no tapar el target.
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

const PADDING = 6;
const BUBBLE_WIDTH = 320;
const GAP = 12;
const MOBILE_BP = 640;

function isVisibleRect(r: DOMRect) {
  if (r.width < 2 || r.height < 2) return false;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Al menos un poco dentro del viewport (evita SideNav off-canvas en mobile).
  const visibleW = Math.min(r.right, vw) - Math.max(r.left, 0);
  const visibleH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  return visibleW > 8 && visibleH > 8;
}

function scoreRect(r: DOMRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const visibleW = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
  const visibleH = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  return visibleW * visibleH;
}

/** Elige el ancla más visible cuando hay varios `data-tour` iguales (dock + nav). */
function readRect(target: string): Rect | null {
  if (typeof document === "undefined") return null;
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`),
  );
  if (!nodes.length) return null;

  let best: DOMRect | null = null;
  let bestScore = 0;
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (!isVisibleRect(r)) continue;
    const score = scoreRect(r);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  if (!best) return null;
  return {
    top: best.top,
    left: best.left,
    width: best.width,
    height: best.height,
  };
}

function scrollTargetIntoView(target: string) {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`),
  );
  const el =
    nodes.find((node) => isVisibleRect(node.getBoundingClientRect())) || nodes[0];
  if (!el) return;
  const scroller = el.closest(".xg-os-content") as HTMLElement | null;
  if (scroller) {
    const er = el.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    const delta = er.top - sr.top - sr.height * 0.25;
    scroller.scrollBy({ top: delta, behavior: "smooth" });
  } else {
    el.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
  }
}

function Tour({
  steps,
  onClose,
  onGoToTab,
}: {
  steps: TourStep[];
  onClose: () => void;
  onGoToTab?: (tab: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BP);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Cambiar de tab si el paso lo necesita.
  useEffect(() => {
    if (!step?.tab) return;
    onGoToTab?.(step.tab);
  }, [step?.tab, step?.target, onGoToTab]);

  // Medir + scroll; reintentar tras cambio de tab / layout mobile.
  useLayoutEffect(() => {
    if (!step) return;
    let cancelled = false;
    let frame = 0;
    let tries = 0;

    const measure = () => {
      if (cancelled) return;
      if (tries === 0 || tries === 4) {
        scrollTargetIntoView(step.target);
      }
      const next = readRect(step.target);
      if (next) {
        setRect(next);
        return;
      }
      if (tries < 36) {
        tries += 1;
        frame = window.setTimeout(measure, tries < 8 ? 40 : 80);
      } else {
        setRect(null);
      }
    };

    frame = window.setTimeout(measure, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(frame);
    };
  }, [step, index]);

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
  const hasTarget = step.target !== "tour-welcome";

  const spot =
    hasTarget && rect
      ? {
          top: Math.max(4, rect.top - PADDING),
          left: Math.max(4, rect.left - PADDING),
          width: Math.min(window.innerWidth - 8, rect.width + PADDING * 2),
          height: Math.min(window.innerHeight - 8, rect.height + PADDING * 2),
        }
      : null;

  // Mobile: burbuja fija abajo (sobre dock). Desktop: junto al elemento.
  let bubbleStyle: React.CSSProperties;
  if (isMobile || !spot) {
    bubbleStyle = {
      left: 12,
      right: 12,
      bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))",
      width: "auto",
      maxWidth: "none",
    };
  } else {
    const vw = window.innerWidth;
    const spaceBelow = window.innerHeight - (spot.top + spot.height);
    const placeBelow = spaceBelow > 220;
    const rawLeft = spot.left + spot.width / 2 - BUBBLE_WIDTH / 2;
    const left = Math.max(12, Math.min(rawLeft, vw - BUBBLE_WIDTH - 12));
    bubbleStyle = placeBelow
      ? { top: spot.top + spot.height + GAP, left, width: BUBBLE_WIDTH }
      : {
          top: Math.max(12, spot.top - GAP),
          left,
          width: BUBBLE_WIDTH,
          transform: "translateY(-100%)",
        };
  }

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial de bienvenida"
    >
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-md ring-2 ring-[#d8ff3e] transition-all duration-300"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(3,3,3,0.84)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/84" />
      )}

      <button
        type="button"
        aria-label="Saltar tutorial"
        onClick={() => finish()}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div
        className="absolute z-[1] border-[3px] border-[#d8ff3e]/45 bg-[#0b0b0b] p-4 shadow-[0_12px_40px_rgba(0,0,0,.65)] sm:p-5"
        style={bubbleStyle}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#d8ff3e] text-black">
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d8ff3e] sm:text-xs sm:tracking-[0.18em]">
              Paso {index + 1} de {steps.length}
            </p>
          </div>
          <button
            type="button"
            onClick={() => finish()}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mt-3 text-lg font-black uppercase leading-tight text-white sm:mt-4 sm:text-xl">
          {step.title}
        </h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/70">{step.body}</p>

        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <span
              key={s.target + i}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-[#d8ff3e]"
                  : i < index
                    ? "w-1.5 bg-[#d8ff3e]/50"
                    : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 sm:mt-5">
          {isFirst ? (
            <button
              type="button"
              onClick={() => finish()}
              className="min-h-11 px-2 text-xs font-bold uppercase tracking-[0.12em] text-white/45 transition hover:text-white"
            >
              Saltar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => i - 1)}
              className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-black uppercase tracking-[0.12em] text-white/60 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>
          )}

          <button
            type="button"
            onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
            className="inline-flex min-h-11 items-center gap-2 bg-[#d8ff3e] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-white active:scale-[0.98]"
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
 * Envoltorio: monta el tour solo cuando `open` es true.
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
