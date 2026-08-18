import type { Metadata } from "next";
import { AdminUsersPage } from "@/app/components/admin/pages/AdminUsersPage";

export const metadata: Metadata = { title: "Users | Admin" };

export default function AdminUsersRoute() {
  return <AdminUsersPage />;
}
