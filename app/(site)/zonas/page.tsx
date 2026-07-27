import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageCircle,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import CinematicLandingFX from "../../components/CinematicLandingFX";
import ScrollSceneVideo from "../../components/ScrollSceneVideo";
import CtaBand from "../../components/CtaBand";
import { TRUST_POINTS, ZONES, waLink } from "../../lib/site";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Zonas de entrenamiento",
  description:
    "Recorré las zonas de calistenia, peso libre, cardio, pierna, tren superior y entrenamiento funcional de Xtreme Gym en Ciudad Quesada.",
  path: "/zonas",
});

const ZONE_VIDEO = {
  0: {
    src: "/xtreme/scene-strength-pexels.mp4",
    credit: "Pressmaster / Pexels",
    href: "https://www.pexels.com/video/a-woman-lifting-heavy-weights-in-a-gym-3195395/",
  },
  1: {
    src: "/xtreme/scene-machines-pexels.mp4",
    credit: "Navdeep Singh / Pexels",
    href: "https://www.pexels.com/video/person-working-out-in-the-gym-14183169/",
  },
} as const;

const QUICK_FACTS = [
  { value: "5", label: "zonas para entrenar" },
  { value: "5 AM", label: "abrimos entre semana" },
  { value: "100%", label: "entrenamiento a tu ritmo" },
  { value: "1", label: "primer día gratis" },
];

const SUPPORT_SPACES = [
  {
    image: "/xtreme/zona-entrenamiento-vip.webp",
    eyebrow: "Dirección cercana",
    title: "Zona VIP",
    text: "Un espacio exclusivo para entrenamiento personalizado o semiprivado con objetivos y seguimiento definidos.",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    image: "/xtreme/consultorio-medicion-corporal.webp",
    eyebrow: "Datos reales",
    title: "Medición InBody",
    text: "Composición corporal para entender tu punto de partida y orientar mejor tu rutina.",
    className: "",
  },
  {
    image: "/xtreme/vestidores-duchas.webp",
    eyebrow: "Antes y después",
    title: "Vestidores y duchas",
    text: "Comodidad para que entrenar encaje mejor en tu día.",
    className: "",
  },
  {
    image: "/xtreme/area-infantil.webp",
    eyebrow: "Familias",
    title: "Sala para peques",
    text: "Un espacio de juego para tenerlos cerca mientras entrenás. No es servicio de cuido.",
    className: "",
  },
  {
    image: "/xtreme/parqueo-amplio.webp",
    eyebrow: "Llegar fácil",
    title: "Parqueo",
    text: "Espacio para clientes, a pocos pasos del piso de entrenamiento.",
    className: "",
  },
];

export default function ZonasPage() {
  return (
    <>
      <section
        data-cinema-stage
        className="zones-cinema-hero cinema-home-hero cinema-stage relative isolate overflow-hidden border-b border-white/10 bg-[#050505]"
      >
        <div className="cinema-stage-image absolute inset-[-2%] z-0 overflow-hidden">
          <video
            className="cinema-hero-video h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/xtreme/piso-maquinas-panoramica.webp"
            aria-label="Recorrido por máquinas y zonas de entrenamiento"
          >
            <source src="/xtreme/scene-machines-pexels.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="cinema-hero-grade absolute inset-0 z-[1]" />
        <div className="cinema-vignette absolute inset-0 z-[1]" />
        <CinematicLandingFX />
        <a
          href="https://www.pexels.com/video/person-working-out-in-the-gym-14183169/"
          target="_blank"
          rel="noreferrer"
          className="absolute right-8 top-5 z-20 hidden text-[8px] font-bold uppercase tracking-[.15em] text-white/40 transition hover:text-white lg:block"
        >
          Video: Navdeep Singh / Pexels
        </a>

        <div className="cinema-home-hero-shell relative z-10 mx-auto flex max-w-[1500px] flex-col px-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between border-b border-white/10 py-4 text-[10px] font-black uppercase tracking-[.22em] text-white/45">
            <span>Recorrido Xtreme · Ciudad Quesada</span>
            <span className="hidden items-center gap-2 sm:inline-flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#f6c400]" />
              Piso activo
            </span>
          </div>

          <div className="flex flex-1 items-end py-10 lg:pb-14 lg:pt-20">
            <div data-cinema-reveal className="w-full">
              <p className="mb-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.28em] text-[#f6c400]">
                <span className="h-px w-12 bg-[#f6c400]" />
                Cinco zonas. Un solo objetivo.
              </p>
              <h1 className="cinema-display text-[clamp(4rem,12vw,12rem)] font-black uppercase leading-[.7] tracking-[-.08em]">
                Encontrá
                <span className="block text-right text-[#f6c400]">tu espacio.</span>
              </h1>
              <div className="mt-8 grid gap-6 border-t border-white/20 pt-6 md:grid-cols-[minmax(0,660px)_1fr] md:items-end">
                <p className="max-w-2xl text-base font-medium leading-7 text-white/72 sm:text-lg sm:leading-8">
                  Peso libre, fuerza guiada, cardio y entrenamiento funcional conviven en un piso pensado
                  para que podás empezar, progresar y seguir encontrando nuevos retos.
                </p>
                <div className="flex flex-wrap gap-3 md:justify-end">
                  <Link
                    href="/primer-dia"
                    className="cinema-cta inline-flex min-h-13 items-center gap-3 bg-[#f6c400] px-5 text-xs font-black uppercase tracking-[.08em] text-black"
                  >
                    Probar gratis <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#recorrido"
                    className="inline-flex min-h-13 items-center gap-3 border border-white/25 bg-black/30 px-5 text-xs font-black uppercase tracking-[.08em] backdrop-blur-md transition hover:border-white/60"
                  >
                    Ver las zonas <ArrowDown className="h-4 w-4 text-[#f6c400]" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-white/12 bg-black/25 backdrop-blur-sm sm:grid-cols-4">
            {QUICK_FACTS.map((fact) => (
              <div key={fact.label} className="border-r border-white/10 px-4 py-4 last:border-r-0 sm:px-5">
                <p className="text-2xl font-black text-white">{fact.value}</p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-[.14em] text-white/38 sm:text-[9px]">
                  {fact.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10 bg-[#080808] px-5 py-24 sm:px-8 lg:py-36">
        <div className="cinema-orbit absolute left-1/2 top-1/2 h-[45rem] w-[45rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f6c400]/10" aria-hidden />
        <div data-cinema-reveal className="relative mx-auto max-w-6xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#f6c400]">No hay una única forma de avanzar</p>
          <h2 className="cinema-display mx-auto mt-6 max-w-5xl text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[.82] tracking-[-.06em]">
            Cambiá el estímulo.
            <span className="block text-white/28">No tu compromiso.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base font-medium leading-8 text-white/48 sm:text-lg">
            Cada zona resuelve una parte distinta de tu entrenamiento. Combinadas, te permiten construir
            una rutina completa sin entrenar todos los días de la misma manera.
          </p>
        </div>
      </section>

      <div className="cinema-marquee overflow-hidden border-b border-white/10 bg-[#f6c400] py-3 text-black" aria-hidden="true">
        <div className="cinema-marquee-track flex w-max items-center gap-7 whitespace-nowrap text-[11px] font-black uppercase tracking-[.24em]">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex items-center gap-7">
              {["Calistenia", "Peso libre", "Cardio", "Pierna", "Tren superior", "Zona funcional"].map((word) => (
                <span key={`${copy}-${word}`} className="flex items-center gap-7">{word} <span>✦</span></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div id="recorrido" className="bg-[#050505]">
        {ZONES.map((zone, index) => {
          const Icon = zone.icon;
          const video = ZONE_VIDEO[index as keyof typeof ZONE_VIDEO];
          const number = String(index + 1).padStart(2, "0");
          return (
            <section key={zone.title} className="cinema-scene border-b border-white/10 px-5 py-20 sm:px-8 lg:min-h-[82vh] lg:py-28">
              <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
                <div data-cinema-reveal className={index % 2 ? "lg:order-2" : ""}>
                  <div className="cinema-image-frame relative aspect-[4/5] overflow-hidden border border-white/12 sm:aspect-[16/11] lg:aspect-[4/5]">
                    {video ? (
                      <ScrollSceneVideo src={video.src} poster={zone.image} label={`Entrenamiento en la zona de ${zone.title}`} />
                    ) : (
                      <Image
                        src={zone.image}
                        alt={`Zona de ${zone.title} en Xtreme Gym`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="cinema-scene-photo object-cover transition duration-1000 hover:scale-[1.035]"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />
                    <div className="cinema-scanline absolute inset-x-0 top-0 h-px bg-[#f6c400]/70" aria-hidden />
                    <span className="absolute left-5 top-5 text-[10px] font-black uppercase tracking-[.22em] text-[#f6c400]">
                      Zona {number}
                    </span>
                    <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2">
                      {zone.details.slice(0, 2).map((detail) => (
                        <span key={detail} className="border border-white/20 bg-black/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[.1em] backdrop-blur">
                          {detail}
                        </span>
                      ))}
                    </div>
                    {video && (
                      <a href={video.href} target="_blank" rel="noreferrer" className="absolute right-5 top-5 text-[8px] font-bold uppercase tracking-[.14em] text-white/45 transition hover:text-white">
                        Video: {video.credit}
                      </a>
                    )}
                  </div>
                </div>

                <div data-cinema-reveal className={index % 2 ? "lg:order-1" : ""}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-5">
                    <p className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.24em] text-[#f6c400]">
                      <Icon className="h-4 w-4" /> {zone.eyebrow}
                    </p>
                    <span className="text-6xl font-black tracking-[-.08em] text-white/[.07]">{number}</span>
                  </div>
                  <h2 className="cinema-display mt-8 text-[clamp(3.2rem,6vw,6.2rem)] font-black uppercase leading-[.84] tracking-[-.06em]">
                    {zone.title}
                  </h2>
                  <p className="mt-7 max-w-xl text-base font-medium leading-8 text-white/55 sm:text-lg">{zone.text}</p>
                  <ul className="mt-8 grid gap-3">
                    {zone.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-3 border-t border-white/10 pt-3 text-sm font-semibold leading-6 text-white/68">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f6c400]" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="relative overflow-hidden border-b border-white/10 bg-[#ece9df] px-5 py-24 text-[#090909] sm:px-8 lg:py-32">
        <div className="absolute -right-32 top-0 h-[34rem] w-[34rem] rounded-full bg-[#f6c400]/35 blur-[120px]" aria-hidden />
        <div className="relative mx-auto max-w-7xl">
          <div data-cinema-reveal className="grid gap-8 border-b border-black/15 pb-9 lg:grid-cols-[1fr_.65fr] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em]">Más allá del piso</p>
              <h2 className="cinema-display mt-4 max-w-4xl text-[clamp(3.5rem,7vw,7.4rem)] font-black uppercase leading-[.78] tracking-[-.065em]">
                Todo alrededor de tu entreno.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-7 text-black/58 lg:justify-self-end">
              Espacios que agregan dirección, comodidad y menos fricción a cada visita.
            </p>
          </div>

          <div className="mt-8 grid auto-rows-[18rem] gap-3 md:grid-cols-2 lg:grid-cols-4">
            {SUPPORT_SPACES.map((space) => (
              <article key={space.title} data-cinema-card className={`group relative overflow-hidden bg-black ${space.className}`}>
                <Image
                  src={space.image}
                  alt={space.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18)_0%,transparent_30%,rgba(0,0,0,.6)_58%,rgba(0,0,0,.98)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f6c400]">{space.eyebrow}</p>
                  <h3 className="mt-2 text-[clamp(1.5rem,2.1vw,2rem)] font-black uppercase leading-[.95] tracking-[-.035em] text-balance">{space.title}</h3>
                  <p className="mt-3 max-w-md text-sm font-medium leading-6 text-white/72 text-pretty">{space.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10 bg-[#f6c400] px-5 py-20 text-black sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div data-cinema-reveal>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-black/55">Entrenamiento semipersonalizado</p>
            <h2 className="cinema-display mt-4 text-[clamp(3.5rem,7vw,7rem)] font-black uppercase leading-[.78] tracking-[-.06em]">
              Tu zona. Tu grupo. Tu coach.
            </h2>
            <p className="mt-7 max-w-xl font-bold leading-7 text-black/62">
              Entrená en grupos reducidos de hasta seis personas con corrección de técnica, seguimiento y
              acceso ilimitado al gimnasio.
            </p>
            <p className="mt-7 text-5xl font-black">₡45.000 <span className="text-sm uppercase tracking-[.12em] text-black/50">al mes</span></p>
            <a
              href={waLink("Hola Xtreme Gym, quiero consultar disponibilidad para las clases grupales de ₡45.000.")}
              className="mt-8 inline-flex min-h-13 items-center gap-3 bg-black px-5 text-xs font-black uppercase tracking-[.1em] text-white transition hover:bg-white hover:text-black"
            >
              Consultar cupo <MessageCircle className="h-5 w-5" />
            </a>
          </div>

          <div data-cinema-reveal className="grid gap-px border-[3px] border-black bg-black sm:grid-cols-2">
            {[
              { icon: Users, title: "Hasta 6 personas", text: "Un grupo pequeño para recibir atención real." },
              { icon: UserRoundCheck, title: "Coach a cargo", text: "Corrección de técnica y seguimiento constante." },
              { icon: Clock3, title: "Tres días", text: "Lunes, miércoles y viernes, mañana o tarde." },
              { icon: ShieldCheck, title: "Acceso incluido", text: "Usá todas las zonas del gimnasio sin límite." },
            ].map((item) => (
              <article key={item.title} className="group min-h-52 bg-[#f4f1e8] p-6 transition hover:bg-white">
                <item.icon className="h-6 w-6" />
                <h3 className="mt-12 text-xl font-black uppercase">{item.title}</h3>
                <p className="mt-3 text-sm font-bold leading-6 text-black/55">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#090909] px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div data-cinema-reveal>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#f6c400]">Por qué Xtreme</p>
            <h2 className="cinema-display mt-4 text-[clamp(3.5rem,7vw,7rem)] font-black uppercase leading-[.8] tracking-[-.06em]">
              Equipo para avanzar. Gente para guiarte.
            </h2>
          </div>
          <div data-cinema-reveal className="grid gap-px bg-white/10 sm:grid-cols-2">
            {TRUST_POINTS.map((point, index) => (
              <div key={point} className="min-h-36 bg-[#0d0d0d] p-5">
                <span className="text-[10px] font-black text-[#f6c400]">{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-8 font-bold leading-6 text-white/72">{point}</p>
              </div>
            ))}
            <Link href="/precios#inscripcion" className="group flex min-h-36 items-end justify-between bg-[#f6c400] p-5 text-black transition hover:bg-white sm:col-span-2">
              <span className="text-2xl font-black uppercase">Ver planes para todas las zonas</span>
              <ArrowRight className="h-6 w-6 shrink-0 transition group-hover:translate-x-1.5" />
            </Link>
          </div>
        </div>
      </section>

      <CtaBand eyebrow="Empezá hoy" title="El primer día corre por nuestra cuenta." cta="Reservar mi primer día" />
    </>
  );
}
