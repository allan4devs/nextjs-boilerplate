import type { Metadata } from "next";
import { AdminRevenuePage } from "@/app/components/admin/pages/AdminRevenuePage";

export const metadata: Metadata = { title: "Ingresos | Admin" };

export default function AdminIngresosRoute() {
  return <AdminRevenuePage />;
}
