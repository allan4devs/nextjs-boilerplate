import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
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
  viewportFit: "cover",
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
        <Script id="google-tag-manager" strategy="afterInteractive">
          {"(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-P5TQ4JRF');"}
        </Script>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P5TQ4JRF"
            height="0"
            width="0"
            className="hidden invisible"
          />
        </noscript>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18319195306"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {"window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18319195306');"}
        </Script>
        <PwaRuntime />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
