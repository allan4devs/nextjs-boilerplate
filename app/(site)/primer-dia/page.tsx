import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, MapPin, ShieldCheck } from "lucide-react";
import ExtremeGymCheckout from "../../ExtremeGymCheckout";
import LandingTrack from "../../components/LandingTrack";
import { BUSINESS, SCHEDULE } from "../../lib/site";

export const metadata: Metadata = {
  title: "Tu primer día gratis | Xtreme Gym",
  description: "Registrate en la app y entrená tu primer día gratis en Xtreme Gym. Después elegís tu plan.",
};

const INCLUDED = [
  "Acceso a fuerza, funcional, cardio y Lower Lab",
  "Orientación inicial para empezar con seguridad",
  "Un día completo gratis para conocer el ambiente y el equipo",
];

export default function PrimerDiaPage() {
  return (
    <>
      <LandingTrack surface="primer-dia" />
      <section className="relative overflow-hidden border-b border-white/10 px-5 py-16 sm:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(246,196,0,.2),transparent_34%),linear-gradient(135deg,#070707,#121212)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Tu primera visita</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[.9] sm:text-7xl">
              Tu primer día es <span className="text-[#f6c400]">gratis.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/70">
              Registrate en la app y llegá listo para entrenar. Sin contratos ni tarjeta: una visita completa y gratis para saber si Xtreme es para vos. Después elegís tu plan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#reservar" className="inline-flex min-h-14 items-center gap-2 bg-[#f6c400] px-6 font-black uppercase text-black transition hover:bg-white">
                Registrarme gratis <ArrowRight className="h-5 w-5" />
              </a>
              <Link href="/zonas" className="inline-flex min-h-14 items-center border border-white/20 px-6 font-black uppercase text-white transition hover:border-[#f6c400]">
                Conocé las zonas
              </Link>
            </div>
          </div>
          <aside className="border border-[#f6c400]/45 bg-[#f6c400] p-6 text-black sm:p-8">
            <p className="text-xs font-black uppercase tracking-[.2em] text-black/55">Primer día</p>
            <p className="mt-2 text-5xl font-black">Gratis</p>
            <div className="mt-7 space-y-4">
              {INCLUDED.map((item) => (
                <div key={item} className="flex gap-3 font-bold leading-6">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-7 grid gap-3 border-t border-black/20 pt-6 text-sm font-black uppercase">
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{BUSINESS.location}</span>
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />Horario amplio, todos los días</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Sin tarjeta, solo registrate en la app</span>
            </div>
          </aside>
        </div>
      </section>
      <section className="border-b border-white/10 bg-[#0e0e0e] px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#f6c400]">Elegí cuándo venir</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {SCHEDULE.map((item) => (
              <div key={item.day} className="border border-white/10 bg-white/[.04] p-5">
                <p className="font-black uppercase">{item.day}</p><p className="mt-2 font-bold text-white/55">{item.hours}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div id="reservar" className="scroll-mt-20"><ExtremeGymCheckout initialOption="day-pass" /></div>
    </>
  );
}
