import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../../components/PageHero";
import CtaBand from "../../components/CtaBand";
import ImageTile from "../../components/ImageTile";
import { GALLERY, TRUST_POINTS, ZONES } from "../../lib/site";
import { pageMetadata } from "../../lib/seo";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Zonas de entrenamiento",
  description:
    "Fuerza, funcional, cardio y lower lab: las cuatro zonas de Xtreme Gym en Ciudad Quesada, con equipo completo y acompañamiento.",
  path: "/zonas",
});

export default function ZonasPage() {
  return (
    <>
      <PageHero
        eyebrow="Zonas"
        title="Equipo, ambiente"
        highlight="y objetivos claros."
        text="Cuatro zonas separadas para trabajar fuerza, condición, salud y confianza. Lo importante es empezar y mantenerse en movimiento."
        image="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=2000&q=86"
        imageAlt="Piso de fuerza en Xtreme Gym"
      />

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
          {ZONES.map((zone) => (
            <article key={zone.title} className="group overflow-hidden border border-white/10 bg-black">
              <div className="relative aspect-[4/5] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={zone.image}
                  alt={zone.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <zone.icon className="absolute left-5 top-5 h-8 w-8 text-[#f6c400]" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6c400]">{zone.eyebrow}</p>
                  <h2 className="mt-2 text-3xl font-black uppercase">{zone.title}</h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/70">{zone.text}</p>
                </div>
              </div>
              <ul className="grid gap-2 p-5">
                {zone.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-white/58">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f6c400]" />
                    {detail}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#101010] px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Por qué Xtreme</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
              Menos excusas, más estructura.
            </h2>
            <div className="mt-8 grid gap-3">
              {TRUST_POINTS.map((point) => (
                <div key={point} className="flex items-center gap-3 border border-white/12 bg-black/60 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#f6c400]" />
                  <span className="font-bold text-white/78">{point}</span>
                </div>
              ))}
            </div>
            <Link
              href="/precios#inscripcion"
              className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black transition hover:bg-white"
            >
              Ver planes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ImageTile src={GALLERY[0].src} alt={GALLERY[0].label} className="aspect-[4/5] sm:row-span-2" />
            <ImageTile src={GALLERY[1].src} alt={GALLERY[1].label} className="aspect-[4/3]" />
            <ImageTile src={GALLERY[2].src} alt={GALLERY[2].label} className="aspect-[4/3]" />
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="Empezá hoy"
        title="Conocé los planes para entrenar en todas las zonas."
        cta="Inscribirme"
      />
    </>
  );
}
