"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ClipboardList,
  Database,
  DoorOpen,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  GameButton,
  GameCallout,
  GameChip,
  GameDockItem,
  GameHudPill,
  GameLabel,
} from "../../components/GameOS";
import EmailCampaignCenter from "../../components/admin/EmailCampaignCenter";
import StaffThemeToggle from "../../components/StaffThemeToggle";
import {
  ADMIN_TABS,
} from "../../components/admin/constants";
import {
  draftFromMember,
  memberDraftFrom,
} from "../../components/admin/helpers";
import {
  TabButton,
} from "../../components/admin/ui";
import {
  InviteMemberModal,
  MemberModal,
  PlanModal,
  QuickPlanModal,
  UserDetailModal,
} from "../../components/admin/modals";
import { AdminProvider, useAdmin } from "../../components/admin/context/AdminProvider";
import { useMemberRoster } from "../../components/admin/hooks/useMemberRoster";
import { SociosTab } from "../../components/admin/tabs/SociosTab";
import { ResumenTab } from "../../components/admin/tabs/ResumenTab";
import { BitacoraTab } from "../../components/admin/tabs/BitacoraTab";
import { AccesosTab } from "../../components/admin/tabs/AccesosTab";
import { IngresosTab } from "../../components/admin/tabs/IngresosTab";
import { GamificacionTab } from "../../components/admin/tabs/GamificacionTab";
import { usePaymentDraft } from "../../components/admin/hooks/usePaymentDraft";
import { useGamificationForms } from "../../components/admin/hooks/useGamificationForms";
import type {
  AdminData,
  AdminMember,
  MemberDraft,
  PlanDraft,
  PlanItem,
  QuickPlanOptionId,
  AdminTabId as Tab,
} from "../../components/admin/types";

export default function XtremeAdminPage() {
  return (
    <AdminProvider>
      <AdminConsole />
    </AdminProvider>
  );
}

/**
 * La pantalla del Admin OS. La sesión, los datos y el feedback llegan del
 * contexto; acá solo vive el estado efímero de la interfaz (filtros, orden,
 * paginación, borradores y qué modal está abierto).
 */
function AdminConsole() {
  const {
    auth: { role: code, staffName, codeInput, setCodeInput, setRole },
    data: { data, setData, gami, isLoading, load, loadGami },
    feedback: { busy, setBusy, error, setError, message, setMessage },
    login,
    logout,
  } = useAdmin();

  const [tab, setTab] = useState<Tab>("resumen");
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
  const [usageSessionId, setUsageSessionId] = useState<string | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [newMetric, setNewMetric] = useState({ date: "", weightKg: "", waistCm: "", note: "" });
  const payments = usePaymentDraft(data?.members);
  const forms = useGamificationForms();
  const {
    paymentForm,
    setPaymentForm,
    setPaymentMemberQuery,
    selectedPaymentMember,
    setSelectedPaymentMember,
  } =
    payments;

  // Un admin sin permiso de super no puede quedarse parado en un tab que ya no
  // le corresponde. La regla vive acá, junto al estado del tab, y no dentro del
  // fetch: quién carga los datos no tiene por qué saber qué se está mirando.
  useEffect(() => {
    if (data && data.role !== "super") {
      setTab((current) => (current === "ingresos" || current === "correos" ? "resumen" : current));
    }
  }, [data]);

  async function resolveOperationalAlert(fingerprint: string) {
    setBusy(`ops:${fingerprint}`);
    setError("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolveOpsAlert", fingerprint }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error || "No se pudo resolver la alerta.");
      setData((current) =>
        current
          ? { ...current, opsAlerts: current.opsAlerts?.filter((alert) => alert.fingerprint !== fingerprint) }
          : current,
      );
      setMessage("Alerta marcada como resuelta.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resolver la alerta.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (code && tab === "gamificacion") void loadGami();
  }, [code, tab, loadGami]);

  async function gamiAction(body: Record<string, unknown>, okMessage: string) {
    if (!code) return;
    setBusy("gami");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin/gamification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo procesar.");
      setMessage(okMessage);
      await loadGami();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de gamificacion.");
    } finally {
      setBusy("");
    }
  }

  async function seed(wipeAll: boolean) {
    if (!code) return;
    setBusy(wipeAll ? "reset" : "seed");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wipeAll }),
      });
      const json = (await response.json()) as {
        insertedMembers?: number;
        insertedPayments?: number;
        pin?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "No se pudo generar el seed.");
      setMessage(
        `Listo: ${json.insertedMembers} socios, ${json.insertedPayments ?? 0} pagos demo. PIN: ${json.pin}.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el seed.");
    } finally {
      setBusy("");
    }
  }

  async function removeMember(memberName: string) {
    if (!code || !window.confirm(`Eliminar socio ${memberName}?`)) return;
    setBusy(`del-${memberName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
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
    if (!code) return;
    setBusy(`in-${memberName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", memberName }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; duplicate?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo registrar ingreso.");
      setMessage(json.duplicate ? `${memberName}: ya tenia ingreso reciente.` : `Ingreso OK: ${memberName}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de ingreso.");
    } finally {
      setBusy("");
    }
  }

  async function sendReminder(memberName: string) {
    if (!code) return;
    setBusy(`mail-${memberName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify", memberName }),
      });
      const json = (await response.json()) as { ok?: boolean; sentTo?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo enviar el recordatorio.");
      setMessage(`Recordatorio enviado a ${json.sentTo}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar recordatorio.");
    } finally {
      setBusy("");
    }
  }

  async function notifyExpiring() {
    if (!code) return;
    setBusy("notify-all");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notifyExpiring" }),
      });
      const json = (await response.json()) as { ok?: boolean; sent?: number; eligible?: number; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudieron enviar los recordatorios.");
      setMessage(`Recordatorios enviados: ${json.sent}/${json.eligible} socios con correo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar recordatorios.");
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
    if (!code || data?.role !== "super" || !inviteMember) return;
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
      const json = (await response.json()) as {
        ok?: boolean;
        sentTo?: string;
        expiresHours?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "No se pudo enviar la invitación.");
      setMessage(
        `Invitación enviada a ${json.sentTo}. El enlace vence en ${json.expiresHours ?? 24} h.`,
      );
      setInviteMember(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al invitar.");
    } finally {
      setSendingInvite(false);
    }
  }

  async function grantQuickPlan() {
    if (!code || data?.role !== "super" || !quickPlanMember) return;
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
        needsRegistration?: boolean;
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
        emailStatus =
          " El plan quedó activo, pero el socio no tiene correo en la ficha: invitalo después con un correo válido.";
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
    if (!code || !planMember || !planDraft) return;
    if (!planDraft.title.trim()) {
      setError("El plan necesita un titulo.");
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
      const json = (await response.json()) as { ok?: boolean; error?: string };
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
    if (!code || !editMember || !memberDraft) return;
    setSavingMember(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "member",
          memberName: editMember.memberName,
          ...memberDraft,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
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
    if (!code || !detailMember) return;
    const weight = parseFloat(newMetric.weightKg);
    const waist = parseFloat(newMetric.waistCm);
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
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo guardar la metrica.");
      setMessage(`Metrica registrada para ${detailMember.memberName}.`);
      // Refresh and update detail
      await load();
      // Re-open with fresh data (the list will have updated member)
      // We close detail after save for simplicity, user can re-open
      closeDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar metrica.");
    } finally {
      setSavingMetric(false);
    }
  }

  async function toggleItem(memberName: string, item: PlanItem) {
    if (!code) return;
    const nextDone = !item.done;
    setPlanDraft((draft) =>
      draft
        ? {
            ...draft,
            items: draft.items.map((i) =>
              i.id === item.id
                ? { ...i, done: nextDone, doneDate: nextDone ? new Date().toISOString().slice(0, 10) : null }
                : i,
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
          ? { ...draft, items: draft.items.map((i) => (i.id === item.id ? { ...i, done: item.done, doneDate: item.doneDate } : i)) }
          : draft,
      );
      setError("No se pudo actualizar el avance.");
    }
  }

  async function savePayment() {
    if (!code) return;
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
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo registrar el pago.");
      setMessage("Pago registrado.");
      setPaymentForm((f) => ({ ...f, amountCrc: "", note: "" }));
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
    if (!code || !window.confirm("Eliminar este pago del registro?")) return;
    setBusy(`pay-${paymentId}`);
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

  async function revokeAllStaffSessions(includeSelf = false) {
    if (data?.role !== "super") return;
    const confirmMsg = includeSelf
      ? "Solo cierra sesiones de STAFF (admin/recepción/ingreso/trainer), incluida la tuya. Las sesiones de SOCIOS en la app NO se tocan. ¿Seguís?"
      : "Solo cierra sesiones de STAFF (admin/recepción/ingreso/trainer), excepto la tuya. Las sesiones de SOCIOS en la app NO se tocan. ¿Seguís?";
    if (!window.confirm(confirmMsg)) return;
    setBusy("revoke-staff");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_all_staff_sessions", includeSelf }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        revoked?: number;
        mustRelogin?: boolean;
        staffSecurity?: AdminData["staffSecurity"];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "No se pudieron cerrar las sesiones.");
      if (json.mustRelogin) {
        setMessage(`Se cerraron ${json.revoked ?? 0} sesión(es). Volvé a entrar.`);
        await fetch("/api/xtreme/staff-session?surface=admin", { method: "DELETE" });
        setRole("");
        setCodeInput("");
        setData(null);
        return;
      }
      setMessage(
        `Listo: se cerraron ${json.revoked ?? 0} sesión(es) de staff. Socios en la app no se tocaron. Tu sesión de admin se mantuvo.`,
      );
      if (json.staffSecurity) {
        setData((current) =>
          current ? { ...current, staffSecurity: json.staffSecurity } : current,
        );
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al revocar sesiones.");
    } finally {
      setBusy("");
    }
  }

  // Acciones que la tabla de socios dispara. Se arman en línea a propósito:
  // los handlers se recrean en cada render, así que memoizar el objeto no
  // evitaría ningún trabajo y solo escondería esa realidad.
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

  if (!code) {
    return (
      <main className="xg-os-login-shell grid bg-[#050505] text-white">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (codeInput.trim()) void login();
          }}
          className="w-full max-w-md border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-6 text-center shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-7"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
            <Lock className="h-7 w-7" />
          </div>
          <GameLabel tone="lime" className="mt-4">
            Admin OS
          </GameLabel>
          <h1 className="mt-2 text-2xl font-black uppercase">Panel Xtreme</h1>
          <p className="mt-2 text-sm font-bold text-white/55">
            Acceso para entrenadora personal y administracion del gym.
          </p>
          <input
            type="password"
            autoComplete="current-password"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="Codigo de acceso"
            className="mt-5 min-h-12 w-full border-[3px] border-white/20 bg-black/40 px-4 py-3 text-center font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#d8ff3e]"
          />
          {error && (
            <div className="mt-3 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
              {error}
            </div>
          )}
          <GameButton type="submit" full className="mt-5" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </GameButton>
          <p className="mt-5 text-xs font-semibold text-white/35">
            Si no tiene el codigo, pidalo a la administracion del gym.
          </p>
        </form>
      </main>
    );
  }

  const t = data?.today;
  const isSuper = data?.role === "super";
  const visibleTabs = ADMIN_TABS.filter((item) => !item.superOnly || isSuper);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="xg-safe-top sticky top-0 z-30 border-b-[3px] border-white/15 bg-[#050505]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <GameLabel tone="lime">Xtreme · Admin OS</GameLabel>
              {isSuper ? (
                <GameChip tone="yellow">
                  <ShieldCheck className="mr-1 inline h-3 w-3" /> Super
                </GameChip>
              ) : (
                <GameChip>
                  <Shield className="mr-1 inline h-3 w-3" /> Admin
                </GameChip>
              )}
            </div>
            <h1 className="mt-1 text-xl font-black uppercase tracking-tight sm:text-3xl">
              Panel de administracion
            </h1>
            {staffName && <p className="mt-1 text-xs font-black uppercase tracking-[.16em] text-[#d8ff3e]">Sesión de {staffName}</p>}
            <p className="mt-1 hidden text-sm font-bold text-white/50 sm:block">
              Socios, planes, accesos y progreso · toca paneles y modales
              {isSuper ? " · super: ingresos" : ""}
            </p>
            {data && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <GameHudPill icon={Users} label="Socios" value={data.totals.memberCount} tone="lime" />
                <GameHudPill icon={DoorOpen} label="Hoy" value={data.today.checkinsToday} tone="cyan" />
                <GameHudPill
                  icon={Activity}
                  label="Gym"
                  value={`${t?.occupancyPct ?? 0}%`}
                  tone="orange"
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StaffThemeToggle />
            <Link
              href="/entrenador"
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-cyan-300/50 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase text-cyan-200 sm:text-sm"
            >
              <ClipboardList className="h-4 w-4" /> Trainer OS
            </Link>
            <Link
              href="/recepcion"
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-3 py-2 text-xs font-black uppercase text-[#eaff93] sm:text-sm"
            >
              <DoorOpen className="h-4 w-4" /> Reception OS
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading || Boolean(busy)}
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase text-white/80 disabled:opacity-50 sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
            {process.env.NODE_ENV !== "production" && (
              <>
                <button
                  type="button"
                  onClick={() => void seed(false)}
                  disabled={Boolean(busy)}
                  className="hidden min-h-11 items-center gap-2 border-[3px] border-black/30 bg-[#d8ff3e] px-3 py-2 text-xs font-black uppercase text-black disabled:opacity-50 sm:inline-flex sm:text-sm"
                >
                  {busy === "seed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Seed
                </button>
                <button
                  type="button"
                  onClick={() => void seed(true)}
                  disabled={Boolean(busy)}
                  className="hidden min-h-11 items-center gap-2 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-xs font-black uppercase text-red-200 disabled:opacity-50 md:inline-flex md:text-sm"
                >
                  {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                  Reset
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase text-white/60 sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </section>

      {/* Mobile dock */}
      <nav
        className="xg-app-dock xg-safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t-[3px] border-white/20 bg-[#0a0a0a]/98 backdrop-blur-md lg:hidden"
        aria-label="Zonas admin"
      >
        {visibleTabs.map((item) => (
          <GameDockItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={tab === item.id}
            onClick={() => setTab(item.id)}
          />
        ))}
      </nav>

      <section className="xg-os-content mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
        <div className="hidden flex-wrap gap-2 lg:flex">
          {visibleTabs.map((item) => (
            <TabButton key={item.id} active={tab === item.id} onClick={() => setTab(item.id)}>
              {item.id === "accesos" ? "Accesos hoy" : item.id === "gamificacion" ? "Gamificacion" : item.label}
            </TabButton>
          ))}
        </div>

        <div className="border-[3px] border-white/15 bg-[#0c0c0c] px-3 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)] lg:hidden">
          <GameLabel tone="lime">Zona activa</GameLabel>
          <p className="mt-1 text-lg font-black uppercase">
            {visibleTabs.find((item) => item.id === tab)?.label ?? tab}
          </p>
        </div>

        {(message || error) && (
          <GameCallout tone={error ? "red" : "lime"}>{error || message}</GameCallout>
        )}

        {isLoading && !data ? (
          <div className="grid min-h-[360px] place-items-center border-[3px] border-white/15 bg-[#0c0c0c]">
            <Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" />
          </div>
        ) : data ? (
          <>
            {tab === "resumen" && (
              <ResumenTab data={data} isSuper={isSuper} busy={busy} onNotifyExpiring={notifyExpiring} onResolveAlert={resolveOperationalAlert} onRevokeStaffSessions={(wipeAll) => void revokeAllStaffSessions(wipeAll)} onOpenTab={setTab} onReload={() => void load()} isLoading={isLoading} />
            )}

            {tab === "socios" && (
              <SociosTab data={data} roster={roster} actions={memberActions} busy={busy} />
            )}

            {tab === "bitacora" && (
              <BitacoraTab data={data} usageSessionId={usageSessionId} onSelectSession={setUsageSessionId}
                onToggleSession={(id) => setUsageSessionId((cur) => (cur === id ? null : id))} />
            )}

            {tab === "accesos" && (
              <AccesosTab data={data} />
            )}

            {tab === "ingresos" && isSuper && data.revenue && (
              <IngresosTab revenue={data.revenue} busy={busy} payments={payments} onSavePayment={savePayment} onDeletePayment={deletePayment} onError={setError} />
            )}

            {tab === "gamificacion" && (
              <GamificacionTab gami={gami} busy={busy} forms={forms} onGamiAction={gamiAction} onReloadGami={() => void loadGami()} />
            )}

            {tab === "correos" && isSuper && <EmailCampaignCenter />}
          </>
        ) : null}
      </section>

      {quickPlanMember && data?.role === "super" && (
        <QuickPlanModal
          member={quickPlanMember}
          option={quickPlanOption}
          saving={grantingQuickPlan}
          onOptionChange={setQuickPlanOption}
          onClose={() => setQuickPlanMember(null)}
          onConfirm={() => void grantQuickPlan()}
        />
      )}

      {inviteMember && data?.role === "super" && (
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
          isSuper={data?.role === "super"}
          savingMetric={savingMetric}
          newMetric={newMetric}
          onClose={closeDetail}
          onChangeMetric={setNewMetric}
          onAddMetric={() => void addBodyMetric()}
          onOpenPlan={() => {
            closeDetail();
            // small delay so state updates
            setTimeout(() => openPlan(detailMember), 50);
          }}
          onOpenEdit={() => {
            closeDetail();
            setTimeout(() => openEdit(detailMember), 50);
          }}
          onOpenInvite={() => {
            closeDetail();
            setTimeout(() => openInvite(detailMember), 50);
          }}
          onRefresh={() => code && void load()}
        />
      )}
    </main>
  );
}
