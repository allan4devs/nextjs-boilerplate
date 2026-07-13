import type { Metadata } from "next";
import Link from "next/link";
import ImageTile from "../components/ImageTile";
import CtaBand from "../components/CtaBand";
import LandingTrack from "../components/LandingTrack";
import {
  BUSINESS,
  HERO_IMAGES,
  QUICK_INFO,
  SOCIAL_PROOF,
  TRANSFORM_STEPS,
} from "../lib/site";
import { gymJsonLd, pageMetadata } from "../lib/seo";
import JsonLd from "../components/JsonLd";
import { ArrowRight, MapPin, Smartphone } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Xtreme Gym | Ciudad Quesada",
  description:
    "Xtreme Gym en Ciudad Quesada, San Carlos. Gimnasio completo para construir hábitos, mejorar condición física, ganar energía y entrenar con acompañamiento.",
  path: "/",
  absoluteTitle: true,
});

const EXPLORE = [
  {
    href: "/precios",
    label: "Precios y planes",
    text: "Día, semana, quincena o mes. Inscríbase y pague en línea.",
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=84",
  },
  {
    href: "/zonas",
    label: "Zonas de entrenamiento",
    text: "Fuerza, funcional, cardio y lower lab con equipo completo.",
    image: "https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=900&q=84",
  },
  {
    href: "/adultos-mayores",
    label: "Adultos mayores",
    text: "Tres clases por semana para movilidad, fuerza y confianza.",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=84",
  },
  {
    href: "/app",
    label: "App de socios",
    text: "Reservas, rachas, carné digital y progreso en un solo lugar.",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=84",
  },
  {
    href: "/preguntas",
    label: "Preguntas frecuentes",
    text: "Lo que la gente consulta antes de su primera sesión.",
    image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=900&q=84",
  },
  {
    href: "/contacto",
    label: "Horario y ubicación",
    text: "Barrio San Pablo. Vea horarios, mapa y cómo llegar.",
    image: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=900&q=84",
  },
];

export default function ExtremeGymLandingPage() {
  return (
    <>
      <JsonLd data={gymJsonLd()} />
      <LandingTrack surface="home" />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2400&q=88"
            alt="Interior de gimnasio con máquinas"
            className="h-full w-full object-cover opacity-44"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#070707_0%,rgba(7,7,7,.94)_38%,rgba(7,7,7,.62)_72%,rgba(7,7,7,.34)_100%)]" />
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px]" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#070707] to-transparent" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col px-5 py-4 sm:px-8 lg:py-3">
          <div className="grid flex-1 gap-8 py-5 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:py-6">
            <div className="min-w-0">
              <a
                href="#mapa-footer"
                aria-label="Ir al mapa y la ubicación de Xtreme Gym"
                className="inline-flex items-center gap-2 border border-[#f6c400]/45 bg-black/45 px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#ffe875] backdrop-blur transition hover:border-[#f6c400] hover:bg-[#f6c400]/10"
              >
                <MapPin className="h-4 w-4" />
                {BUSINESS.location}
              </a>
              <h1 className="mt-5 max-w-4xl text-[2.5rem] font-black uppercase leading-[0.88] tracking-tight min-[420px]:text-5xl sm:text-6xl lg:text-[4rem] xl:text-[4.5rem]">
                Entrena fuerte.
                <span className="block text-[#f6c400]">Vive con más energía.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/72">
                Un gimnasio completo en Ciudad Quesada para fuerza, funcional, cardio y hábitos
                reales. Elija su plan, reserve desde la app y empiece con un equipo pensado para avanzar.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/precios#inscripcion"
                  className="inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black shadow-[0_0_40px_-16px_rgba(246,196,0,.95)] transition hover:bg-white"
                >
                  Inscribirme
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/primer-dia"
                  className="inline-flex min-h-12 items-center gap-2 border border-white/20 bg-white/[0.07] px-5 font-black uppercase text-white backdrop-blur transition hover:border-white/45 hover:bg-white/10"
                >
                  Primer día gratis
                  <Smartphone className="h-5 w-5" />
                </Link>
              </div>

            </div>

            <div className="min-w-0">
              <div className="hidden gap-3 lg:grid lg:grid-cols-[1fr_230px]">
                <div className="relative border border-white/12 bg-black/70 p-3 shadow-2xl backdrop-blur">
                  <ImageTile src={HERO_IMAGES[0].src} alt={HERO_IMAGES[0].alt} className="aspect-square" fit="contain" />
                  <div className="absolute left-6 top-6 max-w-[210px] bg-[#f6c400] px-4 py-3 text-black">
                    <p className="text-xs font-black uppercase tracking-[0.18em]">Movimiento Xtreme</p>
                    <p className="text-2xl font-black uppercase leading-none">Fuerza con dirección</p>
                  </div>
                </div>

                <div className="grid content-start gap-3">
                  <ImageTile src={HERO_IMAGES[1].src} alt={HERO_IMAGES[1].alt} className="aspect-[4/3]" />
                  <div className="border border-[#f6c400]/45 bg-[#f6c400] p-4 text-black shadow-[0_0_36px_-18px_rgba(246,196,0,.9)]">
                    <p className="text-xs font-black uppercase tracking-[0.2em]">Empiece con decisión</p>
                    <h2 className="mt-2 text-2xl font-black uppercase leading-none">Su próximo entreno ya tiene lugar</h2>
                    <p className="mt-2 text-xs font-bold leading-5">
                      Cada entrenamiento es una decisión a favor de su salud, energía y calidad de vida.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border border-white/10 bg-black/55 backdrop-blur sm:grid-cols-4 lg:mt-3">
                {SOCIAL_PROOF.map((item) => (
                  <div key={item.label} className="border-r border-white/10 p-2.5 last:border-r-0 sm:p-3">
                    <p className="text-2xl font-black text-[#f6c400]">{item.value}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/48">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#090909] px-5 py-4 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-3">
          {QUICK_INFO.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-[#f6c400]/55 hover:bg-[#f6c400]/10"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{item.label}</p>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <p className="text-lg font-black uppercase text-white">{item.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f6c400]">{item.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#f6c400] px-5 py-4 text-black sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em]">
          <span>Fuerza</span>
          <span>Funcional</span>
          <span>Cardio</span>
          <span>Acompañamiento</span>
          <span>Hábitos reales</span>
          <span>Adultos mayores</span>
          <span>San Carlos</span>
        </div>
      </section>

      <section className="bg-[#0b0b0b] px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Ruta simple</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black uppercase leading-none sm:text-6xl">
                Llegar, entrenar y sostener el hábito.
              </h2>
            </div>
            <div className="w-full max-w-2xl lg:ml-auto">
              <ImageTile
                src={HERO_IMAGES[2].src}
                alt={HERO_IMAGES[2].alt}
                className="h-28 border border-white/10 sm:h-36 lg:h-32"
              />
              <p className="mt-5 text-base font-semibold leading-8 text-white/58">
                Desde la primera consulta hasta el seguimiento en la app, Xtreme Gym le da una
                ruta clara para moverse mejor, ganar fuerza y mantenerse constante.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TRANSFORM_STEPS.map((step, index) => (
              <article
                key={step.title}
                className="group border border-white/10 bg-white/[0.045] p-5 transition hover:border-[#f6c400]/55 hover:bg-[#f6c400]/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center bg-[#f6c400] text-black">
                    <step.icon className="h-6 w-6" />
                  </span>
                  <span className="text-4xl font-black leading-none text-white/[0.08] transition group-hover:text-[#f6c400]/25">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 text-2xl font-black uppercase">{step.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/58">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Explore</p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
                Todo lo que necesita saber.
              </h2>
            </div>
            <p className="max-w-xl text-sm font-semibold leading-7 text-white/55">
              Cada tema tiene su propia página, con la información completa y sin ruido.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {EXPLORE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative overflow-hidden border border-white/10 bg-black transition hover:border-[#f6c400]/55"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.label}
                    className="h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-black uppercase">{item.label}</h3>
                    <ArrowRight className="h-5 w-5 shrink-0 text-[#f6c400] transition group-hover:translate-x-1" />
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/55">{item.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Elegí el plan que mejor te funcione y empezá a entrenar."
      />
    </>
  );
}
