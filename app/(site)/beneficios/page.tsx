import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Sun } from "lucide-react";
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

const BENEFIT_IMAGES = [
  { src: "/xtreme/consultorio-medicion-corporal.webp", alt: "Consultorio de medición corporal", label: "Medición corporal" },
  { src: "/xtreme/parqueo-clientes.webp", alt: "Parqueo para clientes de Xtreme Gym", label: "Parqueo para clientes" },
  { src: "/xtreme/parqueo-amplio.webp", alt: "Parqueo amplio junto a Xtreme Gym", label: "Parqueo amplio" },
  { src: "/xtreme/area-infantil.webp", alt: "Área infantil de Xtreme Gym", label: "Área infantil" },
  { src: "/xtreme/vestidores-lavamanos.webp", alt: "Vestidores y lavamanos de Xtreme Gym", label: "Vestidores" },
  { src: "/xtreme/vestidores-duchas.webp", alt: "Duchas disponibles en Xtreme Gym", label: "Duchas" },
  { src: "/xtreme/consultorio-valoracion.webp", alt: "Espacio privado para valoración física", label: "Valoración privada" },
];

export default function BeneficiosPage() {
  return (
    <>
      <PageHero
        eyebrow="Beneficios"
        title="Más que máquinas."
        highlight="Todo suma a tu constancia."
        text="Entrenar mejor también depende de sentirse acompañado, llegar con facilidad y contar con espacios que hacen más simple sostener el hábito."
        image="/xtreme/area-infantil-estantes.webp"
        imageAlt="Área infantil disponible para las familias de Xtreme Gym"
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

          <Link href="/bronceado" className="group mt-6 grid gap-5 border border-[#f6c400]/45 bg-[#f6c400]/[0.07] p-6 transition hover:border-[#f6c400] sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <span className="grid h-14 w-14 place-items-center bg-[#f6c400] text-black"><Sun className="h-7 w-7" /></span>
            <span>
              <span className="block text-xs font-black uppercase tracking-[.2em] text-[#f6c400]">Área de bienestar</span>
              <span className="mt-2 block text-2xl font-black uppercase">Cámara de bronceado</span>
              <span className="mt-1 block text-sm font-semibold text-white/55">Sesiones desde ₡4.500 y paquetes de hasta 20 sesiones.</span>
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase">Ver precios y horarios <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </Link>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFIT_IMAGES.map((item, index) => (
              <figure
                key={item.src}
                className={`group relative min-h-72 overflow-hidden border border-white/10 bg-black ${
                  index === 0 ? "lg:col-span-2" : ""
                }`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={72}
                  className="object-cover opacity-85 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18)_0%,transparent_38%,rgba(0,0,0,.94)_100%)]" />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
                  <span className="text-[clamp(1.25rem,2vw,1.75rem)] font-black uppercase leading-none tracking-[-.035em] text-balance">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-[.18em] text-[#f6c400]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
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
