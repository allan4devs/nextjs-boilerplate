import type { Metadata } from "next";
import { AdminEmailPage } from "@/app/components/admin/pages/AdminEmailPage";

export const metadata: Metadata = { title: "Correos | Admin" };

export default function AdminCorreosRoute() {
  return <AdminEmailPage />;
}
