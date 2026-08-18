"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Heart, MapPin, RotateCcw, Sparkles, Utensils } from "lucide-react";
import { CATALOG_TOTALS, FOOD_CATEGORIES } from "./foodData";
import styles from "./ruleta.module.css";

const SPIN_DURATION = 4200;
const WHEEL_COLORS = ["#ff6b6b", "#ffb84d", "#ffd166", "#60d394", "#4cc9b0", "#56a8e8", "#8b7cf6", "#d85bb4"];

type Step = 0 | 1 | 2;

type WheelOption = {
  label: string;
  wheelLabel: string;
  detail?: string;
  emoji: string;
  color: string;
};

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
};

function polarPoint(angle: number, radius = 190) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: 200 + radius * Math.cos(radians),
    y: 200 + radius * Math.sin(radians),
  };
}

function segmentPath(index: number, count: number) {
  const segmentAngle = 360 / count;
  const centerAngle = -90 + index * segmentAngle;
  const start = polarPoint(centerAngle - segmentAngle / 2);
  const end = polarPoint(centerAngle + segmentAngle / 2);
  const largeArc = segmentAngle > 180 ? 1 : 0;

  return `M 200 200 L ${start.x} ${start.y} A 190 190 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function secureRandomIndex(length: number) {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % length;
}

function makeConfetti(): ConfettiPiece[] {
  const colors = ["#ff477e", "#ffd166", "#06d6a0", "#4d96ff", "#9d6bff", "#ffffff"];

  return Array.from({ length: 48 }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.7,
    duration: 2.2 + Math.random() * 1.5,
    color: colors[id % colors.length],
    rotation: Math.random() * 180,
  }));
}

function shorten(label: string, maxLength: number) {
  return label.length <= maxLength ? label : `${label.slice(0, maxLength - 1)}…`;
}

const STEP_COPY = [
  { eyebrow: "Primera ruleta", title: "¿Qué se te antoja?", button: "Girar categoría", next: "Elegir restaurante" },
  { eyebrow: "Segunda ruleta", title: "¿Dónde comemos?", button: "Girar restaurante", next: "Elegir el plato" },
  { eyebrow: "Última ruleta", title: "¿Qué pedimos?", button: "Girar plato", next: "" },
] as const;

export default function RuletaClient() {
  const [step, setStep] = useState<Step>(0);
  const [categoryIndex, setCategoryIndex] = useState<number | null>(null);
  const [restaurantIndex, setRestaurantIndex] = useState<number | null>(null);
  const [dishIndex, setDishIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState(SPIN_DURATION);
  const [spinning, setSpinning] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const category = categoryIndex === null ? null : FOOD_CATEGORIES[categoryIndex];
  const restaurant = category && restaurantIndex !== null ? category.restaurants[restaurantIndex] : null;
  const dish = restaurant && dishIndex !== null ? restaurant.dishes[dishIndex] : null;

  const options = useMemo<WheelOption[]>(() => {
    if (step === 0) {
      return FOOD_CATEGORIES.map((item) => ({
        label: item.label,
        wheelLabel: item.wheelLabel,
        emoji: item.emoji,
        color: item.color,
      }));
    }

    if (step === 1 && category) {
      return category.restaurants.map((item, index) => ({
        label: item.name,
        wheelLabel: item.name,
        detail: item.location,
        emoji: category.emoji,
        color: WHEEL_COLORS[index % WHEEL_COLORS.length],
      }));
    }

    if (step === 2 && restaurant && category) {
      return restaurant.dishes.map((item, index) => ({
        label: item,
        wheelLabel: item,
        emoji: category.emoji,
        color: WHEEL_COLORS[(index + 1) % WHEEL_COLORS.length],
      }));
    }

    return [];
  }, [category, restaurant, step]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function spin() {
    if (spinning || options.length === 0) return;

    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : SPIN_DURATION;
    const selectedIndex = secureRandomIndex(options.length);
    const segmentAngle = 360 / options.length;
    const currentPosition = ((rotation % 360) + 360) % 360;
    const targetPosition = (360 - selectedIndex * segmentAngle) % 360;
    const alignment = (targetPosition - currentPosition + 360) % 360;
    const nextRotation = rotation + 6 * 360 + alignment;

    setSpinning(true);
    setHasResult(false);
    setWinnerIndex(null);
    setConfetti([]);
    setTransitionDuration(duration);
    setRotation(nextRotation);

    timerRef.current = setTimeout(() => {
      if (step === 0) {
        setCategoryIndex(selectedIndex);
        setRestaurantIndex(null);
        setDishIndex(null);
      } else if (step === 1) {
        setRestaurantIndex(selectedIndex);
        setDishIndex(null);
      } else {
        setDishIndex(selectedIndex);
        setConfetti(makeConfetti());
      }

      setWinnerIndex(selectedIndex);
      setHasResult(true);
      setSpinning(false);
    }, duration);
  }

  function goNext() {
    if (!hasResult || step === 2) return;
    setStep((step + 1) as Step);
    setRotation(0);
    setWinnerIndex(null);
    setHasResult(false);
  }

  function goBack() {
    if (spinning || step === 0) return;

    if (step === 1) {
      setCategoryIndex(null);
      setRestaurantIndex(null);
      setDishIndex(null);
      setStep(0);
    } else {
      setRestaurantIndex(null);
      setDishIndex(null);
      setStep(1);
    }

    setRotation(0);
    setWinnerIndex(null);
    setHasResult(false);
    setConfetti([]);
  }

  function restart() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStep(0);
    setCategoryIndex(null);
    setRestaurantIndex(null);
    setDishIndex(null);
    setRotation(0);
    setWinnerIndex(null);
    setHasResult(false);
    setSpinning(false);
    setConfetti([]);
  }

  const winner = winnerIndex === null ? null : options[winnerIndex];
  const isFinal = step === 2 && hasResult && dish !== null;
  const labelLimit = options.length >= 12 ? 11 : options.length >= 5 ? 15 : 20;
  const textSize = options.length >= 12 ? 7.5 : options.length >= 5 ? 11 : 14;
  const emojiSize = options.length >= 12 ? 14 : options.length >= 5 ? 24 : 30;

  return (
    <main className="relative isolate min-h-[100dvh] w-full flex-1 overflow-x-hidden bg-[#fff8f3] px-4 py-7 text-[#38252d] sm:px-6 lg:py-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-20 h-80 w-80 rounded-full bg-[#ffb3c6]/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-[#ffd6a5]/55 blur-3xl" />
        <div className="absolute right-[9%] top-[8%] text-4xl text-[#ff8fab]/40">♡</div>
        <div className="absolute bottom-[10%] left-[7%] rotate-12 text-6xl text-[#ff8fab]/25">♡</div>
        <div className="absolute left-[13%] top-[22%] text-2xl text-[#f4a261]/45">✦</div>
        <div className="absolute bottom-[25%] right-[11%] text-3xl text-[#f4a261]/35">✦</div>
      </div>

      {confetti.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          {confetti.map((piece) => (
            <span
              key={piece.id}
              className={styles.confetti}
              style={{
                left: `${piece.left}%`,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                rotate: `${piece.rotation}deg`,
              }}
            />
          ))}
        </div>
      )}

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <div className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ff8fab]/30 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#d94d73] shadow-sm backdrop-blur">
            <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
            Solo San Carlos · {CATALOG_TOTALS.dishes} posibilidades
          </div>

          <h1 className="text-balance text-4xl font-black leading-[0.95] tracking-[-0.055em] text-[#3d2630] sm:text-6xl lg:text-7xl">
            Hoy en San Carlos
            <span className="block bg-gradient-to-r from-[#ed4c78] to-[#f08a5d] bg-clip-text text-transparent">
              ¿qué vamos a comer?
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-7 text-[#765c66] sm:text-lg lg:mx-0">
            Primero el antojo, luego uno de nuestros restaurantes sancarleños y al final el plato. Sin viajes largos, sin pensarlo de más.
          </p>

          <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2 lg:mx-0">
            {[
              [CATALOG_TOTALS.categories, "categorías"],
              [CATALOG_TOTALS.restaurants, "restaurantes"],
              [CATALOG_TOTALS.dishes, "platos"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-[#7c4358]/10 bg-white/70 px-2 py-3 text-center shadow-sm backdrop-blur">
                <strong className="block text-xl font-black text-[#3d2630] sm:text-2xl">{value}</strong>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9a7180] sm:text-xs">{label}</span>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-5 flex max-w-lg items-center justify-center gap-2 lg:mx-0 lg:justify-start" aria-label={`Paso ${step + 1} de 3`}>
            {STEP_COPY.map((item, index) => {
              const completed = index < step || (index === step && hasResult);
              const active = index === step;

              return (
                <div key={item.eyebrow} className="flex flex-1 items-center gap-2 last:flex-none">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-xs font-black transition ${
                      active
                        ? "border-[#3d2630] bg-[#3d2630] text-white shadow-md"
                        : completed
                          ? "border-[#ed4c78] bg-[#ed4c78] text-white"
                          : "border-[#d9c5cc] bg-white/60 text-[#a88894]"
                    }`}
                    title={item.title}
                  >
                    {completed ? "✓" : index + 1}
                  </div>
                  {index < 2 && <span className={`h-0.5 flex-1 ${index < step ? "bg-[#ed4c78]" : "bg-[#ddcbd1]"}`} />}
                </div>
              );
            })}
          </div>

          <div className="mt-4 min-h-12 text-sm font-semibold text-[#8c6976]">
            {category && (
              <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-white/75 px-3 py-1.5 shadow-sm">
                {category.emoji} {category.label}
              </span>
            )}
            {restaurant && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/75 px-3 py-1.5 shadow-sm">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {restaurant.name}
              </span>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-[2rem] border border-white/80 bg-white/45 px-3 py-5 shadow-[0_24px_80px_rgba(115,55,76,0.12)] backdrop-blur-sm sm:px-6 sm:py-7">
          <div className="mb-3 flex w-full max-w-[31rem] items-center justify-between px-2">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0 || spinning}
              className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-[#84616e] transition hover:bg-white disabled:invisible"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
            </button>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d94d73]">{STEP_COPY[step].eyebrow}</p>
              <h2 className="text-lg font-black tracking-tight text-[#3d2630] sm:text-xl">{STEP_COPY[step].title}</h2>
            </div>
          </div>

          <div className="relative w-full max-w-[31rem] px-4">
            <div className="absolute left-1/2 top-[-5px] z-30 -translate-x-1/2 drop-shadow-[0_5px_4px_rgba(73,36,48,0.22)]" aria-hidden="true">
              <div className={styles.pointer} />
            </div>

            <div className="relative aspect-square rounded-full bg-white p-2.5 shadow-[0_22px_65px_rgba(115,55,76,0.2)] ring-1 ring-[#7c4358]/10 sm:p-3">
              <div
                className="relative h-full w-full rounded-full will-change-transform"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? `transform ${transitionDuration}ms cubic-bezier(0.12, 0.78, 0.14, 1)`
                    : "none",
                }}
              >
                <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible" role="img" aria-label={`Ruleta de ${STEP_COPY[step].title.toLowerCase()}`}>
                  <circle cx="200" cy="200" r="194" fill="#4b2f3a" />
                  {options.map((option, index) => {
                    const centerAngle = -90 + index * (360 / options.length);
                    const labelPoint = polarPoint(centerAngle, options.length >= 12 ? 142 : 125);

                    return (
                      <g key={`${step}-${option.label}`}>
                        <path d={segmentPath(index, options.length)} fill={option.color} stroke="#fff8f3" strokeWidth={options.length >= 12 ? 1.5 : 3} />
                        <g transform={`translate(${labelPoint.x} ${labelPoint.y}) rotate(${centerAngle + 90})`}>
                          <text y={options.length >= 12 ? "-3" : "-10"} textAnchor="middle" fontSize={emojiSize} aria-hidden="true">
                            {option.emoji}
                          </text>
                          <text
                            y={options.length >= 12 ? "11" : "19"}
                            textAnchor="middle"
                            fill="#332229"
                            fontSize={textSize}
                            fontWeight="850"
                            letterSpacing="0.1"
                          >
                            {shorten(option.wheelLabel, labelLimit).toUpperCase()}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                  <circle cx="200" cy="200" r="45" fill="#fff8f3" stroke="#4b2f3a" strokeWidth="7" />
                  <circle cx="200" cy="200" r="32" fill="#ffffff" />
                  <text x="200" y="211" textAnchor="middle" fontSize="31" aria-hidden="true">♥</text>
                </svg>
              </div>

              <div className="pointer-events-none absolute inset-3 rounded-full bg-[linear-gradient(130deg,rgba(255,255,255,0.34),transparent_30%,transparent_68%,rgba(66,31,43,0.08))]" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-5 min-h-[8.25rem] w-full max-w-lg text-center">
            {hasResult && winner ? (
              <div className={styles.result} aria-live="polite">
                <p className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#d94d73] sm:text-xs">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {isFinal ? "La decisión final" : "El destino eligió"}
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-[#3d2630] sm:text-3xl">
                  {winner.emoji} {winner.label}
                </p>
                {winner.detail && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-[#896b76]">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {winner.detail}
                  </p>
                )}
                {isFinal && category && restaurant && dish && (
                  <p className="mx-auto mt-2 max-w-md text-sm text-[#896b76]">
                    Hoy toca <strong>{dish}</strong> en <strong>{restaurant.name}</strong>, {restaurant.location}. 💕
                  </p>
                )}
              </div>
            ) : (
              <div className="pt-2" aria-live="polite">
                <p className="text-sm font-semibold text-[#9b7885]">
                  {spinning ? "El destino está eligiendo…" : `${options.length} opciones en esta ruleta`}
                </p>
                {!spinning && options.length > 0 && (
                  <div className="mx-auto mt-3 flex max-h-16 max-w-lg flex-wrap justify-center gap-1.5 overflow-y-auto px-1">
                    {options.map((option) => (
                      <span key={option.label} className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold text-[#8c6976] shadow-sm">
                        {option.emoji} {option.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {!hasResult ? (
            <button
              type="button"
              onClick={spin}
              disabled={spinning}
              className="group -mt-3 inline-flex min-h-14 min-w-60 items-center justify-center gap-3 rounded-full bg-[#3d2630] px-8 py-4 text-base font-black text-white shadow-[0_8px_0_#24151b,0_18px_35px_rgba(72,34,48,0.2)] transition hover:-translate-y-1 hover:bg-[#513340] hover:shadow-[0_11px_0_#24151b,0_22px_40px_rgba(72,34,48,0.24)] active:translate-y-1 active:shadow-[0_3px_0_#24151b] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 sm:text-lg"
            >
              <RotateCcw className={`h-5 w-5 ${spinning ? "animate-spin" : "transition-transform group-hover:-rotate-45"}`} aria-hidden="true" />
              {spinning ? "Girando…" : STEP_COPY[step].button}
            </button>
          ) : (
            <div className="-mt-3 flex flex-col items-center gap-3 sm:flex-row">
              {step < 2 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex min-h-14 min-w-56 items-center justify-center gap-2 rounded-full bg-[#ed4c78] px-7 py-4 font-black text-white shadow-[0_7px_0_#b72d54] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#b72d54]"
                >
                  <Utensils className="h-5 w-5" aria-hidden="true" /> {STEP_COPY[step].next}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex min-h-14 min-w-56 items-center justify-center gap-2 rounded-full bg-[#ed4c78] px-7 py-4 font-black text-white shadow-[0_7px_0_#b72d54] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#b72d54]"
                >
                  <Heart className="h-5 w-5 fill-current" aria-hidden="true" /> Nueva decisión
                </button>
              )}
              <button type="button" onClick={spin} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-[#765c66] transition hover:bg-white/80">
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Repetir esta ruleta
              </button>
            </div>
          )}

          <button type="button" onClick={restart} className="mt-5 text-xs font-bold text-[#aa8491] underline-offset-4 hover:text-[#d94d73] hover:underline">
            Empezar desde cero
          </button>
        </div>
      </section>
    </main>
  );
}
