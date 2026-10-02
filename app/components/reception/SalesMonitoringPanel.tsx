"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Clock3, Download, Loader2, PackageCheck, Printer, RefreshCw, SlidersHorizontal, WalletCards } from "lucide-react";
import { PRODUCT_CATEGORY_LABEL, type ProductCategory } from "@/lib/xtreme/product-catalog";
import { GameChip, GameLabel, GameModal } from "../GameOS";
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

type ReportCategory = ProductCategory | "otros";

type ProductSummary = {
  productId: string;
  name: string;
  unitsSold: number;
  saleCount: number;
  totalIncome: number;
  averageUnitPrice: number;
};

type Dashboard = {
  range: { from: string; to: string };
  summary: {
    totalIncome: number;
    saleCount: number;
    unitsSold: number;
    averageTicket: number;
    cashIncome: number;
    sinpeIncome: number;
    cashSaleCount: number;
    sinpeSaleCount: number;
    mixedSaleCount: number;
    adjustmentCount: number;
  };
  categorySummary: Array<{
    category: ReportCategory;
    unitsSold: number;
    saleCount: number;
    totalIncome: number;
    products: ProductSummary[];
  }>;
  sales: Sale[];
  adjustments: Adjustment[];
};

const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("es-CR", { dateStyle: "short", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" });
const CATEGORY_LABEL: Record<ReportCategory, string> = {
  ...PRODUCT_CATEGORY_LABEL,
  otros: "Otros productos",
};

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 19);
}

function rangeFor(days: number) {
  const to = new Date();
  const from = new Date(to);
  if (days === 0) from.setHours(0, 0, 0, 0);
  else from.setDate(from.getDate() - days);
  return { from: localInputValue(from), to: localInputValue(to) };
}

function currentMonthValue() {
  return localInputValue(new Date()).slice(0, 7);
}

function rangeForMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return rangeFor(0);
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 1, 0, 0, 0, 0);
  to.setMilliseconds(-1);
  return { from: localInputValue(from), to: localInputValue(to) };
}

export default function SalesMonitoringPanel() {
  const [deletion, setDeletion] = useState<{ id: string; kind: "sale" | "purchase"; label: string } | null>(null);
  const [adminCode, setAdminCode] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  function openDelete(target: NonNullable<typeof deletion>) {
    setAdminCode(""); setDeleteError(""); setDeletion(target);
  }
  async function deleteRecord() {
    if (!deletion || deleting || !adminCode.trim()) return;
    setDeleting(true); setDeleteError("");
    try {
      const response = await fetch("/api/xtreme/reception/inventory", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletion.id, kind: deletion.kind, code: adminCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo eliminar.");
      setDeletion(null); setAdminCode(""); setPrintSale(null);
      window.dispatchEvent(new Event("xtreme:storefront-updated"));
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "Error de conexi?n.");
    } finally { setDeleting(false); }
  }
  const initialMonth = currentMonthValue();
  const initial = rangeForMonth(initialMonth);
  const [month, setMonth] = useState(initialMonth);
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
    setMonth("");
    setFrom(range.from);
    setTo(range.to);
  }

  function applyMonth(value: string) {
    if (!value) return;
    const range = rangeForMonth(value);
    setMonth(value);
    setFrom(range.from);
    setTo(range.to);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <GameLabel tone="cyan">Control en tiempo real</GameLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">Reporte de ventas</h2>
          <p className="mt-2 text-sm font-bold text-white/45">Revisá por mes cuánto se vendió de cada producto, los ingresos y cada movimiento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {month ? (
            <a href={`/api/xtreme/reception/inventory/report?month=${encodeURIComponent(month)}`} download className="inline-flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-4 text-xs font-black uppercase text-black hover:bg-white">
              <Download className="h-4 w-4" /> Descargar PDF del mes
            </a>
          ) : (
            <span title="Elegí un mes para descargar el PDF" className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 border-[3px] border-white/10 px-4 text-xs font-black uppercase text-white/25">
              <Download className="h-4 w-4" /> Elegí un mes para PDF
            </span>
          )}
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-4 text-xs font-black uppercase text-white/65 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e] disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </div>
      </div>

      <div className="mt-5 border-[3px] border-white/15 bg-black/35 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-52 text-[10px] font-black uppercase tracking-wide text-white/40">Mes del reporte
            <span className="mt-1 flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e]/65 bg-[#d8ff3e]/5 px-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-[#d8ff3e]" />
              <input type="month" value={month} onChange={(event) => applyMonth(event.target.value)} className="w-full bg-transparent text-sm font-black text-white outline-none [color-scheme:dark]" />
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => applyPreset(0)} className="min-h-11 border-2 border-white/15 px-3 text-xs font-black uppercase hover:border-[#d8ff3e]">Hoy</button>
            <button type="button" onClick={() => applyPreset(7)} className="min-h-11 border-2 border-white/15 px-3 text-xs font-black uppercase hover:border-[#d8ff3e]">7 días</button>
            <button type="button" onClick={() => applyPreset(30)} className="min-h-11 border-2 border-white/15 px-3 text-xs font-black uppercase hover:border-[#d8ff3e]">30 días</button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <label className="text-[10px] font-black uppercase tracking-wide text-white/40">Desde
            <input type="datetime-local" step="1" value={from} onChange={(event) => { setMonth(""); setFrom(event.target.value); }} className="mt-1 block min-h-11 w-full border-[3px] border-white/15 bg-black px-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" />
          </label>
          <label className="text-[10px] font-black uppercase tracking-wide text-white/40">Hasta
            <input type="datetime-local" step="1" value={to} onChange={(event) => { setMonth(""); setTo(event.target.value); }} className="mt-1 block min-h-11 w-full border-[3px] border-white/15 bg-black px-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" />
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

        <section className="mt-6 border-[3px] border-[#d8ff3e]/35 bg-[#d8ff3e]/[0.035] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <GameLabel tone="lime">Resumen completo del período</GameLabel>
              <h3 className="mt-2 flex items-center gap-2 text-2xl font-black uppercase">
                <PackageCheck className="h-6 w-6 text-[#d8ff3e]" /> Ventas por categoría
              </h3>
              <p className="mt-1 text-xs font-bold text-white/40">
                {dateOnly.format(new Date(data.range.from))} al {dateOnly.format(new Date(data.range.to))} · unidades y monto por producto
              </p>
              <p className="mt-2 text-xs font-bold text-amber-200/70">Los montos son ingresos por ventas, no ganancia neta: aquí no se descuenta el costo del producto.</p>
            </div>
            <GameChip tone="lime">{data.categorySummary.length} categorías</GameChip>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <PaymentMetric
              label="Efectivo"
              amount={data.summary.cashIncome}
              detail={`${data.summary.cashSaleCount} ventas directas`}
            />
            <PaymentMetric
              label="SINPE"
              amount={data.summary.sinpeIncome}
              detail={`${data.summary.sinpeSaleCount} ventas directas`}
            />
            <div className="border-2 border-cyan-300/25 bg-cyan-300/[0.04] p-3">
              <div className="flex items-center gap-2 text-cyan-200"><WalletCards className="h-4 w-4" /><p className="text-[10px] font-black uppercase tracking-[.14em]">Pagos mixtos</p></div>
              <p className="mt-2 text-2xl font-black">{data.summary.mixedSaleCount}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-white/35">incluidos entre efectivo y SINPE</p>
            </div>
          </div>

          {data.categorySummary.length === 0 ? <div className="mt-4"><Empty text="No hay productos vendidos en este período." /></div> : (
            <div className="mt-5 space-y-5">
              {data.categorySummary.map((category) => (
                <CategorySalesTable key={category.category} category={category} />
              ))}
              <div className="grid gap-3 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] p-4 text-black sm:grid-cols-3 sm:items-center">
                <p className="text-sm font-black uppercase">Total de todas las categorías</p>
                <p className="text-xl font-black sm:text-center">{data.summary.unitsSold} unidades</p>
                <p className="text-2xl font-black sm:text-right">{crc.format(data.summary.totalIncome)}</p>
              </div>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <section>
            <div className="flex items-center justify-between gap-3"><div><GameLabel tone="lime">Movimientos cobrados</GameLabel><h3 className="mt-2 text-2xl font-black uppercase">Ventas recientes</h3></div><GameChip tone="lime">{data.sales.length}</GameChip></div>
            {data.summary.saleCount > data.sales.length && <p className="mt-2 text-xs font-bold text-white/40">Mostrando las {data.sales.length} ventas más recientes. El resumen superior sí incluye las {data.summary.saleCount} ventas del período.</p>}
            <div className="mt-3 space-y-3">
              {data.sales.length === 0 && <Empty text="No hay ventas en este período." />}
              {data.sales.map((sale) => <article key={sale.id} className="border-[3px] border-white/15 bg-black/35 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-lg font-black text-[#d8ff3e]">{crc.format(sale.total)}</p><p className="mt-1 text-xs font-bold text-white/40">{dateTime.format(new Date(sale.createdAt))} · {sale.soldBy}</p></div>
                  <button type="button" onClick={() => setPrintSale(sale)} aria-label="Reimprimir comprobante" title="Reimprimir comprobante" className="grid h-9 w-9 shrink-0 place-items-center border-2 border-white/15 text-white/40 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e]">
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
                <button type="button" onClick={() => openDelete({ id: sale.id, kind: "sale", label: `Venta de ${crc.format(sale.total)} ? ${dateTime.format(new Date(sale.createdAt))}` })} className="mt-3 min-h-10 border-2 border-red-400/40 px-3 text-xs font-black text-red-200">Eliminar venta ? c?digo admin</button>
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
                  {(delta.quantity ?? 0) > 0 && (delta.cameraQuantity ?? -1) >= 0 && (delta.warehouseQuantity ?? -1) >= 0 && delta.quantity === (delta.cameraQuantity ?? 0) + (delta.warehouseQuantity ?? 0) && <button type="button" onClick={() => openDelete({ id: entry.id, kind: "purchase", label: `Entrada de ${delta.quantity} ? ${entry.meta.productName || entry.productId}` })} className="mt-3 min-h-10 border-2 border-red-400/40 px-3 text-xs font-black text-red-200">Eliminar entrada / compra ? c?digo admin</button>}
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

      <GameModal open={Boolean(deletion)} onClose={() => { if (!deleting) { setDeletion(null); setAdminCode(""); } }} title="Eliminar registro" size="sm">
        <form onSubmit={(event) => { event.preventDefault(); void deleteRecord(); }} className="space-y-4">
          <p className="font-bold">{deletion?.label}</p>
          <p className="text-sm text-white/65">{deletion?.kind === "sale" ? "Se quitar? la venta de los totales y se devolver?n los productos al inventario. En ventas antiguas sin ubicaci?n registrada, se devolver?n a c?mara." : "Se descontar?n las unidades de esta entrada de c?mara y bodega. Los precios y otros datos del producto se conservar?n."} Se conservar? una copia en la auditor?a.</p>
          <label className="block text-sm font-bold">C?digo de administrador
            <input type="password" autoComplete="off" required value={adminCode} disabled={deleting} onChange={(event) => setAdminCode(event.target.value)} className="mt-2 block min-h-11 w-full border-2 border-white/25 bg-black px-3 text-white" />
          </label>
          {deleteError && <p role="alert" className="text-sm text-red-200">{deleteError}</p>}
          <div className="flex gap-3">
            <button type="button" disabled={deleting} onClick={() => { setDeletion(null); setAdminCode(""); }} className="min-h-11 border-2 border-white/25 px-4">Cancelar</button>
            <button type="submit" disabled={deleting || !adminCode.trim()} className="min-h-11 border-2 border-red-400 bg-red-500/20 px-4 font-bold text-red-200 disabled:opacity-40">{deleting ? "Eliminando?" : "Confirmar eliminaci?n"}</button>
          </div>
        </form>
      </GameModal>
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

function CategorySalesTable({ category }: { category: Dashboard["categorySummary"][number] }) {
  const maxUnits = category.products[0]?.unitsSold || 1;
  return (
    <article className="border-[3px] border-white/15 bg-black/35">
      <div className="grid gap-2 border-b-[3px] border-white/15 bg-white/[0.055] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#d8ff3e]">Categoría</p>
          <h4 className="mt-1 text-xl font-black uppercase">{CATEGORY_LABEL[category.category]}</h4>
        </div>
        <p className="text-sm font-black text-white/65 sm:text-right">{category.unitsSold} unidades · {category.saleCount} ventas</p>
        <p className="text-2xl font-black text-[#d8ff3e] sm:text-right">{crc.format(category.totalIncome)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="text-[10px] font-black uppercase tracking-[.12em] text-white/45">
            <tr>
              <th scope="col" className="px-3 py-3">Producto</th>
              <th scope="col" className="px-3 py-3 text-right">Unidades</th>
              <th scope="col" className="px-3 py-3 text-right">Ventas</th>
              <th scope="col" className="px-3 py-3 text-right">Precio promedio</th>
              <th scope="col" className="px-3 py-3 text-right">Total vendido</th>
            </tr>
          </thead>
          <tbody>
            {category.products.map((product, index) => {
              const width = `${Math.max(5, Math.round((product.unitsSold / maxUnits) * 100))}%`;
              return (
                <tr key={product.productId} className="border-t-2 border-white/10 align-top">
                  <th scope="row" className="px-3 py-3">
                    <div className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center border-2 border-white/15 text-[10px] font-black text-white/45">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white">{product.name}</p>
                        <div className="mt-2 h-1.5 bg-white/10"><div className="h-full bg-[#d8ff3e]" style={{ width }} /></div>
                      </div>
                    </div>
                  </th>
                  <td className="px-3 py-3 text-right text-xl font-black text-[#d8ff3e]">{product.unitsSold}</td>
                  <td className="px-3 py-3 text-right font-bold text-white/60">{product.saleCount}</td>
                  <td className="px-3 py-3 text-right font-bold text-white/60">{crc.format(product.averageUnitPrice)}</td>
                  <td className="px-3 py-3 text-right font-black text-white">{crc.format(product.totalIncome)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-[3px] border-white/20 bg-white/[0.045] font-black">
            <tr>
              <th scope="row" className="px-3 py-3 uppercase">Total {CATEGORY_LABEL[category.category]}</th>
              <td className="px-3 py-3 text-right text-[#d8ff3e]">{category.unitsSold}</td>
              <td className="px-3 py-3 text-right">{category.saleCount}</td>
              <td className="px-3 py-3" />
              <td className="px-3 py-3 text-right text-[#d8ff3e]">{crc.format(category.totalIncome)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
  );
}

function Metric({ label, value, accent = false, warn = false }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return <div className={`border-[3px] p-4 ${warn ? "border-orange-300/45 bg-orange-400/[0.07]" : "border-white/15 bg-black/35"}`}><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/40">{label}</p><p className={`mt-2 text-2xl font-black ${accent ? "text-[#d8ff3e]" : warn ? "text-orange-200" : "text-white"}`}>{value}</p></div>;
}

function PaymentMetric({ label, amount, detail }: { label: string; amount: number; detail: string }) {
  return <div className="border-2 border-white/15 bg-black/30 p-3"><p className="text-[10px] font-black uppercase tracking-[.14em] text-white/40">{label}</p><p className="mt-2 text-2xl font-black text-white">{crc.format(amount)}</p><p className="mt-1 text-[10px] font-bold uppercase text-white/35">{detail}</p></div>;
}

function Delta({ label, value, money = false }: { label: string; value: number; money?: boolean }) {
  const positive = value > 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  return <span className={`inline-flex items-center gap-1 border-2 px-2 py-1 text-[10px] font-black uppercase ${positive ? "border-[#d8ff3e]/35 text-[#d8ff3e]" : "border-red-400/35 text-red-200"}`}><Icon className="h-3 w-3" /> {label} {positive ? "+" : ""}{money ? crc.format(value) : value}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="border-[3px] border-dashed border-white/15 p-6 text-center text-sm font-bold text-white/35">{text}</div>;
}
