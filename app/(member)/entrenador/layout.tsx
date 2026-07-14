import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trainer OS",
  robots: { index: false, follow: false },
};

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
