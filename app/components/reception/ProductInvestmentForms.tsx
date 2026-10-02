"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { businessDate } from "@/lib/xtreme/business-date";
import { INVESTMENT_STATUS_LABEL, type InvestmentStatus, type ProductInvestmentEntry, type ProductInvestor } from "@/lib/xtreme/product-investment-model";
import { GameButton, GameModal } from "../GameOS";

const field = "mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300";
export async function investmentRequest(method: string, body: Record<string, unknown>) {
  const response = await fetch("/api/xtreme/reception/investments", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
  return result as { id: string; revision: number };
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-bold text-white/65">{label}{children}</label>;
}

export function InvestmentEditor({ entry, month, investorId, investors, onCancel, onSaved, onInvestorAdded }: {
  entry: ProductInvestmentEntry | null; month: string; investorId: string; investors: ProductInvestor[];
  onCancel: () => void; onSaved: (month: string) => void; onInvestorAdded: (investor: ProductInvestor) => void;
}) {
  const initial = {
    accountingMonth: entry?.accountingMonth ?? month, investorId: entry?.investorId ?? investorId,
    concept: entry?.concept ?? "", amountCrc: entry?.amountCrc?.toString() ?? "",
    quantity: entry?.quantity?.toString() ?? "", purchaseDate: entry?.purchaseDate ?? "",
    status: entry?.status ?? "reported", needsVerification: entry?.needsVerification ?? false,
    note: entry?.note ?? "", invoiceReference: entry?.invoiceReference ?? "",
  };
  const [draft, setDraft] = useState(initial);
  const [addingInvestor, setAddingInvestor] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || Boolean(newName || newDescription);
  const change = <K extends keyof typeof draft>(key: K, value: typeof draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const close = () => { if (!busy && (!dirty || window.confirm("¿Cerrar y descartar los cambios sin guardar?"))) onCancel(); };
  async function addInvestor() {
    if (!newName.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const values = { name: newName.trim(), description: newDescription.trim(), active: true };
      const saved = await investmentRequest("POST", { entity: "investor", ...values });
      onInvestorAdded({ ...values, ...saved });
      change("investorId", saved.id); setAddingInvestor(false); setNewName(""); setNewDescription("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo agregar el inversionista."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await investmentRequest(entry ? "PATCH" : "POST", {
        entity: "investment", ...(entry ? { id: entry.id, revision: entry.revision } : {}),
        ...draft, amountCrc: draft.amountCrc === "" ? null : Number(draft.amountCrc),
        quantity: draft.quantity === "" ? null : Number(draft.quantity), purchaseDate: draft.purchaseDate || null,
      });
      onSaved(draft.accountingMonth);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la inversión."); }
    finally { setBusy(false); }
  }
  return <GameModal open onClose={close} title={entry ? "Editar inversión" : "Agregar inversión"} size="lg" tone="cyan">
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mes contable"><input type="month" required value={draft.accountingMonth} onChange={(event) => change("accountingMonth", event.target.value)} className={field} /></Field>
          <Field label="Fecha de compra (si se conoce)"><input type="date" max={businessDate()} value={draft.purchaseDate} onChange={(event) => change("purchaseDate", event.target.value)} className={field} /></Field>
        </div>
        <Field label="Inversionista">
          <select required value={draft.investorId} onChange={(event) => change("investorId", event.target.value)} className={field}>
            <option value="">Elegí quién hizo la inversión</option>
            {investors.filter((person) => person.active || person.id === draft.investorId).map((person) => <option key={person.id} value={person.id}>{person.name}{person.active ? "" : " (inactivo)"}</option>)}
          </select>
        </Field>
        <button type="button" onClick={() => setAddingInvestor(!addingInvestor)} className="min-h-10 text-xs font-black text-cyan-200"><Plus className="mr-1 inline h-4 w-4" />{addingInvestor ? "Cerrar nuevo inversionista" : "Agregar inversionista aquí"}</button>
        {addingInvestor && <div className="space-y-3 border-2 border-cyan-300/30 p-3">
          <Field label="Nombre del nuevo inversionista"><input value={newName} maxLength={100} onChange={(event) => setNewName(event.target.value)} className={field} /></Field>
          <Field label="Productos / descripción"><input value={newDescription} maxLength={160} onChange={(event) => setNewDescription(event.target.value)} className={field} /></Field>
          <GameButton variant="cyan" disabled={!newName.trim()} onClick={() => void addInvestor()}>Guardar inversionista y seleccionarlo</GameButton>
        </div>}
        <Field label="Concepto / productos"><input required value={draft.concept} maxLength={160} onChange={(event) => change("concept", event.target.value)} className={field} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Inversión total (₡) - vacío si el monto está pendiente"><input type="number" min="0" max="1000000000" step="0.01" value={draft.amountCrc} onChange={(event) => change("amountCrc", event.target.value)} className={field} /></Field>
          <Field label="Cantidad de unidades (opcional)"><input type="number" min="0" max="1000000" step="1" value={draft.quantity} onChange={(event) => change("quantity", event.target.value)} className={field} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Estado"><select value={draft.status} onChange={(event) => change("status", event.target.value as InvestmentStatus)} className={field}>{Object.entries(INVESTMENT_STATUS_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
          <Field label="Factura / referencia (opcional)"><input value={draft.invoiceReference} maxLength={120} onChange={(event) => change("invoiceReference", event.target.value)} className={field} /></Field>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm font-bold text-orange-200"><input type="checkbox" checked={draft.needsVerification} onChange={(event) => change("needsVerification", event.target.checked)} />Monto o factura por verificar</label>
        <Field label="Detalle / notas"><textarea value={draft.note} maxLength={2000} rows={3} onChange={(event) => change("note", event.target.value)} className={field} /></Field>
        <p className="text-xs text-white/45">Este registro guarda la inversión del mes. Las existencias se ajustan por aparte en el inventario.</p>
        {entry?.updatedBy && <p className="text-xs text-white/40">Última edición: {entry.updatedBy}</p>}
      </fieldset>
      {error && <p role="alert" className="text-sm font-bold text-red-200">{error}</p>}
      <div className="flex flex-wrap gap-2"><GameButton type="submit" disabled={busy || !draft.investorId || addingInvestor}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar inversión</GameButton><GameButton variant="ghost" disabled={busy} onClick={close}>Cancelar</GameButton></div>
    </form>
  </GameModal>;
}

export function InvestorEditor({ investor, onCancel, onSaved }: { investor: ProductInvestor | null; onCancel: () => void; onSaved: () => void }) {
  const initial = { name: investor?.name ?? "", description: investor?.description ?? "", active: investor?.active ?? true };
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => { if (!busy && (JSON.stringify(draft) === JSON.stringify(initial) || window.confirm("¿Descartar los cambios del inversionista?"))) onCancel(); };
  async function save() {
    setBusy(true); setError("");
    try {
      await investmentRequest(investor ? "PATCH" : "POST", { entity: "investor", ...draft, ...(investor ? { id: investor.id, revision: investor.revision } : {}) });
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  return <GameModal open onClose={close} title={investor ? "Editar inversionista" : "Agregar inversionista"} tone="cyan">
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-4">
      <fieldset disabled={busy} className="space-y-3">
        <Field label="Nombre"><input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={field} /></Field>
        <Field label="Productos / descripción"><input maxLength={160} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={field} /></Field>
        <label className="flex min-h-11 items-center gap-3 text-sm font-bold"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Activo para nuevas inversiones</label>
        <p className="text-xs text-white/45">Desactivar conserva sus inversiones anteriores.</p>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
      <div className="flex gap-2"><GameButton type="submit" disabled={busy}>{busy ? "Guardando..." : "Guardar inversionista"}</GameButton><GameButton variant="ghost" onClick={close} disabled={busy}>Cancelar</GameButton></div>
    </form>
  </GameModal>;
}
