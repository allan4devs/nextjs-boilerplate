"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Compass,
  Dumbbell,
  HeartPulse,
  RotateCcw,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { checkoutHref, freeDayHref } from "../lib/cta";
import { getAnonymousId } from "../lib/analytics/session-client";
import { BUSINESS } from "@/lib/constants/business";
import { XTREME_CHECKOUT_OPTIONS } from "@/lib/constants/checkout";

type GoalId = "habit" | "strength" | "condition" | "mobility";
type ModeId = "independent" | "guided" | "group" | "senior";
type StartId =
  | "week"
  | "fortnight"
  | "month"
  | "morning"
  | "afternoon"
  | "coordinate"
  | "senior-9"
  | "senior-10"
  | "senior-coordinate";

type Choice<T extends string> = {
  id: T;
  label: string;
  detail: string;
  icon: LucideIcon;
};

type Recommendation = {
  id: string;
  title: string;
  price: string;
  description: string;
  href: string;
  cta: string;
  plan?: string;
  supportNote?: string;
  whatsappHref?: string;
};

const GROUP_PRICE_LABEL = "CRC 45.000";

const GOALS: Choice<GoalId>[] = [
  {
    id: "habit",
    label: "Agarrar constancia",
    detail: "Crear una rutina que sí pueda sostener.",
    icon: CalendarDays,
  },
  {
    id: "strength",
    label: "Ganar fuerza",
    detail: "Pesas, máquinas y progresión.",
    icon: Dumbbell,
  },
  {
    id: "condition",
    label: "Mejorar condición",
    detail: "Más resistencia, cardio y energía.",
    icon: Zap,
  },
  {
    id: "mobility",
    label: "Moverme mejor",
    detail: "Bienestar, movilidad y confianza.",
    icon: HeartPulse,
  },
];

const MODES: Choice<ModeId>[] = [
  {
    id: "independent",
    label: "A mi ritmo",
    detail: "Orientación cuando la necesités.",
    icon: Compass,
  },
  {
    id: "guided",
    label: "Con más guía",
    detail: "Quiero apoyo con equipo y técnica.",
    icon: Target,
  },
  {
    id: "group",
    label: "Grupo reducido",
    detail: "Coach a cargo · hasta 6 personas.",
    icon: Users,
  },
  {
    id: "senior",
    label: "Adulto mayor",
    detail: "Movilidad y fuerza segura en clase.",
    icon: HeartPulse,
  },
];

const REGULAR_STARTS: Choice<StartId>[] = [
  {
    id: "week",
    label: `7 días · ${checkoutOption("week")?.priceLabel ?? "ver precio"}`,
    detail: "Quiero probar mi ritmo.",
    icon: Clock3,
  },
  {
    id: "fortnight",
    label: `15 días · ${checkoutOption("fortnight")?.priceLabel ?? "ver precio"}`,
    detail: "Quiero tomar constancia.",
    icon: CalendarDays,
  },
  {
    id: "month",
    label: `30 días · ${checkoutOption("month")?.priceLabel ?? "ver precio"}`,
    detail: "Quiero el mejor precio por día.",
    icon: Sparkles,
  },
];

const GROUP_STARTS: Choice<StartId>[] = [
  { id: "morning", label: "En la mañana", detail: "Lunes, miércoles y viernes.", icon: Clock3 },
  { id: "afternoon", label: "En la tarde", detail: "Lunes, miércoles y viernes.", icon: Clock3 },
  { id: "coordinate", label: "Necesito coordinar", detail: "Quiero revisar cupos y horario.", icon: Users },
];

const SENIOR_STARTS: Choice<StartId>[] = [
  { id: "senior-9", label: "9:00 – 10:00 AM", detail: "Primer bloque del día.", icon: Clock3 },
  { id: "senior-10", label: "10:00 – 11:00 AM", detail: "Segundo bloque del día.", icon: Clock3 },
  {
    id: "senior-coordinate",
    label: "Necesito consultar",
    detail: "Quiero confirmar el bloque disponible.",
    icon: Users,
  },
];

const GOAL_NOTES: Record<GoalId, string> = {
  habit: "Elegiste construir una rutina sostenible, así que el plazo importa más que empezar demasiado fuerte.",
  strength: "Podés combinar peso libre y máquinas en las zonas regulares para trabajar fuerza de forma progresiva.",
  condition: "Podés combinar cardio y entrenamiento funcional para mejorar resistencia y energía a tu ritmo.",
  mobility: "Podés empezar de forma progresiva y pedir orientación antes de aumentar cargas o intensidad.",
};

const PLAN_COPY: Record<"week" | "fortnight" | "month", { title: string; description: string }> = {
  week: {
    title: "Plan semanal",
    description: "Una semana para probar horarios, zonas regulares y ritmo antes de elegir un plazo mayor.",
  },
  fortnight: {
    title: "Plan quincenal",
    description: "Quince días para tomar ritmo y empezar a darle seguimiento a tu progreso.",
  },
  month: {
    title: "Plan mensual",
    description: "La opción con mejor precio por día para convertir tu objetivo en constancia.",
  },
};

function optionById<T extends string>(choices: Choice<T>[], id: T | null) {
  return choices.find((choice) => choice.id === id);
}

function checkoutOption(id: string) {
  return XTREME_CHECKOUT_OPTIONS.find((option) => option.id === id);
}

function whatsappHref(message: string) {
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
}

function trackRecommendation(
  type: "recommendation_shown" | "recommendation_acted",
  properties: Record<string, string | null>,
) {
  try {
    void fetch("/api/xtreme/events/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        type,
        source: "site",
        anonymousId: getAnonymousId(),
        properties,
      }),
    }).catch(() => {});
  } catch {
    // El diagnóstico nunca depende de la medición.
  }
}

function buildRecommendation(goal: GoalId, mode: ModeId, start: StartId): Recommendation {
  const goalLabel = optionById(GOALS, goal)?.label ?? "mi objetivo";

  if (mode === "group") {
    const slotLabel = optionById(GROUP_STARTS, start)?.label ?? "un horario por coordinar";
    return {
      id: "group",
      title: "Entrenamiento semipersonalizado",
      price: `${GROUP_PRICE_LABEL} al mes`,
      description:
        "Tres días por semana, coach a cargo, grupo de hasta 6 personas y acceso sin límite a las zonas regulares.",
      supportNote: `Preferencia: ${slotLabel}. El área VIP se contrata por aparte.`,
      href: checkoutHref(),
      cta: "Ver precio y cómo reservar",
      whatsappHref: whatsappHref(
        `Hola Xtreme Gym, quiero consultar cupo para el entrenamiento semipersonalizado de ${GROUP_PRICE_LABEL}. Mi objetivo es ${goalLabel.toLowerCase()} y prefiero ${slotLabel.toLowerCase()}.`,
      ),
    };
  }

  if (mode === "senior") {
    const slotLabel = optionById(SENIOR_STARTS, start)?.label ?? "un bloque por confirmar";
    const senior = checkoutOption("senior");
    return {
      id: "senior",
      title: "Clases para adultos mayores",
      price: senior?.priceLabel ?? "CRC 16.000",
      description: "Tres clases por semana para movilidad, fuerza segura, equilibrio y confianza.",
      supportNote: `Bloque preferido: ${slotLabel}. La disponibilidad se confirma con recepción.`,
      href: checkoutHref("senior"),
      cta: `Elegir adultos mayores · ${senior?.priceLabel ?? "CRC 16.000"}`,
      plan: "senior",
    };
  }

  const planId = start as "week" | "fortnight" | "month";
  const plan = checkoutOption(planId);
  const copy = PLAN_COPY[planId];
  const supportNote =
    mode === "guided"
      ? "Los instructores pueden orientarte con equipo y técnica; no es un coach exclusivo."
      : "Entrenás a tu ritmo con orientación disponible cuando la ocupés.";

  return {
    id: planId,
    title: copy.title,
    price: plan?.priceLabel ?? "",
    description: copy.description,
    supportNote,
    href: checkoutHref(planId),
    cta: `Elegir ${copy.title.toLowerCase()} · ${plan?.priceLabel ?? "ver precio"}`,
    plan: planId,
  };
}

function ChoiceGrid<T extends string>({
  name,
  choices,
  selected,
  onChoose,
}: {
  name: string;
  choices: Choice<T>[];
  selected: T | null;
  onChoose: (id: T) => void;
}) {
  return (
    <div
      className={`mt-4 grid gap-2 ${
        choices.length === 3 ? "sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3" : "grid-cols-2"
      }`}
    >
      {choices.map(({ id, label, detail, icon: Icon }) => (
        <label key={id} className="group relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={id}
            checked={selected === id}
            onChange={() => onChoose(id)}
            className="peer sr-only"
          />
          <span className="flex min-h-[3.6rem] items-start gap-2.5 rounded-xl border border-white/15 bg-white/[.045] p-2.5 text-left transition group-hover:border-[#f6c400]/60 group-hover:bg-white/[.08] peer-checked:border-[#f6c400] peer-checked:bg-[#f6c400]/10 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#f6c400]">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/8 text-[#f6c400] transition group-hover:bg-[#f6c400] group-hover:text-black">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-black uppercase leading-4 tracking-[.06em] text-white">
                {label}
              </span>
              <span className="mt-1 hidden text-[10px] font-semibold leading-4 text-white/45 sm:block">{detail}</span>
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

export default function HeroGoalFinder({ intro }: { intro: string }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [mode, setMode] = useState<ModeId | null>(null);
  const [start, setStart] = useState<StartId | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const thirdChoices = mode === "group" ? GROUP_STARTS : mode === "senior" ? SENIOR_STARTS : REGULAR_STARTS;
  const recommendation = useMemo(
    () => (goal && mode && start ? buildRecommendation(goal, mode, start) : null),
    [goal, mode, start],
  );

  const goalChoice = optionById(GOALS, goal);
  const modeChoice = optionById(MODES, mode);
  const startChoice = optionById(thirdChoices, start);

  useEffect(() => {
    if (step > 0) contentRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (!recommendation || !goal || !mode || !start) return;
    trackRecommendation("recommendation_shown", {
      surface: "home-hero-finder",
      goal,
      mode,
      start,
      recommendation: recommendation.id,
      destination: recommendation.href,
    });
  }, [goal, mode, recommendation, start]);

  function goBack() {
    if (step === 3) {
      setStart(null);
      setStep(2);
      return;
    }
    if (step === 2) {
      setMode(null);
      setStart(null);
      setStep(1);
      return;
    }
    if (step === 1) {
      setGoal(null);
      setMode(null);
      setStart(null);
      setStep(0);
    }
  }

  function reset() {
    setGoal(null);
    setMode(null);
    setStart(null);
    setStep(0);
  }

  function actOnRecommendation() {
    if (!recommendation || !goal || !mode || !start) return;
    trackRecommendation("recommendation_acted", {
      surface: "home-hero-finder",
      goal,
      mode,
      start,
      recommendation: recommendation.id,
      destination: recommendation.href,
    });
  }

  return (
    <div className="grid min-w-0 lg:col-span-2 md:grid-cols-[minmax(0,.72fr)_minmax(23rem,1.28fr)]">
      <div className="flex min-w-0 flex-col justify-between border-b border-white/10 p-5 sm:p-6 md:border-b-0 md:border-r">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#f6c400]">
            Encontrá tu punto de partida
          </p>
          <p className="mt-3 text-sm font-medium leading-6 text-white/72 sm:hidden">
            Contanos qué buscás y te mostramos un buen punto de partida.
          </p>
          <p className="mt-3 hidden max-w-lg text-sm font-medium leading-6 text-white/72 sm:block">{intro}</p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[.14em] text-white/38 sm:mt-3">
            3 preguntas · 20 segundos · sin dejar tus datos
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-[9px] font-black uppercase tracking-[.08em] sm:mt-5 sm:gap-x-4 sm:text-[10px] sm:tracking-[.1em]">
          <Link href={freeDayHref()} className="text-[#f6c400] underline decoration-[#f6c400]/35 underline-offset-4 transition hover:text-white">
            Primer día gratis
          </Link>
          <Link href={checkoutHref()} className="text-white/48 underline decoration-white/20 underline-offset-4 transition hover:text-white">
            Ver precios directo
          </Link>
        </div>
      </div>

      <div className="min-w-0 p-4">
        <div className="flex items-center gap-4">
          <ol className="flex flex-1 items-center gap-2" aria-label={step === 3 ? "Diagnóstico completo" : `Paso ${step + 1} de 3`}>
            {[0, 1, 2].map((index) => (
              <li
                key={index}
                aria-current={index === step ? "step" : undefined}
                className={`h-1 flex-1 rounded-full transition-colors ${index <= step ? "bg-[#f6c400]" : "bg-white/15"}`}
              >
                <span className="sr-only">Pregunta {index + 1}</span>
              </li>
            ))}
          </ol>
          <span className="shrink-0 text-[9px] font-black uppercase tracking-[.16em] text-white/42">
            {step === 3 ? "Listo" : `0${step + 1} / 03`}
          </span>
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-9 items-center gap-1 text-[9px] font-black uppercase tracking-[.12em] text-white/48 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c400]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Atrás
            </button>
          ) : null}
        </div>

        <p className="sr-only" aria-live="polite">
          {step === 0
            ? "Pregunta uno: qué querés conseguir primero"
            : step === 1
              ? "Pregunta dos: cómo y con quién querés entrenar"
              : step === 2
                ? "Pregunta tres: elegí tu forma de empezar"
                : `Recomendación: ${recommendation?.title ?? "lista"}`}
        </p>

        <div ref={contentRef} tabIndex={-1} className="min-h-[11.5rem] outline-none">
          {step === 0 ? (
            <fieldset className="mt-4">
              <legend className="text-lg font-black uppercase leading-tight text-white sm:text-xl">
                ¿Qué querés conseguir primero?
              </legend>
              <ChoiceGrid
                name="hero-goal"
                choices={GOALS}
                selected={goal}
                onChoose={(id) => {
                  setGoal(id);
                  setStep(1);
                }}
              />
            </fieldset>
          ) : null}

          {step === 1 ? (
            <fieldset className="mt-4">
              <legend className="text-lg font-black uppercase leading-tight text-white sm:text-xl">
                ¿Cómo y con quién querés entrenar?
              </legend>
              <ChoiceGrid
                name="hero-mode"
                choices={MODES}
                selected={mode}
                onChoose={(id) => {
                  setMode(id);
                  setStart(null);
                  setStep(2);
                }}
              />
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="mt-4">
              <legend className="text-lg font-black uppercase leading-tight text-white sm:text-xl">
                {mode === "group"
                  ? "¿Qué turno te funciona mejor?"
                  : mode === "senior"
                    ? "¿Qué bloque te sirve más?"
                    : "¿Con cuánto tiempo querés empezar?"}
              </legend>
              <p className="mt-1 text-[10px] font-semibold leading-4 text-white/42">
                {mode === "group"
                  ? "El cupo se coordina con recepción."
                  : mode === "senior"
                    ? "Son tres clases por semana."
                    : "Los planes cubren las zonas regulares; el área VIP va por aparte."}
              </p>
              <ChoiceGrid
                name="hero-start"
                choices={thirdChoices}
                selected={start}
                onChoose={(id) => {
                  setStart(id);
                  setStep(3);
                }}
              />
            </fieldset>
          ) : null}

          {step === 3 && recommendation && goal ? (
            <div className="mt-4" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-[#f6c400]">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Esto te calza mejor
                  </p>
                  <h2 className="mt-2 text-xl font-black uppercase leading-none text-white sm:text-2xl">
                    {recommendation.title}
                  </h2>
                </div>
                <p className="shrink-0 text-sm font-black text-[#f6c400]">{recommendation.price}</p>
              </div>

              <p className="mt-3 text-xs font-semibold leading-5 text-white/65">{recommendation.description}</p>
              <p className="mt-1 text-[10px] font-medium leading-4 text-white/42">{GOAL_NOTES[goal]}</p>
              {recommendation.supportNote ? (
                <p className="mt-1 text-[10px] font-medium leading-4 text-white/42">{recommendation.supportNote}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tus respuestas">
                {[goalChoice?.label, modeChoice?.label, startChoice?.label].filter(Boolean).map((label) => (
                  <span key={label} className="rounded-full border border-white/12 bg-white/[.04] px-2 py-1 text-[8px] font-black uppercase tracking-[.08em] text-white/48">
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href={recommendation.href}
                  onClick={actOnRecommendation}
                  data-analytics={`hero recomendación ${recommendation.id}`}
                  className="cinema-cta inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f6c400] px-4 text-[10px] font-black uppercase tracking-[.07em] text-black"
                >
                  {recommendation.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                {recommendation.whatsappHref ? (
                  <a
                    href={recommendation.whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center px-3 text-[9px] font-black uppercase tracking-[.08em] text-white/55 transition hover:text-white"
                  >
                    Consultar turno
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[9px] font-black uppercase tracking-[.1em] text-white/42 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c400]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Cambiar respuestas
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
