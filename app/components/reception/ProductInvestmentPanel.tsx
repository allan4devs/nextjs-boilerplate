"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { ProductInvestmentReport } from "@/lib/xtreme/product-investments";
import { GameLabel } from "../GameOS";

const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });
const monthFormat = new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric", timeZone: "America/Costa_Rica" });

export default function ProductInvestmentPanel() {
  const [month, setMonth] = useState("2026-09");
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState<ProductInvestmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setReport(null);
      setError("");
      try {
        const response = await fetch(`/api/xtreme/reception/investments?${new URLSearchParams({ month })}`, {
          cache: "no-store", signal: controller.signal,
        });
        const json = await response.json() as ProductInvestmentReport & { error?: string };
        if (!response.ok) throw new Error(json.error || "No se pudo cargar la comparación.");
        if (!controller.signal.aborted) setReport(json);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Error de conexión.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [month, revision]);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("xtreme:storefront-updated", refresh);
    return () => window.removeEventListener("xtreme:storefront-updated", refresh);
  }, []);

  const summary = report?.summary;
  return (
    <section className="mt-6 border-[3px] border-cyan-300/30 bg-cyan-300/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <GameLabel tone="cyan">Compras de productos</GameLabel>
          <h3 className="mt-2 text-2xl font-black uppercase">Inversión y ventas del mes</h3>
          <p className="mt-2 text-sm font-bold text-white/50">Comparación del mes completo, independiente del filtro de ventas recientes.</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs font-bold text-white/60">Mes contable
            <input type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} className="mt-1 block min-h-11 border-2 border-white/20 bg-black px-3 text-sm text-white" />
          </label>
          <button type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading} aria-label="Actualizar comparación mensual" className="grid h-11 w-11 place-items-center border-2 border-white/20 text-white/60 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm font-bold text-red-200">{error}</p>}
      {loading && <div className="mt-4 flex items-center gap-2 text-sm text-white/60"><Loader2 className="h-5 w-5 animate-spin" /> Cargando comparación mensual…</div>}
      {report && summary && <>
        <p className="mt-5 text-sm font-black uppercase text-cyan-200">{monthFormat.format(new Date(`${report.month}-01T00:00:00-06:00`))}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Amount label="Ventas del mes" value={summary.totalIncome} />
          <Amount label="Inversión reportada" value={summary.reportedInvestment} />
          <Amount label="Falta recuperar" value={summary.remainingToRecover} />
          <Amount label="Ventas menos inversión" value={summary.balance} />
        </div>
        {summary.recoveryPercent !== null && <p className="mt-3 text-sm font-bold text-cyan-200">Las ventas cubren el {summary.recoveryPercent.toLocaleString("es-CR", { maximumFractionDigits: 1 })}% de la inversión reportada.</p>}
        <p className="mt-3 text-xs font-bold text-white/50">Saldo de recuperación, provisional: no es utilidad contable. Faltan el costo de los productos vendidos, el inventario restante y otros gastos.</p>
        {(summary.investmentToVerify > 0 || summary.pendingAmounts > 0) && <p className="mt-2 text-sm font-bold text-orange-200">Incluye {crc.format(summary.investmentToVerify)} por verificar. {summary.pendingAmounts} conceptos pendientes de monto; el total de inversión está incompleto.</p>}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead><tr className="border-b border-white/15 text-xs uppercase text-white/45"><th className="py-3 pr-3">Compra</th><th className="p-3">Fecha de compra</th><th className="p-3">Inversión</th><th className="py-3 pl-3">Detalle</th></tr></thead>
            <tbody>{report.entries.map((entry) => <tr key={entry.id} className="border-b border-white/10">
              <td className="py-3 pr-3 font-bold">{entry.concept}{entry.quantity !== null && <span className="mt-1 block text-xs text-white/45">{entry.quantity} unidades</span>}</td>
              <td className="p-3 text-white/50">{entry.purchaseDate ? entry.purchaseDate.split("-").reverse().join("/") : "Por confirmar"}</td>
              <td className="p-3 font-black text-orange-200">{entry.amountCrc === null ? "Monto pendiente" : crc.format(entry.amountCrc)}{entry.needsVerification && entry.amountCrc !== null && <span className="mt-1 block text-xs font-bold">Por verificar</span>}</td>
              <td className="py-3 pl-3 text-xs text-white/55">{entry.note}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {report.entries.length === 0 ? <p className="mt-4 text-sm font-bold text-white/50">No hay inversiones registradas en este mes. Esto no confirma que no haya compras.</p> : <p className="mt-3 text-xs text-white/40">Fuente: {report.entries[0].source}</p>}
      </>}
    </section>
  );
}

function Amount({ label, value }: { label: string; value: number }) {
  return <div className="border-[3px] border-white/15 bg-black/35 p-4"><p className="text-[10px] font-black uppercase tracking-wide text-white/45">{label}</p><p className="mt-2 text-2xl font-black text-cyan-100">{crc.format(value)}</p></div>;
}
