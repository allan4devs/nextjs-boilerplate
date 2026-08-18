import type { Metadata } from "next";
import { AdminFrame } from "@/app/components/admin/AdminFrame";
import { AdminLogPage } from "@/app/components/admin/pages/AdminLogPage";

export const metadata: Metadata = {
  title: "Bitácora | Admin",
  robots: { index: false, follow: false },
};

export default function AnalyticsRoute() {
  return (
    <AdminFrame>
      <AdminLogPage />
    </AdminFrame>
  );
}
