import { XTREME_CHECKOUT_OPTIONS } from "@/lib/constants/checkout";

/**
 * Fuente única de los destinos de conversión del sitio público.
 *
 * Regla: todo CTA de servicio termina en una superficie donde se puede pagar o
 * registrarse dentro del sitio. WhatsApp y teléfono quedan como apoyo, nunca
 * como el único camino de un servicio que sí se puede contratar en línea.
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
    pay: "Inscribirme y pagar",
    free: "Primer día gratis",
    support:
      "Elegí tu plan y pagá en línea desde esta misma página: el acceso queda activo apenas se confirma el cobro.",
    trust: ["Pago en línea seguro", "Acceso al confirmar", "Sin contratos"],
  },
  en: {
    pay: "Join and pay online",
    free: "Free first day",
    support:
      "Pick your plan and pay online right here: your access is active as soon as the payment is confirmed.",
    trust: ["Secure online payment", "Access on confirmation", "No contracts"],
  },
};
