import type { Metadata } from "next";
import { AdminPaymentsPage } from "@/app/components/admin/pages/AdminPaymentsPage";

export const metadata: Metadata = { title: "Pagos | Admin" };

export default function AdminPagosRoute() {
  return <AdminPaymentsPage />;
}
