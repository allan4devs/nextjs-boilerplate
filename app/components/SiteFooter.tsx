import Link from "next/link";
import { ArrowRight, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { BUSINESS, NAV_LINKS, telLink, waLink } from "../lib/site";

export default function SiteFooter() {
  return (
    <>
      <footer className="border-t border-white/10 bg-[#070707] px-5 pb-24 pt-12 sm:px-8 md:pb-12">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-2xl font-black uppercase">
              Xtreme<span className="text-[#f6c400]">Gym</span>
            </p>
            <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-white/55">
              {BUSINESS.location}. Fuerza, funcional, cardio, adultos mayores y una app de socios
              para sostener el hábito.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={waLink("Hola Xtreme Gym, quiero información para entrenar.")}
                className="inline-flex items-center gap-2 bg-[#f6c400] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href={telLink}
                className="inline-flex items-center gap-2 border border-white/15 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-white/35"
              >
                <Phone className="h-4 w-4" />
                {BUSINESS.phone}
              </a>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-black uppercase tracking-[0.12em] text-white/55 sm:grid-cols-3 lg:justify-items-end">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-[#f6c400]">
                {link.label}
              </Link>
            ))}
            <a
              href={BUSINESS.maps}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-[#f6c400]"
            >
              <MapPin className="h-4 w-4" />
              Mapa
            </a>
          </nav>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm font-bold text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>Xtreme Gym - Ciudad Quesada, Barrio San Pablo</span>
          <span className="inline-flex items-center gap-2">
            <Star className="h-4 w-4 text-[#f6c400]" />
            Hábitos, movimiento y progreso
          </span>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/92 px-3 py-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <Link
            href="/primer-dia#reservar"
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#f6c400] px-3 text-xs font-black uppercase text-black"
          >
            Reservar día
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/precios"
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 bg-white/[0.06] px-3 text-xs font-black uppercase text-white"
          >
            Ver planes
          </Link>
        </div>
      </div>
    </>
  );
}
