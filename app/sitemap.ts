import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/seo";

const ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/precios", changeFrequency: "weekly", priority: 0.9 },
  { path: "/zonas", changeFrequency: "monthly", priority: 0.8 },
  { path: "/beneficios", changeFrequency: "monthly", priority: 0.8 },
  { path: "/adultos-mayores", changeFrequency: "monthly", priority: 0.8 },
  { path: "/primer-dia", changeFrequency: "monthly", priority: 0.8 },
  { path: "/preguntas", changeFrequency: "monthly", priority: 0.7 },
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
