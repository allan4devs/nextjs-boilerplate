import type { Metadata } from "next";
import { Suspense } from "react";
import GraciasContent from "./GraciasContent";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "¡Gracias por tu pago!",
    description: "Tu pago se procesó correctamente. Tu acceso a Xtreme Gym ya está activo.",
    path: "/gracias",
  }),
  robots: { index: false, follow: false },
};

export default function GraciasPage() {
  return (
    <Suspense fallback={null}>
      <GraciasContent />
    </Suspense>
  );
}
