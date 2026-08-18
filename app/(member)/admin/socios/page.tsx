import type { Metadata } from "next";
import { AdminMembersPage } from "@/app/components/admin/pages/AdminMembersPage";

export const metadata: Metadata = { title: "Socios | Admin" };

export default function AdminSociosRoute() {
  return <AdminMembersPage />;
}
