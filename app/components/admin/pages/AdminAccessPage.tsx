"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { memberDraftFrom } from "../helpers";
import { useAdmin } from "../context/AdminProvider";
import { MemberModal, UserDetailModal } from "../modals";
import { AccesosTab } from "../tabs/AccesosTab";
import type { AdminMember, MemberDraft } from "../types";

export function AdminAccessPage() {
  const router = useRouter();
  const {
    auth: { role },
    data: { data, load },
    feedback: { busy, setBusy, setError, setMessage },
  } = useAdmin();
  const [detailMember, setDetailMember] = useState<AdminMember | null>(null);
  const [editMember, setEditMember] = useState<AdminMember | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [savingMetric, setSavingMetric] = useState(false);
  const [newMetric, setNewMetric] = useState({ date: "", weightKg: "", waistCm: "", note: "" });

  if (!data) return null;

  function openDetail(member: AdminMember) {
    setDetailMember(member);
    setNewMetric({
      date: new Date().toISOString().slice(0, 10),
      weightKg: member.latestWeight ? String(member.latestWeight) : "",
      waistCm: member.latestWaist ? String(member.latestWaist) : "",
      note: "",
    });
    setError("");
    setMessage("");
  }

  function closeDetail() {
    setDetailMember(null);
    setNewMetric({ date: "", weightKg: "", waistCm: "", note: "" });
  }

  function openEdit(member: AdminMember) {
    setEditMember(member);
    setMemberDraft(memberDraftFrom(member));
    setError("");
    setMessage("");
  }

  async function saveMember() {
    if (!role || !editMember || !memberDraft) return;
    setSavingMember(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "member", memberName: editMember.memberName, ...memberDraft }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo guardar.");
      setMessage(`Perfil actualizado: ${memberDraft.displayName || editMember.memberName}.`);
      setEditMember(null);
      setMemberDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar perfil.");
    } finally {
      setSavingMember(false);
    }
  }

  async function addBodyMetric() {
    if (!role || !detailMember) return;
    const weight = Number.parseFloat(newMetric.weightKg);
    const waist = Number.parseFloat(newMetric.waistCm);
    if (!weight || !waist) {
      setError("Ingresá peso y medida de cintura válidos.");
      return;
    }
    setSavingMetric(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "metric",
          memberName: detailMember.memberName,
          date: newMetric.date || undefined,
          weightKg: weight,
          waistCm: waist,
          note: newMetric.note.trim(),
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo guardar la métrica.");
      setMessage(`Métrica registrada para ${detailMember.memberName}.`);
      await load();
      closeDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar métrica.");
    } finally {
      setSavingMetric(false);
    }
  }

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
      const json = (await response.json()) as { sentTo?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo enviar el recordatorio.");
      setMessage(`Recordatorio de pago enviado a ${json.sentTo}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el recordatorio.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <AccesosTab
        data={data}
        actions={{ openDetail, openEdit }}
        busy={busy}
        onRemindEmail={(member) => void sendPaymentReminder(member)}
      />

      {editMember && memberDraft && (
        <MemberModal
          member={editMember}
          draft={memberDraft}
          saving={savingMember}
          onClose={() => {
            setEditMember(null);
            setMemberDraft(null);
          }}
          onChange={setMemberDraft}
          onSave={() => void saveMember()}
        />
      )}

      {detailMember && (
        <UserDetailModal
          member={detailMember}
          isSuper={data.role === "super"}
          savingMetric={savingMetric}
          newMetric={newMetric}
          onClose={closeDetail}
          onChangeMetric={setNewMetric}
          onAddMetric={() => void addBodyMetric()}
          onOpenPlan={() => router.push("/admin/socios")}
          onOpenEdit={() => {
            const member = detailMember;
            closeDetail();
            setTimeout(() => openEdit(member), 50);
          }}
          onOpenInvite={() => router.push("/admin/socios")}
          onRefresh={() => role && void load()}
        />
      )}
    </>
  );
}
