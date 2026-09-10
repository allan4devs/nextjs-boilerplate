import type { Metadata } from "next";
import { AdminMachineMediaPage } from "@/app/components/admin/pages/AdminMachineMediaPage";

export const metadata: Metadata = { title: "Video y fotos | Admin" };

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ assetId?: string }> };

export default async function AdminEquipoMediaRoute({ params, searchParams }: Params) {
  const { id } = await params;
  const { assetId } = await searchParams;
  return <AdminMachineMediaPage machineId={id} assetId={assetId} />;
}
