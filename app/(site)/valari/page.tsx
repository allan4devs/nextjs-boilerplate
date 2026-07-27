import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, CalendarDays, Heart, MapPin, MessageCircle, Music2, Sparkles, Users } from "lucide-react";
import HeroTrainingVideo from "../../components/HeroTrainingVideo";
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
      <section className="cinema-home-hero cinema-stage relative isolate overflow-hidden border-b border-white/10 bg-[#050505]">
        <div className="cinema-stage-image absolute inset-[-2%] z-0 overflow-hidden">
          <HeroTrainingVideo
            src="/valari/hero-bachata-pixabay.mp4"
            poster="/valari/hero-bachata-pixabay.jpg"
            label="Pareja bailando bachata"
          />
        </div>
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(5,3,2,.9)_0%,rgba(5,3,2,.46)_48%,rgba(5,3,2,.24)_100%),linear-gradient(0deg,rgba(5,3,2,.93)_0%,transparent_55%,rgba(5,3,2,.45)_100%)]" />
        <div className="cinema-vignette absolute inset-0 z-[1]" />

        <div className="cinema-home-hero-shell relative z-10 mx-auto flex max-w-[1600px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-[.18em] text-white/70">
            <span className="cinema-hero-pill inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 backdrop-blur-xl">
              <MapPin className="h-3.5 w-3.5 text-[#f6c400]" />
              Ciudad Quesada
            </span>
            <span className="cinema-hero-pill hidden min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 backdrop-blur-xl sm:inline-flex">
              <Music2 className="h-3.5 w-3.5 text-[#f6c400]" />
              Profesora Natalia Zapata
            </span>
          </div>

          <div className="relative flex flex-1 items-center py-16 sm:py-20">
            <div className="w-full max-w-6xl">
              <p className="mb-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.28em] text-white/72">
                <span className="h-px w-8 bg-[#f6c400]" />
                Salsa · bachata · baile popular
              </p>
              <h1 className="cinema-display cinema-hero-title max-w-6xl text-[clamp(4.4rem,11vw,11rem)] font-black uppercase leading-[.7] tracking-[-.085em]">
                Sentí el ritmo.
                <span className="block text-[#f6c400]">Bailá Valari.</span>
              </h1>
            </div>
          </div>

          <div className="cinema-hero-dock grid overflow-hidden rounded-[1.5rem] border border-white/15 bg-black/40 backdrop-blur-2xl lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-stretch">
            <div className="p-5 sm:p-6">
              <p className="max-w-2xl text-sm font-medium leading-6 text-white/78 sm:text-base sm:leading-7">
                Aprendé salsa, bachata y baile popular con técnica, confianza y una energía que se siente desde el primer paso.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 border-t border-white/10 p-4 lg:border-l lg:border-t-0">
              <a href={whatsapp} target="_blank" rel="noreferrer" className="cinema-cta inline-flex min-h-12 items-center gap-3 rounded-full bg-[#f6c400] px-5 text-xs font-black uppercase tracking-[.08em] text-black">
                Consultar clases <MessageCircle className="h-5 w-5" />
              </a>
              <a href="#servicios" className="inline-flex min-h-12 items-center gap-3 rounded-full border border-white/25 bg-white/[.06] px-5 text-xs font-black uppercase tracking-[.08em] text-white transition hover:border-white/60 hover:bg-white/10">
                Ver opciones <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
          <a href="#servicios" className="mx-auto mt-4 inline-flex min-h-11 items-center gap-3 text-[10px] font-black uppercase tracking-[.2em] text-white/60 transition hover:text-white">
            Descubrí Valari <ArrowDown className="h-4 w-4 text-[#f6c400]" />
          </a>
          <a
            href="https://pixabay.com/videos/dance-bachata-italy-love-couple-129523/"
            target="_blank"
            rel="noreferrer"
            className="absolute right-10 top-20 z-20 hidden text-[8px] font-bold uppercase tracking-[.15em] text-white/35 transition hover:text-white md:block"
          >
            Video: Reydeloficial / Pixabay
          </a>
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
