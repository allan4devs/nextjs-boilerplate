import type { Metadata } from "next";
import SiteHeader from "../../components/SiteHeader";
import CommunityClient from "../../components/CommunityClient";

export const metadata: Metadata = { title: "Comunidad Xtreme", description: "Liga mensual, referidos y compas de entrenamiento." };

export default function ComunidadPage() {
  return <><SiteHeader /><CommunityClient /></>;
}
