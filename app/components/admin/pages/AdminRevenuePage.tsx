"use client";

import { Loader2 } from "lucide-react";
import { useAdmin } from "../context/AdminProvider";
import { usePaymentDraft } from "../hooks/usePaymentDraft";
import { IngresosTab } from "../tabs/IngresosTab";

export function AdminRevenuePage() {
  const {
    auth: { role },
    data: { data, load },
    feedback: { busy, setBusy, setError, setMessage },
  } = useAdmin();
  const payments = usePaymentDraft(data?.members);
  const {
    paymentForm,
    setPaymentForm,
    setPaymentMemberQuery,
    selectedPaymentMember,
    setSelectedPaymentMember,
  } = payments;

  if (!data || data.role !== "super") return null;
  if (!data.revenue) {
    return (
      <div className="grid min-h-[280px] place-items-center border-[3px] border-white/15 bg-[#0c0c0c]">
        <Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" aria-label="Cargando ingresos" />
      </div>
    );
  }

  async function savePayment() {
    if (!role) return;
    if (!selectedPaymentMember) {
      setError("Seleccioná un socio registrado antes de guardar el pago.");
      return;
    }
    setBusy("payment");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment",
          memberKey: selectedPaymentMember.normalizedName,
          amountCrc: Number(paymentForm.amountCrc),
          optionLabel: paymentForm.optionLabel,
          optionId: paymentForm.optionLabel.toLowerCase().replace(/\s+/g, "-"),
          category: paymentForm.category,
          method: paymentForm.method,
          note: paymentForm.note,
          extendMembership: paymentForm.extendMembership && paymentForm.category === "Plan",
          extendDays: Number(paymentForm.extendDays) || 30,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo registrar el pago.");
      setMessage("Pago registrado.");
      setPaymentForm((form) => ({ ...form, amountCrc: "", note: "" }));
      setSelectedPaymentMember(null);
      setPaymentMemberQuery("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar pago.");
    } finally {
      setBusy("");
    }
  }

  async function deletePayment(paymentId: string) {
    if (!role || !window.confirm("¿Eliminar este pago del registro?")) return;
    setBusy(`pay-${paymentId}`);
    setError("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (!response.ok) throw new Error("No se pudo eliminar.");
      setMessage("Pago eliminado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar pago.");
    } finally {
      setBusy("");
    }
  }

  return (
    <IngresosTab
      revenue={data.revenue}
      busy={busy}
      payments={payments}
      onSavePayment={() => void savePayment()}
      onDeletePayment={(id) => void deletePayment(id)}
      onError={setError}
    />
  );
}
