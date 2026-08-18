"use client";

import { useState } from "react";
import { draftFromMember, memberDraftFrom } from "../helpers";
import { useAdmin } from "../context/AdminProvider";
import { useMemberRoster } from "../hooks/useMemberRoster";
import {
  InviteMemberModal,
  MemberModal,
  PlanModal,
  QuickPlanModal,
  UserDetailModal,
} from "../modals";
import { SociosTab } from "../tabs/SociosTab";
import type {
  AdminMember,
  MemberDraft,
  PlanDraft,
  PlanItem,
  QuickPlanOptionId,
} from "../types";

export function AdminMembersPage() {
  const {
    auth: { role },
    data: { data, load },
    feedback: { busy, setBusy, setError, setMessage },
  } = useAdmin();
  const roster = useMemberRoster(data?.members);

  const [planMember, setPlanMember] = useState<AdminMember | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [editMember, setEditMember] = useState<AdminMember | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [quickPlanMember, setQuickPlanMember] = useState<AdminMember | null>(null);
  const [quickPlanOption, setQuickPlanOption] = useState<QuickPlanOptionId>("month");
  const [grantingQuickPlan, setGrantingQuickPlan] = useState(false);
  const [inviteMember, setInviteMember] = useState<AdminMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [detailMember, setDetailMember] = useState<AdminMember | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [newMetric, setNewMetric] = useState({ date: "", weightKg: "", waistCm: "", note: "" });

  if (!data) return null;

  async function removeMember(memberName: string) {
    if (!role || !window.confirm(`¿Eliminar socio ${memberName}?`)) return;
    setBusy(`del-${memberName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo eliminar.");
      setMessage(`Eliminado: ${memberName}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setBusy("");
    }
  }

  async function adminCheckin(memberName: string) {
    if (!role) return;
    setBusy(`in-${memberName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", memberName }),
      });
      const json = (await response.json()) as { message?: string; duplicate?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo registrar ingreso.");
      setMessage(json.duplicate ? `${memberName}: ya tenía ingreso reciente.` : `Ingreso OK: ${memberName}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de ingreso.");
    } finally {
      setBusy("");
    }
  }

  async function sendReminder(memberName: string) {
    if (!role) return;
    setBusy(`mail-${memberName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify", memberName }),
      });
      const json = (await response.json()) as { sentTo?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo enviar el recordatorio.");
      setMessage(`Recordatorio enviado a ${json.sentTo}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar recordatorio.");
    } finally {
      setBusy("");
    }
  }

  function openPlan(member: AdminMember) {
    setPlanMember(member);
    setPlanDraft(draftFromMember(member));
    setError("");
    setMessage("");
  }

  function openEdit(member: AdminMember) {
    setEditMember(member);
    setMemberDraft(memberDraftFrom(member));
    setError("");
    setMessage("");
  }

  function openQuickPlan(member: AdminMember) {
    if (data?.role !== "super") return;
    setQuickPlanMember(member);
    setQuickPlanOption("month");
    setError("");
    setMessage("");
  }

  function openInvite(member: AdminMember) {
    if (data?.role !== "super") return;
    setInviteMember(member);
    setInviteEmail(member.email || "");
    setError("");
    setMessage("");
  }

  async function sendMemberInvite() {
    if (!role || data?.role !== "super" || !inviteMember) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setError("Ingresá el correo del socio.");
      return;
    }
    setSendingInvite(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite_member",
          memberName: inviteMember.memberName,
          normalizedName: inviteMember.normalizedName,
          email,
        }),
      });
      const json = (await response.json()) as { sentTo?: string; expiresHours?: number; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo enviar la invitación.");
      setMessage(`Invitación enviada a ${json.sentTo}. El enlace vence en ${json.expiresHours ?? 24} h.`);
      setInviteMember(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al invitar.");
    } finally {
      setSendingInvite(false);
    }
  }

  async function grantQuickPlan() {
    if (!role || data?.role !== "super" || !quickPlanMember) return;
    setGrantingQuickPlan(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quickPlan",
          memberName: quickPlanMember.memberName,
          optionId: quickPlanOption,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        plan?: string;
        endsOn?: string;
        emailSent?: boolean;
        emailAvailable?: boolean;
        emailKind?: "plan" | "invite" | "none";
        emailError?: string | null;
        inviteExpiresHours?: number | null;
        extended?: boolean;
        hasPin?: boolean;
        error?: string;
      };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "No se pudo otorgar el plan.");
      const extendLabel = json.extended ? " (días sumados al plan vigente)" : "";
      let emailStatus = "";
      if (json.emailSent && json.emailKind === "invite") {
        emailStatus = ` Le enviamos un enlace para completar registro y crear PIN (vence en ${json.inviteExpiresHours ?? 24} h). El plan se conserva.`;
      } else if (json.emailSent && json.emailKind === "plan") {
        emailStatus = json.hasPin
          ? " Le avisamos por correo que el plan ya está activo."
          : " Le avisamos por correo: plan activo y que cree el PIN en la app.";
      } else if (!json.emailAvailable) {
        emailStatus = " El plan quedó activo, pero el socio no tiene correo en la ficha: invitalo después con un correo válido.";
      } else {
        emailStatus = ` El plan quedó activo, pero el correo no se envió${json.emailError ? `: ${json.emailError}` : "."}`;
      }
      setMessage(
        `${json.plan} activado para ${quickPlanMember.memberName} hasta ${json.endsOn}${extendLabel}.${emailStatus}`,
      );
      setQuickPlanMember(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al otorgar el plan.");
    } finally {
      setGrantingQuickPlan(false);
    }
  }

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

  async function savePlan() {
    if (!role || !planMember || !planDraft) return;
    if (!planDraft.title.trim()) {
      setError("El plan necesita un título.");
      return;
    }
    setSavingPlan(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", memberName: planMember.memberName, plan: planDraft }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo guardar el plan.");
      setMessage(`Plan guardado para ${planMember.memberName}.`);
      setPlanMember(null);
      setPlanDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el plan.");
    } finally {
      setSavingPlan(false);
    }
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

  async function toggleItem(memberName: string, item: PlanItem) {
    if (!role) return;
    const nextDone = !item.done;
    setPlanDraft((draft) =>
      draft
        ? {
            ...draft,
            items: draft.items.map((current) =>
              current.id === item.id
                ? { ...current, done: nextDone, doneDate: nextDone ? new Date().toISOString().slice(0, 10) : null }
                : current,
            ),
          }
        : draft,
    );
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, itemId: item.id, done: nextDone }),
      });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      setPlanDraft((draft) =>
        draft
          ? {
              ...draft,
              items: draft.items.map((current) =>
                current.id === item.id
                  ? { ...current, done: item.done, doneDate: item.doneDate }
                  : current,
              ),
            }
          : draft,
      );
      setError("No se pudo actualizar el avance.");
    }
  }

  const memberActions = {
    openDetail,
    openEdit,
    openInvite,
    openPlan,
    openQuickPlan,
    removeMember,
    sendReminder,
    adminCheckin,
  };

  return (
    <>
      <SociosTab data={data} roster={roster} actions={memberActions} busy={busy} />

      {quickPlanMember && data.role === "super" && (
        <QuickPlanModal
          member={quickPlanMember}
          option={quickPlanOption}
          saving={grantingQuickPlan}
          onOptionChange={setQuickPlanOption}
          onClose={() => setQuickPlanMember(null)}
          onConfirm={() => void grantQuickPlan()}
        />
      )}

      {inviteMember && data.role === "super" && (
        <InviteMemberModal
          member={inviteMember}
          email={inviteEmail}
          saving={sendingInvite}
          onEmailChange={setInviteEmail}
          onClose={() => setInviteMember(null)}
          onConfirm={() => void sendMemberInvite()}
        />
      )}

      {planMember && planDraft && (
        <PlanModal
          member={planMember}
          draft={planDraft}
          saving={savingPlan}
          onClose={() => {
            setPlanMember(null);
            setPlanDraft(null);
          }}
          onChange={setPlanDraft}
          onSave={() => void savePlan()}
          onToggleItem={(item) => void toggleItem(planMember.memberName, item)}
        />
      )}

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
          onOpenPlan={() => {
            const member = detailMember;
            closeDetail();
            setTimeout(() => openPlan(member), 50);
          }}
          onOpenEdit={() => {
            const member = detailMember;
            closeDetail();
            setTimeout(() => openEdit(member), 50);
          }}
          onOpenInvite={() => {
            const member = detailMember;
            closeDetail();
            setTimeout(() => openInvite(member), 50);
          }}
          onRefresh={() => role && void load()}
        />
      )}
    </>
  );
}
