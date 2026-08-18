import type { Metadata } from "next";
import { AdminToolsPage } from "@/app/components/admin/pages/AdminToolsPage";

export const metadata: Metadata = { title: "Herramientas | Admin" };

export default function AdminToolsRoute() {
  return <AdminToolsPage />;
}
