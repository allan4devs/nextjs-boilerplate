import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Dzcate | Zacate Zoysia Toro — Instalación incluida",
  },
  description:
    "Oferta especial de zacate Zoysia Toro. Instalado desde ₡3,000/m² o sin instalar desde ₡2,200/m². Suave, seguro para niños y mascotas. Cotice por WhatsApp.",
  openGraph: {
    title: "Dzcate | Zacate Zoysia Toro",
    description:
      "El mejor zacate para su jardín. Instalación profesional incluida. Cotice sin compromiso.",
    type: "website",
    locale: "es_CR",
    siteName: "Dzcate",
    images: [{ url: "/dzcate/oferta.jpg" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#14532d",
  colorScheme: "light",
};

export default function DzcateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-[#f4f7f0] text-stone-900 antialiased">
      {children}
    </div>
  );
}
