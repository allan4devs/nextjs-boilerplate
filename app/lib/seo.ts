import type { Metadata } from "next";
import { APP_URL } from "@/lib/constants/app-url";
import { BUSINESS, COSTS, FAQS, SCHEDULE } from "./site";

export const SITE_URL = APP_URL;

export const SITE_NAME = "Xtreme Gym";

type PageMetadataInput = {
  title: string;
  description: string;
  /** Ruta absoluta desde la raíz, ej. "/precios". Se usa para canonical y og:url. */
  path: string;
  /** true cuando el título ya incluye la marca y no debe pasar por el template "%s | Xtreme Gym". */
  absoluteTitle?: boolean;
};

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      locale: "es_CR",
      siteName: SITE_NAME,
    },
  };
}

const DAY_MAP: Record<string, string[]> = {
  "Lunes a viernes": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "Sábados": ["Saturday"],
  "Domingos": ["Sunday"],
};

function to24h(time: string): string {
  const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return time;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;
  return `${String(hours).padStart(2, "0")}:${match[2] ?? "00"}`;
}

export function gymJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ExerciseGym",
    name: SITE_NAME,
    url: SITE_URL,
    image: `${SITE_URL}/pwa-icon-512.png`,
    telephone: `+506${BUSINESS.phone.replace(/\s/g, "")}`,
    email: BUSINESS.email,
    priceRange: "CRC 8.000 - CRC 23.000",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Barrio San Pablo",
      addressLocality: "Ciudad Quesada",
      addressRegion: "Alajuela",
      addressCountry: "CR",
    },
    hasMap: BUSINESS.maps,
    sameAs: Object.values(BUSINESS.social),
    openingHoursSpecification: SCHEDULE.map((entry) => {
      const [opens, closes] = entry.hours.split("-").map((part) => to24h(part));
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY_MAP[entry.day] ?? entry.day,
        opens,
        closes,
      };
    }),
    makesOffer: COSTS.map((cost) => ({
      "@type": "Offer",
      name: `Plan ${cost.period}`,
      price: cost.price === "Gratis" ? "0" : cost.price.replace(/[^\d]/g, ""),
      priceCurrency: "CRC",
    })),
  };
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
