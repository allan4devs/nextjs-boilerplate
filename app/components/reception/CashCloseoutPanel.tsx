"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, Loader2, Printer, RefreshCw, Smartphone, Wallet } from "lucide-react";
import { GameChip, GameLabel } from "../GameOS";
import { RECEIPT_HEADER, colones, fmtDateTime, fmtIsoDate } from "./receipt-format";

type Closeout = {
  date: string;
  range: { from: string; to: string };
  productSales: { count: number; units: number; cash: number; sinpe: number; card: number; total: number };
  memberPayments: { count: number; cash: number; sinpe: number; card: number; other: number; total: number };
  totals: { efectivo: number; sinpe: number; tarjeta: number; otros: number; total: number };
  generatedAt: string;
  staffName: string;
};

const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });

/** Fecha de negocio (Costa Rica) en formato YYYY-MM-DD para el input de fecha. */
function crToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function CashCloseoutPanel() {
  const [date, setDate] = useState(crToday);
  const [data, setData] = useState<Closeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/xtreme/reception/cierre?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      const json = (await res.json()) as Closeout & { error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo cargar el cierre.");
      setData(json);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("xtreme:storefront-updated", refresh);
    return () => window.removeEventListener("xtreme:storefront-updated", refresh);
  }, [load]);

  const methods = useMemo(() => {
    if (!data) return [];
    return [
      { id: "efectivo", label: "Efectivo", value: data.totals.efectivo, icon: Banknote },
      { id: "sinpe", label: "SINPE", value: data.totals.sinpe, icon: Smartphone },
      { id: "tarjeta", label: "Tarjeta", value: data.totals.tarjeta, icon: CreditCard },
    ];
  }, [data]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <GameLabel tone="lime">Recaudación del día</GameLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">Cierre de caja</h2>
          <p className="mt-2 text-sm font-bold text-white/45">Total recaudado en recepción por efectivo, SINPE y tarjeta, listo para imprimir.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-black uppercase tracking-wide text-white/40">Día
            <input type="date" value={date} max={crToday()} onChange={(event) => setDate(event.target.value || crToday())} className="mt-1 block min-h-11 w-full border-[3px] border-white/15 bg-black px-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" />
          </label>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-4 text-xs font-black uppercase text-white/65 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e] disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
          <button type="button" onClick={() => window.print()} disabled={!data} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-4 text-xs font-black uppercase text-black disabled:opacity-40">
            <Printer className="h-4 w-4" /> Imprimir cierre
          </button>
        </div>
      </div>

      {error && <div className="mt-4 border-[3px] border-red-400/60 bg-red-500/10 p-3 text-sm font-black text-red-200">{error}</div>}

      {loading && !data ? (
        <div className="grid min-h-52 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" /></div>
      ) : data && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {methods.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.id} className="border-[3px] border-white/15 bg-black/35 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white/40"><Icon className="h-4 w-4" /> {method.label}</div>
                  <p className="mt-2 text-2xl font-black text-white">{crc.format(method.value)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-[3px] border-[#d8ff3e] bg-[#d8ff3e]/[0.07] p-4">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-[#d8ff3e]"><Wallet className="h-5 w-5" /> Total recaudado</div>
            <p className="text-3xl font-black text-[#d8ff3e]">{crc.format(data.totals.total)}</p>
          </div>
          {data.totals.otros > 0 && (
            <p className="mt-2 text-xs font-bold text-white/45">Incluye {crc.format(data.totals.otros)} en otros métodos (sin desglose de tarjeta/efectivo/SINPE).</p>
          )}

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <section className="border-[3px] border-white/15 bg-black/35 p-4">
              <div className="flex items-center justify-between gap-3"><div><GameLabel tone="cyan">Punto de venta</GameLabel><h3 className="mt-2 text-xl font-black uppercase">Ventas de productos</h3></div><GameChip tone="cyan">{data.productSales.count}</GameChip></div>
              <dl className="mt-3 space-y-1.5 text-sm font-bold text-white/65">
                <Row label={`Unidades (${data.productSales.units})`} value={crc.format(data.productSales.total)} strong />
                <Row label="Efectivo" value={crc.format(data.productSales.cash)} />
                <Row label="SINPE" value={crc.format(data.productSales.sinpe)} />
              </dl>
            </section>

            <section className="border-[3px] border-white/15 bg-black/35 p-4">
              <div className="flex items-center justify-between gap-3"><div><GameLabel tone="orange">Recepción</GameLabel><h3 className="mt-2 text-xl font-black uppercase">Pases y planes</h3></div><GameChip tone="orange">{data.memberPayments.count}</GameChip></div>
              <dl className="mt-3 space-y-1.5 text-sm font-bold text-white/65">
                <Row label="Cobrado" value={crc.format(data.memberPayments.total)} strong />
                <Row label="Efectivo" value={crc.format(data.memberPayments.cash)} />
                <Row label="SINPE" value={crc.format(data.memberPayments.sinpe)} />
                <Row label="Tarjeta" value={crc.format(data.memberPayments.card)} />
                {data.memberPayments.other > 0 && <Row label="Otros" value={crc.format(data.memberPayments.other)} />}
              </dl>
            </section>
          </div>

          <p className="mt-4 text-[10px] font-black uppercase tracking-[.16em] text-white/30">Los cobros por PayPal/en línea no entran al cierre de caja física.</p>

          <CloseoutReceipt data={data} />
        </>
      )}
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-b border-white/10 pb-1.5 text-white" : ""}`}>
      <dt>{label}</dt>
      <dd className={strong ? "font-black text-[#d8ff3e]" : "font-black text-white"}>{value}</dd>
    </div>
  );
}

/** Comprobante térmico (72 mm) del cierre de caja. Solo esto se envía a la
 *  impresora (ver reglas @media print en globals.css: .thermal-receipt). */
function CloseoutReceipt({ data }: { data: Closeout }) {
  const generado = fmtDateTime(data.generatedAt);
  const t = data.totals;
  return (
    <div className="thermal-receipt mx-auto mt-6 max-w-[280px] border border-black bg-white px-3 py-3 font-serif text-[11px] leading-[1.35] text-black">
      <div className="text-center">
        <p className="font-bold">{RECEIPT_HEADER.name1}</p>
        <p>{RECEIPT_HEADER.legalId}</p>
      </div>

      <p className="mt-3 text-center text-[13px] font-bold">CIERRE DE CAJA</p>
      <p className="text-center">{fmtIsoDate(data.date)}</p>

      <div className="mt-3">
        <p><span className="font-bold">Cajero:</span> {data.staffName}</p>
        <p><span className="font-bold">Generado:</span> {generado.date} {generado.time}</p>
      </div>

      <table className="mt-3 w-full border-collapse">
        <thead><tr className="border-y border-black text-left font-bold">
          <th className="py-0.5">Metodo</th><th className="py-0.5 text-right">Monto</th>
        </tr></thead>
        <tbody>
          <tr><td className="py-0.5">Efectivo</td><td className="whitespace-nowrap py-0.5 text-right">{colones(t.efectivo)}</td></tr>
          <tr><td className="py-0.5">SINPE</td><td className="whitespace-nowrap py-0.5 text-right">{colones(t.sinpe)}</td></tr>
          <tr><td className="py-0.5">Tarjeta</td><td className="whitespace-nowrap py-0.5 text-right">{colones(t.tarjeta)}</td></tr>
          {t.otros > 0 && <tr><td className="py-0.5">Otros</td><td className="whitespace-nowrap py-0.5 text-right">{colones(t.otros)}</td></tr>}
          <tr className="border-t-2 border-black text-[13px] font-bold"><td className="py-1">TOTAL</td><td className="whitespace-nowrap py-1 text-right">{colones(t.total)}</td></tr>
        </tbody>
      </table>

      <table className="mt-3 w-full border-collapse">
        <thead><tr className="border-y border-black text-left font-bold">
          <th className="py-0.5">Detalle</th><th className="py-0.5 text-right">Monto</th>
        </tr></thead>
        <tbody>
          <tr><td className="py-0.5">Productos ({data.productSales.count}) · {data.productSales.units} u.</td><td className="whitespace-nowrap py-0.5 text-right">{colones(data.productSales.total)}</td></tr>
          <tr><td className="py-0.5">Pases y planes ({data.memberPayments.count})</td><td className="whitespace-nowrap py-0.5 text-right">{colones(data.memberPayments.total)}</td></tr>
        </tbody>
      </table>

      <p className="mt-6">Firma: ____________________</p>
      <p className="mt-4 text-center text-[9px] text-black/60">Cierre interno · no sustituye la facturación fiscal de Latinsoft</p>
    </div>
  );
}
