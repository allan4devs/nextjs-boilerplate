import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Oculta el indicador flotante de Next en dev (logo "N").
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    // Vercel restaura .next/cache entre builds; Turbopack reutiliza el grafo
    // compilado y reduce de forma importante los builds consecutivos.
    turbopackFileSystemCacheForBuild: true,
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
