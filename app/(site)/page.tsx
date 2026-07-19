import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  CalendarCheck,
  Dumbbell,
  MapPin,
  ScanLine,
  Smartphone,
  Sparkles,
} from "lucide-react";
import CinematicLandingFX from "../components/CinematicLandingFX";
import CtaBand from "../components/CtaBand";
import JsonLd from "../components/JsonLd";
import LandingTrack from "../components/LandingTrack";
import { BUSINESS, SOCIAL_PROOF } from "../lib/site";
import { gymJsonLd, pageMetadata } from "../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Xtreme Gym | Ciudad Quesada",
  description:
    "Xtreme Gym en Ciudad Quesada, San Carlos. Entrená con máquinas completas, zonas especializadas, acompañamiento y una app para sostener tu progreso.",
  path: "/",
  absoluteTitle: true,
});

const SCENES = [
  {
    number: "01",
    eyebrow: "Un piso que responde",
    title: "Todo para entrenar. Nada para distraerte.",
    text: "Peso libre, fuerza guiada, cardio y zonas funcionales conviven en un espacio amplio. Llegás con un objetivo y encontrás el equipo para trabajarlo.",
    image: "/xtreme/piso-maquinas-panoramica.webp",
    alt: "Piso panorámico de máquinas de Xtreme Gym",
    href: "/zonas",
    cta: "Recorrer las zonas",
    icon: Dumbbell,
    facts: ["5 zonas", "Equipo completo", "Desde las 5 AM"],
  },
  {
    number: "02",
    eyebrow: "Member OS",
    title: "Tu constancia también vive fuera del gym.",
    text: "Reservas, plan, rachas, progreso y carné digital en una experiencia diseñada para decirte qué sigue, sin convertir tu entrenamiento en otra lista de tareas.",
    image: "/xtreme/maquinas-y-entrenador-xtreme.webp",
    alt: "Socio entrenando con acompañamiento en Xtreme Gym",
    href: "/app",
    cta: "Abrir la app",
    icon: Smartphone,
    facts: ["Reservas reales", "Progreso visible", "Acceso privado"],
  },
  {
    number: "03",
    eyebrow: "Dirección humana",
    title: "Tecnología cuando ayuda. Personas cuando importa.",
    text: "El equipo te orienta, la medición corporal pone contexto y la comunidad hace más fácil volver. No necesitás experiencia: necesitás un buen punto de partida.",
    image: "/xtreme/zona-funcional-clases.webp",
    alt: "Entrenamiento guiado en la zona funcional de Xtreme Gym",
    href: "/beneficios",
    cta: "Ver lo que incluye",
    icon: Activity,
    facts: ["Medición incluida", "Guía de instructores", "Comunidad Xtreme"],
  },
] as const;

const PATHS = [
  { number: "01", title: "Probá el gym", text: "Tu primer día es gratis.", href: "/primer-dia", icon: Sparkles },
  { number: "02", title: "Elegí tu plan", text: "Semana, quincena o mes.", href: "/precios", icon: CalendarCheck },
  { number: "03", title: "Conocé las zonas", text: "Encontrá dónde avanzar.", href: "/zonas", icon: Dumbbell },
  { number: "04", title: "Entrá a Member OS", text: "Tu progreso en un lugar.", href: "/app", icon: Smartphone },
] as const;

export default function ExtremeGymLandingPage() {
  return (
    <>
      <JsonLd data={gymJsonLd()} />
      <LandingTrack surface="home" />

      <section
        data-cinema-stage
        className="cinema-home-hero cinema-stage relative isolate overflow-hidden border-b border-white/10 bg-[#050505]"
      >
        <div className="cinema-stage-image absolute inset-[-2%] z-0">
          <Image
            src="/xtreme/piso-pesas-panoramica.webp"
            alt="Piso de pesas de Xtreme Gym en Ciudad Quesada"
            fill
            priority
            quality={82}
            sizes="100vw"
            className="object-cover object-[62%_center]"
          />
        </div>
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(4,4,4,.98)_0%,rgba(4,4,4,.91)_38%,rgba(4,4,4,.52)_70%,rgba(4,4,4,.68)_100%)]" />
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,.2),transparent_30%,rgba(0,0,0,.92)_100%)]" />
        <div className="cinema-vignette absolute inset-0 z-[1]" />
        <CinematicLandingFX />

        <div className="cinema-home-hero-shell relative z-10 mx-auto flex max-w-[1500px] flex-col px-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 py-4 text-[10px] font-black uppercase tracking-[.2em] text-white/45">
            <a href="#mapa-footer" className="inline-flex min-h-11 items-center gap-2 transition hover:text-[#f6c400]">
              <MapPin className="h-3.5 w-3.5 text-[#f6c400]" />
              {BUSINESS.location}
            </a>
            <span className="hidden items-center gap-2 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f6c400]/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f6c400]" />
              </span>
              Sistema Xtreme · activo
            </span>
          </div>

          <div className="grid flex-1 items-end gap-10 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.55fr)] lg:pb-14 lg:pt-16">
            <div data-cinema-reveal className="max-w-5xl">
              <p className="mb-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.28em] text-[#f6c400]">
                <span className="h-px w-12 bg-[#f6c400]" />
                Entrenamiento · Ciudad Quesada
              </p>
              <h1 className="cinema-display max-w-[1050px] text-[clamp(3.35rem,8.8vw,9rem)] font-black uppercase leading-[.78] tracking-[-.07em]">
                No venís a
                <span className="block text-[#f6c400]">pasar el rato.</span>
              </h1>
              <div className="mt-8 grid max-w-4xl gap-6 border-t border-white/15 pt-6 md:grid-cols-[1fr_auto] md:items-end">
                <p className="max-w-2xl text-base font-medium leading-7 text-white/62 sm:text-lg sm:leading-8">
                  Venís a moverte, medir el avance y volver más fuerte. Nosotros ponemos el espacio,
                  el equipo y la dirección para que esa decisión se sostenga.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Link
                    href="/primer-dia"
                    className="cinema-cta inline-flex min-h-13 items-center gap-3 bg-[#f6c400] px-5 text-xs font-black uppercase tracking-[.08em] text-black"
                  >
                    Empezá gratis <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/precios#inscripcion"
                    className="inline-flex min-h-13 items-center gap-3 border border-white/25 bg-black/25 px-5 text-xs font-black uppercase tracking-[.08em] text-white backdrop-blur-md transition hover:border-white/60 hover:bg-white/10"
                  >
                    Ver planes
                  </Link>
                </div>
              </div>
            </div>

            <aside
              data-cinema-reveal
              className="cinema-live-card relative hidden self-end overflow-hidden border border-white/15 bg-black/35 p-2 backdrop-blur-md lg:block"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src="/xtreme/maquinas-xtreme-amarillas.webp"
                  alt="Máquinas amarillas de Xtreme Gym"
                  fill
                  sizes="360px"
                  className="object-cover opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-[9px] font-black uppercase tracking-[.18em]">
                  <span className="inline-flex items-center gap-2"><ScanLine className="h-4 w-4 text-[#f6c400]" /> Piso principal</span>
                  <span className="text-[#f6c400]">Live</span>
                </div>
                <div className="absolute inset-x-4 bottom-4">
                  <p className="text-3xl font-black uppercase leading-none">El trabajo se nota.</p>
                  <div className="mt-4 h-px bg-white/20"><div className="h-px w-2/3 bg-[#f6c400]" /></div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[.15em] text-white/55">Fuerza · cardio · funcional</p>
                </div>
              </div>
            </aside>
          </div>

          <div className="grid border-t border-white/12 bg-black/20 backdrop-blur-sm sm:grid-cols-[auto_1fr]">
            <a href="#experiencia" className="hidden min-h-20 items-center gap-3 border-r border-white/10 px-5 text-[9px] font-black uppercase tracking-[.2em] text-white/45 transition hover:text-white sm:flex">
              Descubrí más <ArrowDown className="h-4 w-4 text-[#f6c400]" />
            </a>
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {SOCIAL_PROOF.map((item) => (
                <div key={item.label} className="border-r border-white/10 px-3 py-3 last:border-r-0 sm:px-5">
                  <p className="text-xl font-black text-white sm:text-2xl">{item.value}</p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-[.13em] text-white/35 sm:text-[9px]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="experiencia" className="relative overflow-hidden border-b border-white/10 bg-[#080808] px-5 py-24 sm:px-8 lg:py-36">
        <div className="cinema-orbit absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f6c400]/10" aria-hidden />
        <div data-cinema-reveal className="relative mx-auto max-w-6xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#f6c400]">La idea es simple</p>
          <h2 className="cinema-display mx-auto mt-6 max-w-5xl text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[.84] tracking-[-.06em]">
            Un buen gym no te grita.
            <span className="block text-white/28">Te da razones para volver.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base font-medium leading-8 text-white/48 sm:text-lg">
            Menos fricción. Más claridad. Un lugar que acompaña la decisión que ya tomaste.
          </p>
        </div>
      </section>

      <div className="bg-[#050505]">
        {SCENES.map((scene, index) => {
          const Icon = scene.icon;
          return (
            <section key={scene.number} className="cinema-scene border-b border-white/10 px-5 py-20 sm:px-8 lg:min-h-[82vh] lg:py-28">
              <div className={`mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-20 ${index % 2 ? "" : ""}`}>
                <div data-cinema-reveal className={`relative ${index % 2 ? "lg:order-2" : ""}`}>
                  <div className="cinema-image-frame relative aspect-[4/5] overflow-hidden border border-white/12 sm:aspect-[16/11] lg:aspect-[4/5]">
                    <Image
                      src={scene.image}
                      alt={scene.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover opacity-80 transition duration-1000 hover:scale-[1.025] hover:opacity-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />
                    <span className="absolute left-5 top-5 text-[10px] font-black uppercase tracking-[.22em] text-[#f6c400]">Scene {scene.number}</span>
                    <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2">
                      {scene.facts.map((fact) => <span key={fact} className="border border-white/20 bg-black/55 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[.12em] backdrop-blur">{fact}</span>)}
                    </div>
                  </div>
                </div>

                <div data-cinema-reveal className={index % 2 ? "lg:order-1" : ""}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-5">
                    <p className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.24em] text-[#f6c400]"><Icon className="h-4 w-4" /> {scene.eyebrow}</p>
                    <span className="text-5xl font-black tracking-[-.08em] text-white/[.07]">{scene.number}</span>
                  </div>
                  <h2 className="cinema-display mt-8 text-[clamp(2.8rem,5vw,5.6rem)] font-black uppercase leading-[.86] tracking-[-.055em]">{scene.title}</h2>
                  <p className="mt-7 max-w-xl text-base font-medium leading-8 text-white/52 sm:text-lg">{scene.text}</p>
                  <Link href={scene.href} className="group mt-9 inline-flex min-h-12 items-center gap-4 border-b border-[#f6c400] text-xs font-black uppercase tracking-[.13em] text-white transition hover:text-[#f6c400]">
                    {scene.cta}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1.5" />
                  </Link>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="bg-[#0a0a0a] px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div data-cinema-reveal className="flex flex-wrap items-end justify-between gap-6 border-b border-white/12 pb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#f6c400]">Tu entrada</p>
              <h2 className="cinema-display mt-4 text-5xl font-black uppercase leading-[.85] tracking-[-.055em] sm:text-7xl">Elegí por dónde empezar.</h2>
            </div>
            <p className="max-w-md text-sm font-medium leading-7 text-white/45">Cuatro caminos claros. Sin una pared de tarjetas compitiendo por tu atención.</p>
          </div>

          <div className="mt-8 grid gap-px bg-white/10 sm:grid-cols-2">
            {PATHS.map((path) => {
              const Icon = path.icon;
              return (
                <Link key={path.number} href={path.href} data-cinema-card className="cinema-path group relative min-h-52 overflow-hidden bg-[#080808] p-6 sm:p-8">
                  <div className="cinema-card-spotlight pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100" />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-black tracking-[.18em] text-white/28">{path.number}</span>
                      <Icon className="h-5 w-5 text-[#f6c400]" />
                    </div>
                    <div className="mt-14">
                      <div className="flex items-end justify-between gap-4">
                        <div><h3 className="text-2xl font-black uppercase sm:text-3xl">{path.title}</h3><p className="mt-2 text-sm font-medium text-white/42">{path.text}</p></div>
                        <ArrowRight className="h-5 w-5 shrink-0 text-white/35 transition group-hover:translate-x-1 group-hover:text-[#f6c400]" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <CtaBand title="La decisión puede empezar hoy. El primer día corre por nuestra cuenta." cta="Ver planes y pagar" />
    </>
  );
}
