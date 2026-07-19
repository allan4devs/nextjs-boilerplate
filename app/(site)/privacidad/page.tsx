import type { Metadata } from "next";
import PageHero from "../../components/PageHero";
import {
  LegalDocNav,
  LegalSections,
  LegalToc,
  LegalUpdated,
} from "../../components/LegalDoc";
import { PRIVACY_SECTIONS } from "../../lib/legal";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Política de privacidad",
  description:
    "Cómo Xtreme Gym trata tus datos personales en el gym y en la app: cédula, correo, PIN, pagos, reservas y opciones de privacidad.",
  path: "/privacidad",
});

export default function PrivacidadPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Política de"
        highlight="privacidad."
        text="Qué datos pedimos, para qué los usamos y cómo podés controlar correos, avisos y tu cuenta de socio."
        image="/xtreme/recepcion-sala-espera.webp"
        imageAlt="Xtreme Gym"
      >
        <div className="space-y-4">
          <LegalDocNav current="privacidad" />
          <LegalUpdated />
        </div>
      </PageHero>

      <section className="px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[240px_1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <LegalToc sections={PRIVACY_SECTIONS} />
          </div>
          <LegalSections sections={PRIVACY_SECTIONS} />
        </div>
      </section>
    </>
  );
}
