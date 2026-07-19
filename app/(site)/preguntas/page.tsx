import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../../components/PageHero";
import CtaBand from "../../components/CtaBand";
import JsonLd from "../../components/JsonLd";
import { LegalDocNav } from "../../components/LegalDoc";
import { FAQS, waLink } from "../../lib/site";
import { faqJsonLd, pageMetadata } from "../../lib/seo";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Preguntas frecuentes",
  description:
    "Respuestas sobre planes, horarios, pago en línea, clase de adultos mayores y app de socios de Xtreme Gym en Ciudad Quesada.",
  path: "/preguntas",
});

export default function PreguntasPage() {
  return (
    <>
      <JsonLd data={faqJsonLd()} />
      <PageHero
        eyebrow="Preguntas"
        title="Lo que la gente"
        highlight="pregunta antes de llegar."
        text="Respuestas cortas sobre planes, app, PIN, reservas y tu primera visita. Para el detalle legal y las normas, usá el Centro de ayuda."
        image="/xtreme/recepcion-sala-espera.webp"
        imageAlt="Recepción y sala de espera de Xtreme Gym"
      >
        <LegalDocNav current="preguntas" />
      </PageHero>

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="divide-y divide-white/10 border-y border-white/10">
            {FAQS.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-black uppercase text-white">
                  {item.question}
                  <span className="grid h-8 w-8 shrink-0 place-items-center bg-white text-black transition group-open:rotate-45 group-open:bg-[#f6c400]">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-base font-semibold leading-8 text-white/58">{item.answer}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href={waLink("Hola Xtreme Gym, tengo una pregunta antes de empezar.")}
              className="inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black transition hover:bg-white"
            >
              Preguntar por WhatsApp
              <MessageCircle className="h-4 w-4" />
            </a>
            <Link
              href="/ayuda"
              className="inline-flex min-h-12 items-center border border-white/20 px-5 font-black uppercase text-white transition hover:border-[#f6c400]"
            >
              Centro de ayuda
            </Link>
          </div>
        </div>
      </section>

      <CtaBand
        title="Ya sabés cómo funciona. Elegí el plan que mejor te quede."
      />
    </>
  );
}
