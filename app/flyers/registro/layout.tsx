import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Póster Oficial App | Xtreme Gym Costa Rica",
  robots: { index: false, follow: false },
};

export default function FlyerLayout({ children }: { children: React.ReactNode }) {
  // Layout standalone: sin header ni footer del site
  return children;
}
