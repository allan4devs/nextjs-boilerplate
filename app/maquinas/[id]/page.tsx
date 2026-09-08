import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { GameCallout, GameChip, GamePanel } from "@/app/components/GameOS";
import {
  MACHINE_GUIDE,
  findMachineGuide,
  machinePath,
} from "@/app/lib/machines";
import { getDb } from "@/lib/helpers/mongodb";
import { getMachineMedia } from "@/lib/xtreme/machine-media";
import MachineGallery from "../_components/MachineGallery";
import MachineVideo from "../_components/MachineVideo";
import InventoryConnections from "../_components/InventoryConnections";
import { getPublicEquipment } from "@/lib/xtreme/public-equipment";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ asset?: string }> };

// El video/fotos de cada máquina se puede editar desde /admin/equipo, así que
// esta ficha se renderiza por request en vez de quedar fija del build estático.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return MACHINE_GUIDE.map((machine) => ({ id: machine.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const machine = findMachineGuide(id);
  if (!machine) return {};
  const description =
    machine.summary ?? `Cómo usar ${machine.name} en Xtreme Gym: ajuste, tips, errores y video de técnica.`;
  return {
    title: machine.name,
    description,
    alternates: { canonical: machinePath(machine.id) },
    openGraph: {
      title: `${machine.name} · Xtreme Gym`,
      description,
      url: machinePath(machine.id),
      type: "article",
      images: [{ url: machine.image }],
    },
  };
}

export default async function MachineDetailPage({ params, searchParams }: Params) {
  const { id } = await params;
  const machine = findMachineGuide(id);
  if (!machine) notFound();

  const [{ inventory, source }, query] = await Promise.all([getPublicEquipment(), searchParams]);
  const unit = inventory.find((asset) => asset.id === query.asset && asset.machineGuideId === machine.id);

  const db = await getDb();
  const media = await getMachineMedia(db, machine.id);
  const images = media?.images?.length ? media.images : machine.images;
  const image = images?.[0] ?? machine.image;
  const videoUrl = media?.videoUrl || machine.videoUrl;
  const videoLabel = media?.videoLabel || machine.videoLabel;

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Cómo usarla</p>
        <h1 className="mt-2 text-2xl font-black uppercase leading-tight tracking-tight sm:text-4xl">
          {unit?.name ?? machine.name}
        </h1>
        <p className="mt-2 text-xs font-bold text-white/50">
          {unit?.code ? `${unit.code} · ` : ""}{unit?.area ?? machine.zone}
        </p>
      </header>

      <section aria-label="Videos y fotos" className="space-y-5">
        {videoUrl && (
          <MachineVideo url={videoUrl} name={machine.name} label={videoLabel || "Abrir video"} />
        )}
        {image && <MachineGallery key={machine.id} name={machine.name} image={image} images={images} />}
        {!videoUrl && !image && (
          <p className="rounded-xl border border-white/15 p-5 text-sm text-white/60">
            Todavía no hay fotos ni videos asociados. Podés consultar la guía de uso abajo.
          </p>
        )}
      </section>

      <div className="mt-8 space-y-3">
        <details className="group rounded-xl border border-white/15 bg-white/[0.03]">
          <summary className="cursor-pointer rounded-xl p-5 font-black focus-visible:outline-2 focus-visible:outline-[#d8ff3e]">
            Cómo usarla y entrenamientos
            <span className="mt-1 block text-xs font-medium text-white/50">Ajustes, técnica y series para empezar</span>
          </summary>
          <div className="space-y-5 border-t border-white/10 p-4 sm:p-5">
            <div className="flex flex-wrap gap-1.5">
              {machine.muscles.map((muscle) => <GameChip key={muscle} tone="lime">{muscle}</GameChip>)}
            </div>
          <GamePanel title="Ajuste inicial" tone="cyan" compact>
            <p className="text-sm font-bold leading-6 text-white/70">{machine.setup}</p>
          </GamePanel>

          <div className="grid gap-4 sm:grid-cols-2">
            <GamePanel title="Tips" tone="lime" compact>
              <ul className="space-y-2 text-sm font-bold text-white/65">
                {machine.tips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d8ff3e]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </GamePanel>
            <GamePanel title="Evitá" tone="orange" compact>
              <ul className="space-y-2 text-sm font-bold text-white/65">
                {machine.mistakes.map((mistake) => (
                  <li key={mistake} className="flex gap-2">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </GamePanel>
          </div>

          <GameCallout tone="orange" icon={Timer}>
            <span className="font-black uppercase">Starter · </span>
            {machine.starter}
          </GameCallout>
            <Link href="/app" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#d8ff3e]">
              Ver mis entrenamientos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </details>

        <details className="rounded-xl border border-white/15 bg-white/[0.03]">
          <summary className="cursor-pointer rounded-xl p-5 font-black focus-visible:outline-2 focus-visible:outline-[#d8ff3e]">
            Detalles de la máquina
            <span className="mt-1 block text-xs font-medium text-white/50">Descripción, marca, año y ubicación</span>
          </summary>
          <div className="space-y-5 border-t border-white/10 p-4 sm:p-5">
            {(unit?.description || machine.summary) && (
              <p className="text-sm leading-7 text-white/70">{unit?.description || machine.summary}</p>
            )}
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Nombre", unit?.name ?? machine.name],
                ["Zona", unit?.area ?? machine.zone],
                ["Marca", unit?.brand || "Sin registrar"],
                ["Modelo", "Sin registrar"],
                ["Año", unit?.year ? String(unit.year) : "Sin registrar"],
                ["Nivel", machine.level],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-white/45">{label}</dt>
                  <dd className="mt-1 break-words font-bold">{value}</dd>
                </div>
              ))}
            </dl>
            {(unit?.location || machine.location) && (
              <p className="flex items-start gap-2 text-sm text-white/60">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#d8ff3e]" />
                {unit?.location || machine.location}
              </p>
            )}
            <InventoryConnections inventory={inventory} source={source} guides={[{ id: machine.id, name: machine.name }]} guideId={machine.id} selectedAssetId={unit?.id} />
          </div>
        </details>
      </div>

      <Link href="/maquinas" className="mt-8 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/50 hover:text-[#d8ff3e]">
        <ArrowLeft className="h-4 w-4" /> Todas las máquinas
      </Link>
    </article>
  );
}
