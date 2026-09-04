import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ScanLine,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { GameCallout, GameChip, GamePanel } from "@/app/components/GameOS";
import {
  MACHINE_GUIDE,
  findMachineGuide,
  machineNeighbors,
  machinePath,
  machineQrValue,
} from "@/app/lib/machines";
import { getDb } from "@/lib/helpers/mongodb";
import { getMachineMedia } from "@/lib/xtreme/machine-media";
import MachineGallery from "../_components/MachineGallery";
import MachineQr from "../_components/MachineQr";
import MachineVideo from "../_components/MachineVideo";

type Params = { params: Promise<{ id: string }> };

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

export default async function MachineDetailPage({ params }: Params) {
  const { id } = await params;
  const machine = findMachineGuide(id);
  if (!machine) notFound();

  const { prev, next } = machineNeighbors(machine.id);
  const qrValue = machineQrValue(machine.id);

  const db = await getDb();
  const media = await getMachineMedia(db, machine.id);
  const images = media?.images?.length ? media.images : machine.images;
  const image = images?.[0] ?? machine.image;
  const videoUrl = media?.videoUrl || machine.videoUrl;
  const videoLabel = media?.videoLabel || machine.videoLabel;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/maquinas"
        className="inline-flex min-h-11 items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/50 transition hover:text-[#d8ff3e] focus-visible:text-[#d8ff3e] focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" />
        Todas las máquinas
      </Link>

      <header className="mt-5 border-b-2 border-white/12 pb-6">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d8ff3e]">
          {machine.zone} · {machine.level}
        </p>
        <h1 className="mt-3 text-[clamp(2.2rem,6vw,4rem)] font-black uppercase leading-[0.88] tracking-[-0.03em] text-balance">
          {machine.name}
        </h1>
        {machine.summary && (
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/70 text-pretty sm:text-lg">
            {machine.summary}
          </p>
        )}
        {machine.location && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/45">
            <MapPin className="h-4 w-4 text-[#d8ff3e]" />
            {machine.location}
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <MachineGallery name={machine.name} image={image} images={images} />

          <div className="flex flex-wrap gap-1.5">
            {machine.muscles.map((muscle) => (
              <GameChip key={muscle} tone="lime">
                {muscle}
              </GameChip>
            ))}
          </div>

          {videoUrl && (
            <section>
              <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#d8ff3e]">
                Video de técnica
              </h2>
              <MachineVideo
                url={videoUrl}
                name={machine.name}
                label={videoLabel ? `${videoLabel} · YouTube` : "Ver en YouTube"}
              />
            </section>
          )}

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
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border-[3px] border-[#d8ff3e]/40 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,0.6)]">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">
              <ScanLine className="h-4 w-4" />
              QR de esta máquina
            </p>
            <p className="mt-1 text-xs font-bold text-white/45">
              Es el mismo que va pegado en el equipo. Escaneálo para volver a esta ficha.
            </p>
            <div className="mt-4">
              <MachineQr value={qrValue} label={machine.name} size={196} />
            </div>
            <p className="mt-3 break-all text-center text-[10px] font-bold text-white/30">{qrValue}</p>
          </div>
        </aside>
      </div>

      <nav className="mt-12 grid gap-3 border-t-2 border-white/12 pt-6 sm:grid-cols-2">
        {prev && (
          <Link
            href={machinePath(prev.id)}
            className="group flex items-center gap-3 border-2 border-white/15 bg-black/30 p-3.5 transition hover:border-[#d8ff3e] focus-visible:border-[#d8ff3e] focus-visible:outline-none"
          >
            <ChevronLeft className="h-5 w-5 shrink-0 text-white/40 transition group-hover:text-[#d8ff3e]" />
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
                Anterior
              </span>
              <span className="block truncate text-sm font-black uppercase">{prev.name}</span>
            </span>
          </Link>
        )}
        {next && (
          <Link
            href={machinePath(next.id)}
            className="group flex items-center justify-end gap-3 border-2 border-white/15 bg-black/30 p-3.5 text-right transition hover:border-[#d8ff3e] focus-visible:border-[#d8ff3e] focus-visible:outline-none sm:col-start-2"
          >
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
                Siguiente
              </span>
              <span className="block truncate text-sm font-black uppercase">{next.name}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/40 transition group-hover:text-[#d8ff3e]" />
          </Link>
        )}
      </nav>

      <Link
        href="/maquinas/qr"
        className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35 transition hover:text-[#d8ff3e] focus-visible:text-[#d8ff3e] focus-visible:outline-none"
      >
        Staff: códigos y QR de todas <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
