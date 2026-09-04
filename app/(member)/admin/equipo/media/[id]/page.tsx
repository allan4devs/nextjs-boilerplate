import type { Metadata } from "next";
import { AdminMachineMediaPage } from "@/app/components/admin/pages/AdminMachineMediaPage";

export const metadata: Metadata = { title: "Video y fotos | Admin" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminEquipoMediaRoute({ params }: Params) {
  const { id } = await params;
  return <AdminMachineMediaPage machineId={id} />;
}
