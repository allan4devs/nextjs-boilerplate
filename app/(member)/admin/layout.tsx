import type { Metadata } from "next";
import { AdminProvider } from "@/app/components/admin/context/AdminProvider";
import { AdminShell } from "@/app/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
