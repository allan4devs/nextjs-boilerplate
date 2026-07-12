import type { Metadata } from "next";
import CommunityClient from "../../../components/CommunityClient";

export const metadata: Metadata = { title: "Comunidad Xtreme", description: "Liga mensual, referidos y compas de entrenamiento." };

export default function ComunidadPage() {
  return <CommunityClient />;
}
