import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import CtaBand from "../../components/CtaBand";
import GymBenefitsGrid from "../../components/GymBenefitsGrid";
import PageHero from "../../components/PageHero";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Beneficios para socios",
  description:
    "Conocé los beneficios de Xtreme Gym: instructores, medición corporal, parqueo, variedad de máquinas, área para merendar y espacio infantil.",
  path: "/beneficios",
});

export default function BeneficiosPage() {
  return (
    <>
      <PageHero
        eyebrow="Beneficios"
        title="Más que máquinas."
        highlight="Todo suma a tu constancia."
        text="Entrenar mejor también depende de sentirse acompañado, llegar con facilidad y contar con espacios que hacen más simple sostener el hábito."
        image="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=2000&q=86"
        imageAlt="Piso de entrenamiento con variedad de máquinas"
      >
        <Link
          href="/precios#inscripcion"
          className="inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black transition hover:bg-white"
        >
          Ver planes <ArrowRight className="h-4 w-4" />
        </Link>
      </PageHero>

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#f6c400]">Pensado para tu día a día</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-none sm:text-6xl">
                Llegá con menos preocupaciones. Entrená con más dirección.
              </h2>
            </div>
            <p className="max-w-md text-sm font-semibold leading-7 text-white/55">
              Beneficios sujetos a horario, disponibilidad y normas de uso del gimnasio.
            </p>
          </div>
          <GymBenefitsGrid />
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#101010] px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {["Acompañamiento para empezar", "Seguimiento para medir avances", "Espacios para una visita más cómoda"].map((item) => (
            <div key={item} className="flex items-center gap-3 border border-white/10 bg-black/50 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#f6c400]" />
              <span className="font-black uppercase text-white/75">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <CtaBand
        eyebrow="Tu próximo paso"
        title="Elegí un plan y aprovechá todo lo que Xtreme tiene para acompañarte."
      />
    </>
  );
}
