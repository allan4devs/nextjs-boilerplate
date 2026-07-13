import type { Metadata } from "next";
import CommunityClient from "../../../components/CommunityClient";
import { pageMetadata } from "../../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Comunidad Xtreme",
  description: "Liga mensual, referidos y compas de entrenamiento.",
  path: "/app/comunidad",
});

export default function ComunidadPage() {
  return <CommunityClient />;
}
