import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recepción",
  robots: { index: false, follow: false },
};

export default function RecepcionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
