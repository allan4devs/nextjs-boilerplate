import type { Metadata } from "next";
import PageHero from "../../components/PageHero";
import {
  LegalDocNav,
  LegalSections,
  LegalToc,
  LegalUpdated,
} from "../../components/LegalDoc";
import { TERMS_SECTIONS } from "../../lib/legal";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Condiciones de uso",
  description:
    "Condiciones de uso de Xtreme Gym y de la app de socios: membresías, primer día, reservas, conducta y responsabilidad en Ciudad Quesada.",
  path: "/terminos",
});

export default function TerminosPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Condiciones"
        highlight="de uso."
        text="Reglas del servicio del gimnasio y de la app de socios. Léelas con calma: son la base de un espacio seguro y claro para todos."
        image="/xtreme/recepcion-sala-espera.webp"
        imageAlt="Xtreme Gym"
      >
        <div className="space-y-4">
          <LegalDocNav current="terminos" />
          <LegalUpdated />
        </div>
      </PageHero>

      <section className="px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[240px_1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <LegalToc sections={TERMS_SECTIONS} />
          </div>
          <LegalSections sections={TERMS_SECTIONS} />
        </div>
      </section>
    </>
  );
}
