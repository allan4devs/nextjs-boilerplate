import type { Metadata } from "next";
import { AdminLogPage } from "@/app/components/admin/pages/AdminLogPage";

export const metadata: Metadata = { title: "Bitácora | Admin" };

export default function AdminBitacoraRoute() {
  return <AdminLogPage />;
}
