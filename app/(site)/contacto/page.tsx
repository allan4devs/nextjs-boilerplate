import type { Metadata } from "next";
import PageHero from "../../components/PageHero";
import ImageTile from "../../components/ImageTile";
import { BUSINESS, SCHEDULE, telLink, waLink } from "../../lib/site";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contacto y ubicación",
  description:
    "Horarios, teléfono, correo y ubicación de Xtreme Gym en Ciudad Quesada, Barrio San Pablo. Escríbanos por WhatsApp.",
};

export default function ContactoPage() {
  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title="Su próximo entreno"
        highlight="empieza aquí."
        text={`${BUSINESS.location}. Escriba por WhatsApp para consultar horarios, costos, clases o una visita al gimnasio.`}
        image="https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=2000&q=86"
        imageAlt="Persona entrenando con pesas"
      />

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Horario</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">Abrimos temprano.</h2>
            <div className="mt-8 grid gap-3">
              {SCHEDULE.map((item) => (
                <div
                  key={item.day}
                  className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="flex items-center gap-3 font-black uppercase">
                    <Clock className="h-5 w-5 text-[#f6c400]" />
                    {item.day}
                  </span>
                  <span className="text-sm font-bold text-white/58">{item.hours}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3">
              <a
                href={telLink}
                className="flex items-center gap-3 border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#f6c400]/55"
              >
                <Phone className="h-5 w-5 text-[#f6c400]" />
                <span className="font-bold text-white/78">{BUSINESS.phone}</span>
              </a>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="flex items-center gap-3 border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#f6c400]/55"
              >
                <Mail className="h-5 w-5 text-[#f6c400]" />
                <span className="break-all font-bold text-white/78">{BUSINESS.email}</span>
              </a>
            </div>
          </div>

          <div className="grid overflow-hidden border border-white/10 bg-black lg:grid-cols-[.9fr_1.1fr]">
            <ImageTile
              src="https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=900&q=84"
              alt="Persona entrenando con pesas"
              className="min-h-[360px]"
            />
            <div className="grid place-items-center p-6 text-center">
              <div>
                <MapPin className="mx-auto h-12 w-12 text-[#f6c400]" />
                <p className="mt-5 text-3xl font-black uppercase">Xtreme Gym</p>
                <p className="mt-2 text-sm font-semibold text-white/55">{BUSINESS.location}</p>
                <p className="mt-1 text-sm font-semibold text-white/42">
                  {BUSINESS.phone} - {BUSINESS.email}
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <a
                    href={waLink("Hola Xtreme Gym, quiero información para entrenar.")}
                    className="inline-flex items-center gap-2 bg-[#f6c400] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                  <a
                    href={BUSINESS.maps}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border border-white/15 px-5 py-3 font-black uppercase text-white transition hover:border-white/35"
                  >
                    Cómo llegar
                    <MapPin className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0b0b0b] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Ubicación</p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
                Llegue directo a Xtreme Gym.
              </h2>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/58">
                Estamos en {BUSINESS.location}. Abra el mapa y venga con ganas de moverse.
              </p>
            </div>
            <a
              href={BUSINESS.maps}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#f6c400] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
            >
              Cómo llegar
              <MapPin className="h-4 w-4" />
            </a>
          </div>

          <div className="overflow-hidden border border-white/10 bg-black">
            <iframe
              title="Mapa de Xtreme Gym en Ciudad Quesada"
              src="https://www.google.com/maps?q=Xtreme%20Gym%20Ciudad%20Quesada%20Barrio%20San%20Pablo&output=embed"
              className="h-[420px] w-full border-0 grayscale invert-[.92] contrast-125 md:h-[520px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
}
