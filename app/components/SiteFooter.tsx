"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CreditCard, MapPin, MessageCircle, Star } from "lucide-react";
import { BUSINESS, NAV_LINKS, waLink } from "../lib/site";

/** Rutas de app / operación: sin footer de marketing ni CTA sticky. */
function isOsSurface(pathname: string) {
  if (pathname === "/app" || pathname.startsWith("/app/")) return true;
  if (pathname === "/recepcion" || pathname.startsWith("/recepcion/")) return true;
  if (pathname === "/ingreso" || pathname.startsWith("/ingreso/")) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname === "/entrenador" || pathname.startsWith("/entrenador/")) return true;
  if (pathname === "/acceso") return true;
  return false;
}

export default function SiteFooter() {
  const pathname = usePathname() || "";
  if (isOsSurface(pathname)) return null;

  const english = pathname === "/en" || pathname.startsWith("/en/");
  const navLabels = ["Training", "Prices", "Seniors", "App", "FAQ", "Contact"];
  const englishHrefs = ["/en/training", "/en/prices", "/en/seniors", "/app", "/en/faq", "/en/contact"];

  const showMobileCta = !pathname.startsWith("/gracias") && !pathname.startsWith("/registro");

  return (
    <>
      <footer
        id="mapa-footer"
        className={`border-t border-white/10 bg-[#070707] px-5 pt-12 sm:px-8 md:pb-12 ${
          showMobileCta ? "xg-site-footer-with-cta" : "pb-12"
        }`}
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-2xl font-black uppercase">
              Xtreme<span className="text-[#f6c400]">Gym</span>
            </p>
            <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-white/55">
              {english
                ? `${BUSINESS.location}. Complete equipment, instructor support, body assessments, parking and spaces that make consistency easier.`
                : `${BUSINESS.location}. Equipo completo, acompañamiento de instructores, medición corporal, parqueo y espacios que hacen más simple sostener el hábito.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={english ? "/en/prices" : "/precios#inscripcion"}
                className="inline-flex items-center gap-2 bg-[#f6c400] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
              >
                <CreditCard className="h-4 w-4" />
                {english ? "Join now" : "Inscribirme"}
              </Link>
              <a
                href={waLink("Hola Xtreme Gym, quiero información para entrenar.")}
                className="inline-flex items-center gap-2 border border-white/15 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-white/35"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-black uppercase tracking-[0.12em] text-white/55 sm:grid-cols-3 lg:justify-items-end">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={english ? englishHrefs[NAV_LINKS.indexOf(link)] : link.href} className="transition hover:text-[#f6c400]">
                {english ? navLabels[NAV_LINKS.indexOf(link)] : link.label}
              </Link>
            ))}
            <Link href={english ? "/en/benefits" : "/beneficios"} className="transition hover:text-[#f6c400]">
              {english ? "Benefits" : "Beneficios"}
            </Link>
            <a
              href={BUSINESS.maps}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-[#f6c400]"
            >
              <MapPin className="h-4 w-4" />
              {english ? "Map" : "Mapa"}
            </a>
          </nav>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm font-bold text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>Xtreme Gym - Ciudad Quesada, Barrio San Pablo</span>
          <span className="inline-flex items-center gap-2">
            <Star className="h-4 w-4 text-[#f6c400]" />
            {english ? "Habits, movement and progress" : "Hábitos, movimiento y progreso"}
          </span>
        </div>
      </footer>

      {showMobileCta && (
        <div className="xg-mobile-cta fixed z-40 md:hidden">
          <Link
            href={english ? "/en/prices" : "/precios#inscripcion"}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 border-[2px] border-[#f6c400] bg-[#f6c400] px-5 text-xs font-black uppercase text-black shadow-[4px_4px_0_rgba(0,0,0,.55)] transition active:translate-y-px active:shadow-[2px_2px_0_rgba(0,0,0,.55)]"
          >
            {english ? "See plans" : "Ver planes"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}
