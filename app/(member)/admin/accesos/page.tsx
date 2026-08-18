import type { Metadata } from "next";
import { AdminAccessPage } from "@/app/components/admin/pages/AdminAccessPage";

export const metadata: Metadata = { title: "Accesos | Admin" };

export default function AdminAccesosRoute() {
  return <AdminAccessPage />;
}
