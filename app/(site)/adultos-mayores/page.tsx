import type { Metadata } from "next";
import { Suspense } from "react";
import ExtremeGymCheckout from "../../ExtremeGymCheckout";
import PageHero from "../../components/PageHero";
import CtaBand from "../../components/CtaBand";
import { BUSINESS, SENIOR_BENEFITS, SENIOR_CLASSES, telLink } from "../../lib/site";
import { pageMetadata } from "../../lib/seo";
import { CreditCard, Phone } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Clase de adultos mayores",
  description:
    "Clase de adultos mayores en Xtreme Gym, Ciudad Quesada: tres sesiones por semana de movilidad, fuerza segura y equilibrio por CRC 16.000.",
  path: "/adultos-mayores",
});

const SENIOR_FACTS = [
  ["3", "clases por semana"],
  ["CRC 16.000", "inversión"],
  [BUSINESS.phone, "información"],
];

export default function AdultosMayoresPage() {
  return (
    <>
      <PageHero
        eyebrow="Adultos mayores"
        title="Nunca es tarde"
        highlight="para sentirse mejor."
        text="Moverse es bienestar. No importa la edad ni el punto de partida: cada clase es una oportunidad para cuidar su cuerpo, fortalecer su mente y ganar confianza en comunidad."
        image="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=2000&q=86"
        imageAlt="Adultos activos entrenando bienestar"
      />

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="border border-white/10 bg-[#0d0d0d] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Horario de clases</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">Dos bloques por día.</h2>

            <div className="mt-8 grid gap-4">
              {SENIOR_CLASSES.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[.82fr_1.18fr] overflow-hidden border border-[#f6c400] bg-black/70"
                >
                  <div className="grid place-items-center bg-[#f6c400] px-4 py-5 text-center text-black">
                    <span className="text-lg font-black uppercase leading-none">{item.label}</span>
                  </div>
                  <div className="grid place-items-center px-4 py-5 text-center">
                    <span className="text-lg font-black uppercase">{item.time}</span>
                  </div>
                </div>
              ))}
              <p className="text-center text-sm font-black uppercase tracking-[0.22em] text-white/70">
                Tres clases por semana - costo: CRC 16.000
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {SENIOR_FACTS.map(([value, label]) => (
                <div key={label} className="border border-white/12 bg-white/[0.05] p-4">
                  <p className="text-xl font-black uppercase text-[#f6c400]">{value}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#inscripcion"
                className="inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black transition hover:bg-white"
              >
                Inscribirme
                <CreditCard className="h-4 w-4" />
              </a>
              <a
                href={telLink}
                className="inline-flex min-h-12 items-center gap-2 border border-white/20 px-5 font-black uppercase text-white transition hover:border-white/45"
              >
                Llamar
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Qué trabajamos</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
              Bienestar y movimiento, con calma.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-white/60">
              La clase está pensada para principiantes. Se avanza con seguridad, a un ritmo
              cómodo y con acompañamiento en cada ejercicio.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {SENIOR_BENEFITS.map((item) => (
                <article
                  key={item.title}
                  className="border border-white/10 bg-white/[0.045] p-5 transition hover:border-[#f6c400]/55 hover:bg-[#f6c400]/10"
                >
                  <h3 className="text-xl font-black uppercase">{item.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-white/58">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <ExtremeGymCheckout initialOption="senior" />
      </Suspense>

      <CtaBand
        eyebrow="Opciones disponibles"
        title="Elegí el plan de adultos mayores y empezá con acompañamiento."
        cta="Inscribirme"
        href="#inscripcion"
      />
    </>
  );
}
