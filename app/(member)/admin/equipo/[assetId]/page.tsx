import type { Metadata } from "next";
import { AdminEquipmentPage } from "@/app/components/admin/pages/AdminEquipmentPage";

export const metadata: Metadata = { title: "Editar m?quina | Admin" };

export default async function AdminEquipmentDetailRoute({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return <AdminEquipmentPage key={assetId} assetId={assetId} />;
}
