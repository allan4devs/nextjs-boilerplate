import type { NextConfig } from "next";
import { dirname, join } from "node:path";

const nextConfig: NextConfig = {
  // Build standalone: server mínimo con solo los node_modules necesarios,
  // pensado para la imagen de Docker (ver Dockerfile).
  output: "standalone",
  // Oculta el indicador flotante de Next en dev (logo "N").
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // `@vladmandic/human` expone un build Node que requiere `tfjs-node` y su
  // exportación condicional gana durante el bundle SSR de Client Components.
  // Esta app solo usa Human en el navegador, así que fijamos su build ESM web.
  turbopack: {
    resolveAlias: {
      "@vladmandic/human": "./node_modules/@vladmandic/human/dist/human.esm.js",
    },
  },
  experimental: {
    // Evitar un trabajador por núcleo durante el build de todas las rutas.
    cpus: 2,
    // Reducir el pico de compilación de Webpack usado en desarrollo.
    webpackMemoryOptimizations: true,
    // El alias personalizado desactiva este worker por defecto; reactivarlo
    // permite liberar cada compilación antes de pasar a la siguiente.
    webpackBuildWorker: true,
    // Objetivo de memoria de Turbopack; no es un límite del RSS total.
    turbopackMemoryLimit: 2 * 1024 * 1024 * 1024,
    // Vercel restaura .next/cache entre builds; Turbopack reutiliza el grafo
    // compilado y reduce de forma importante los builds consecutivos.
    turbopackFileSystemCacheForBuild: true,
  },
  webpack(config) {
    // Conservar la resolución web de Human al usar Webpack en desarrollo.
    config.resolve.alias["@vladmandic/human$"] = join(dirname(require.resolve("@vladmandic/human")), "human.esm.js");
    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    qualities: [60, 70, 72, 74, 76, 78, 82],
    minimumCacheTTL: 2_678_400,
  },
  async headers() {
    return [
      {
        source: "/xtreme/:path*.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
