import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ingreso",
  robots: { index: false, follow: false },
  manifest: "/manifest-ingreso.webmanifest",
};

export default function IngresoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
