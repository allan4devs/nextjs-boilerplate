"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, CreditCard, Loader2, Lock, Printer, RefreshCw, RotateCcw, Smartphone, Wallet } from "lucide-react";
import { GameChip, GameLabel } from "../GameOS";
import { RECEIPT_HEADER, colones, fmtDateTime, fmtIsoDate } from "./receipt-format";

type Totals = { efectivo: number; sinpe: number; tarjeta: number; otros: number; total: number };
type ProductSales = { count: number; units: number; cash: number; sinpe: number; card: number; total: number };
type MemberPayments = { count: number; cash: number; sinpe: number; card: number; other: number; total: number };

type PersistedCloseout = {
  id: string;
  businessDate: string;
  seq: number;
  from: string;
  to: string;
  staffName: string;
  productSales: ProductSales;
  memberPayments: MemberPayments;
  totals: Totals;
  createdAt: string;
};

type OpenShift = {
  open: true;
  date: string;
  seq: number;
  range: { from: string; to: string };
  productSales: ProductSales;
  memberPayments: MemberPayments;
  totals: Totals;
  generatedAt: string;
  staffName: string;
  history: PersistedCloseout[];
};

type PastDay = {
  open: false;
  date: string;
  staffName: string;
  history: PersistedCloseout[];
  remainder: (Pick<PersistedCloseout, "from" | "to" | "productSales" | "memberPayments" | "totals">) | null;
};

type ApiResponse = OpenShift | PastDay;

/** Lo que se muestra y se imprime: un cierre guardado o el turno abierto (parcial). */
type Printable = {
  official: boolean;
  seq: number | null;
  businessDate: string;
  from: string;
  to: string;
  staffName: string;
  generatedAt: string;
  productSales: ProductSales;
  memberPayments: MemberPayments;
  totals: Totals;
};

const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });

/** Fecha de negocio (Costa Rica) en formato YYYY-MM-DD para el input de fecha. */
function crToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function CashCloseoutPanel() {
  const [date, setDate] = useState(crToday);
  const [data, setData] = useState<ApiResponse | null>(null);
  // Qué se muestra/imprime: un cierre guardado, el remanente sin cerrar de un
  // día pasado, o nada (→ turno abierto actual).
  const [selected, setSelected] = useState<PersistedCloseout | "remainder" | null>(null);
  const [justClosed, setJustClosed] = useState<{ seq: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/xtreme/reception/cierre?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo cargar el cierre.");
      setData(json);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { setSelected(null); }, [date]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("xtreme:storefront-updated", refresh);
    return () => window.removeEventListener("xtreme:storefront-updated", refresh);
  }, [load]);

  async function doCloseout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/xtreme/reception/cierre", { method: "POST" });
      const json = (await res.json()) as { closeout?: PersistedCloseout; error?: string };
      if (!res.ok || !json.closeout) throw new Error(json.error || "No se pudo cerrar la caja.");
      setSelected(json.closeout);
      setJustClosed({ seq: json.closeout.seq, total: json.closeout.totals.total });
      window.setTimeout(() => setJustClosed(null), 2600);
      window.setTimeout(() => window.print(), 400);
      window.dispatchEvent(new Event("xtreme:storefront-updated"));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cerrar la caja.");
    } finally {
      setBusy(false);
    }
  }

  const isOpenToday = data?.open === true;
  const staffName = data?.staffName ?? "Recepción";

  const printable: Printable | null = useMemo(() => {
    if (selected && selected !== "remainder") {
      return {
        official: true,
        seq: selected.seq,
        businessDate: selected.businessDate,
        from: selected.from,
        to: selected.to,
        staffName: selected.staffName,
        generatedAt: selected.createdAt,
        productSales: selected.productSales,
        memberPayments: selected.memberPayments,
        totals: selected.totals,
      };
    }
    if (selected === "remainder" && data && !data.open && data.remainder) {
      return {
        official: false,
        seq: null,
        businessDate: data.date,
        from: data.remainder.from,
        to: data.remainder.to,
        staffName: data.staffName,
        generatedAt: new Date().toISOString(),
        productSales: data.remainder.productSales,
        memberPayments: data.remainder.memberPayments,
        totals: data.remainder.totals,
      };
    }
    if (data?.open) {
      return {
        official: false,
        seq: data.seq,
        businessDate: data.date,
        from: data.range.from,
        to: data.range.to,
        staffName: data.staffName,
        generatedAt: data.generatedAt,
        productSales: data.productSales,
        memberPayments: data.memberPayments,
        totals: data.totals,
      };
    }
    return null;
  }, [selected, data]);

  const methods = useMemo(() => {
    const t = printable?.totals;
    if (!t) return [];
    return [
      { id: "efectivo", label: "Efectivo", value: t.efectivo, icon: Banknote },
      { id: "sinpe", label: "SINPE", value: t.sinpe, icon: Smartphone },
      { id: "tarjeta", label: "Tarjeta", value: t.tarjeta, icon: CreditCard },
    ];
  }, [printable]);

  return (
    <div className="relative">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <GameLabel tone="lime">Recaudación por turno</GameLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">Cierre de caja</h2>
          <p className="mt-2 text-sm font-bold text-white/45">Cada cierre cubre desde el cierre anterior hasta ahora y arranca un turno nuevo. No se repiten ventas entre comprobantes.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-black uppercase tracking-wide text-white/40">Día
            <input type="date" value={date} max={crToday()} onChange={(event) => setDate(event.target.value || crToday())} className="mt-1 block min-h-11 w-full border-[3px] border-white/15 bg-black px-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" />
          </label>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-4 text-xs font-black uppercase text-white/65 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e] disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
          <button type="button" onClick={() => window.print()} disabled={!printable} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-4 text-xs font-black uppercase text-white/65 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e] disabled:opacity-40">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      {error && <div className="mt-4 border-[3px] border-red-400/60 bg-red-500/10 p-3 text-sm font-black text-red-200">{error}</div>}

      {loading && !data ? (
        <div className="grid min-h-52 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" /></div>
      ) : data && (
        <>
          {isOpenToday && !selected && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-[3px] border-[#d8ff3e]/45 bg-[#d8ff3e]/[0.06] p-4">
              <div>
                <GameLabel tone="lime">Turno abierto · cierre #{(data as OpenShift).seq}</GameLabel>
                <p className="mt-1 text-sm font-black uppercase text-white">
                  Cajero: {staffName}
                </p>
                <p className="mt-0.5 text-xs font-bold text-white/45">
                  Desde {fmtDateTime((data as OpenShift).range.from).time} · corta al cerrar
                </p>
              </div>
            </div>
          )}

          {selected && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-[3px] border-white/20 bg-black/35 p-4">
              <p className="text-sm font-black uppercase text-white">
                {selected === "remainder"
                  ? `Viendo lo no cerrado · ${fmtIsoDate(date)}`
                  : `Viendo cierre #${selected.seq} · ${selected.staffName} · ${fmtIsoDate(selected.businessDate)}`}
              </p>
              <button type="button" onClick={() => setSelected(null)} className="inline-flex min-h-10 items-center gap-2 border-[3px] border-white/20 px-3 text-[10px] font-black uppercase text-white/60 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e]">
                <RotateCcw className="h-4 w-4" /> {isOpenToday ? "Volver al turno actual" : "Quitar selección"}
              </button>
            </div>
          )}

          {printable && (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-[#d8ff3e]"><Wallet className="h-5 w-5" /> {printable.official ? `Cierre #${printable.seq}` : "Turno abierto"} · total</div>
                <p className="text-3xl font-black text-[#d8ff3e]">{crc.format(printable.totals.total)}</p>
              </div>
              {printable.totals.otros > 0 && (
                <p className="mt-2 text-xs font-bold text-white/45">Incluye {crc.format(printable.totals.otros)} en otros métodos (sin desglose de tarjeta/efectivo/SINPE).</p>
              )}

              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <section className="border-[3px] border-white/15 bg-black/35 p-4">
                  <div className="flex items-center justify-between gap-3"><div><GameLabel tone="cyan">Punto de venta</GameLabel><h3 className="mt-2 text-xl font-black uppercase">Ventas de productos</h3></div><GameChip tone="cyan">{printable.productSales.count}</GameChip></div>
                  <dl className="mt-3 space-y-1.5 text-sm font-bold text-white/65">
                    <Row label={`Unidades (${printable.productSales.units})`} value={crc.format(printable.productSales.total)} strong />
                    <Row label="Efectivo" value={crc.format(printable.productSales.cash)} />
                    <Row label="SINPE" value={crc.format(printable.productSales.sinpe)} />
                  </dl>
                </section>

                <section className="border-[3px] border-white/15 bg-black/35 p-4">
                  <div className="flex items-center justify-between gap-3"><div><GameLabel tone="orange">Recepción</GameLabel><h3 className="mt-2 text-xl font-black uppercase">Pases y planes</h3></div><GameChip tone="orange">{printable.memberPayments.count}</GameChip></div>
                  <dl className="mt-3 space-y-1.5 text-sm font-bold text-white/65">
                    <Row label="Cobrado" value={crc.format(printable.memberPayments.total)} strong />
                    <Row label="Efectivo" value={crc.format(printable.memberPayments.cash)} />
                    <Row label="SINPE" value={crc.format(printable.memberPayments.sinpe)} />
                    <Row label="Tarjeta" value={crc.format(printable.memberPayments.card)} />
                    {printable.memberPayments.other > 0 && <Row label="Otros" value={crc.format(printable.memberPayments.other)} />}
                  </dl>
                </section>
              </div>
            </>
          )}

          {isOpenToday && !selected && (
            <button
              type="button"
              onClick={() => void doCloseout()}
              disabled={busy}
              className="mt-5 flex min-h-16 w-full items-center justify-center gap-3 border-[3px] border-black/30 bg-[#d8ff3e] px-6 text-lg font-black uppercase tracking-tight text-black shadow-[6px_6px_0_rgba(216,255,62,.25)] disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Lock className="h-6 w-6" />}
              Cerrar caja · turno #{(data as OpenShift).seq} · {crc.format((data as OpenShift).totals.total)}
            </button>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <GameLabel tone="white">Cierres {isOpenToday ? "de hoy" : `del ${fmtIsoDate(date)}`}</GameLabel>
              <GameChip tone="lime">{data.history.length}</GameChip>
            </div>
            <div className="mt-3 space-y-2">
              {data.history.length === 0 && (
                <p className="border-[3px] border-dashed border-white/15 p-4 text-center text-sm font-bold text-white/35">Todavía no hay cierres {isOpenToday ? "hoy" : "ese día"}.</p>
              )}
              {data.history.map((entry) => {
                const active = selected !== "remainder" && selected?.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelected(entry)}
                    className={`flex w-full flex-wrap items-center justify-between gap-3 border-[3px] p-3 text-left ${active ? "border-[#d8ff3e] bg-[#d8ff3e]/[0.08]" : "border-white/15 bg-black/35 hover:border-white/35"}`}
                  >
                    <span>
                      <span className="block text-sm font-black uppercase text-white">Cierre #{entry.seq} · {entry.staffName}</span>
                      <span className="mt-0.5 block text-xs font-bold text-white/45">{fmtDateTime(entry.from).time} a {fmtDateTime(entry.to).time}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-lg font-black text-[#d8ff3e]">{crc.format(entry.totals.total)}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-white/45"><Printer className="h-3.5 w-3.5" /> Ver / imprimir</span>
                    </span>
                  </button>
                );
              })}
              {!data.open && data.remainder && (
                <button
                  type="button"
                  onClick={() => setSelected("remainder")}
                  className={`flex w-full flex-wrap items-center justify-between gap-3 border-[3px] p-3 text-left ${selected === "remainder" ? "border-[#d8ff3e] bg-[#d8ff3e]/[0.08]" : "border-orange-300/40 bg-orange-400/[0.06] hover:border-orange-300/70"}`}
                >
                  <span>
                    <span className="block text-sm font-black uppercase text-orange-100">Sin cerrar · resto del día</span>
                    <span className="mt-0.5 block text-xs font-bold text-white/45">{fmtDateTime(data.remainder.from).time} a {fmtDateTime(data.remainder.to).time}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-lg font-black text-[#d8ff3e]">{crc.format(data.remainder.totals.total)}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-white/45"><Printer className="h-3.5 w-3.5" /> Ver / imprimir</span>
                  </span>
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-[10px] font-black uppercase tracking-[.16em] text-white/30">Los cobros por PayPal/en línea no entran al cierre de caja física.</p>

          {printable && <CloseoutReceipt data={printable} />}
        </>
      )}

      {justClosed && (
        <div role="status" className="fixed inset-0 z-[60] grid place-items-center bg-[#050505]/97 p-6 text-center">
          <div>
            <CheckCircle2 className="mx-auto h-16 w-16 text-[#d8ff3e]" />
            <p className="mt-4 text-2xl font-black uppercase tracking-tight">Cierre #{justClosed.seq} registrado</p>
            <p className="mt-1 text-4xl font-black text-[#d8ff3e] sm:text-5xl">{crc.format(justClosed.total)}</p>
            <p className="mt-2 text-sm font-bold text-white/45">Turno nuevo iniciado · imprimiendo…</p>
          </div>
        </div>
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

/** Comprobante térmico (72 mm) del cierre. Solo esto se envía a la impresora
 *  (ver reglas @media print en globals.css: .thermal-receipt). */
function CloseoutReceipt({ data }: { data: Printable }) {
  const generado = fmtDateTime(data.generatedAt);
  const desde = fmtDateTime(data.from);
  const hasta = fmtDateTime(data.to);
  const t = data.totals;
  return (
    <div className="thermal-receipt mx-auto mt-6 max-w-[280px] border border-black bg-white px-3 py-3 font-serif text-[11px] leading-[1.35] text-black">
      <div className="text-center">
        <p className="font-bold">{RECEIPT_HEADER.name1}</p>
        <p>{RECEIPT_HEADER.legalId}</p>
      </div>

      <p className="mt-3 text-center text-[13px] font-bold">CIERRE DE CAJA{data.seq != null ? ` #${data.seq}` : ""}</p>
      <p className="text-center">{fmtIsoDate(data.businessDate)}</p>
      {!data.official && <p className="text-center font-bold">**** PARCIAL — SIN CERRAR ****</p>}

      <div className="mt-3">
        <p><span className="font-bold">Cajero:</span> {data.staffName}</p>
        <p><span className="font-bold">Turno:</span> {desde.time} a {hasta.time}</p>
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
