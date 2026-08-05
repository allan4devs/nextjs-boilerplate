"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, PackageOpen, ReceiptText, UserRound } from "lucide-react";
import { GameChip, GameLabel } from "../GameOS";

type ReporterId = "resumen" | "david" | "aurelia" | "alberto";

const crc = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

const REPORTERS = [
  {
    id: "david" as const,
    name: "David Mendoza",
    title: "Barritas",
    status: "Pendiente de entrega",
    pending: true,
    total: 6_850,
  },
  {
    id: "aurelia" as const,
    name: "Aurelia",
    title: "Productos de batidos",
    status: "Reportado",
    pending: false,
    total: 1_670,
  },
  {
    id: "alberto" as const,
    name: "Alberto",
    title: "Latas",
    status: "Reportado",
    pending: false,
    total: 117_720,
  },
];

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-0 ${strong ? "text-[#d8ff3e]" : "text-white/70"}`}>
      <span className="text-sm font-bold">{label}</span>
      <span className={`${strong ? "text-xl" : "text-sm"} text-right font-black`}>{value}</span>
    </div>
  );
}

export default function InventoryReporterPages() {
  const [active, setActive] = useState<ReporterId>("resumen");
  const selected = REPORTERS.find((reporter) => reporter.id === active);

  return (
    <section className="mt-6 border-[3px] border-white/15 bg-white/[0.025] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <GameLabel tone="orange">Facturas y entregas</GameLabel>
          <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">Reportes por responsable</h3>
          <p className="mt-1 text-sm font-bold text-white/45">Una página de control para cada persona que reporta inventario.</p>
        </div>
        <GameChip tone="cyan">3 responsables</GameChip>
      </div>

      <div className="xg-mobile-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
        {(["resumen", "david", "aurelia", "alberto"] as const).map((id) => {
          const label = id === "resumen" ? "Resumen" : REPORTERS.find((item) => item.id === id)?.name ?? id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`min-h-11 shrink-0 border-[3px] px-4 text-xs font-black uppercase ${active === id ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/55 hover:border-white/35 hover:text-white"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {active === "resumen" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {REPORTERS.map((reporter) => (
            <button
              key={reporter.id}
              type="button"
              onClick={() => setActive(reporter.id)}
              className="border-[3px] border-white/15 bg-black/35 p-4 text-left transition hover:border-[#d8ff3e]/60"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center border-2 border-white/15 bg-white/5"><UserRound className="h-5 w-5 text-white/55" /></span>
                {reporter.pending ? <AlertTriangle className="h-5 w-5 text-orange-300" /> : <CheckCircle2 className="h-5 w-5 text-[#d8ff3e]" />}
              </div>
              <p className="mt-4 text-lg font-black uppercase">{reporter.name}</p>
              <p className="mt-1 text-xs font-bold uppercase text-white/40">{reporter.title}</p>
              <p className="mt-4 text-2xl font-black text-[#d8ff3e]">{crc.format(reporter.total)}</p>
              <p className={`mt-2 text-[10px] font-black uppercase tracking-wide ${reporter.pending ? "text-orange-300" : "text-white/40"}`}>{reporter.status}</p>
            </button>
          ))}
        </div>
      ) : selected ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="border-[3px] border-white/15 bg-black/35 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-white/40">Reporte de {selected.name}</p>
                <h4 className="mt-1 text-2xl font-black uppercase">{selected.title}</h4>
              </div>
              <ReceiptText className="h-7 w-7 text-[#d8ff3e]" />
            </div>

            {selected.id === "david" && (
              <div className="mt-4">
                <DetailRow label="2 cajas de maní" value={`2 × ${crc.format(2_000)} = ${crc.format(4_000)}`} />
                <DetailRow label="6 cajas de fresa" value={`${crc.format(2_850)} en total`} />
                <DetailRow label="Precio de venta por barrita" value={crc.format(500)} />
                <DetailRow label="Total de factura" value={crc.format(6_850)} strong />
              </div>
            )}
            {selected.id === "aurelia" && (
              <div className="mt-4">
                <DetailRow label="Productos" value="Leche y bananos" />
                <DetailRow label="Total reportado" value={crc.format(1_670)} strong />
              </div>
            )}
            {selected.id === "alberto" && (
              <div className="mt-4">
                <DetailRow label="72 latas" value={`${crc.format(1_535)} × 72 = ${crc.format(110_520)}`} />
                <DetailRow label="Comisión" value={crc.format(7_200)} />
                <DetailRow label="Total" value={crc.format(117_720)} strong />
              </div>
            )}
          </div>

          <aside className={`border-[3px] p-4 ${selected.pending ? "border-orange-300/60 bg-orange-400/10" : "border-[#d8ff3e]/45 bg-[#d8ff3e]/[0.07]"}`}>
            <PackageOpen className={`h-7 w-7 ${selected.pending ? "text-orange-300" : "text-[#d8ff3e]"}`} />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-white/40">Estado</p>
            <p className={`mt-1 text-lg font-black uppercase ${selected.pending ? "text-orange-200" : "text-[#d8ff3e]"}`}>{selected.status}</p>
            {selected.pending && <p className="mt-3 text-sm font-bold leading-5 text-white/55">La factura de las barritas está registrada, pero las cajas todavía faltan por entregar.</p>}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
