import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Xtreme Gym App",
    short_name: "Xtreme Gym",
    description:
      "App de socios de Xtreme Gym para rachas, check-ins, reservas, planes y progreso corporal.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070707",
    theme_color: "#f6c400",
    categories: ["fitness", "health", "sports"],
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "App de socios",
        short_name: "Socios",
        description: "Abrir el dashboard de socios.",
        url: "/app",
        icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Ingreso al gym",
        short_name: "Ingreso",
        description: "Abrir check-in de recepción.",
        url: "/ingreso",
        icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
