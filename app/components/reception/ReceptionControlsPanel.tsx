"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bolt, Check, Crown, Loader2, Plus, RefreshCw, Sun, UsersRound } from "lucide-react";
import { GameLabel } from "@/app/components/GameOS";

export type ReceptionControlKind = "vip" | "seniors" | "tanning" | "electricity";
type Kind = ReceptionControlKind;
type RecordItem = { id: string; kind: Kind; date: string; name: string; detail: string; quantity: number; amount: number; status: "pending" | "paid" | "completed"; paymentMethod: string; note: string; createdAt: string };

const PANELS = {
  vip: { label: "VIP", title: "Control del área VIP", icon: Crown, name: "Nombre del cliente", detail: "Plan o período", quantity: "Personas", amount: "Monto cobrado", tone: "text-amber-300 border-amber-300/45 bg-amber-300" },
  seniors: { label: "Adultos mayores", title: "Control de adultos mayores", icon: UsersRound, name: "Clase o responsable", detail: "Horario / grupo", quantity: "Asistencia", amount: "Monto recibido", tone: "text-cyan-300 border-cyan-300/45 bg-cyan-300" },
  tanning: { label: "Bronceado", title: "Cámara de bronceado", icon: Sun, name: "Nombre del cliente", detail: "Paquete o sesión", quantity: "Sesiones usadas", amount: "Monto cobrado", tone: "text-orange-300 border-orange-300/45 bg-orange-300" },
  electricity: { label: "Pagos de luz", title: "Control de pagos de luz", icon: Bolt, name: "Proveedor / medidor", detail: "Período facturado", quantity: "Consumo kWh", amount: "Monto del recibo", tone: "text-yellow-300 border-yellow-300/45 bg-yellow-300" },
} as const;

function today() { return new Date().toISOString().slice(0, 10); }
function money(value: number) { return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value); }

export default function ReceptionControlsPanel({ initialKind = "vip", single = false }: { initialKind?: ReceptionControlKind; single?: boolean }) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ date: today(), name: "", detail: "", quantity: "1", amount: "", status: "completed", paymentMethod: "Efectivo", note: "" });
  const panel = PANELS[kind];
  const PanelIcon = panel.icon;

  const load = useCallback(async (selected: Kind) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/xtreme/reception/controls?kind=${selected}`, { cache: "no-store" });
      const data = (await response.json()) as { records?: RecordItem[]; error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo cargar.");
      setRecords(data.records ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(kind); }, [kind, load]);

  function changeKind(next: Kind) {
    setKind(next);
    setForm({ date: today(), name: "", detail: "", quantity: "1", amount: "", status: next === "electricity" ? "pending" : "completed", paymentMethod: "Efectivo", note: "" });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/xtreme/reception/controls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, kind, quantity: Number(form.quantity), amount: Number(form.amount) }) });
      const data = (await response.json()) as { record?: RecordItem; error?: string };
      if (!response.ok || !data.record) throw new Error(data.error || "No se pudo guardar.");
      setRecords((current) => [data.record!, ...current]);
      setForm((current) => ({ ...current, name: "", detail: "", quantity: "1", amount: "", note: "" }));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  }

  async function complete(record: RecordItem) {
    const status = record.status === "pending" ? "paid" : "completed";
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status } : item));
    const response = await fetch("/api/xtreme/reception/controls", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, status }) });
    if (!response.ok) { setError("No se pudo actualizar el estado."); void load(kind); }
  }

  const month = today().slice(0, 7);
  const summary = useMemo(() => {
    const current = records.filter((record) => record.date.startsWith(month));
    return { entries: current.length, quantity: current.reduce((sum, record) => sum + record.quantity, 0), amount: current.reduce((sum, record) => sum + record.amount, 0), pending: current.filter((record) => record.status === "pending").length };
  }, [records, month]);

  return <div>
    <GameLabel tone="lime">Registros operativos · MongoDB</GameLabel>
    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">{single ? panel.title : "Paneles de control"}</h1>
    <p className="mt-2 text-sm font-bold text-white/45">{single ? "Registrá movimientos y revisá el historial de este control." : "Registrá controles de VIP, adultos mayores, bronceado y recibos desde recepción."}</p>

    {!single && <div className="xg-mobile-scroll mt-5 flex gap-2 overflow-x-auto pb-2">
      {(Object.keys(PANELS) as Kind[]).map((id) => { const item = PANELS[id]; const Icon = item.icon; return <button key={id} type="button" onClick={() => changeKind(id)} className={`flex min-h-14 shrink-0 items-center gap-2 border-[3px] px-4 text-xs font-black uppercase ${kind === id ? `${item.tone.split(" ")[2]} border-black text-black` : "border-white/15 bg-black/35 text-white/50 hover:text-white"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}
    </div>}

    <div className="mt-4 grid gap-3 sm:grid-cols-4">
      <Stat label="Registros este mes" value={String(summary.entries)} />
      <Stat label={panel.quantity} value={String(summary.quantity)} />
      <Stat label="Total del mes" value={money(summary.amount)} />
      <Stat label="Pendientes" value={String(summary.pending)} alert={summary.pending > 0} />
    </div>

    <form onSubmit={submit} className={`mt-5 border-[3px] ${panel.tone.split(" ")[1]} bg-black/40 p-4 sm:p-5`}>
      <div className="flex items-center gap-3"><PanelIcon className={`h-6 w-6 ${panel.tone.split(" ")[0]}`} /><h2 className="text-xl font-black uppercase">{panel.title}</h2></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Fecha"><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="control-input" /></Input>
        <Input label={panel.name}><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Escribí acá" className="control-input" /></Input>
        <Input label={panel.detail}><input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="Detalle opcional" className="control-input" /></Input>
        <Input label={panel.quantity}><input type="number" min="0" step="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="control-input" /></Input>
        <Input label={panel.amount}><input type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="₡" className="control-input" /></Input>
        <Input label="Forma de pago"><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="control-input"><option>Efectivo</option><option>SINPE</option><option>Tarjeta</option><option>Transferencia</option><option>No aplica</option></select></Input>
        <Input label="Estado"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="control-input"><option value="completed">Completado</option><option value="paid">Pagado</option><option value="pending">Pendiente</option></select></Input>
        <Input label="Nota"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Observación" className="control-input" /></Input>
      </div>
      <button disabled={saving} className={`mt-4 inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-black px-5 text-sm font-black uppercase text-black ${panel.tone.split(" ")[2]} disabled:opacity-50`}>{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Guardar registro</button>
    </form>

    {error && <p className="mt-4 border-[3px] border-red-400/60 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}
    <div className="mt-5 flex items-center justify-between"><h2 className="text-xl font-black uppercase">Historial reciente</h2><button onClick={() => void load(kind)} className="text-white/40 hover:text-white"><RefreshCw className="h-5 w-5" /></button></div>
    {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#d8ff3e]" /></div> : <div className="mt-3 grid gap-2">
      {records.map((record) => <article key={record.id} className="flex flex-wrap items-center gap-3 border-[3px] border-white/12 bg-black/35 p-3 sm:p-4"><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{record.date} · {record.paymentMethod || "Sin forma de pago"}</p><p className="truncate text-base font-black uppercase">{record.name}</p><p className="text-xs font-bold text-white/40">{record.detail || record.note || "Sin detalle"}</p></div><div className="text-right"><p className="text-lg font-black">{money(record.amount)}</p><p className="text-[10px] font-black uppercase text-white/35">{record.quantity} · {panel.quantity}</p></div><button type="button" onClick={() => void complete(record)} className={`inline-flex min-h-10 items-center gap-1.5 border-[3px] px-3 text-[10px] font-black uppercase ${record.status === "pending" ? "border-orange-300/60 text-orange-200" : "border-[#d8ff3e]/50 text-[#d8ff3e]"}`}><Check className="h-4 w-4" />{record.status === "pending" ? "Marcar pagado" : record.status === "paid" ? "Pagado" : "Listo"}</button></article>)}
      {!records.length && <p className="border-[3px] border-dashed border-white/15 p-8 text-center text-sm font-bold text-white/35">Todavía no hay registros en este panel.</p>}
    </div>}
    <style jsx>{`.control-input{min-height:44px;width:100%;border:3px solid rgba(255,255,255,.16);background:#050505;padding:0 12px;color:white;font-weight:800;outline:none}.control-input:focus{border-color:#d8ff3e}`}</style>
  </div>;
}

function Input({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{label}</span>{children}</label>; }
function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) { return <div className={`border border-white/10 bg-white/[0.035] p-4 ${alert ? "text-orange-300" : ""}`}><p className="truncate text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p></div>; }
