import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  MapPin,
} from "lucide-react";
import CinematicLandingFX from "../components/CinematicLandingFX";
import HeroTrainingVideo from "../components/HeroTrainingVideo";
import ScrollSceneVideo from "../components/ScrollSceneVideo";
import CtaBand from "../components/CtaBand";
import JsonLd from "../components/JsonLd";
import LandingTrack from "../components/LandingTrack";
import { HOME_CONTENT } from "../lib/home-content";
import { BUSINESS, SOCIAL_PROOF } from "../lib/site";
import { gymJsonLd, pageMetadata } from "../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Xtreme Gym | Ciudad Quesada",
  description:
    "Xtreme Gym en Ciudad Quesada, San Carlos. Entrená con máquinas completas, zonas especializadas, acompañamiento y una app para sostener tu progreso.",
  path: "/",
  absoluteTitle: true,
});

const content = HOME_CONTENT.es;
const { scenes: SCENES, paths: PATHS, services: SERVICES } = content;

export default function ExtremeGymLandingPage() {
  return (
    <>
      <JsonLd data={gymJsonLd()} />
      <LandingTrack surface="home" />

      <section
        data-cinema-stage
        className="cinema-home-hero cinema-stage relative isolate overflow-hidden border-b border-white/10 bg-[#050505]"
      >
        <div className="cinema-stage-image absolute inset-[-2%] z-0 overflow-hidden">
          <HeroTrainingVideo />
        </div>
        <div className="cinema-hero-grade absolute inset-0 z-[1]" />
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
              {content.systemStatus}
            </span>
          </div>

          <div className="relative flex flex-1 items-end py-9 lg:pb-12 lg:pt-16">
            <div data-cinema-reveal className="w-full">
              <p className="mb-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.28em] text-[#f6c400]">
                <span className="h-px w-12 bg-[#f6c400]" />
                {content.eyebrow}
              </p>
              <h1 className="cinema-display text-[clamp(4.4rem,13vw,13rem)] font-black uppercase leading-[.68] tracking-[-.085em]">
                <span className="block">{content.heroLine1}</span>
                <span className="block text-right text-[#f6c400]">{content.heroLine2}</span>
              </h1>
              <div className="mt-8 grid gap-6 border-t border-white/20 pt-6 md:grid-cols-[minmax(0,620px)_1fr] md:items-end md:justify-between">
                <p className="max-w-xl text-base font-medium leading-7 text-white/72 sm:text-lg sm:leading-8">
                  {content.heroText}
                </p>
                <div className="flex flex-wrap gap-2.5 md:justify-end">
                  <Link
                    href={content.primaryHref}
                    className="cinema-cta inline-flex min-h-13 items-center gap-3 bg-[#f6c400] px-5 text-xs font-black uppercase tracking-[.08em] text-black"
                  >
                    {content.primaryCta} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={content.secondaryHref}
                    className="inline-flex min-h-13 items-center gap-3 border border-white/25 bg-black/25 px-5 text-xs font-black uppercase tracking-[.08em] text-white backdrop-blur-md transition hover:border-white/60 hover:bg-white/10"
                  >
                    {content.secondaryCta}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="grid border-t border-white/12 bg-black/20 backdrop-blur-sm sm:grid-cols-[auto_1fr]">
            <a href="#experiencia" className="hidden min-h-20 items-center gap-3 border-r border-white/10 px-5 text-[9px] font-black uppercase tracking-[.2em] text-white/45 transition hover:text-white sm:flex">
              {content.discover} <ArrowDown className="h-4 w-4 text-[#f6c400]" />
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
          <a
            href="https://www.pexels.com/video/training-at-gym-12188781/"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-[5.6rem] right-20 z-20 hidden text-[8px] font-bold uppercase tracking-[.15em] text-white/35 transition hover:text-white md:block"
          >
            Video: utopia 36 / Pexels
          </a>
        </div>
      </section>

      <section id="experiencia" className="relative overflow-hidden border-b border-white/10 bg-[#080808] px-5 py-24 sm:px-8 lg:py-36">
        <div className="cinema-orbit absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f6c400]/10" aria-hidden />
        <div data-cinema-reveal className="relative mx-auto max-w-6xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#f6c400]">{content.ideaEyebrow}</p>
          <h2 className="cinema-display mx-auto mt-6 max-w-5xl text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[.84] tracking-[-.06em]">
            {content.ideaTitle}
            <span className="block text-white/28">{content.ideaHighlight}</span>
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base font-medium leading-8 text-white/48 sm:text-lg">
            {content.ideaText}
          </p>
        </div>
      </section>

      <div className="cinema-marquee overflow-hidden border-b border-white/10 bg-[#f6c400] py-3 text-black" aria-hidden="true">
        <div className="cinema-marquee-track flex w-max items-center gap-7 whitespace-nowrap text-[11px] font-black uppercase tracking-[.24em]">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex items-center gap-7">
              {content.marquee.map((word) => <span key={`${copy}-${word}`} className="flex items-center gap-7">{word} <span>✦</span></span>)}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-[#050505]">
        {SCENES.map((scene, index) => {
          const Icon = scene.icon;
          return (
            <section key={scene.number} className="cinema-scene border-b border-white/10 px-5 py-20 sm:px-8 lg:min-h-[82vh] lg:py-28">
              <div className={`mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-20 ${index % 2 ? "" : ""}`}>
                <div data-cinema-reveal className={`relative ${index % 2 ? "lg:order-2" : ""}`}>
                  <div className="cinema-image-frame relative aspect-[4/5] overflow-hidden border border-white/12 sm:aspect-[16/11] lg:aspect-[4/5]">
                    {scene.video ? (
                      <ScrollSceneVideo src={scene.video} poster={scene.image} label={scene.alt} />
                    ) : (
                      <Image
                        src={scene.image}
                        alt={scene.alt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="cinema-scene-photo object-cover transition duration-1000 hover:scale-[1.025]"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />
                    <div className="cinema-scanline absolute inset-x-0 top-0 h-px bg-[#f6c400]/70" aria-hidden />
                    <span className="absolute left-5 top-5 text-[10px] font-black uppercase tracking-[.22em] text-[#f6c400]">Scene {scene.number}</span>
                    <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2">
                      {scene.facts.map((fact) => <span key={fact} className="border border-white/20 bg-black/55 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[.12em] backdrop-blur">{fact}</span>)}
                    </div>
                    {scene.videoHref && (
                      <a
                        href={scene.videoHref}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-5 top-5 z-10 text-[8px] font-bold uppercase tracking-[.14em] text-white/45 transition hover:text-white"
                      >
                        {scene.videoCredit}
                      </a>
                    )}
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

      <section className="relative overflow-hidden border-b border-white/10 bg-[#ece9df] px-5 py-24 text-[#090909] sm:px-8 lg:py-32">
        <div className="cinema-services-glow pointer-events-none absolute -right-40 top-0 h-[36rem] w-[36rem] rounded-full bg-[#f6c400]/35 blur-[120px]" aria-hidden />
        <div className="relative mx-auto max-w-7xl">
          <div data-cinema-reveal className="grid gap-8 border-b border-black/15 pb-9 lg:grid-cols-[1fr_.7fr] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em]">{content.servicesEyebrow}</p>
              <h2 className="cinema-display mt-4 max-w-4xl text-[clamp(3.5rem,7vw,7.4rem)] font-black uppercase leading-[.78] tracking-[-.065em]">
                {content.servicesTitle}
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-7 text-black/58 lg:justify-self-end">
              {content.servicesText}
            </p>
          </div>

          <div className="cinema-services-grid mt-8 grid gap-px overflow-hidden border border-black/15 bg-black/15 md:grid-cols-2 xl:grid-cols-4">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              const content = (
                <>
                  <Image src={service.image} alt="" fill sizes="(max-width: 768px) 100vw, 25vw" className="cinema-service-photo pointer-events-none object-cover" />
                  <div className="cinema-service-shade pointer-events-none absolute inset-0" />
                  <div className="cinema-service-light pointer-events-none absolute inset-0" />
                  <div className="cinema-service-sweep pointer-events-none absolute inset-y-0 -left-1/2 w-1/3" />
                  <span className="cinema-service-ghost pointer-events-none absolute -right-2 top-8 font-black leading-none">
                    {service.number}
                  </span>
                  <div className="relative z-10 flex items-start justify-between">
                    <span className="cinema-service-index text-[10px] font-black tracking-[.18em]">{service.number}</span>
                    <span className="cinema-service-icon grid h-11 w-11 place-items-center border border-black/15">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="relative z-10 mt-16">
                    <h3 className="cinema-service-title text-2xl font-black uppercase leading-none tracking-[-.035em]">{service.title}</h3>
                    <p className="cinema-service-copy mt-4 text-sm font-semibold leading-6">{service.text}</p>
                    <p className="cinema-service-meta mt-7 flex items-center justify-between gap-3 border-t pt-4 text-[9px] font-black uppercase tracking-[.14em]">
                      {service.meta}
                      {"href" in service && service.href ? <ArrowRight className="h-4 w-4 shrink-0" /> : null}
                    </p>
                  </div>
                </>
              );

              return "href" in service && service.href ? (
                <Link key={service.number} href={service.href} data-cinema-card className="cinema-service-card group relative isolate overflow-hidden bg-[#f4f1e8] p-6">
                  {content}
                </Link>
              ) : (
                <article key={service.number} data-cinema-card className="cinema-service-card group relative isolate overflow-hidden bg-[#f4f1e8] p-6">
                  {content}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0a0a0a] px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div data-cinema-reveal className="flex flex-wrap items-end justify-between gap-6 border-b border-white/12 pb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#f6c400]">{content.pathsEyebrow}</p>
              <h2 className="cinema-display mt-4 text-5xl font-black uppercase leading-[.85] tracking-[-.055em] sm:text-7xl">{content.pathsTitle}</h2>
            </div>
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
                        <div><h3 className="text-2xl font-black uppercase sm:text-3xl">{path.title}</h3><p className="mt-2 text-sm font-medium text-white/42">{path.text}</p><span className="mt-5 inline-flex border border-[#f6c400]/45 px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-[#f6c400]">Abrir ahora</span></div>
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

      <CtaBand title={content.finalCta} cta={content.finalCtaLabel} />
    </>
  );
}
