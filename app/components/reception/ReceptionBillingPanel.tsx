"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, Loader2, Printer, Smartphone } from "lucide-react";
import { GameLabel } from "@/app/components/GameOS";
import type { MemberHit } from "@/lib/xtreme/checkin/contracts";

const ITEMS = [
  { id: "enrollment", label: "Matrícula", price: 5_000 },
  { id: "day-pass", label: "Pase del día", price: 3_000 },
  { id: "week", label: "Plan semanal", price: 8_000 },
  { id: "fortnight", label: "Plan quincenal", price: 13_500 },
  { id: "month", label: "Plan mensual", price: 23_000 },
  { id: "senior", label: "Adultos mayores", price: 16_000 },
] as const;

type Receipt = { id: string; date: string; createdAt: string; customerName: string; itemLabel: string; amountCrc: number; breakdown: { cash: number; sinpe: number; card: number }; nextBillingDate?: string | null; staffName: string };
const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });

export default function ReceptionBillingPanel({ member }: { member: MemberHit }) {
  const [itemId, setItemId] = useState("month");
  const [amount, setAmount] = useState("23000");
  const [lastAmounts, setLastAmounts] = useState<Record<string, number>>({});
  const [parts, setParts] = useState({ cash: "23000", sinpe: "", card: "" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const selected = ITEMS.find((item) => item.id === itemId)!;
  const total = Math.max(0, Math.round(Number(amount) || 0));
  const paid = Math.max(0, Number(parts.cash) || 0) + Math.max(0, Number(parts.sinpe) || 0) + Math.max(0, Number(parts.card) || 0);
  const difference = total - paid;
  const historical = lastAmounts[itemId];

  useEffect(() => {
    void fetch(`/api/xtreme/reception/billing?memberKey=${encodeURIComponent(member.normalizedName)}`, { cache: "no-store" })
      .then((response) => response.json()).then((data: { lastAmounts?: Record<string, number> }) => setLastAmounts(data.lastAmounts ?? {})).catch(() => undefined);
  }, [member.normalizedName]);

  function chooseItem(nextId: string) {
    const item = ITEMS.find((entry) => entry.id === nextId)!;
    const nextAmount = lastAmounts[nextId] ?? item.price;
    setItemId(nextId); setAmount(String(nextAmount)); setParts({ cash: String(nextAmount), sinpe: "", card: "" }); setReceipt(null); setError("");
  }

  function singlePayment(method: "cash" | "sinpe" | "card") {
    setParts({ cash: method === "cash" ? String(total) : "", sinpe: method === "sinpe" ? String(total) : "", card: method === "card" ? String(total) : "" });
  }

  async function bill() {
    setBusy(true); setError(""); setReceipt(null);
    try {
      const response = await fetch("/api/xtreme/reception/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberKey: member.normalizedName, itemId, amountCrc: total, payment: { cash: Number(parts.cash) || 0, sinpe: Number(parts.sinpe) || 0, card: Number(parts.card) || 0 }, note }) });
      const data = (await response.json()) as { receipt?: Receipt; error?: string };
      if (!response.ok || !data.receipt) throw new Error(data.error || "No se pudo facturar.");
      setReceipt(data.receipt);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo facturar."); }
    finally { setBusy(false); }
  }

  return <div>
    <GameLabel tone="lime">Facturación de recepción</GameLabel>
    <h2 className="mt-2 text-3xl font-black uppercase">{member.memberName}</h2>
    <p className="mt-2 text-sm font-bold text-white/45">Elegí el producto, confirmá el monto vigente para esta persona y distribuí el pago.</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="border-[3px] border-white/15 bg-black/30 p-4">
        <label className="text-[10px] font-black uppercase tracking-wide text-white/40">Producto o plan<select value={itemId} onChange={(event) => chooseItem(event.target.value)} className="mt-2 min-h-13 w-full border-[3px] border-white/20 bg-black px-3 font-black outline-none focus:border-[#d8ff3e]">{ITEMS.map((item) => <option key={item.id} value={item.id}>{item.label} · {crc.format(item.price)}</option>)}</select></label>
        <label className="mt-4 block text-[10px] font-black uppercase tracking-wide text-white/40">Monto a cobrar<input type="number" min="1" step="500" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 min-h-14 w-full border-[3px] border-[#d8ff3e]/50 bg-black px-3 text-2xl font-black outline-none focus:border-[#d8ff3e]" /></label>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase"><span className="text-white/35">Precio nuevo: {crc.format(selected.price)}</span>{historical ? <button type="button" onClick={() => { setAmount(String(historical)); setParts({ cash: String(historical), sinpe: "", card: "" }); }} className="text-cyan-300 underline">Última factura: {crc.format(historical)}</button> : <span className="text-white/25">Sin factura anterior</span>}</div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-wide text-white/40">Forma de pago</p>
        <div className="mt-2 grid grid-cols-3 gap-2">{[{ id: "cash" as const, label: "Efectivo", icon: Banknote }, { id: "sinpe" as const, label: "SINPE", icon: Smartphone }, { id: "card" as const, label: "Tarjeta", icon: CreditCard }].map((method) => <button key={method.id} type="button" onClick={() => singlePayment(method.id)} className="flex min-h-14 flex-col items-center justify-center gap-1 border-[3px] border-white/15 text-[10px] font-black uppercase hover:border-[#d8ff3e]"><method.icon className="h-5 w-5" />{method.label}</button>)}</div>
        <div className="mt-3 grid grid-cols-3 gap-2">{(["cash", "sinpe", "card"] as const).map((key) => <label key={key} className="text-[9px] font-black uppercase text-white/35">{key === "cash" ? "Efectivo" : key === "sinpe" ? "SINPE" : "Tarjeta"}<input type="number" min="0" step="500" value={parts[key]} onChange={(event) => setParts((current) => ({ ...current, [key]: event.target.value }))} placeholder="0" className="mt-1 min-h-11 w-full border-[3px] border-white/15 bg-black px-2 font-black outline-none focus:border-cyan-300" /></label>)}</div>
        <div className={`mt-3 flex justify-between border-2 px-3 py-2 text-xs font-black ${difference === 0 && total > 0 ? "border-[#d8ff3e]/45 text-[#d8ff3e]" : "border-orange-300/45 text-orange-200"}`}><span>{difference === 0 ? "Pago completo" : difference > 0 ? "Falta" : "Excede"}</span><span>{crc.format(Math.abs(difference))}</span></div>
        <label className="mt-4 block text-[10px] font-black uppercase text-white/35">Nota opcional<input value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-11 w-full border-[3px] border-white/15 bg-black px-3 font-bold outline-none focus:border-[#d8ff3e]" /></label>
        {error && <p className="mt-3 border border-red-400/40 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}
        <button type="button" onClick={() => void bill()} disabled={busy || total <= 0 || difference !== 0} className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 bg-[#d8ff3e] px-4 text-sm font-black uppercase text-black disabled:opacity-35">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />} Facturar {crc.format(total)}</button>
      </section>
      <aside className="border-[3px] border-white/15 bg-white/[.025] p-4">{receipt ? <><ThermalReceipt receipt={receipt} /><button type="button" onClick={() => window.print()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 border-[3px] border-[#d8ff3e] text-xs font-black uppercase text-[#d8ff3e]"><Printer className="h-4 w-4" /> Imprimir comprobante</button></> : <div className="grid min-h-64 place-items-center text-center"><div><Printer className="mx-auto h-10 w-10 text-white/20" /><p className="mt-3 text-sm font-black uppercase text-white/35">El comprobante aparecerá aquí</p></div></div>}</aside>
    </div>
  </div>;
}

function ThermalReceipt({ receipt }: { receipt: Receipt }) {
  const lines = useMemo(() => [{ label: "Efectivo", value: receipt.breakdown.cash }, { label: "SINPE", value: receipt.breakdown.sinpe }, { label: "Tarjeta", value: receipt.breakdown.card }].filter((line) => line.value > 0), [receipt]);
  return <div className="thermal-receipt bg-white p-3 font-mono text-[11px] leading-4 text-black"><p className="text-center text-base font-black">XTREME GYM</p><p className="text-center">Ciudad Quesada</p><p className="my-2 border-t border-dashed border-black" /><p>Comprobante: {receipt.id}</p><p>Fecha: {receipt.date}</p><p>Cliente: {receipt.customerName}</p><p>Atendió: {receipt.staffName}</p><p className="my-2 border-t border-dashed border-black" /><div className="flex justify-between gap-2"><span>{receipt.itemLabel}</span><strong>{crc.format(receipt.amountCrc)}</strong></div>{lines.map((line) => <div key={line.label} className="flex justify-between"><span>{line.label}</span><span>{crc.format(line.value)}</span></div>)}{receipt.nextBillingDate && <p className="mt-2">Vence: {receipt.nextBillingDate}</p>}<p className="my-2 border-t border-dashed border-black" /><p className="text-center font-bold">Gracias por preferir Xtreme</p><p className="mt-1 text-center text-[9px]">Comprobante interno · facturación fiscal en Latinsoft</p></div>;
}
