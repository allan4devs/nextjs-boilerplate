import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recepción",
  robots: { index: false, follow: false },
  manifest: "/manifest-recepcion.webmanifest",
};

export default function RecepcionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
