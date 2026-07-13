import {
  Baby,
  CarFront,
  Coffee,
  Dumbbell,
  ScanLine,
  UsersRound,
} from "lucide-react";

const BENEFITS = [
  {
    icon: UsersRound,
    esTitle: "Acompañamiento de instructores",
    enTitle: "Instructor support",
    esText: "No entrenás solo: nuestro equipo te orienta, corrige y motiva durante el proceso.",
    enText: "You are not on your own: our team guides, corrects and motivates you throughout the process.",
  },
  {
    icon: ScanLine,
    esTitle: "Medición corporal sin costo",
    enTitle: "Free body assessment",
    esText: "Conocé tus avances reales y ajustá tu plan con una medición de seguimiento mes a mes.",
    enText: "Understand your progress and adjust your plan with a monthly follow-up assessment.",
  },
  {
    icon: CarFront,
    esTitle: "Parqueo para clientes",
    enTitle: "Member parking",
    esText: "Llegá, estacioná y empezá a entrenar con mayor comodidad.",
    enText: "Arrive, park and start training with greater convenience.",
  },
  {
    icon: Dumbbell,
    esTitle: "Variedad de máquinas",
    enTitle: "Wide equipment variety",
    esText: "Espacios y equipos para entrenar fuerza, funcional, cardio y tren inferior de forma completa.",
    enText: "Equipment for complete strength, functional, cardio and lower-body training.",
  },
  {
    icon: Coffee,
    esTitle: "Área para merendar",
    enTitle: "Snack area",
    esText: "Un espacio para calentar tu merienda, sentarte y disfrutar tus snacks con calma.",
    enText: "A space to heat your meal, sit down and enjoy your snacks comfortably.",
  },
  {
    icon: Baby,
    esTitle: "Área infantil",
    enTitle: "Kids area",
    esText: "Un espacio pensado para tus hijos mientras permanecen bajo la supervisión de su persona responsable.",
    enText: "A space designed for children while they remain supervised by their responsible adult.",
  },
] as const;

export default function GymBenefitsGrid({ locale = "es" }: { locale?: "es" | "en" }) {
  const english = locale === "en";

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {BENEFITS.map((benefit, index) => {
        const Icon = benefit.icon;
        const title = english ? benefit.enTitle : benefit.esTitle;
        const text = english ? benefit.enText : benefit.esText;
        const words = title.split(" ");
        const pivot = Math.max(1, Math.ceil(words.length / 2));

        return (
          <article
            key={benefit.esTitle}
            className="group relative min-h-[19rem] overflow-hidden border border-white/15 bg-[#0b0b0b] p-6 shadow-[7px_7px_0_rgba(246,196,0,.12)] transition hover:-translate-y-1 hover:border-[#f6c400]/60 hover:shadow-[9px_9px_0_rgba(246,196,0,.22)]"
          >
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:54px_100%]" />
            <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rotate-45 border-[24px] border-[#f6c400]/10" />

            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center bg-[#f6c400] text-black">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-5xl font-black leading-none text-white/[0.08]">0{index + 1}</span>
              </div>

              <h3 className="mt-7 text-[1.75rem] font-black uppercase leading-[.92] tracking-[-.04em] sm:text-3xl">
                <span className="block text-white">{words.slice(0, pivot).join(" ")}</span>
                <span className="block text-[#f6c400]">{words.slice(pivot).join(" ")}</span>
              </h3>

              <p className="mt-auto rounded-2xl border border-white/50 bg-black/55 px-4 py-3 text-sm font-bold leading-5 text-white/75">
                {text}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
