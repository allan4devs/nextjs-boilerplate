import { CreditCard, Zap } from "lucide-react";
import CtaLink from "./CtaLink";
import {
  CTA_COPY,
  checkoutHref,
  freeDayHref,
  planPriceAnchor,
  type CtaLocale,
} from "../lib/cta";

/**
 * Banda de cierre de cada página pública.
 *
 * El CTA principal siempre lleva al checkout embebido (pago dentro del sitio);
 * el secundario al registro del primer día gratis. Los destinos y el precio
 * salen de `app/lib/cta.ts` para que no se desincronicen del catálogo real.
 */
export default function CtaBand({
  eyebrow,
  title,
  cta,
  href,
  secondaryCta,
  secondaryHref,
  plan = "month",
  locale = "es",
  support,
  showPrice = true,
}: {
  eyebrow?: string;
  title: string;
  cta?: string;
  href?: string;
  secondaryCta?: string;
  secondaryHref?: string;
  /** Plan preseleccionado en el checkout al llegar desde esta banda. */
  plan?: string;
  locale?: CtaLocale;
  support?: string;
  showPrice?: boolean;
}) {
  const copy = CTA_COPY[locale];
  const payHref = href ?? checkoutHref(plan, locale);
  const payLabel = cta ?? copy.pay;
  const freeHref = secondaryHref ?? freeDayHref(locale);
  const freeLabel = secondaryCta ?? copy.free;
  const eyebrowLabel = eyebrow ?? (locale === "es" ? "Primer paso" : "First step");

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#f6c400] px-5 py-16 text-black sm:px-8">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,#000_1px,transparent_1px)] [background-size:54px_54px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-black/65">{eyebrowLabel}</p>
          <h2 className="mt-3 max-w-4xl text-balance text-4xl font-black uppercase leading-none sm:text-6xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-sm font-bold leading-6 text-black/60">
            {support ?? copy.support}
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {copy.trust.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-2 border border-black/25 bg-black/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-black/70"
              >
                <span className="h-1.5 w-1.5 shrink-0 bg-black" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto">
          {showPrice && (
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/65 sm:text-right">
              {planPriceAnchor(locale)}
            </p>
          )}
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <CtaLink
              href={payHref}
              cta={payLabel}
              plan={plan}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 border-[3px] border-black bg-white px-6 text-center font-black uppercase text-black transition hover:bg-black hover:text-white sm:w-auto"
            >
              {payLabel}
              <CreditCard className="h-5 w-5 shrink-0" />
            </CtaLink>
            <CtaLink
              href={freeHref}
              cta={freeLabel}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 bg-black px-6 text-center font-black uppercase text-white transition hover:bg-white hover:text-black sm:w-auto"
            >
              {freeLabel}
              <Zap className="h-5 w-5 shrink-0" />
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
