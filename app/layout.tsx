import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaRuntime from "./components/PwaRuntime";
import { SITE_URL } from "./lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Xtreme Gym",
  title: {
    default: "Xtreme Gym | Ciudad Quesada",
    template: "%s | Xtreme Gym",
  },
  description:
    "Gimnasio en Ciudad Quesada, San Carlos, con fuerza, funcional, cardio, adultos mayores, app de socios y pago en línea.",
  openGraph: {
    title: "Xtreme Gym | Ciudad Quesada",
    description:
      "Entrene en Ciudad Quesada con planes flexibles, zonas completas, clases, app de socios y acompañamiento.",
    url: "/",
    type: "website",
    locale: "es_CR",
    siteName: "Xtreme Gym",
  },
  twitter: {
    card: "summary_large_image",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Xtreme Gym",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f6c400",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRuntime />
        {children}
      </body>
    </html>
  );
}
