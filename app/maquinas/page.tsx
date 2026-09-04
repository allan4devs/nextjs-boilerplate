import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Dumbbell, MapPinned, PlayCircle, QrCode } from "lucide-react";
import {
  MACHINE_GUIDE,
  machinePath,
  machinesByZone,
  zoneSlug,
  type MachineGuide,
} from "@/app/lib/machines";
import ZoneNav from "./_components/ZoneNav";

export const metadata: Metadata = {
  title: { absolute: "Guía de máquinas · Xtreme Gym" },
  description:
    "Recorré todas las máquinas y estaciones de Xtreme Gym por zona: para qué sirve cada una, cómo se ajusta y su video de técnica.",
  alternates: { canonical: "/maquinas" },
};

const HERO_IMAGE = "/xtreme/piso-maquinas-panoramica.webp";

function MachineCard({
  machine,
  featured = false,
}: {
  machine: MachineGuide;
  featured?: boolean;
}) {
  return (
    <Link
      href={machinePath(machine.id)}
      className={`group relative flex flex-col overflow-hidden border-[3px] border-white/20 bg-[#0c0c0c] shadow-[4px_4px_0_rgba(0,0,0,0.6)] transition hover:border-[#d8ff3e] focus-visible:border-[#d8ff3e] focus-visible:outline-none active:translate-x-px active:translate-y-px active:shadow-none ${
        featured ? "min-h-[300px] sm:min-h-[360px]" : "min-h-[248px]"
      }`}
    >
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={machine.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.30)_0%,rgba(0,0,0,0.20)_32%,rgba(0,0,0,0.86)_70%,rgba(0,0,0,0.97)_100%)]" />
      </div>
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${machine.accent}`} />

      <div className="relative mt-auto flex flex-col gap-2 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
            {machine.zone} · {machine.level}
          </p>
          {machine.videoUrl && (
            <span className="inline-flex items-center gap-1 border-2 border-black/50 bg-black/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#d8ff3e]">
              <PlayCircle className="h-3 w-3" />
              Video
            </span>
          )}
        </div>
        <h3
          className={`font-black uppercase leading-[1.05] text-balance drop-shadow ${
            featured ? "text-2xl sm:text-[1.9rem]" : "text-lg sm:text-xl"
          }`}
        >
          {machine.name}
        </h3>
        {machine.summary && (
          <p className="max-w-md text-sm font-semibold leading-6 text-white/65 text-pretty">
            {machine.summary}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          {machine.muscles.slice(0, featured ? 4 : 2).map((muscle) => (
            <span
              key={muscle}
              className="inline-flex items-center border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#eaff93]"
            >
              {muscle}
            </span>
          ))}
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 border-t border-[#d8ff3e]/35 pt-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#d8ff3e]">
          Ver ficha
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1 motion-reduce:transition-none" />
        </p>
      </div>
    </Link>
  );
}

export default function MaquinasIndexPage() {
  const groups = machinesByZone();
  const zones = groups.map((g) => g.zone);
  const total = MACHINE_GUIDE.length;
  const withVideo = MACHINE_GUIDE.filter((m) => m.videoUrl).length;

  return (
    <>
      <section className="relative isolate overflow-hidden border-b-[3px] border-[#d8ff3e]/25">
        <div className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="Piso de máquinas de Xtreme Gym"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,7,0.72)_0%,rgba(7,7,7,0.82)_55%,rgba(7,7,7,0.97)_100%)]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#d8ff3e]">
            <span className="h-px w-10 bg-[#d8ff3e]" />
            Catálogo del piso
          </p>
          <h1 className="mt-5 max-w-3xl text-[clamp(2.6rem,7vw,5rem)] font-black uppercase leading-[0.85] tracking-[-0.03em] text-balance">
            Todas las máquinas del gym
          </h1>
          <p className="mt-6 max-w-xl text-base font-semibold leading-7 text-white/70 text-pretty sm:text-lg">
            Para qué sirve cada una, cómo se ajusta, los errores que hay que evitar y un video de
            técnica. Cada máquina en sala tiene su QR: escaneálo y caés directo en su ficha.
          </p>

          <dl className="mt-9 grid max-w-lg grid-cols-3 border-[3px] border-white/15 bg-black/40 backdrop-blur-sm">
            {[
              { value: total, label: "equipos y zonas" },
              { value: withVideo, label: "con video" },
              { value: groups.length, label: "zonas" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className={`px-4 py-4 ${index < 2 ? "border-r border-white/12" : ""}`}
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-3xl font-black text-white">{stat.value}</span>
                  <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.14em] text-white/40">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <ZoneNav zones={zones} />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6 sm:py-16">
        {groups.map(({ zone, machines }) => {
          const hasFeatured = machines.length === 1 || machines.length >= 3;
          const featured = hasFeatured ? machines[0] : null;
          const rest = featured ? machines.slice(1) : machines;
          const restCols =
            machines.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
          return (
            <section key={zone} id={zoneSlug(zone)} className="scroll-mt-32">
              <div className="flex items-end justify-between gap-4 border-b-2 border-white/12 pb-4">
                <h2 className="flex items-center gap-3 text-[clamp(1.7rem,4vw,2.75rem)] font-black uppercase leading-none tracking-[-0.02em]">
                  <Dumbbell className="h-6 w-6 shrink-0 text-[#d8ff3e] sm:h-7 sm:w-7" />
                  {zone}
                </h2>
                <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.16em] text-white/40">
                  {machines.length} {machines.length === 1 ? "equipo" : "equipos"}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {featured && <MachineCard machine={featured} featured />}
                {rest.length > 0 && (
                  <div className={`grid gap-4 ${restCols}`}>
                    {rest.map((machine) => (
                      <MachineCard key={machine.id} machine={machine} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}

        <aside className="flex flex-col items-start justify-between gap-4 border-[3px] border-white/15 bg-[#0c0c0c] p-5 shadow-[4px_4px_0_rgba(0,0,0,0.6)] sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center border-2 border-black/40 bg-white text-black">
              <QrCode className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.08em]">Staff · códigos y QR</p>
              <p className="mt-1 text-xs font-bold text-white/45">
                Tabla con el código de cada máquina y su QR para imprimir y pegar en sala.
              </p>
            </div>
          </div>
          <Link
            href="/maquinas/qr"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 border-2 border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-[#eaff93] transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/20 focus-visible:border-[#d8ff3e] focus-visible:outline-none"
          >
            Abrir códigos y QR <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </aside>

        <aside className="flex flex-col items-start justify-between gap-4 border-[3px] border-[#d8ff3e]/35 bg-[#0c0c0c] p-5 shadow-[4px_4px_0_rgba(0,0,0,0.6)] sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center border-2 border-black/40 bg-[#d8ff3e] text-black">
              <MapPinned className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.08em]">Staff · plano editable</p>
              <p className="mt-1 text-xs font-bold text-white/45">
                Un piso en cuadrícula para ubicar, mover y dimensionar los 131 activos físicos.
              </p>
            </div>
          </div>
          <Link
            href="/maquinas/plano"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 border-2 border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-[#eaff93] transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/20 focus-visible:border-[#d8ff3e] focus-visible:outline-none"
          >
            Abrir plano <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </aside>
      </div>
    </>
  );
}
