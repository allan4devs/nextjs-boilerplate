import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicQrGroups } from "@/lib/xtreme/public-qr-groups";

export const dynamic = "force-dynamic";

export default async function QrGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = (await getPublicQrGroups()).find(item => item.id === id);
  if (!group) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/maquinas" className="text-sm text-lime-300">Volver al catálogo</Link>
      <p className="mt-8 text-sm text-white/60">{group.area} · Etiqueta grupal</p>
      <h1 className="mt-3 text-3xl font-black">{group.name}</h1>
      <p className="mt-2 font-bold">{group.code}</p>
      <p className="mt-8 text-white/70">{group.description}</p>
      <p className="mt-4 text-sm text-white/50">Fotos y videos pendientes de asociar.</p>
    </main>
  );
}
