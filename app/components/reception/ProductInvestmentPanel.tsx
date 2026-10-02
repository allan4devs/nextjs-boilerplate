"use client";

import { useEffect, useState } from "react";
import { Download, Edit3, Loader2, Plus, RefreshCw, Trash2, UserRound } from "lucide-react";
import { businessDate } from "@/lib/xtreme/business-date";
import { INVESTMENT_STATUS_LABEL, type ProductInvestmentEntry, type ProductInvestmentReport, type ProductInvestor } from "@/lib/xtreme/product-investment-model";
import { GameButton, GameChip, GameLabel, GameModal } from "../GameOS";
import { InvestmentEditor, InvestorEditor, investmentRequest } from "./ProductInvestmentForms";

const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });
const monthFormat = new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric", timeZone: "America/Costa_Rica" });
const monthLabel = (value: string) => monthFormat.format(new Date(`${value}-01T00:00:00-06:00`));

export default function ProductInvestmentPanel({ month: selectedMonth, onMonthChange }: { month?: string; onMonthChange?: (month: string) => void } = {}) {
  const [localMonth, setLocalMonth] = useState(() => businessDate().slice(0, 7));
  const month = selectedMonth || localMonth;
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState<ProductInvestmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState("resumen");
  const [editor, setEditor] = useState<{ entry: ProductInvestmentEntry | null; month: string; investorId: string } | null>(null);
  const [investorEditor, setInvestorEditor] = useState<{ investor: ProductInvestor | null } | null>(null);
  const [deletion, setDeletion] = useState<ProductInvestmentEntry | null>(null);
  const [adminCode, setAdminCode] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const visible = report?.month === month ? report : null;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/xtreme/reception/investments?${new URLSearchParams({ month })}`, { cache: "no-store", signal: controller.signal });
        const json = await response.json() as ProductInvestmentReport & { error?: string };
        if (!response.ok) throw new Error(json.error || "No se pudo cargar el mes.");
        if (!controller.signal.aborted) setReport(json);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Error de conexión."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [month, revision]);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("xtreme:storefront-updated", refresh);
    return () => window.removeEventListener("xtreme:storefront-updated", refresh);
  }, []);
  function changeMonth(value: string) {
    if (!value) return;
    setLocalMonth(value); onMonthChange?.(value); setActive("resumen"); setNotice("");
  }
  function changed(message: string) {
    setNotice(message);
    window.dispatchEvent(new Event("xtreme:storefront-updated"));
  }
  async function remove() {
    if (!deletion || deleting) return;
    setDeleting(true); setDeleteError("");
    try {
      await investmentRequest("DELETE", { id: deletion.id, revision: deletion.revision, code: adminCode });
      setDeletion(null); setAdminCode(""); changed("Inversión retirada del reporte mensual.");
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "No se pudo eliminar."); }
    finally { setDeleting(false); }
  }
  const summary = visible?.summary;
  const investors = visible?.investors ?? [];
  const selectedInvestor = investors.find((row) => row.id === active);
  const selectedRows = visible?.entries.filter((row) => active === "resumen" || (active === "unassigned" ? !investors.some((person) => person.id === row.investorId) : row.investorId === active)) ?? [];

  return <section className="mt-6 border-[3px] border-white/15 bg-white/[0.025] p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><GameLabel tone="orange">Facturas e inversiones del mes</GameLabel><h3 className="mt-2 text-2xl font-black uppercase">Reportes por inversionista</h3><p className="mt-1 text-sm font-bold text-white/45">Cada inversión pertenece a un mes contable y a la persona que la realizó.</p></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold text-white/60">Mes contable<input type="month" value={month} onChange={(event) => changeMonth(event.target.value)} className="mt-1 block min-h-11 border-2 border-white/20 bg-black px-3 text-sm text-white [color-scheme:dark]" /></label>
        <button type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading} aria-label="Actualizar inversiones del mes" className="grid h-11 w-11 place-items-center border-2 border-white/20 text-white/60 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <GameButton disabled={!visible || loading} onClick={() => setEditor({ entry: null, month, investorId: selectedInvestor?.active ? selectedInvestor.id : "" })}><Plus className="h-4 w-4" />Agregar inversión</GameButton>
      <GameButton variant="cyan" disabled={!visible || loading} onClick={() => setInvestorEditor({ investor: null })}><UserRound className="h-4 w-4" />Agregar inversionista</GameButton>
      <a href={`/api/xtreme/reception/inventory/report?month=${encodeURIComponent(month)}`} download className="inline-flex min-h-11 items-center gap-2 border-2 border-white/20 px-3 text-xs font-black uppercase"><Download className="h-4 w-4" />PDF de {monthLabel(month)}</a>
    </div>
    {notice && <p role="status" className="mt-3 text-sm font-bold text-[#d8ff3e]">{notice}</p>}
    {error && <p role="alert" className="mt-4 text-sm font-bold text-red-200">{error}</p>}
    {loading && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-white/60"><Loader2 className="h-5 w-5 animate-spin" />Cargando {monthLabel(month)}...</p>}
    {visible && summary && <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-black uppercase text-cyan-200">{monthLabel(month)}</h4><GameChip tone="cyan">{investors.filter((row) => row.active).length} inversionistas activos</GameChip></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Amount label="Ventas del mes" value={summary.totalIncome} />
        <Amount label="Inversión registrada" value={summary.reportedInvestment} />
        <Amount label="Falta recuperar" value={summary.remainingToRecover} />
        <Amount label="Ventas menos inversión" value={summary.balance} />
      </div>
      {summary.recoveryPercent !== null && <p className="mt-3 text-sm font-bold text-cyan-200">Las ventas cubren el {summary.recoveryPercent.toLocaleString("es-CR", { maximumFractionDigits: 1 })}% de la inversión registrada.</p>}
      <p className="mt-2 text-xs text-white/50">Comparación de recuperación del mes; no es utilidad contable. No incluye el costo de lo vendido ni otros gastos.</p>
      {(summary.investmentToVerify > 0 || summary.pendingAmounts > 0) && <p className="mt-2 text-sm font-bold text-orange-200">{crc.format(summary.investmentToVerify)} por verificar · {summary.pendingAmounts} registros sin monto. La comparación está incompleta.</p>}
      {summary.unassignedCount > 0 && <p className="mt-2 text-sm font-bold text-orange-200">{summary.unassignedCount} inversiones sin inversionista asignado ({crc.format(summary.unassignedInvestment)}). Editalas para completar la persona; ya están incluidas una sola vez en el total.</p>}
      <div className="mt-5 grid items-start gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
        <aside aria-label="Inversionistas" className="grid gap-2 border-[3px] border-white/10 bg-black/25 p-2">
          {[{ id: "resumen", name: "Resumen" }, ...investors, ...(summary.unassignedCount ? [{ id: "unassigned", name: "Sin asignar" }] : [])].map((person) => <button key={person.id} type="button" aria-pressed={active === person.id} onClick={() => setActive(person.id)} className={`min-h-11 border-[3px] px-3 text-left text-xs font-black uppercase ${active === person.id ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/55 hover:border-white/35"}`}>{person.name}</button>)}
        </aside>
        <div className="min-w-0 space-y-4">
          {active === "resumen" ? <div className="grid gap-3 lg:grid-cols-3">
            {visible.byInvestor.map((person) => <button key={person.id} type="button" onClick={() => setActive(person.id)} className="flex min-w-0 flex-col border-[3px] border-white/15 bg-black/35 p-4 text-left hover:border-[#d8ff3e]/60">
              <UserRound className="h-5 w-5 text-white/55" /><p className="mt-3 break-words text-lg font-black uppercase">{person.name}</p><p className="mt-1 text-xs text-white/40">{person.description || "Inversionista"}{person.active ? "" : " · Inactivo"}</p><p className="mt-4 text-2xl font-black text-[#d8ff3e]">{crc.format(person.reportedInvestment)}</p><p className="mt-2 text-xs text-white/50">{person.entryCount ? `${person.entryCount} inversiones · ${person.pendingDeliveries} entregas pendientes` : "Sin registros en este mes"}</p>
            </button>)}
          </div> : selectedInvestor ? <div className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-white/15 p-4"><div><h5 className="text-xl font-black">{selectedInvestor.name}</h5><p className="mt-1 text-sm text-white/50">{selectedInvestor.description}</p></div><GameButton variant="ghost" onClick={() => setInvestorEditor({ investor: selectedInvestor })}><Edit3 className="h-4 w-4" />Editar inversionista</GameButton></div> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <caption className="py-3 text-left text-xs font-black uppercase text-white/60">{selectedRows.length} inversiones de {active === "resumen" ? "todo el mes" : selectedInvestor?.name ?? "personas por asignar"}</caption>
              <thead><tr className="border-b border-white/15 text-xs uppercase text-white/45"><th className="py-3 pr-3">Inversionista / compra</th><th className="p-3">Fecha / factura</th><th className="p-3 text-right">Inversión</th><th className="p-3">Estado / detalle</th><th className="py-3 pl-3">Acciones</th></tr></thead>
              <tbody>{selectedRows.map((entry) => <tr key={entry.id} className="border-b border-white/10 align-top">
                <td className="py-3 pr-3"><span className="block text-xs font-black text-cyan-200">{investors.find((person) => person.id === entry.investorId)?.name ?? "Sin asignar"}</span><strong className="mt-1 block">{entry.concept}</strong>{entry.quantity !== null && <span className="text-xs text-white/45">{entry.quantity} unidades</span>}</td>
                <td className="p-3 text-xs text-white/55">{entry.purchaseDate?.split("-").reverse().join("/") ?? "Fecha por confirmar"}<span className="mt-1 block">{entry.invoiceReference || "Sin referencia de factura"}</span></td>
                <td className="whitespace-nowrap p-3 text-right font-black text-orange-200">{entry.amountCrc === null ? "Monto pendiente" : crc.format(entry.amountCrc)}{entry.needsVerification && <span className="mt-1 block text-xs font-bold">Por verificar</span>}</td>
                <td className="max-w-64 p-3 text-xs text-white/55"><strong>{INVESTMENT_STATUS_LABEL[entry.status]}</strong><p className="mt-1 whitespace-pre-wrap break-words">{entry.note}</p>{entry.updatedBy && <p className="mt-1 text-white/30">Editado por {entry.updatedBy}</p>}</td>
                <td className="py-3 pl-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditor({ entry, month, investorId: entry.investorId ?? "" })} className="min-h-10 border-2 border-white/20 px-3 text-xs font-black"><Edit3 className="mr-1 inline h-3.5 w-3.5" />Editar</button><button type="button" onClick={() => { setDeletion(entry); setDeleteError(""); setAdminCode(""); }} aria-label={`Eliminar inversión ${entry.concept}`} className="min-h-10 border-2 border-red-400/30 px-3 text-red-200"><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>)}</tbody>
            </table>
          </div>
          {!selectedRows.length && <p className="border-2 border-dashed border-white/15 p-4 text-sm font-bold text-white/50">No hay inversiones registradas para {selectedInvestor?.name ?? "esta selección"} en {monthLabel(month)}. Agregá las que correspondan a este mes.</p>}
        </div>
      </div>
    </>}
    {editor && <InvestmentEditor key={editor.entry?.id ?? "new"} {...editor} investors={report?.investors ?? []} onCancel={() => setEditor(null)} onInvestorAdded={(person) => setReport((current) => current ? { ...current, investors: [...current.investors.filter((row) => row.id !== person.id), person] } : current)} onSaved={(savedMonth) => { setEditor(null); changeMonth(savedMonth); changed("Inversión guardada."); }} />}
    {investorEditor && <InvestorEditor key={investorEditor.investor?.id ?? "new-investor"} {...investorEditor} onCancel={() => setInvestorEditor(null)} onSaved={() => { setInvestorEditor(null); changed("Inversionista guardado."); }} />}
    {deletion && <GameModal open onClose={() => { if (!deleting) setDeletion(null); }} title="Eliminar inversión" size="sm"><form onSubmit={(event) => { event.preventDefault(); void remove(); }} className="space-y-4"><p className="text-sm font-bold">{deletion.concept} · {deletion.accountingMonth}</p><p className="text-xs text-white/50">Se retira del reporte, conservando el registro de la operación.</p><label className="block text-xs font-bold text-white/65">Código admin<input type="password" required autoComplete="off" value={adminCode} onChange={(event) => setAdminCode(event.target.value)} className="mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3" /></label>{deleteError && <p role="alert" className="text-sm text-red-200">{deleteError}</p>}<GameButton type="submit" variant="danger" disabled={deleting || !adminCode}>{deleting ? "Eliminando..." : "Eliminar inversión"}</GameButton></form></GameModal>}
  </section>;
}
function Amount({ label, value }: { label: string; value: number }) {
  return <div className="flex h-full flex-col justify-between border-[3px] border-white/15 bg-black/35 p-4"><p className="text-[10px] font-black uppercase tracking-wide text-white/45">{label}</p><p className="mt-2 break-words text-2xl font-black text-cyan-100">{crc.format(value)}</p></div>;
}
