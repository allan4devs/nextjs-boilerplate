import type { Metadata } from "next";
import { AdminEquipmentPage } from "@/app/components/admin/pages/AdminEquipmentPage";

export const metadata: Metadata = { title: "Equipo | Admin" };

export default function AdminEquipoRoute() {
  return <AdminEquipmentPage />;
}
