import Link from "next/link";
import { ArrowRight, CreditCard, Zap } from "lucide-react";

export default function CtaBand({
  eyebrow = "Primer paso",
  title,
  cta = "Inscribirme",
  href = "/precios#inscripcion",
  secondaryCta = "Primer día gratis",
  secondaryHref = "/primer-dia",
}: {
  eyebrow?: string;
  title: string;
  cta?: string;
  href?: string;
  secondaryCta?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#f6c400] px-5 py-16 text-black sm:px-8">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,#000_1px,transparent_1px)] [background-size:54px_54px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-black/55">{eyebrow}</p>
          <h2 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none sm:text-6xl">{title}</h2>
          <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-black/58">
            Probá sin compromiso o inscribite hoy y activá tu acceso al instante con PayPal.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href={secondaryHref}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 bg-black px-6 font-black uppercase text-white transition hover:bg-white hover:text-black sm:w-auto"
          >
            {secondaryCta}
            <Zap className="h-5 w-5" />
          </Link>
          <Link
            href={href}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 border-[3px] border-black bg-white px-6 font-black uppercase text-black transition hover:bg-black hover:text-white sm:w-auto"
          >
            {cta}
            <CreditCard className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}