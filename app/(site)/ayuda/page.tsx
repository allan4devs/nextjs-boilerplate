import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  MessageCircle,
  Scale,
  Shield,
  Smartphone,
} from "lucide-react";
import PageHero from "../../components/PageHero";
import CtaBand from "../../components/CtaBand";
import { LegalDocNav, LegalSections, LegalUpdated } from "../../components/LegalDoc";
import {
  APP_HELP_SECTIONS,
  GYM_HELP_SECTIONS,
  HELP_TOPICS,
} from "../../lib/legal";
import { BUSINESS, waLink } from "../../lib/site";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Ayuda",
  description:
    "Centro de ayuda de Xtreme Gym: app de socios, reservas, PIN, primer día, normas, condiciones y privacidad en Ciudad Quesada.",
  path: "/ayuda",
});

const GROUP_LABEL: Record<string, string> = {
  empezar: "Empezar",
  app: "App de socios",
  gym: "En el gym",
  legal: "Legal",
};

export default function AyudaPage() {
  const groups = ["empezar", "app", "gym", "legal"] as const;

  return (
    <>
      <PageHero
        eyebrow="Ayuda"
        title="Centro de"
        highlight="ayuda."
        text="Todo lo que necesitás saber del gym y de la app: acceso, reservas, planes, normas y privacidad. Claro y en un solo lugar."
        image="/xtreme/recepcion-sala-espera.webp"
        imageAlt="Recepción de Xtreme Gym"
      >
        <LegalDocNav current="ayuda" />
      </PageHero>

      <section className="border-b border-white/10 px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6c400]">
                Atajos
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase">¿En qué te ayudamos?</h2>
            </div>
            <LegalUpdated />
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {groups.map((group) => (
              <div key={group}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                  {GROUP_LABEL[group]}
                </p>
                <div className="mt-3 grid gap-2">
                  {HELP_TOPICS.filter((topic) => topic.group === group).map((topic) => (
                    <Link
                      key={topic.id}
                      href={topic.href}
                      className="group flex items-start justify-between gap-3 border border-white/10 bg-[#0e0e0e] p-4 transition hover:border-[#f6c400]/50"
                    >
                      <span>
                        <span className="block text-sm font-black uppercase text-white group-hover:text-[#f6c400]">
                          {topic.title}
                        </span>
                        <span className="mt-1 block text-xs font-semibold leading-5 text-white/50">
                          {topic.summary}
                        </span>
                      </span>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30 group-hover:text-[#f6c400]" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_280px]">
          <div className="space-y-14">
            <div>
              <div className="mb-6 flex items-center gap-2 text-[#f6c400]">
                <Smartphone className="h-5 w-5" />
                <p className="text-xs font-black uppercase tracking-[0.18em]">App de socios</p>
              </div>
              <LegalSections sections={APP_HELP_SECTIONS} />
            </div>
            <div>
              <div className="mb-6 flex items-center gap-2 text-[#f6c400]">
                <HelpCircle className="h-5 w-5" />
                <p className="text-xs font-black uppercase tracking-[0.18em]">En el gym</p>
              </div>
              <LegalSections sections={GYM_HELP_SECTIONS} />
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="border border-[#f6c400]/40 bg-[#f6c400] p-5 text-black">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-black/55">
                ¿No encontraste la respuesta?
              </p>
              <p className="mt-2 text-sm font-bold leading-6">
                Escribinos y te orientamos con planes, app o tu primera visita.
              </p>
              <a
                href={waLink("Hola Xtreme Gym, necesito ayuda con la app / el gym.")}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 text-xs font-black uppercase text-[#f6c400]"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp {BUSINESS.phone}
              </a>
              <Link
                href="/contacto"
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center border border-black/20 text-xs font-black uppercase"
              >
                Contacto y horario
              </Link>
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                Documentos
              </p>
              <ul className="mt-3 space-y-3 text-sm font-bold">
                <li>
                  <Link href="/normas" className="inline-flex items-center gap-2 text-white/70 hover:text-[#f6c400]">
                    <BookOpen className="h-4 w-4" /> Normas del gym
                  </Link>
                </li>
                <li>
                  <Link href="/terminos" className="inline-flex items-center gap-2 text-white/70 hover:text-[#f6c400]">
                    <Scale className="h-4 w-4" /> Condiciones de uso
                  </Link>
                </li>
                <li>
                  <Link href="/privacidad" className="inline-flex items-center gap-2 text-white/70 hover:text-[#f6c400]">
                    <Shield className="h-4 w-4" /> Privacidad
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <CtaBand title="Listo para entrenar. Elegí tu plan o tu primer día gratis." />
    </>
  );
}
