import { XTREME_CHECKOUT_OPTIONS } from "@/lib/constants/checkout";

/**
 * Fuente única de los destinos de conversión del sitio público.
 *
 * Regla: los planes se coordinan por WhatsApp. El sitio conserva la selección
 * de opciones y el primer día gratis, pero no procesa cobros en línea.
 */

export type CtaLocale = "es" | "en";

/** Anchor de la sección de checkout embebida (ExtremeGymCheckout). */
export const CHECKOUT_ANCHOR = "inscripcion";

const PRICES_PATH: Record<CtaLocale, string> = { es: "/precios", en: "/en/prices" };
const FREE_DAY_PATH: Record<CtaLocale, string> = { es: "/primer-dia", en: "/en/first-day" };

/** Deep link al checkout con el plan ya preseleccionado. */
export function checkoutHref(plan?: string, locale: CtaLocale = "es") {
  const query = plan ? `?plan=${plan}` : "";
  return `${PRICES_PATH[locale]}${query}#${CHECKOUT_ANCHOR}`;
}

/** Deep link al registro del primer día gratis. */
export function freeDayHref(locale: CtaLocale = "es") {
  return locale === "es" ? `${FREE_DAY_PATH.es}#registro` : FREE_DAY_PATH.en;
}

function priceLabel(optionId: string) {
  return XTREME_CHECKOUT_OPTIONS.find((option) => option.id === optionId)?.priceLabel ?? "";
}

/** Ancla de precio para los CTA: siempre sale del catálogo real de checkout. */
export function planPriceAnchor(locale: CtaLocale = "es") {
  const week = priceLabel("week");
  const month = priceLabel("month");
  return locale === "es"
    ? `Desde ${week} la semana · ${month} el mes`
    : `From ${week} per week · ${month} per month`;
}

export const CTA_COPY: Record<
  CtaLocale,
  { pay: string; free: string; support: string; trust: readonly string[] }
> = {
  es: {
    pay: "Consultar por WhatsApp",
    free: "Primer día gratis",
    support:
      "Elegí tu plan y escribinos por WhatsApp; recepción te ayuda a completar la inscripción.",
    trust: ["Atención por WhatsApp", "Planes claros", "Sin contratos"],
  },
  en: {
    pay: "Ask on WhatsApp",
    free: "Free first day",
    support:
      "Pick your plan and message us on WhatsApp; reception will help you complete your membership.",
    trust: ["WhatsApp support", "Clear plans", "No contracts"],
  },
};
