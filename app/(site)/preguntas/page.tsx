import type { Metadata } from "next";
import PageHero from "../../components/PageHero";
import CtaBand from "../../components/CtaBand";
import { FAQS, waLink } from "../../lib/site";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Respuestas sobre planes, horarios, pago en línea, clase de adultos mayores y app de socios de Xtreme Gym en Ciudad Quesada.",
};

export default function PreguntasPage() {
  return (
    <>
      <PageHero
        eyebrow="Preguntas"
        title="Lo que la gente"
        highlight="pregunta antes de llegar."
        text="Si no encuentra su respuesta acá, escríbanos por WhatsApp y recepción le confirma cualquier detalle."
        image="https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=2000&q=86"
        imageAlt="Entrenamiento funcional en Xtreme Gym"
      />

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

          <a
            href={waLink("Hola Xtreme Gym, tengo una pregunta antes de empezar.")}
            className="mt-10 inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black transition hover:bg-white"
          >
            Preguntar por WhatsApp
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </section>

      <CtaBand
        title="Ya sabe cómo funciona. Ahora falta empezar."
        message="Hola Xtreme Gym, quiero visitar hoy y empezar mi plan."
      />
    </>
  );
}
