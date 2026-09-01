import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Dumbbell } from "lucide-react";
import { APP_URL } from "@/lib/constants/app-url";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Guía de máquinas | Xtreme Gym",
    template: "%s | Máquinas Xtreme",
  },
  description:
    "Catálogo de máquinas y estaciones de Xtreme Gym: para qué sirve cada una, cómo se ajusta, tips, errores comunes y video de técnica. Escaneá el QR de la máquina en sala.",
  openGraph: {
    title: "Guía de máquinas · Xtreme Gym",
    description:
      "Para qué sirve cada máquina, cómo se ajusta y video de técnica. Escaneá el QR en sala.",
    url: "/maquinas",
    type: "website",
    locale: "es_CR",
    siteName: "Xtreme Gym",
  },
};

export default function MaquinasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#070707] text-white selection:bg-[#d8ff3e] selection:text-black">
      <header className="sticky top-0 z-30 border-b-[3px] border-[#d8ff3e]/25 bg-[#070707]/92 backdrop-blur supports-[backdrop-filter]:bg-[#070707]/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/maquinas"
            className="group flex items-center gap-2.5 focus-visible:outline-none"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black/40 bg-[#d8ff3e] text-black shadow-[3px_3px_0_rgba(0,0,0,0.6)] transition group-focus-visible:ring-2 group-focus-visible:ring-[#d8ff3e] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#070707]">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black uppercase tracking-[0.08em]">Xtreme Gym</span>
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#d8ff3e]">
                Guía de máquinas
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em]">
            <Link
              href="/"
              className="hidden min-h-11 items-center border-2 border-white/20 px-3 text-white/65 transition hover:border-white/45 hover:text-white focus-visible:border-[#d8ff3e] focus-visible:text-white focus-visible:outline-none sm:inline-flex"
            >
              Sitio
            </Link>
            <Link
              href="/app"
              className="inline-flex min-h-11 items-center gap-1.5 border-2 border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-3 text-[#eaff93] transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/20 focus-visible:border-[#d8ff3e] focus-visible:outline-none"
            >
              Mi app <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-[#070707] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40 sm:flex-row sm:items-center">
          <p>Xtreme Gym · Ciudad Quesada, San Carlos</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/zonas" className="transition hover:text-white/70">
              Zonas
            </Link>
            <Link href="/precios" className="transition hover:text-white/70">
              Precios
            </Link>
            <Link href="/app" className="transition hover:text-white/70">
              App de socios
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
