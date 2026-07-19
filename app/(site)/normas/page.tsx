import type { Metadata } from "next";
import PageHero from "../../components/PageHero";
import CtaBand from "../../components/CtaBand";
import {
  LegalDocNav,
  LegalSections,
  LegalToc,
  LegalUpdated,
} from "../../components/LegalDoc";
import { NORMS_SECTIONS } from "../../lib/legal";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Normas del gym",
  description:
    "Normas de convivencia y seguridad en Xtreme Gym: equipo, higiene, área infantil y responsabilidad al entrenar en Ciudad Quesada.",
  path: "/normas",
});

export default function NormasPage() {
  return (
    <>
      <PageHero
        eyebrow="Gym"
        title="Normas del"
        highlight="gimnasio."
        text="Convivencia, cuidado del equipo y seguridad. Así todos pueden entrenar con respeto y en buenas condiciones."
        image="/xtreme/piso-pesas-panoramica.webp"
        imageAlt="Piso de entrenamiento Xtreme Gym"
      >
        <div className="space-y-4">
          <LegalDocNav current="normas" />
          <LegalUpdated />
        </div>
      </PageHero>

      <section className="px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[240px_1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <LegalToc sections={NORMS_SECTIONS} />
          </div>
          <LegalSections sections={NORMS_SECTIONS} />
        </div>
      </section>

      <CtaBand title="¿Listo para la primera visita? Empezá con tu día gratis." />
    </>
  );
}
