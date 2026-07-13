import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Xtreme Gym App",
    short_name: "Xtreme Gym",
    description:
      "App de socios de Xtreme Gym para rachas, check-ins, reservas, planes y progreso corporal.",
    id: "/app",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#070707",
    theme_color: "#070707",
    lang: "es-CR",
    dir: "ltr",
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
        description: "Abrir el dashboard de socios (Member OS).",
        url: "/app",
        icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Reception OS",
        short_name: "Recepción",
        description: "Ingreso de socios y mostrador (check-in, altas, chat).",
        url: "/recepcion",
        icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
