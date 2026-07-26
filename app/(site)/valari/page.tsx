import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Heart, MessageCircle, Music2, Sparkles, Users } from "lucide-react";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Valari Dance Studio",
  description: "Salsa, bachata, baile popular y coreografías personalizadas con la profesora Natalia Zapata.",
  path: "/valari",
});

const whatsapp = "https://wa.me/50661792121";

export default function ValariPage() {
  return (
    <>
      <section className="relative isolate min-h-[calc(100svh-72px)] overflow-hidden bg-[#110d0a] px-5 py-16 sm:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(246,196,0,.24),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(192,55,34,.18),transparent_30%)]" />
        <div className="absolute -right-24 top-10 h-[34rem] w-[34rem] rounded-full border border-[#f6c400]/15" />
        <div className="absolute -right-2 top-32 h-[22rem] w-[22rem] rounded-full border border-[#f6c400]/10" />
        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.65fr_1.35fr] lg:items-end">
          <div>
            <div className="grid h-16 w-16 place-items-center rounded-full border border-[#f6c400]/45 text-[#f6c400]">
              <Music2 className="h-7 w-7" />
            </div>
            <p className="mt-9 text-[10px] font-black uppercase tracking-[.25em] text-[#f6c400]">Dance studio · Ciudad Quesada</p>
            <p className="mt-3 text-sm font-black uppercase tracking-[.14em] text-white/42">Profesora Natalia Zapata</p>
          </div>
          <div>
            <h1 className="cinema-display text-[clamp(4.5rem,11vw,11rem)] font-black uppercase leading-[.68] tracking-[-.075em]">
              Valari
              <span className="block text-[#f6c400]">Dance</span>
              <span className="block text-white/28">Studio.</span>
            </h1>
            <p className="mt-9 max-w-3xl text-lg font-semibold leading-8 text-white/62">
              Salsa, bachata y baile popular para diferentes niveles. Aprendé, soltate y disfrutá cada paso en un espacio con energía y dirección.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center gap-3 bg-[#f6c400] px-6 text-xs font-black uppercase tracking-[.1em] text-black transition hover:bg-white">
                Consultar clases <MessageCircle className="h-5 w-5" />
              </a>
              <a href="#servicios" className="inline-flex min-h-14 items-center gap-3 border border-white/25 px-6 text-xs font-black uppercase tracking-[.1em] transition hover:border-[#f6c400] hover:text-[#f6c400]">
                Ver opciones <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="servicios" className="bg-[#eeeade] px-5 py-20 text-black sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-black uppercase tracking-[.25em]">Bailá a tu manera</p>
          <h2 className="cinema-display mt-4 max-w-5xl text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[.8] tracking-[-.06em]">Clases y coreografías con propósito.</h2>
          <div className="mt-12 grid gap-px border border-black/15 bg-black/15 md:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: Music2, title: "Salsa y bachata", text: "Técnica, ritmo y confianza para disfrutar la pista." },
              { icon: Users, title: "Baile popular", text: "Clases accesibles para aprender y moverte en comunidad." },
              { icon: Heart, title: "Bodas y quince años", text: "Coreografías creadas para que tu momento se sienta único." },
              { icon: Sparkles, title: "Eventos artísticos", text: "Montajes para celebraciones y Festivales de las Artes." },
            ].map((item) => (
              <article key={item.title} className="group min-h-72 bg-[#f5f1e7] p-6 transition duration-500 hover:-translate-y-2 hover:bg-[#f6c400] hover:shadow-2xl">
                <item.icon className="h-7 w-7 transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-125" />
                <h3 className="mt-24 text-2xl font-black uppercase leading-none">{item.title}</h3>
                <p className="mt-4 text-sm font-semibold leading-6 text-black/58">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#090909] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#f6c400]">Reservá tu espacio</p>
            <h2 className="cinema-display mt-4 max-w-4xl text-[clamp(3.4rem,7vw,7rem)] font-black uppercase leading-[.8] tracking-[-.06em]">Tu próxima canción puede empezar hoy.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center justify-center gap-3 bg-[#f6c400] px-6 text-xs font-black uppercase text-black hover:bg-white">
              WhatsApp 6179-2121 <MessageCircle className="h-5 w-5" />
            </a>
            <Link href="/contacto" className="inline-flex min-h-14 items-center justify-center gap-3 border border-white/25 px-6 text-xs font-black uppercase hover:border-[#f6c400] hover:text-[#f6c400]">
              Ubicación y contacto <CalendarDays className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
