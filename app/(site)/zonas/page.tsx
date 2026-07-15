import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../../components/PageHero";
import CtaBand from "../../components/CtaBand";
import ImageTile from "../../components/ImageTile";
import { GALLERY, TRUST_POINTS, ZONES, waLink } from "../../lib/site";
import { pageMetadata } from "../../lib/seo";
import { ArrowRight, CheckCircle2, Clock3, MessageCircle, Sparkles, UserRoundCheck, Users } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Zonas de entrenamiento",
  description:
    "Calistenia, peso libre, cardio, pierna y tren superior en Xtreme Gym, con máquinas excelentes, entrenamiento VIP y clases grupales.",
  path: "/zonas",
});

export default function ZonasPage() {
  return (
    <>
      <PageHero
        eyebrow="Zonas"
        title="Todo el equipo."
        highlight="Cero excusas."
        text="Máquinas excelentes de todo tipo y zonas completas para quien decidió tomarse su entrenamiento en serio."
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

      <section className="border-y border-white/10 bg-[#f6c400] px-5 py-16 text-black sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-black/55">Clases grupales</p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
                Más seguimiento. Más compromiso.
              </h2>
              <p className="mt-5 max-w-xl font-bold leading-7 text-black/65">
                Entrená con el acompañamiento de un entrenador en un grupo reducido de hasta 6 personas.
                Recibí corrección de técnica, seguimiento constante y acceso ilimitado al gimnasio.
              </p>
              <p className="mt-6 text-4xl font-black">₡45.000 <span className="text-base uppercase text-black/55">al mes</span></p>
              <a
                href={waLink("Hola Xtreme Gym, quiero consultar disponibilidad para las clases grupales de ₡45.000.")}
                className="mt-7 inline-flex min-h-12 items-center gap-2 bg-black px-5 font-black uppercase text-white transition hover:bg-white hover:text-black"
              >
                Consultar cupo
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="border-[3px] border-black bg-white p-5 shadow-[7px_7px_0_rgba(0,0,0,.2)]">
                <Users className="h-7 w-7" />
                <h3 className="mt-4 text-xl font-black uppercase">Grupos de hasta 6</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-black/60">Atención cercana, motivación compartida y seguimiento de tu progreso.</p>
              </article>
              <article className="border-[3px] border-black bg-white p-5 shadow-[7px_7px_0_rgba(0,0,0,.2)]">
                <UserRoundCheck className="h-7 w-7" />
                <h3 className="mt-4 text-xl font-black uppercase">Supervisión personalizada</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-black/60">Un entrenador corrige tu técnica y te ayuda a mantener el enfoque.</p>
              </article>
              <article className="border-[3px] border-black bg-white p-5 shadow-[7px_7px_0_rgba(0,0,0,.2)] sm:col-span-2">
                <Clock3 className="h-7 w-7" />
                <h3 className="mt-4 text-xl font-black uppercase">Lunes, miércoles y viernes</h3>
                <div className="mt-3 flex flex-wrap gap-3 text-sm font-black uppercase">
                  <span className="border border-black/20 bg-black/[.05] px-3 py-2">5:30 a. m. – 6:45 a. m.</span>
                  <span className="border border-black/20 bg-black/[.05] px-3 py-2">5:00 p. m. – 6:15 p. m.</span>
                </div>
                <p className="mt-3 text-sm font-bold text-black/55">Los cupos son limitados y el grupo inicia una vez conformado.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
          <article className="border border-white/12 bg-white/[.04] p-6">
            <UserRoundCheck className="h-8 w-8 text-[#f6c400]" />
            <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-[#f6c400]">Modalidad especial</p>
            <h2 className="mt-2 text-3xl font-black uppercase">Entrenamiento VIP</h2>
            <p className="mt-3 font-semibold leading-7 text-white/60">Entrenamiento personalizado o semi-privado para recibir una guía más cercana y trabajar tus objetivos con estructura.</p>
          </article>
          <article className="border border-white/12 bg-white/[.04] p-6">
            <Sparkles className="h-8 w-8 text-[#f6c400]" />
            <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-[#f6c400]">Servicio adicional</p>
            <h2 className="mt-2 text-3xl font-black uppercase">Máquina de bronceado</h2>
            <p className="mt-3 font-semibold leading-7 text-white/60">Consultá en recepción por disponibilidad, recomendaciones de uso y condiciones del servicio.</p>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#101010] px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Por qué Xtreme</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
              Para quienes van en serio.
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
