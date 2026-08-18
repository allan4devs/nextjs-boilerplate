"use client";

import { useAdmin } from "../context/AdminProvider";
import { PagosTab } from "../tabs/PagosTab";
import type { AdminMember } from "../types";

export function AdminPaymentsPage() {
  const {
    auth: { role },
    data: { data, setData },
    feedback: { busy, setBusy, setError, setMessage },
  } = useAdmin();

  if (!data || data.role !== "super") return null;

  async function sendPaymentReminder(member: AdminMember) {
    if (!role) return;
    setBusy(`remind-${member.normalizedName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "paymentReminder", memberName: member.memberName }),
      });
      const json = (await response.json()) as {
        sentTo?: string;
        sentAt?: string | null;
        alreadySent?: boolean;
        error?: string;
      };
      const sentAt = json.sentAt ?? new Date().toISOString();
      if (!response.ok && !json.alreadySent) {
        throw new Error(json.error ?? "No se pudo enviar el recordatorio.");
      }
      setData((current) =>
        current
          ? {
              ...current,
              members: current.members.map((row) =>
                row.normalizedName === member.normalizedName
                  ? { ...row, paymentReminderSent: true, paymentReminderSentAt: sentAt }
                  : row,
              ),
            }
          : current,
      );
      if (json.alreadySent) {
        setMessage("Ese recordatorio ya se había enviado para este vencimiento.");
        return;
      }
      setMessage(`Recordatorio de pago enviado a ${json.sentTo}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el recordatorio.");
    } finally {
      setBusy("");
    }
  }

  return (
    <PagosTab
      members={data.members}
      today={data.today.date}
      busy={busy}
      onRemindEmail={(member) => void sendPaymentReminder(member)}
    />
  );
}
