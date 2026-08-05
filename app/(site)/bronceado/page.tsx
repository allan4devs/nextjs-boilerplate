import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MessageCircle, ShieldCheck, Sparkles, Sun } from "lucide-react";
import CtaBand from "../../components/CtaBand";
import PageHero from "../../components/PageHero";
import { waLink } from "../../lib/site";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cámara de bronceado",
  description: "Precios, paquetes, horarios y recomendaciones para usar la cámara de bronceado de Xtreme Gym en Ciudad Quesada.",
  path: "/bronceado",
});

const SESSION_PACKAGES = [
  { sessions: "1 sesión", price: "₡4.500", note: "Sin vencimiento de paquete" },
  { sessions: "5 sesiones", price: "₡15.000", note: "Vigencia de 4 meses", featured: true },
  { sessions: "10 sesiones", price: "₡26.000", note: "Vigencia de 6 meses" },
  { sessions: "20 sesiones", price: "₡41.000", note: "Vigencia de 8 meses" },
] as const;

const TANNERS = [
  { name: "Sobre para 1 sesión", price: "₡2.500" },
  { name: "Botella grande", price: "₡22.000" },
] as const;

const WHATSAPP = waLink("Hola Xtreme Gym, quiero consultar disponibilidad para la cámara de bronceado.");

export default function BronceadoPage() {
  return (
    <>
      <PageHero
        eyebrow="Bienestar · imagen personal"
        title="Cámara de"
        highlight="bronceado."
        text="Elegí una sesión individual o un paquete para conseguir y mantener el tono que buscás, con tiempos progresivos y horarios propios."
        image="/xtreme/recepcion-sala-espera.webp"
        imageAlt="Área de atención para la cámara de bronceado de Xtreme Gym"
      >
        <a href={WHATSAPP} className="inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black transition hover:bg-white">
          Consultar disponibilidad <MessageCircle className="h-4 w-4" />
        </a>
      </PageHero>

      <section className="bg-[#ece9df] px-5 py-20 text-black sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-7 border-b border-black/15 pb-8 lg:grid-cols-[1fr_.7fr] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em]">Sesiones y paquetes</p>
              <h2 className="mt-4 text-5xl font-black uppercase leading-[.85] tracking-[-.055em] sm:text-7xl">Elegí cómo empezar.</h2>
            </div>
            <p className="text-sm font-semibold leading-7 text-black/60">El producto bronceador no está incluido en el precio de las sesiones y se ofrece por separado.</p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SESSION_PACKAGES.map((item) => (
              <article key={item.sessions} className={`min-h-56 border p-6 ${"featured" in item ? "border-black bg-[#f6c400]" : "border-black/15 bg-white/55"}`}>
                <Sun className="h-6 w-6" />
                <p className="mt-10 text-xs font-black uppercase tracking-[.18em] text-black/50">{item.sessions}</p>
                <p className="mt-2 text-4xl font-black tracking-tight">{item.price}</p>
                <p className="mt-4 border-t border-black/15 pt-4 text-sm font-bold text-black/60">{item.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-2">
          <article className="border border-white/12 bg-[#101010] p-6 sm:p-8">
            <div className="flex items-center gap-3 text-[#f6c400]"><Sparkles className="h-6 w-6" /><p className="text-xs font-black uppercase tracking-[.2em]">Bronceadores</p></div>
            <h2 className="mt-5 text-4xl font-black uppercase">Producto especializado</h2>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-white/55">Disponible para comprar en recepción. No está incluido con la sesión o el paquete.</p>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {TANNERS.map((item) => <div key={item.name} className="border border-white/10 bg-black/40 p-4"><p className="text-sm font-bold text-white/55">{item.name}</p><p className="mt-2 text-2xl font-black text-[#f6c400]">{item.price}</p></div>)}
            </div>
          </article>

          <article className="border border-white/12 bg-[#101010] p-6 sm:p-8">
            <div className="flex items-center gap-3 text-[#f6c400]"><Clock3 className="h-6 w-6" /><p className="text-xs font-black uppercase tracking-[.2em]">Horario de la cámara</p></div>
            <h2 className="mt-5 text-4xl font-black uppercase">Visitá dentro del horario.</h2>
            <div className="mt-8 space-y-2">
              <div className="flex justify-between gap-4 border border-white/10 bg-black/40 p-4"><span className="font-bold text-white/55">Lunes a viernes</span><strong>5:00 AM – 8:30 PM</strong></div>
              <div className="flex justify-between gap-4 border border-white/10 bg-black/40 p-4"><span className="font-bold text-white/55">Sábados</span><strong>8:00 AM – 1:00 PM</strong></div>
            </div>
            <a href={WHATSAPP} className="mt-6 inline-flex min-h-12 items-center gap-2 border border-[#f6c400] px-5 text-xs font-black uppercase text-[#f6c400] transition hover:bg-[#f6c400] hover:text-black">Confirmar disponibilidad <ArrowRight className="h-4 w-4" /></a>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#101010] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3 text-[#f6c400]"><ShieldCheck className="h-6 w-6" /><p className="text-xs font-black uppercase tracking-[.2em]">Antes de tu sesión</p></div>
          <h2 className="mt-4 max-w-4xl text-4xl font-black uppercase sm:text-6xl">Tiempo progresivo y descanso entre exposiciones.</h2>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="border border-white/10 p-5"><p className="text-3xl font-black text-[#f6c400]">8 min</p><p className="mt-2 text-sm font-semibold text-white/55">Tiempo inicial recomendado para la primera sesión.</p></div>
            <div className="border border-white/10 p-5"><p className="text-3xl font-black text-[#f6c400]">12 min</p><p className="mt-2 text-sm font-semibold text-white/55">Tiempo máximo indicado para una exposición.</p></div>
            <div className="border border-white/10 p-5"><CalendarDays className="h-7 w-7 text-[#f6c400]" /><p className="mt-3 text-sm font-semibold text-white/55">Dejá descansar la piel entre sesiones: día por medio o cada dos días si es sensible.</p></div>
          </div>
          <p className="mt-6 max-w-4xl text-xs font-semibold leading-6 text-white/40">Seguí siempre las indicaciones del personal y del equipo. Informá cualquier sensibilidad o condición relevante antes de usar la cámara.</p>
        </div>
      </section>

      <CtaBand eyebrow="Consultá antes de venir" title="Escribinos y coordiná tu próxima sesión de bronceado." />
    </>
  );
}
