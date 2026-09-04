"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Clock3, Loader2, Printer, RefreshCw, SlidersHorizontal } from "lucide-react";
import { GameChip, GameLabel } from "../GameOS";
import ProductSaleReceipt from "./ProductSaleReceipt";

type Sale = {
  id: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;
  total: number;
  paymentMethod: "cash" | "sinpe" | "mixed";
  cashAmount: number;
  sinpeAmount: number;
  soldBy: string;
  createdAt: string;
};

type AdjustmentValues = { quantity?: number; cameraQuantity?: number; warehouseQuantity?: number; price?: number };
type Adjustment = {
  id: string;
  at: string;
  actorRole: string;
  summary: string;
  productId: string;
  meta: { productName?: string; before?: AdjustmentValues; after?: AdjustmentValues; delta?: AdjustmentValues };
};

type Dashboard = {
  range: { from: string; to: string };
  summary: { totalIncome: number; saleCount: number; unitsSold: number; averageTicket: number; adjustmentCount: number };
  sales: Sale[];
  adjustments: Adjustment[];
};

const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("es-CR", { dateStyle: "short", timeStyle: "short" });

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function rangeFor(days: number) {
  const to = new Date();
  const from = new Date(to);
  if (days === 0) from.setHours(0, 0, 0, 0);
  else from.setDate(from.getDate() - days);
  return { from: localInputValue(from), to: localInputValue(to) };
}

export default function SalesMonitoringPanel() {
  const initial = rangeFor(0);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Reimpresión de una venta pasada: mismo comprobante que el POS, generado
  // al vuelo desde los datos ya cargados (no vuelve a pedirle nada al servidor).
  const [printSale, setPrintSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (!printSale) return;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [printSale]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ dashboard: "1", from: new Date(from).toISOString(), to: new Date(to).toISOString() });
      const response = await fetch(`/api/xtreme/reception/inventory?${params}`, { cache: "no-store" });
      const json = (await response.json()) as Dashboard & { error?: string };
      if (!response.ok) throw new Error(json.error || "No se pudo cargar el monitoreo.");
      setData(json);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("xtreme:storefront-updated", refresh);
    return () => window.removeEventListener("xtreme:storefront-updated", refresh);
  }, [load]);

  function applyPreset(days: number) {
    const range = rangeFor(days);
    setFrom(range.from);
    setTo(range.to);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <GameLabel tone="cyan">Control en tiempo real</GameLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">Monitoreo de ventas</h2>
          <p className="mt-2 text-sm font-bold text-white/45">Consultá ingresos, ventas y reajustes en cualquier rango de fecha y hora.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-4 text-xs font-black uppercase text-white/65 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e] disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      <div className="mt-5 border-[3px] border-white/15 bg-black/35 p-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => applyPreset(0)} className="min-h-10 border-2 border-white/15 px-3 text-xs font-black uppercase hover:border-[#d8ff3e]">Hoy</button>
          <button type="button" onClick={() => applyPreset(7)} className="min-h-10 border-2 border-white/15 px-3 text-xs font-black uppercase hover:border-[#d8ff3e]">7 días</button>
          <button type="button" onClick={() => applyPreset(30)} className="min-h-10 border-2 border-white/15 px-3 text-xs font-black uppercase hover:border-[#d8ff3e]">30 días</button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <label className="text-[10px] font-black uppercase tracking-wide text-white/40">Desde
            <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block min-h-11 w-full border-[3px] border-white/15 bg-black px-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" />
          </label>
          <label className="text-[10px] font-black uppercase tracking-wide text-white/40">Hasta
            <input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block min-h-11 w-full border-[3px] border-white/15 bg-black px-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" />
          </label>
          <button type="button" onClick={() => void load()} className="mt-[15px] inline-flex min-h-11 items-center justify-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-5 text-xs font-black uppercase text-black"><Clock3 className="h-4 w-4" /> Consultar</button>
        </div>
      </div>

      {error && <div className="mt-4 border-[3px] border-red-400/60 bg-red-500/10 p-3 text-sm font-black text-red-200">{error}</div>}
      {loading && !data ? <div className="grid min-h-52 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" /></div> : data && <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Ingresos" value={crc.format(data.summary.totalIncome)} accent />
          <Metric label="Ventas" value={String(data.summary.saleCount)} />
          <Metric label="Unidades vendidas" value={String(data.summary.unitsSold)} />
          <Metric label="Venta promedio" value={crc.format(data.summary.averageTicket)} />
          <Metric label="Reajustes" value={String(data.summary.adjustmentCount)} warn={data.summary.adjustmentCount > 0} />
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <section>
            <div className="flex items-center justify-between gap-3"><div><GameLabel tone="lime">Movimientos cobrados</GameLabel><h3 className="mt-2 text-2xl font-black uppercase">Ventas recientes</h3></div><GameChip tone="lime">{data.sales.length}</GameChip></div>
            <div className="mt-3 space-y-3">
              {data.sales.length === 0 && <Empty text="No hay ventas en este período." />}
              {data.sales.map((sale) => <article key={sale.id} className="border-[3px] border-white/15 bg-black/35 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-lg font-black text-[#d8ff3e]">{crc.format(sale.total)}</p><p className="mt-1 text-xs font-bold text-white/40">{dateTime.format(new Date(sale.createdAt))} · {sale.soldBy}</p></div>
                  <button type="button" onClick={() => setPrintSale(sale)} aria-label="Reimprimir comprobante" title="Reimprimir comprobante" className="grid h-9 w-9 shrink-0 place-items-center border-2 border-white/15 text-white/40 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e]">
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-1">{sale.items.map((item) => <div key={item.productId} className="flex justify-between gap-3 text-sm font-bold text-white/65"><span>{item.quantity} × {item.name}</span><span className="shrink-0">{crc.format(item.quantity * item.unitPrice)}</span></div>)}</div>
              </article>)}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3"><div><GameLabel tone="orange">Trazabilidad</GameLabel><h3 className="mt-2 text-2xl font-black uppercase">Reajustes de inventario</h3></div><GameChip tone="orange">{data.adjustments.length}</GameChip></div>
            <div className="mt-3 space-y-3">
              {data.adjustments.length === 0 && <Empty text="No hubo reajustes en este período." />}
              {data.adjustments.map((entry) => {
                const delta = entry.meta.delta ?? {};
                return <article key={entry.id} className="border-[3px] border-orange-300/25 bg-orange-400/[0.05] p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-black uppercase">{entry.meta.productName || entry.productId}</p><p className="mt-1 text-xs font-bold text-white/40">{dateTime.format(new Date(entry.at))} · {entry.actorRole}</p></div><SlidersHorizontal className="h-5 w-5 text-orange-300" /></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {delta.quantity !== undefined && delta.quantity !== 0 && <Delta label="Total" value={delta.quantity} />}
                    {delta.cameraQuantity !== undefined && delta.cameraQuantity !== 0 && <Delta label="Cámara" value={delta.cameraQuantity} />}
                    {delta.warehouseQuantity !== undefined && delta.warehouseQuantity !== 0 && <Delta label="Bodega" value={delta.warehouseQuantity} />}
                    {delta.price !== undefined && delta.price !== 0 && <Delta label="Precio" value={delta.price} money />}
                  </div>
                  <p className="mt-3 text-xs font-bold text-white/45">Existencia: {entry.meta.before?.quantity ?? "—"} → {entry.meta.after?.quantity ?? "—"}{entry.meta.before?.price !== entry.meta.after?.price ? ` · Precio: ${crc.format(entry.meta.before?.price ?? 0)} → ${crc.format(entry.meta.after?.price ?? 0)}` : ""}</p>
                </article>;
              })}
            </div>
          </section>
        </div>
      </>}

      {printSale && (
        <div className="pointer-events-none absolute left-[-9999px] top-0" aria-hidden="true">
          <ProductSaleReceipt
            receipt={{
              id: printSale.id,
              createdAt: printSale.createdAt,
              items: printSale.items,
              total: printSale.total,
              paymentMethod: printSale.paymentMethod,
              cashAmount: printSale.cashAmount,
              sinpeAmount: printSale.sinpeAmount,
              staffName: printSale.soldBy,
            }}
          />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent = false, warn = false }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return <div className={`border-[3px] p-4 ${warn ? "border-orange-300/45 bg-orange-400/[0.07]" : "border-white/15 bg-black/35"}`}><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/40">{label}</p><p className={`mt-2 text-2xl font-black ${accent ? "text-[#d8ff3e]" : warn ? "text-orange-200" : "text-white"}`}>{value}</p></div>;
}

function Delta({ label, value, money = false }: { label: string; value: number; money?: boolean }) {
  const positive = value > 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  return <span className={`inline-flex items-center gap-1 border-2 px-2 py-1 text-[10px] font-black uppercase ${positive ? "border-[#d8ff3e]/35 text-[#d8ff3e]" : "border-red-400/35 text-red-200"}`}><Icon className="h-3 w-3" /> {label} {positive ? "+" : ""}{money ? crc.format(value) : value}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="border-[3px] border-dashed border-white/15 p-6 text-center text-sm font-bold text-white/35">{text}</div>;
}
