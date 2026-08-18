import type { Metadata } from "next";
import { AdminGamificationPage } from "@/app/components/admin/pages/AdminGamificationPage";

export const metadata: Metadata = { title: "Gamificación | Admin" };

export default function AdminGamificacionRoute() {
  return <AdminGamificationPage />;
}
