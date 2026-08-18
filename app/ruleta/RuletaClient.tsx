"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Heart, MapPin, RotateCcw, Shuffle, Sparkles, Utensils, X } from "lucide-react";
import { CATALOG_TOTALS, FOOD_CATEGORIES } from "./foodData";
import styles from "./ruleta.module.css";

const WHEEL_COLORS = ["#ff6b6b", "#ffd166", "#60d394", "#56a8e8", "#9b78f6", "#f27aa4"];
const WHEEL_DURATION = 3200;

type Step = 0 | 1 | 2 | 3;

type Choice = {
  label: string;
  subtitle: string;
  emoji: string;
  color: string;
};

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
};

const STEP_COPY = [
  {
    kicker: "Empecemos por lo importante",
    title: "¿Qué se te antoja?",
    subtitle: "Elegí el tipo de comida que les provoca hoy.",
  },
  {
    kicker: "Ya tenemos el antojo",
    title: "¿De cuál restaurante?",
    subtitle: "Todos quedan en San Carlos. Tocá el que más les llame.",
  },
  {
    kicker: "Una última decisión",
    title: "¿Qué van a pedir?",
    subtitle: "Elegí el plato y queda resuelta la comida de hoy.",
  },
] as const;

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

  return `M 200 200 L ${start.x} ${start.y} A 190 190 0 0 1 ${end.x} ${end.y} Z`;
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
    delay: Math.random() * 0.55,
    duration: 2.2 + Math.random() * 1.4,
    color: colors[id % colors.length],
  }));
}

function shorten(label: string, limit = 19) {
  return label.length <= limit ? label : `${label.slice(0, limit - 1)}…`;
}

export default function RuletaClient({ onExit }: { onExit?: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [categoryIndex, setCategoryIndex] = useState<number | null>(null);
  const [restaurantIndex, setRestaurantIndex] = useState<number | null>(null);
  const [dishIndex, setDishIndex] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelDuration, setWheelDuration] = useState(WHEEL_DURATION);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState<number | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const category = categoryIndex === null ? null : FOOD_CATEGORIES[categoryIndex];
  const restaurant = category && restaurantIndex !== null ? category.restaurants[restaurantIndex] : null;
  const dish = restaurant && dishIndex !== null ? restaurant.dishes[dishIndex] : null;

  const choices = useMemo<Choice[]>(() => {
    if (step === 0) {
      return FOOD_CATEGORIES.map((item) => ({
        label: item.label,
        subtitle: `${item.restaurants.length} restaurantes`,
        emoji: item.emoji,
        color: item.color,
      }));
    }

    if (step === 1 && category) {
      return category.restaurants.map((item, index) => ({
        label: item.name,
        subtitle: item.location,
        emoji: category.emoji,
        color: WHEEL_COLORS[index % WHEEL_COLORS.length],
      }));
    }

    if (step === 2 && category && restaurant) {
      return restaurant.dishes.map((item, index) => ({
        label: item.name,
        subtitle: restaurant.name,
        emoji: category.emoji,
        color: WHEEL_COLORS[(index + 1) % WHEEL_COLORS.length],
      }));
    }

    return [];
  }, [category, restaurant, step]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!wheelOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !wheelSpinning) setWheelOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [wheelOpen, wheelSpinning]);

  function choose(index: number) {
    if (transitioning || step === 3) return;

    setTransitioning(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 210;

    transitionTimerRef.current = setTimeout(() => {
      if (step === 0) {
        setCategoryIndex(index);
        setRestaurantIndex(null);
        setDishIndex(null);
      } else if (step === 1) {
        setRestaurantIndex(index);
        setDishIndex(null);
      } else {
        setDishIndex(index);
        setConfetti(makeConfetti());
      }

      setStep((step + 1) as Step);
      setTransitioning(false);
    }, delay);
  }

  function goBack() {
    if (transitioning || wheelSpinning || step === 0) return;

    setConfetti([]);
    if (step === 1) {
      setCategoryIndex(null);
      setRestaurantIndex(null);
      setDishIndex(null);
      setStep(0);
    } else if (step === 2) {
      setRestaurantIndex(null);
      setDishIndex(null);
      setStep(1);
    } else {
      setDishIndex(null);
      setStep(2);
    }
  }

  function restart() {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    setStep(0);
    setCategoryIndex(null);
    setRestaurantIndex(null);
    setDishIndex(null);
    setTransitioning(false);
    setWheelOpen(false);
    setWheelSpinning(false);
    setWheelWinner(null);
    setWheelRotation(0);
    setConfetti([]);
  }

  function openWheel() {
    if (choices.length < 2) return;
    setWheelOpen(true);
    setWheelWinner(null);
    setWheelRotation(0);
  }

  function closeWheel() {
    if (!wheelSpinning) setWheelOpen(false);
  }

  function spinWheel() {
    if (wheelSpinning || choices.length < 2) return;

    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : WHEEL_DURATION;
    const selectedIndex = secureRandomIndex(choices.length);
    const segmentAngle = 360 / choices.length;
    const currentPosition = ((wheelRotation % 360) + 360) % 360;
    const targetPosition = (360 - selectedIndex * segmentAngle) % 360;
    const alignment = (targetPosition - currentPosition + 360) % 360;

    setWheelWinner(null);
    setWheelDuration(duration);
    setWheelSpinning(true);
    setWheelRotation(wheelRotation + 6 * 360 + alignment);

    wheelTimerRef.current = setTimeout(() => {
      setWheelWinner(selectedIndex);
      setWheelSpinning(false);
    }, duration);
  }

  function acceptWheelResult() {
    if (wheelWinner === null) return;
    const selectedIndex = wheelWinner;
    setWheelOpen(false);
    setWheelWinner(null);
    choose(selectedIndex);
  }

  const activeStep = step < 3 ? (step as 0 | 1 | 2) : null;
  const activeCopy = activeStep === null ? null : STEP_COPY[activeStep];
  const completedLabels = [category?.label, restaurant?.name, dish?.name];
  const finalChoice = step === 3 && category && restaurant && dish;

  return (
    <main className="relative isolate min-h-[100dvh] w-full flex-1 overflow-x-hidden bg-[#fff8f3] text-[#38252d]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-[#ffb3c6]/35 blur-3xl" />
        <div className="absolute -bottom-36 -right-28 h-[34rem] w-[34rem] rounded-full bg-[#ffd6a5]/50 blur-3xl" />
        <div className="absolute left-[8%] top-[22%] text-4xl text-[#f4a261]/30">✦</div>
        <div className="absolute right-[8%] top-[12%] text-5xl text-[#ff8fab]/30">♡</div>
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
              }}
            />
          ))}
        </div>
      )}

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <button type="button" onClick={restart} className="group flex items-center gap-3 text-left" aria-label="Volver al inicio">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#3d2630] text-xl text-white shadow-[0_5px_0_#24151b] transition group-hover:-translate-y-0.5">♥</span>
          <span>
            <strong className="block text-sm font-black tracking-tight text-[#3d2630]">¿Qué comemos?</strong>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#b0798b]">Edición San Carlos</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-[#7c4358]/10 bg-white/70 px-4 py-2 text-xs font-bold text-[#896b76] shadow-sm backdrop-blur sm:flex">
            <MapPin className="h-3.5 w-3.5 text-[#ed4c78]" aria-hidden="true" />
            {CATALOG_TOTALS.restaurants} lugares · {CATALOG_TOTALS.dishes} platos
          </div>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#7c4358]/10 bg-white/70 px-4 text-xs font-black text-[#d94d73] shadow-sm backdrop-blur transition hover:bg-white"
            >
              Armar mi platillo
            </button>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 pb-10 pt-3 sm:px-6 lg:px-8 lg:pb-14">
        <div className="mb-8 flex items-center gap-3 sm:mb-10">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#7c4358]/10 bg-white/65 px-4 text-sm font-black text-[#765c66] shadow-sm transition hover:bg-white disabled:pointer-events-none disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Atrás
          </button>

          <div className="flex flex-1 items-center gap-2" aria-label={step < 3 ? `Paso ${step + 1} de 3` : "Selección completa"}>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${index <= step ? "bg-[#ed4c78]" : "bg-[#decbd1]"}`}
              />
            ))}
          </div>

          <span className="min-w-16 text-right text-xs font-black uppercase tracking-[0.16em] text-[#a47c89]">
            {step < 3 ? `0${step + 1} / 03` : "Listo"}
          </span>
        </div>

        {completedLabels.some(Boolean) && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {completedLabels.map((label, index) =>
              label ? (
                <span key={`${index}-${label}`} className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/70 px-3 py-1.5 text-xs font-bold text-[#765c66] shadow-sm">
                  {index === 0 ? category?.emoji : index === 1 ? <MapPin className="h-3 w-3" aria-hidden="true" /> : <Utensils className="h-3 w-3" aria-hidden="true" />}
                  {label}
                </span>
              ) : null,
            )}
          </div>
        )}

        {activeCopy ? (
          <div className={`${styles.stage} ${transitioning ? styles.stageOut : styles.stageIn}`}>
            <div className="mb-7 max-w-4xl sm:mb-9">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[#d94d73]">{activeCopy.kicker}</p>
              <h1 className="text-balance text-4xl font-black leading-[0.94] tracking-[-0.055em] text-[#3d2630] sm:text-6xl lg:text-7xl">
                {activeCopy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[#846b75] sm:text-lg">{activeCopy.subtitle}</p>
            </div>

            <div className={`grid gap-4 ${choices.length === 2 ? "lg:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              {choices.map((choice, index) => (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => choose(index)}
                  disabled={transitioning}
                  className={`${styles.choiceButton} group relative isolate min-h-48 overflow-hidden rounded-[2rem] border-2 border-white/70 p-6 text-left shadow-[0_18px_45px_rgba(75,35,50,0.12)] transition focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#ed4c78] sm:min-h-60 sm:p-8`}
                  style={{
                    "--choice-color": choice.color,
                    animationDelay: `${index * 70}ms`,
                  } as CSSProperties}
                >
                  <span className="absolute right-6 top-5 font-mono text-xs font-black tracking-[0.18em] text-[#3d2630]/45">0{index + 1}</span>
                  <span className="mb-8 block text-6xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:text-7xl" aria-hidden="true">
                    {choice.emoji}
                  </span>
                  <span className="relative z-10 block max-w-[85%] text-2xl font-black leading-[0.96] tracking-[-0.04em] text-[#352028] sm:text-3xl lg:text-4xl">
                    {choice.label}
                  </span>
                  <span className="relative z-10 mt-3 flex items-center gap-1.5 text-sm font-bold text-[#3d2630]/60">
                    {step === 1 && <MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
                    {choice.subtitle}
                  </span>
                  <span className="absolute bottom-6 right-6 grid h-12 w-12 place-items-center rounded-full bg-[#3d2630] text-white shadow-[0_5px_0_rgba(36,21,27,0.45)] transition duration-300 group-hover:translate-x-1 group-hover:bg-[#ed4c78] sm:h-14 sm:w-14">
                    <ChevronRight className="h-6 w-6" aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-7 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] border border-dashed border-[#cfaeba] bg-white/45 px-5 py-4 sm:flex-row">
              <div className="text-center sm:text-left">
                <p className="text-sm font-black text-[#4d303b]">¿Se quedaron pegados?</p>
                <p className="text-xs font-medium text-[#967580]">La ruleta puede escoger una opción de este nivel.</p>
              </div>
              <button
                type="button"
                onClick={openWheel}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#d94d73] shadow-[0_5px_18px_rgba(75,35,50,0.1)] ring-1 ring-[#ed4c78]/15 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" /> Jugar la ruleta
              </button>
            </div>
          </div>
        ) : finalChoice ? (
          <div className={`${styles.stage} ${styles.stageIn} mx-auto w-full max-w-5xl`}>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#3d2630] px-6 py-10 text-center text-white shadow-[0_30px_90px_rgba(61,38,48,0.28)] sm:px-12 sm:py-14 lg:px-16">
              <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden="true">
                <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#ff8fab] blur-3xl" />
                <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-[#ffd166] blur-3xl" />
              </div>

              <div className="relative z-10">
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-[1.75rem] bg-white text-5xl shadow-[0_8px_0_rgba(0,0,0,0.2)] sm:h-24 sm:w-24 sm:text-6xl">
                  {category.emoji}
                </span>
                <p className="mt-8 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#ffb3c6]">
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> La elección de hoy <Sparkles className="h-4 w-4" aria-hidden="true" />
                </p>
                <h1 className="mx-auto mt-3 max-w-4xl text-balance text-4xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                  {dish.name}
                </h1>
                <div className="mx-auto mt-7 max-w-2xl rounded-[1.5rem] border border-white/15 bg-white/10 px-5 py-5 backdrop-blur">
                  <p className="text-2xl font-black text-white sm:text-3xl">{restaurant.name}</p>
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-white/65">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> {restaurant.location}
                  </p>
                </div>
                <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/70">Decisión tomada. Ahora sólo falta pedir y disfrutar juntos. 💕</p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex min-h-14 min-w-56 items-center justify-center gap-2 rounded-full bg-[#ff7096] px-7 py-4 font-black text-white shadow-[0_7px_0_#a62f53] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#a62f53]"
                  >
                    <Heart className="h-5 w-5 fill-current" aria-hidden="true" /> Elegir otra comida
                  </button>
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Cambiar sólo el plato
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {wheelOpen && activeCopy && (
        <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#28181f]/75 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeWheel()}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wheel-title"
            className={`${styles.modalIn} relative my-auto w-full max-w-xl rounded-[2rem] border border-white/70 bg-[#fff8f3] p-5 shadow-[0_32px_100px_rgba(0,0,0,0.35)] sm:p-7`}
          >
            <button
              type="button"
              onClick={closeWheel}
              disabled={wheelSpinning}
              className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white text-[#765c66] shadow-sm transition hover:bg-[#ffe8ee] disabled:cursor-wait disabled:opacity-40"
              aria-label="Cerrar ruleta"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="mb-5 pr-12">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d94d73]">Juego complementario</p>
              <h2 id="wheel-title" className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#3d2630]">Que decida la ruleta</h2>
              <p className="mt-1 text-sm font-medium text-[#896b76]">Está eligiendo entre las {choices.length} opciones visibles.</p>
            </div>

            <div className="relative mx-auto w-full max-w-[22rem] px-3">
              <div className="absolute left-1/2 top-[-4px] z-20 -translate-x-1/2 drop-shadow-[0_5px_4px_rgba(73,36,48,0.22)]" aria-hidden="true">
                <div className={styles.pointer} />
              </div>
              <div className="aspect-square rounded-full bg-white p-2.5 shadow-[0_18px_50px_rgba(115,55,76,0.22)]">
                <div
                  className="h-full w-full will-change-transform"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: wheelSpinning ? `transform ${wheelDuration}ms cubic-bezier(0.12,0.78,0.14,1)` : "none",
                  }}
                >
                  <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Ruleta de las opciones visibles">
                    <circle cx="200" cy="200" r="194" fill="#4b2f3a" />
                    {choices.map((choice, index) => {
                      const centerAngle = -90 + index * (360 / choices.length);
                      const labelPoint = polarPoint(centerAngle, 124);

                      return (
                        <g key={choice.label}>
                          <path d={segmentPath(index, choices.length)} fill={choice.color} stroke="#fff8f3" strokeWidth="4" />
                          <g transform={`translate(${labelPoint.x} ${labelPoint.y}) rotate(${centerAngle + 90})`}>
                            <text y="-11" textAnchor="middle" fontSize="29" aria-hidden="true">{choice.emoji}</text>
                            <text y="20" textAnchor="middle" fill="#332229" fontSize="13" fontWeight="850">
                              {shorten(choice.label).toUpperCase()}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                    <circle cx="200" cy="200" r="43" fill="#fff8f3" stroke="#4b2f3a" strokeWidth="7" />
                    <text x="200" y="211" textAnchor="middle" fontSize="31" aria-hidden="true">♥</text>
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-5 min-h-24 text-center" aria-live="polite">
              {wheelWinner !== null ? (
                <div className={styles.result}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d94d73]">La ruleta eligió</p>
                  <p className="mt-1 text-2xl font-black text-[#3d2630]">{choices[wheelWinner].emoji} {choices[wheelWinner].label}</p>
                </div>
              ) : (
                <p className="pt-4 text-sm font-semibold text-[#896b76]">{wheelSpinning ? "Buscando una señal del destino…" : "Un giro y se acaba la indecisión."}</p>
              )}
            </div>

            {wheelWinner === null ? (
              <button
                type="button"
                onClick={spinWheel}
                disabled={wheelSpinning}
                className="mx-auto flex min-h-14 min-w-56 items-center justify-center gap-2 rounded-full bg-[#3d2630] px-7 py-4 font-black text-white shadow-[0_7px_0_#24151b] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#24151b] disabled:cursor-wait disabled:opacity-70"
              >
                <RotateCcw className={`h-5 w-5 ${wheelSpinning ? "animate-spin" : ""}`} aria-hidden="true" />
                {wheelSpinning ? "Girando…" : "Girar ruleta"}
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={acceptWheelResult}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#ed4c78] px-7 py-4 font-black text-white shadow-[0_7px_0_#b72d54] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#b72d54]"
                >
                  Usar esta opción <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
                <button type="button" onClick={spinWheel} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-black text-[#765c66] hover:bg-white">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Repetir
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
