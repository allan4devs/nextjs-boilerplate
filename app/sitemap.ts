import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/seo";
import { MACHINE_GUIDE } from "./lib/machines";

const ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/precios", changeFrequency: "weekly", priority: 0.9 },
  { path: "/zonas", changeFrequency: "monthly", priority: 0.8 },
  { path: "/beneficios", changeFrequency: "monthly", priority: 0.8 },
  { path: "/bronceado", changeFrequency: "monthly", priority: 0.8 },
  { path: "/adultos-mayores", changeFrequency: "monthly", priority: 0.8 },
  { path: "/primer-dia", changeFrequency: "monthly", priority: 0.8 },
  { path: "/preguntas", changeFrequency: "monthly", priority: 0.7 },
  { path: "/ayuda", changeFrequency: "monthly", priority: 0.7 },
  { path: "/normas", changeFrequency: "yearly", priority: 0.5 },
  { path: "/terminos", changeFrequency: "yearly", priority: 0.5 },
  { path: "/privacidad", changeFrequency: "yearly", priority: 0.5 },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.7 },
  { path: "/en", changeFrequency: "weekly", priority: 0.9 },
  { path: "/en/prices", changeFrequency: "weekly", priority: 0.8 },
  { path: "/en/training", changeFrequency: "monthly", priority: 0.7 },
  { path: "/en/benefits", changeFrequency: "monthly", priority: 0.7 },
  { path: "/en/seniors", changeFrequency: "monthly", priority: 0.7 },
  { path: "/en/first-day", changeFrequency: "monthly", priority: 0.7 },
  { path: "/en/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/en/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/app/comunidad", changeFrequency: "monthly", priority: 0.5 },
  { path: "/dzcate", changeFrequency: "monthly", priority: 0.3 },
  { path: "/maquinas", changeFrequency: "monthly", priority: 0.7 },
  ...MACHINE_GUIDE.map((machine) => ({
    path: `/maquinas/${machine.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
