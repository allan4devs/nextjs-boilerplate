"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronRight, MessageCircle, Phone, X } from "lucide-react";
import { NAV_LINKS, BUSINESS, telLink, waLink } from "../lib/site";

const WA_HEADER = waLink("Hola Xtreme Gym, quiero empezar a entrenar y conocer las opciones disponibles.");

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled
          ? "border-white/10 bg-[#070707]/90 shadow-[0_10px_40px_-24px_rgba(0,0,0,1)] backdrop-blur-xl"
          : "border-transparent bg-[#070707]/60 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-[#f6c400]/50 bg-[#f6c400] text-black shadow-[0_0_28px_-12px_rgba(246,196,0,.9)] transition group-hover:shadow-[0_0_28px_-6px_rgba(246,196,0,.9)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/xtreme/logo.jpg" alt="Xtreme Gym" className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0 text-lg font-black uppercase tracking-tight">
            Xtreme<span className="text-[#f6c400]">Gym</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                  active ? "text-[#f6c400]" : "text-white/58 hover:text-white"
                }`}
              >
                {link.label}
                <span
                  className={`absolute inset-x-3 -bottom-0.5 h-0.5 origin-left bg-[#f6c400] transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/precios"
            className="hidden items-center gap-2 border border-white/20 bg-white/[0.07] px-4 py-2.5 text-sm font-black uppercase text-white transition hover:border-white/45 hover:bg-white/10 xl:inline-flex"
          >
            Inscribirme
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={WA_HEADER}
            className="hidden items-center gap-2 bg-[#f6c400] px-5 py-2.5 text-sm font-black uppercase text-black shadow-[0_0_30px_-14px_rgba(246,196,0,.9)] transition hover:bg-white sm:inline-flex"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="grid h-11 w-11 place-items-center border border-white/15 bg-white/[0.06] text-white transition hover:border-[#f6c400]/60 lg:hidden"
          >
            {open ? (
              <X className="h-5 w-5" />
            ) : (
              <span className="grid gap-1.5">
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-3.5 bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 top-[73px] z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <nav className="relative max-h-[calc(100dvh-73px)] overflow-y-auto border-b border-white/10 bg-[#0b0b0b] px-5 pb-6 pt-3">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-4 border-b border-white/[0.07] py-4 transition ${
                    active ? "text-[#f6c400]" : "text-white hover:text-[#f6c400]"
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center border transition ${
                      active
                        ? "border-[#f6c400] bg-[#f6c400] text-black"
                        : "border-white/12 bg-white/[0.05] text-[#f6c400]"
                    }`}
                  >
                    <link.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black uppercase tracking-[0.1em]">{link.label}</span>
                    <span className="mt-0.5 block text-xs font-semibold leading-5 text-white/45">
                      {link.description}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
                </Link>
              );
            })}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={WA_HEADER}
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#f6c400] px-5 text-sm font-black uppercase text-black transition hover:bg-white"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href={telLink}
                className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 px-5 text-sm font-black uppercase text-white transition hover:border-white/40"
              >
                <Phone className="h-4 w-4" />
                {BUSINESS.phone}
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
