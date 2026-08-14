"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, Mail, RefreshCw, Send } from "lucide-react";
import {
  AUDIENCE_LABELS,
  AUDIENCES,
  OPT_OUT_REASON_LABELS,
  QUARANTINE_REASON_LABELS,
} from "./email/audiences";
import { templateFor } from "./email/templates";
import { EMAIL_RE, parseSpreadsheet } from "./email/importSheet";
import {
  useCoveragePanel,
  useEmailFeedback,
  useRecipientsPanel,
  useTrackingPanel,
} from "./email/hooks";
import type {
  AudienceId,
  CampaignProcessSummary,
  CampaignTrackingPayload,
  CenterData,
  MemberCoverage,
  RecipientPreview,
} from "./email/types";


export default function EmailCampaignCenter() {
  const [data, setData] = useState<CenterData | null>(null);
  const [sheet, setSheet] = useState("");
  const [importConsent, setImportConsent] = useState(false);
  const [campaignConsent, setCampaignConsent] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const { busy, setBusy, notice, setNotice, error, setError } = useEmailFeedback();
  const {
    recipients,
    setRecipients,
    recipientsBusy,
    setRecipientsBusy,
    recipientSearch,
    setRecipientSearch,
  } = useRecipientsPanel();
  const {
    coverage,
    setCoverage,
    coverageBusy,
    setCoverageBusy,
    coverageSearch,
    setCoverageSearch,
    coverageFilter,
    setCoverageFilter,
  } = useCoveragePanel();
  const {
    trackingCampaignId,
    setTrackingCampaignId,
    trackingFilter,
    setTrackingFilter,
    tracking,
    setTracking,
    trackingBusy,
    setTrackingBusy,
    trackingSearch,
    setTrackingSearch,
  } = useTrackingPanel();
  const [form, setForm] = useState(() => {
    const seed = templateFor("claim_profile");
    return {
      audience: "claim_recovered" as AudienceId,
      subject: seed.subject,
      title: seed.title,
      message: seed.message,
      ctaLabel: seed.ctaLabel,
      ctaPath: seed.ctaPath,
    };
  });
  const parsed = useMemo(() => parseSpreadsheet(sheet), [sheet]);
  const validCount = useMemo(() => new Set(parsed.filter((row) => EMAIL_RE.test(row.email)).map((row) => row.email)).size, [parsed]);
  const activeTemplate = templateFor(form.audience);
  const filteredRecipients = useMemo(() => {
    const query = recipientSearch.trim().toLocaleLowerCase("es-CR");
    if (!query) return recipients;
    return recipients.filter((item) =>
      `${item.name} ${item.email} ${item.source} ${item.plan}`.toLocaleLowerCase("es-CR").includes(query),
    );
  }, [recipientSearch, recipients]);
  const filteredCoverage = useMemo(() => {
    const query = coverageSearch.trim().toLocaleLowerCase("es-CR");
    return (coverage ?? []).filter((item) => {
      if (coverageFilter === "sendable" && !item.email) return false;
      if (coverageFilter === "missing" && item.email) return false;
      if (coverageFilter === "quarantined" && !item.quarantineReason) return false;
      return !query || `${item.name} ${item.email} ${item.quarantinedEmail} ${item.plan} ${item.rate} ${item.sourceStatus}`
        .toLocaleLowerCase("es-CR").includes(query);
    });
  }, [coverage, coverageFilter, coverageSearch]);

  function applyTemplate(audience: AudienceId = form.audience) {
    const next = templateFor(audience);
    setForm({
      audience,
      subject: next.subject,
      title: next.title,
      message: next.message,
      ctaLabel: next.ctaLabel,
      ctaPath: next.ctaPath,
    });
    setNotice(`Plantilla cargada: ${AUDIENCE_LABELS[audience]}. Revisá y editá antes de encolar.`);
    setError("");
  }

  const load = useCallback(async () => {
    setBusy((current) => current || "load");
    setError("");
    try {
      const response = await fetch("/api/xtreme/admin/email", { cache: "no-store" });
      const json = (await response.json()) as CenterData & { error?: string };
      if (!response.ok) throw new Error(json.error || "No se pudo cargar.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar.");
    } finally {
      setBusy("");
    }
  }, [setBusy, setError]);

  useEffect(() => { void load(); }, [load]);

  // Si la audiencia elegida ya no tiene pendientes (todos invitados), saltar a la primera con trabajo.
  useEffect(() => {
    if (!data) return;
    const currentCount = data.audiences[form.audience] ?? 0;
    if (currentCount > 0) return;
    const next = AUDIENCES.find((item) => (data.audiences[item.id] ?? 0) > 0);
    if (!next || next.id === form.audience) return;
    const tpl = templateFor(next.id);
    setForm({
      audience: next.id,
      subject: tpl.subject,
      title: tpl.title,
      message: tpl.message,
      ctaLabel: tpl.ctaLabel,
      ctaPath: tpl.ctaPath,
    });
  }, [data, form.audience]);

  async function loadCoverage() {
    setCoverageBusy(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/admin/email?coverage=1", { cache: "no-store" });
      const json = (await response.json()) as { memberCoverage?: MemberCoverage[]; error?: string };
      if (!response.ok) throw new Error(json.error || "No se pudo cargar la auditoría.");
      setCoverage(json.memberCoverage ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la auditoría.");
    } finally {
      setCoverageBusy(false);
    }
  }

  async function loadCampaignTracking(campaignId: string, filter = trackingFilter) {
    if (!campaignId) return;
    setTrackingBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        campaignId,
        deliveryFilter: filter,
      });
      const response = await fetch(`/api/xtreme/admin/email?${params}`, { cache: "no-store" });
      const json = (await response.json()) as {
        campaignTracking?: CampaignTrackingPayload;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "No se pudo cargar el seguimiento.");
      setTracking(json.campaignTracking ?? null);
      setTrackingCampaignId(campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el seguimiento.");
    } finally {
      setTrackingBusy(false);
    }
  }

  async function resendReminder(deliveryKey: string) {
    setBusy(`resend:${deliveryKey}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/xtreme/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_reminder", deliveryKey }),
      });
      const json = (await response.json()) as { ok?: boolean; email?: string; error?: string };
      if (!response.ok) throw new Error(json.error || "No se pudo reenviar.");
      setNotice(`Recordatorio reenviado a ${json.email}.`);
      if (trackingCampaignId) await loadCampaignTracking(trackingCampaignId, trackingFilter);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar.");
    } finally {
      setBusy("");
    }
  }

  async function resendRemindersBatch() {
    if (!trackingCampaignId) return;
    setBusy("resend-batch");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/xtreme/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resend_reminders_batch",
          campaignId: trackingCampaignId,
          limit: 25,
        }),
      });
      const json = (await response.json()) as {
        sent?: number;
        failed?: number;
        attempted?: number;
        errors?: string[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "No se pudo reenviar el lote.");
      setNotice(
        `Recordatorios: ${json.sent ?? 0} reenviados, ${json.failed ?? 0} fallidos (lote de ${json.attempted ?? 0}).`,
      );
      await loadCampaignTracking(trackingCampaignId, trackingFilter);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar el lote.");
    } finally {
      setBusy("");
    }
  }

  const filteredTrackingRows = useMemo(() => {
    const rows = tracking?.rows ?? [];
    const q = trackingSearch.trim().toLocaleLowerCase("es-CR");
    if (!q) return rows;
    return rows.filter((row) =>
      `${row.name} ${row.email} ${row.status}`.toLocaleLowerCase("es-CR").includes(q),
    );
  }, [tracking, trackingSearch]);

  function statusLabel(status: string) {
    if (status === "registered") return "Registrado";
    if (status === "opened") return "Abrió enlace";
    if (status === "sent") return "Enviado (sin click)";
    if (status === "failed") return "Fallido";
    if (status === "skipped") return "Omitido";
    if (status === "queued" || status === "sending") return "En cola";
    return status;
  }

  function statusClass(status: string) {
    if (status === "registered") return "text-lime-200";
    if (status === "opened") return "text-cyan-200";
    if (status === "sent") return "text-amber-200";
    if (status === "failed") return "text-red-300";
    return "text-white/50";
  }

  function fmtWhen(value: string | null | undefined) {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("es-CR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return "—";
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setRecipientsBusy(true);
    setRecipientSearch("");
    void fetch(`/api/xtreme/admin/email?audience=${encodeURIComponent(form.audience)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as { recipientList?: RecipientPreview[]; error?: string };
        if (!response.ok) throw new Error(json.error || "No se pudo cargar la lista de destinatarios.");
        setRecipients(json.recipientList ?? []);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setRecipients([]);
        setError(err instanceof Error ? err.message : "No se pudo cargar la lista de destinatarios.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecipientsBusy(false);
      });
    return () => controller.abort();
  }, [form.audience, setError, setRecipientSearch, setRecipients, setRecipientsBusy]);

  async function importContacts() {
    if (!validCount) return setError("Pegá al menos un correo válido.");
    setBusy("import"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/xtreme/admin/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", contacts: parsed, consentConfirmed: importConsent, consentSource: "Lista histórica del gimnasio" }),
      });
      const json = (await response.json()) as { processed?: number; inserted?: number; updated?: number; invalid?: number; error?: string };
      if (!response.ok) throw new Error(json.error || "No se pudo importar.");
      setNotice(`${json.processed} correos procesados: ${json.inserted} nuevos y ${json.updated} actualizados.`);
      setSheet(""); setImportConsent(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo importar."); }
    finally { setBusy(""); }
  }

  async function queueCampaign() {
    setBusy("campaign"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/xtreme/admin/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "campaign", ...form, consentConfirmed: campaignConsent }),
      });
      const json = (await response.json()) as {
        recipients?: number;
        excludedAlreadySent?: number;
        process?: CampaignProcessSummary;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "No se pudo crear la campaña.");
      const process = json.process;
      if (process && !process.configured) {
        setError(
          `Campaña en cola (${json.recipients} destinos) pero el servidor no puede enviar: ${process.error || "revisá EMAIL_SENDING_ENABLED / Resend"}.`,
        );
      } else if (process && (process.processed > 0 || process.sent > 0)) {
        setNotice(
          `Campaña en cola para ${json.recipients} destinatarios. Primer lote: ${process.sent} enviados, ${process.failed} fallidos, ${process.skipped} omitidos. El resto sigue cada ~5 min o con «Procesar cola».`,
        );
      } else {
        setNotice(
          `Campaña en cola para ${json.recipients} destinatarios. El envío continúa en lotes automáticos (~cada 5 min) o con «Procesar cola ahora».`,
        );
      }
      setCampaignConsent(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo crear la campaña."); }
    finally { setBusy(""); }
  }

  async function sendTestCampaign() {
    const email = testEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return setError("Ingresá un correo válido para la prueba.");
    setBusy("test-campaign"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/xtreme/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_campaign", ...form, email }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error || "No se pudo enviar la prueba.");
      setNotice(`Prueba enviada únicamente a ${email}. No se creó una campaña.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la prueba.");
    } finally {
      setBusy("");
    }
  }

  async function stopCampaign(campaignId: string, subject: string) {
    const ok = window.confirm(
      `¿Detener la cola de envíos de «${subject}»?\n\n` +
        "Los correos que ya salieron se mantienen. Los pendientes NO se envían.",
    );
    if (!ok) return;
    setBusy(`stop:${campaignId}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/xtreme/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop_campaign", campaignId }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        stoppedPending?: number;
        sent?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "No se pudo detener la campaña.");
      setNotice(
        `Campaña detenida. ${json.stoppedPending ?? 0} pendientes cancelados · ${json.sent ?? 0} ya enviados se conservan.`,
      );
      if (trackingCampaignId === campaignId) {
        await loadCampaignTracking(campaignId, trackingFilter);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo detener la campaña.");
    } finally {
      setBusy("");
    }
  }

  async function processQueueNow() {
    setBusy("process"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/xtreme/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_queue" }),
      });
      const json = (await response.json()) as {
        process?: CampaignProcessSummary;
        emailConfigured?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "No se pudo procesar la cola.");
      const process = json.process;
      if (!process?.configured) {
        setError(process?.error || "El servidor no tiene el correo configurado para envíos.");
      } else if (
        !process.processed &&
        !process.sent &&
        !process.reclaimed &&
        !process.alreadySentSkipped
      ) {
        setNotice("No había correos pendientes en la cola (o la campaña ya terminó).");
      } else {
        setNotice(
          `Cola: ${process.sent} enviados, ${process.failed} fallidos, ${process.skipped} omitidos` +
            (process.reclaimed ? `, ${process.reclaimed} desbloqueados` : "") +
            (process.alreadySentSkipped ? `, ${process.alreadySentSkipped} duplicados sacados` : "") +
            `. Seguís con «Procesar cola» o el cron (~5 min).`,
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la cola.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-[3px] border-lime-300/35 bg-lime-300/[0.06] p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2 text-lime-200">
            <Mail className="h-5 w-5" />
            <h2 className="font-black uppercase">Centro de correos</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-white/55">
            Importá contactos, armá audiencias y enviá en lotes. Las bajas se excluyen solas y
            quienes ya recibieron campaña hoy no vuelven a aparecer hasta mañana. Recibos y
            códigos de cuenta siempre se entregan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void processQueueNow()}
            className="inline-flex min-h-11 items-center gap-2 border-2 border-lime-300/50 bg-lime-300/15 px-3 text-xs font-black uppercase text-lime-100 disabled:opacity-40"
          >
            {busy === "process" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Procesar cola ahora
          </button>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 border-2 border-white/20 px-3 text-xs font-black uppercase"><RefreshCw className={`h-4 w-4 ${busy === "load" ? "animate-spin" : ""}`} />Actualizar</button>
        </div>
      </div>

      {data && data.emailConfigured === false && (
        <div className="border-[3px] border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100">
          El servidor no puede enviar campañas: {data.emailConfigError || "falta configuración de correo (EMAIL_SENDING_ENABLED, RESEND_API_KEY, SMTP_FROM)."}.
          Las campañas se quedan en cola hasta corregir las variables en Vercel Production.
        </div>
      )}

      {(notice || error) && <div className={`border-[3px] px-4 py-3 text-sm font-bold ${error ? "border-red-400/50 bg-red-500/10 text-red-200" : "border-lime-300/50 bg-lime-300/10 text-lime-100"}`}>{error || notice}</div>}

      <section className="border-[3px] border-cyan-300/30 bg-cyan-300/[0.04] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-black uppercase text-cyan-100">Cobertura real de la base</h3>
            <p className="mt-2 max-w-3xl text-xs font-semibold leading-relaxed text-white/50">
              Un socio sin correo no está borrado ni oculto: sigue en la base, pero no puede recibir campañas. Los conteos de abajo separan fichas de socios y destinatarios reales.
            </p>
          </div>
          <button type="button" disabled={coverageBusy} onClick={() => void loadCoverage()} className="inline-flex min-h-10 items-center gap-2 border-2 border-cyan-300/40 px-3 text-[10px] font-black uppercase text-cyan-100 disabled:opacity-40">
            {coverageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {coverage ? "Recargar auditoría" : "Ver los socios"}
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            [data?.diagnostics.totalMembers, "Socios en la base", "Incluye los importados del Excel"],
            [data?.diagnostics.membersWithUsableEmail, "Con correo usable", "Verificados y pendientes de verificar"],
            [data?.diagnostics.importedContactEmails, "Contactos reales", "Direcciones únicas recuperadas del Excel"],
            [
              data?.diagnostics.remainingActivationEmails ?? data?.diagnostics.inviteRecoverableEmails ?? data?.audiences.invite_recoverable,
              "Falta registrar",
              "Activación/invitación pendientes, incluso con magic link previo",
            ],
            [
              data?.diagnostics.inviteRecoverableTotal,
              "Invitables",
              "Recuperables sin verificar; solo salen al registrarse",
            ],
            [
              data?.diagnostics.unverifiedNotSentEmails ?? data?.audiences.unverified_not_sent,
              "No verificados",
              "Incluye enviados y clicks sin registro",
            ],
            [data?.diagnostics.alreadyCampaignSentEmails, "Ya enviados", "Tienen magic link, pero siguen disponibles si no se registraron"],
            [
              data?.diagnostics.sentNotRegisteredEmails ?? data?.audiences.sent_not_registered,
              "Enviados sin registro",
              "Recibieron mail y no se registraron",
            ],
            [
              data?.diagnostics.openedNotRegisteredEmails ?? data?.audiences.opened_not_registered,
              "Abrieron sin registro",
              "Click en el enlace y no terminaron",
            ],
            [
              data?.diagnostics.activeAppEmails ?? data?.audiences.active_app,
              "Activos en app",
              "Verificados con apertura en 14 d",
            ],
            [
              data?.diagnostics.planExpiringEmails ?? data?.audiences.plan_expiring,
              "Plan por vencer",
              "1–7 días restantes",
            ],
            [data?.diagnostics.recoveredMembers, "Fichas recuperadas", "Asignación segura y auditada"],
            [data?.diagnostics.recoveredFromExcel, "Desde Excel", "Alineados por nombre/apellidos"],
            [data?.diagnostics.recoveredFromQuarantine, "Desde cuarentena", "Re-sacados con match de nombre"],
            [data?.diagnostics.membersWithoutUsableEmail, "Sin correo seguro", "No se pueden incluir en un envío seguro"],
            [(data?.diagnostics.quarantinedMembers ?? 0) + (data?.diagnostics.unsafeIdentityMatches ?? 0), "No seguros (claim)", "Aislados de activación con match; sí entran en invitación masiva"],
          ].map(([value, label, detail]) => (
            <div key={String(label)} className="border-2 border-white/10 bg-black/40 p-3">
              <div className="text-2xl font-black text-cyan-100">{value ?? "-"}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-white">{label}</div>
              <div className="mt-1 text-[10px] font-semibold text-white/35">{detail}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] font-semibold text-white/45">
          No seguros: {data?.diagnostics.quarantinedMembers ?? "-"} en cuarentena · {data?.diagnostics.quarantineWithPreviousEmail ?? "-"} con correo anterior guardado · {data?.diagnostics.unsafeIdentityMatches ?? "-"} nombre/correo dudoso · {data?.diagnostics.quarantineShared ?? "-"} compartidos · {data?.diagnostics.quarantinePlaceholder ?? "-"} placeholders. Corré el script de recovery para realinear.
        </p>
        {coverage && (
          <div className="mt-4 border-2 border-white/10 bg-black/40 p-3">
            <div className="flex flex-wrap gap-2">
              {([
                ["all", "Todos"], ["sendable", "Seguros para enviar"], ["missing", "Sin correo"], ["quarantined", "No seguros · no enviar"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setCoverageFilter(id)} className={`min-h-9 border-2 px-3 text-[10px] font-black uppercase ${coverageFilter === id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/55"}`}>{label}</button>
              ))}
            </div>
            <input value={coverageSearch} onChange={(event) => setCoverageSearch(event.target.value)} placeholder="Buscar nombre, correo, plan, tarifa o estado del Excel" className="mt-3 min-h-10 w-full border-2 border-white/15 bg-black px-3 text-xs font-semibold text-white outline-none focus:border-cyan-300" />
            <div className="mt-2 text-[10px] font-black uppercase text-cyan-100">{filteredCoverage.length} de {coverage.length} socios</div>
            <div className="mt-2 max-h-80 overflow-y-auto border border-white/10">
              {filteredCoverage.map((member, index) => (
                <div key={`${member.name}-${member.email}-${index}`} className="grid gap-1 border-b border-white/10 px-3 py-2 text-xs last:border-b-0 lg:grid-cols-[1.2fr_1fr_1fr] lg:items-center">
                  <div className="min-w-0"><div className="truncate font-black text-white">{member.name}</div><div className={`truncate font-semibold ${member.email ? "text-cyan-100/70" : "text-orange-200/70"}`}>{member.email || "Sin correo usable"}</div></div>
                  <div className="font-semibold text-white/45">{member.rate || member.plan || "Sin tarifa"}{member.sourceStatus ? ` · ${member.sourceStatus}` : ""}</div>
                  <div className="min-w-0 font-semibold text-white/35 lg:text-right">
                    <div>{member.email ? (member.emailVerified ? "Verificado" : member.recoveryMethod ? "Recuperado del Excel · coincidencia segura" : "Pendiente de verificar") : member.quarantineReason ? `No enviar: ${QUARANTINE_REASON_LABELS[member.quarantineReason] || member.quarantineReason}` : "No venía correo usable"}</div>
                    {!member.email && member.quarantinedEmail && <div className="truncate text-orange-200/60">Anterior: {member.quarantinedEmail}</div>}
                    {!member.email && member.quarantineReason && member.emailNameScore > 0 && (
                      <div className="text-orange-100/45">Coincidencia nombre/correo: {Math.round(member.emailNameScore * 100)}%</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {(["Re-engagement", "Activación", "Confirmación", "Invitación masiva", "Win-back", "Segmentos", "Planes", "Listas"] as const).map((group) => {
        // Solo categorías con gente: si el conteo es 0, la tarjeta no se muestra.
        const items = AUDIENCES.filter((item) => {
          if (item.group !== group) return false;
          if (!data) return true;
          return (data.audiences[item.id] ?? 0) > 0;
        });
        if (!items.length) return null;
        return (
          <section key={group} className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white/45">{group}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`border-2 bg-[#0c0c0c] p-4 ${
                    group === "Re-engagement"
                      ? "border-orange-300/40"
                      : group === "Activación" || group === "Invitación masiva"
                      ? "border-lime-300/35"
                      : "border-white/15"
                  }`}
                >
                  <div className="text-2xl font-black text-lime-200">
                    {data?.audiences[item.id] ?? "-"}
                  </div>
                  <div className="mt-1 text-xs font-black uppercase">{item.label}</div>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-white/40">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <p className="text-xs font-bold text-white/40">
        Bajas/supresiones: {data?.audiences.suppressed ?? "-"} · Ya con magic link:{" "}
        {data?.diagnostics.alreadyCampaignSentEmails ?? "-"} (siguen en los filtros mientras no
        completen el registro) · Los clics sin registro también permanecen disponibles.
      </p>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5">
          <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-cyan-300" /><h3 className="font-black uppercase">Importar desde Excel</h3></div>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-white/45">En Excel seleccioná las columnas correo, nombre y teléfono, copiá y pegá aquí. También podés cargar un CSV; el archivo nunca se envía completo al servidor.</p>
          <textarea value={sheet} onChange={(event) => setSheet(event.target.value)} rows={8} placeholder={'correo\tnombre\tteléfono\nana@email.com\tAna\t8888-8888'} className="mt-4 w-full border-2 border-white/20 bg-black p-3 font-mono text-xs text-white outline-none focus:border-cyan-300" />
          <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then(setSheet); }} className="mt-3 block w-full text-xs font-bold text-white/50 file:mr-3 file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:font-black file:uppercase file:text-black" />
          <div className="mt-3 text-xs font-black text-cyan-200">Vista previa: {validCount} correos válidos y únicos</div>
          <label className="mt-4 flex items-start gap-3 text-xs font-semibold leading-relaxed text-white/60"><input type="checkbox" checked={importConsent} onChange={(event) => setImportConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-lime-300" /><span>Confirmo que estas personas dieron permiso al gimnasio para contactarlas y que la procedencia de la lista es legítima.</span></label>
          <button type="button" disabled={!validCount || !importConsent || Boolean(busy)} onClick={() => void importContacts()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-cyan-300 px-4 text-xs font-black uppercase text-black disabled:opacity-40">{busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Importar sin enviar</button>
        </section>

        <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Send className="h-5 w-5 text-lime-300" /><h3 className="font-black uppercase">Nueva campaña</h3></div>
            <button
              type="button"
              onClick={() => applyTemplate(form.audience)}
              className="inline-flex min-h-10 items-center gap-2 border-2 border-lime-300/40 bg-lime-300/10 px-3 text-[10px] font-black uppercase tracking-wide text-lime-200 transition hover:bg-lime-300 hover:text-black"
            >
              <Mail className="h-3.5 w-3.5" /> Cargar plantilla
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold text-white/45">
            Cada audiencia tiene plantilla con asunto, título, mensaje y botón. Al cambiar la audiencia se rellena sola; podés editar todo antes de encolar.
          </p>
          <label className="mt-4 block text-[10px] font-black uppercase tracking-widest text-white/45">
            Audiencia
            <select
              value={form.audience}
              onChange={(event) => {
                const audience = event.target.value as AudienceId;
                const next = templateFor(audience);
                setForm({
                  audience,
                  subject: next.subject,
                  title: next.title,
                  message: next.message,
                  ctaLabel: next.ctaLabel,
                  ctaPath: next.ctaPath,
                });
                setError("");
              }}
              className="mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3 text-sm font-bold text-white"
            >
              {AUDIENCES.filter((item) => !data || (data.audiences[item.id] ?? 0) > 0).map(
                (item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} ({data?.audiences[item.id] ?? 0})
                  </option>
                ),
              )}
            </select>
          </label>
          <div className="mt-3 border-2 border-white/10 bg-black/40 px-3 py-2 text-[11px] font-semibold leading-relaxed text-white/50">
            Plantilla activa: <span className="font-black text-lime-200">{AUDIENCE_LABELS[form.audience]}</span>
            {" · "}CTA base → <span className="text-cyan-200">{activeTemplate.ctaPath}</span>
            {activeTemplate.ctaPath.startsWith("/registro/confirmar") ? (
              <span className="mt-1 block text-[10px] font-normal text-zinc-400">
                Envío real: un magic link personal por correo (
                <code className="text-lime-200/90">/registro/confirmar?token=…</code>
                ). Sin token válido en Mongo el mensaje no sale; se reencola.
              </span>
            ) : null}
            <p className="mt-1.5 text-[10px] font-semibold text-white/40">
              Diseño profesional: logo Xtreme, mapa de ubicación (clic a Google Maps), fachada y
              accesos rápidos a app / planes.
            </p>
          </div>
          <div className="mt-3 border-2 border-cyan-300/25 bg-cyan-300/[0.04] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Lista exacta de destinatarios</div>
                <p className="mt-1 text-xs font-semibold text-white/45">
                  {recipientsBusy ? "Calculando con las reglas actuales..." : `${recipients.length} personas recibirían esta campaña ahora.`}
                </p>
              </div>
              {recipientsBusy && <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />}
            </div>
            <input
              value={recipientSearch}
              onChange={(event) => setRecipientSearch(event.target.value)}
              placeholder="Buscar por nombre, correo, origen o plan"
              className="mt-3 min-h-10 w-full border-2 border-white/15 bg-black px-3 text-xs font-semibold text-white outline-none focus:border-cyan-300"
            />
            <div className="mt-3 max-h-72 overflow-y-auto border border-white/10">
              {filteredRecipients.map((recipient) => (
                <div key={recipient.email} className="grid gap-1 border-b border-white/10 px-3 py-2 text-xs last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-black text-white">{recipient.name}</div>
                    <div className="truncate font-semibold text-cyan-100/70">{recipient.email}</div>
                  </div>
                  <div className="text-left font-semibold text-white/40 sm:text-right">
                    <div>{recipient.source} · {recipient.emailVerified ? "correo verificado" : "sin verificar"}{recipient.duplicateProfiles ? " · correo repetido en fichas" : ""}</div>
                    {(recipient.plan || recipient.nextBillingDate) && <div>{recipient.plan || "Sin plan"}{recipient.nextBillingDate ? ` · vence ${recipient.nextBillingDate}` : ""}</div>}
                  </div>
                </div>
              ))}
              {!recipientsBusy && !filteredRecipients.length && (
                <p className="px-3 py-4 text-xs font-semibold text-white/40">
                  {recipientSearch ? "Nadie coincide con la búsqueda." : "Esta audiencia no tiene destinatarios."}
                </p>
              )}
            </div>
          </div>
          {([{ key: "subject", label: "Asunto", placeholder: activeTemplate.subject }, { key: "title", label: "Título", placeholder: activeTemplate.title }] as const).map((field) => (
            <label key={field.key} className="mt-3 block text-[10px] font-black uppercase tracking-widest text-white/45">
              {field.label}
              <input
                value={form[field.key]}
                onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                placeholder={field.placeholder}
                className="mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3 text-sm font-bold text-white outline-none focus:border-lime-300"
              />
            </label>
          ))}
          <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-white/45">
            Mensaje
            <textarea
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              rows={8}
              className="mt-1 w-full border-2 border-white/20 bg-black p-3 text-sm font-semibold text-white outline-none focus:border-lime-300"
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/45">
              Texto del botón
              <input
                value={form.ctaLabel}
                onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })}
                className="mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3 text-sm text-white"
              />
            </label>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/45">
              Ruta interna
              <input
                value={form.ctaPath}
                onChange={(event) => setForm({ ...form, ctaPath: event.target.value })}
                className="mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3 text-sm text-white"
              />
            </label>
          </div>
          <label className="mt-4 flex items-start gap-3 text-xs font-semibold leading-relaxed text-white/60">
            <input type="checkbox" checked={campaignConsent} onChange={(event) => setCampaignConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-lime-300" />
            <span>Revisé asunto, contenido, audiencia y permiso. Entiendo que esto crea una campaña real en cola.</span>
          </label>
          <div className="mt-4 border-2 border-cyan-300/30 bg-cyan-300/[0.04] p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Prueba individual</div>
            <p className="mt-1 text-xs font-semibold text-white/45">Usa el contenido de arriba y no crea una campaña ni toca la audiencia.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                type="email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                className="min-h-11 border-2 border-white/20 bg-black px-3 text-sm font-bold text-white outline-none focus:border-cyan-300"
              />
              <button
                type="button"
                disabled={!EMAIL_RE.test(testEmail.trim()) || Boolean(busy)}
                onClick={() => void sendTestCampaign()}
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-cyan-300 px-4 text-xs font-black uppercase text-black disabled:opacity-40"
              >
                {busy === "test-campaign" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar solo prueba
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={!campaignConsent || !form.subject || !form.title || !form.message || recipientsBusy || Boolean(busy)}
            onClick={() => void queueCampaign()}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-lime-300 px-4 text-xs font-black uppercase text-black disabled:opacity-40"
          >
            {busy === "campaign" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Confirmar y poner en cola
          </button>
        </section>
      </div>

      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-black uppercase">Campañas y seguimiento</h3>
            <p className="mt-2 max-w-2xl text-xs font-semibold text-white/45">
              Envío en lotes (~5 min). Tocá una campaña para ver por persona: cuándo se envió, si abrió el enlace,
              si ya se registró, y reenviar recordatorio de verificación.
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void processQueueNow()}
            className="inline-flex min-h-10 items-center gap-2 border-2 border-lime-300/40 px-3 text-[10px] font-black uppercase text-lime-100 disabled:opacity-40"
          >
            {busy === "process" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Procesar cola
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {data?.campaigns.map((campaign) => {
            const remaining = Math.max(0, campaign.total - campaign.sent - campaign.failed - campaign.skipped);
            const t = campaign.tracking;
            const selected = trackingCampaignId === campaign.id;
            const canStop = campaign.status === "queued" || campaign.status === "processing";
            const statusTone =
              campaign.status === "cancelled"
                ? "text-red-300"
                : campaign.status === "completed"
                  ? "text-lime-200"
                  : "text-amber-200";
            return (
              <div
                key={campaign.id}
                className={`grid gap-2 border-2 p-3 text-xs sm:grid-cols-[1fr_auto] sm:items-center ${
                  selected
                    ? "border-lime-300/50 bg-lime-300/10"
                    : campaign.status === "cancelled"
                      ? "border-red-300/25 bg-black/30"
                      : "border-white/10 bg-black/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => void loadCampaignTracking(campaign.id, trackingFilter)}
                  className="min-w-0 text-left"
                >
                  <div className="font-black text-white">{campaign.subject}</div>
                  <div className="mt-1 font-semibold text-white/40">
                    {AUDIENCE_LABELS[campaign.audience] ?? campaign.audience} ·{" "}
                    {new Date(campaign.createdAt).toLocaleString("es-CR")}
                    {campaign.lastProcessedAt
                      ? ` · último lote ${new Date(campaign.lastProcessedAt).toLocaleString("es-CR")}`
                      : ""}
                  </div>
                  {t ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide">
                      <span className="border border-white/15 px-2 py-0.5 text-white/70">
                        Enviados {t.sent}
                      </span>
                      <span className="border border-cyan-300/30 px-2 py-0.5 text-cyan-200">
                        Abrieron {t.opened}
                      </span>
                      <span className="border border-lime-300/30 px-2 py-0.5 text-lime-200">
                        Registrados {t.registered}
                      </span>
                      <span className="border border-amber-300/30 px-2 py-0.5 text-amber-200">
                        Sin click {t.notOpened}
                      </span>
                      <span className="border border-orange-300/30 px-2 py-0.5 text-orange-200">
                        Sin registro {t.notRegistered}
                      </span>
                    </div>
                  ) : null}
                  {campaign.lastError ? (
                    <div className="mt-1 font-semibold text-amber-200/90">{campaign.lastError}</div>
                  ) : null}
                  <div className="mt-1 text-[10px] font-bold text-white/40">
                    {selected ? "Seguimiento abierto ↓" : "Tocá para ver detalle →"}
                  </div>
                </button>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <div className={`font-black uppercase ${statusTone}`}>
                    {campaign.status === "cancelled"
                      ? "DETENIDA"
                      : campaign.status === "completed"
                        ? "COMPLETADA"
                        : campaign.status === "processing"
                          ? "ENVIANDO"
                          : "EN COLA"}
                    {" · "}
                    {campaign.sent}/{campaign.total}
                    {campaign.failed ? ` · ${campaign.failed} fallidos` : ""}
                    {campaign.skipped ? ` · ${campaign.skipped} omitidos` : ""}
                    {remaining > 0 && canStop ? ` · ${remaining} pendientes` : ""}
                  </div>
                  {canStop ? (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={(e) => {
                        e.stopPropagation();
                        void stopCampaign(campaign.id, campaign.subject);
                      }}
                      className="inline-flex min-h-9 items-center justify-center border-2 border-red-300/50 bg-red-500/10 px-3 text-[10px] font-black uppercase tracking-wide text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      {busy === `stop:${campaign.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Detener cola"
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {data && !data.campaigns.length && (
            <p className="text-sm font-semibold text-white/40">Todavía no hay campañas.</p>
          )}
        </div>

        {trackingCampaignId ? (
          <div className="mt-4 border-2 border-cyan-300/25 bg-black/40 p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">
                  Detalle por persona
                </div>
                <p className="mt-1 text-xs font-semibold text-white/50">
                  Enviado = salió el correo · Abrió = tocó el enlace · Registrado = verificó correo y creó PIN.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={trackingBusy || Boolean(busy)}
                  onClick={() => void loadCampaignTracking(trackingCampaignId, trackingFilter)}
                  className="inline-flex min-h-9 items-center gap-1.5 border border-white/20 px-2 text-[10px] font-black uppercase text-white/70"
                >
                  {trackingBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Actualizar
                </button>
                <button
                  type="button"
                  disabled={trackingBusy || Boolean(busy) || !(tracking?.stats.notRegistered)}
                  onClick={() => void resendRemindersBatch()}
                  className="inline-flex min-h-9 items-center gap-1.5 border border-lime-300/40 bg-lime-300/10 px-2 text-[10px] font-black uppercase text-lime-100 disabled:opacity-40"
                >
                  {busy === "resend-batch" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  Recordatorio a sin registro (25)
                </button>
              </div>
            </div>

            {tracking?.stats ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {[
                  ["Enviados", tracking.stats.sent, "text-white"],
                  ["Abrieron", tracking.stats.opened, "text-cyan-200"],
                  ["Registrados", tracking.stats.registered, "text-lime-200"],
                  ["Sin click", tracking.stats.notOpened, "text-amber-200"],
                  ["Sin registro", tracking.stats.notRegistered, "text-orange-200"],
                  ["Fallidos", tracking.stats.failed, "text-red-300"],
                ].map(([label, value, tone]) => (
                  <div key={String(label)} className="border border-white/10 bg-[#0c0c0c] p-2">
                    <div className="text-[9px] font-black uppercase tracking-wider text-white/40">{label}</div>
                    <div className={`mt-0.5 text-lg font-black ${tone}`}>{value as number}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["all", "Todos"],
                  ["sent", "Enviados"],
                  ["opened", "Abrieron"],
                  ["not_opened", "Sin click"],
                  ["registered", "Registrados"],
                  ["not_registered", "Sin registro"],
                  ["failed", "Fallidos"],
                  ["queued", "En cola"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTrackingFilter(id);
                    void loadCampaignTracking(trackingCampaignId, id);
                  }}
                  className={`min-h-8 border px-2 text-[10px] font-black uppercase ${
                    trackingFilter === id
                      ? "border-lime-300 bg-lime-300 text-black"
                      : "border-white/15 text-white/55 hover:border-white/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              value={trackingSearch}
              onChange={(e) => setTrackingSearch(e.target.value)}
              placeholder="Buscar nombre o correo…"
              className="mt-3 w-full border-2 border-white/10 bg-black px-3 py-2 text-xs text-white placeholder:text-white/30"
            />

            <div className="mt-3 max-h-[28rem] overflow-auto border border-white/10">
              <table className="min-w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-[#121212] text-[10px] font-black uppercase tracking-wide text-white/45">
                  <tr>
                    <th className="px-2 py-2">Persona</th>
                    <th className="px-2 py-2">Estado</th>
                    <th className="px-2 py-2">Enviado</th>
                    <th className="px-2 py-2">Click / abrió</th>
                    <th className="px-2 py-2">Registrado</th>
                    <th className="px-2 py-2">Recordatorios</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredTrackingRows.map((row) => (
                    <tr key={row.deliveryKey} className="border-t border-white/10 align-top">
                      <td className="px-2 py-2">
                        <div className="font-black text-white">{row.name}</div>
                        <div className="font-semibold text-white/45">{row.email}</div>
                      </td>
                      <td className={`px-2 py-2 font-black uppercase ${statusClass(row.status)}`}>
                        {statusLabel(row.status)}
                      </td>
                      <td className="px-2 py-2 font-semibold text-white/70">{fmtWhen(row.sentAt)}</td>
                      <td className="px-2 py-2 font-semibold text-cyan-100/90">{fmtWhen(row.openedAt)}</td>
                      <td className="px-2 py-2 font-semibold text-lime-100/90">
                        {fmtWhen(row.registeredAt)}
                        {row.emailVerified ? (
                          <div className="text-[9px] font-black uppercase text-lime-300/80">Verificado</div>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 font-semibold text-white/50">
                        {row.reminderCount > 0 ? (
                          <>
                            {row.reminderCount}×
                            <div className="text-[10px]">{fmtWhen(row.lastReminderAt)}</div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.canResend ? (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => void resendReminder(row.deliveryKey)}
                            className="inline-flex min-h-8 items-center gap-1 border border-lime-300/40 px-2 text-[9px] font-black uppercase text-lime-100 disabled:opacity-40"
                          >
                            {busy === `resend:${row.deliveryKey}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Mail className="h-3 w-3" />
                            )}
                            Reenviar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!trackingBusy && !filteredTrackingRows.length ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center font-semibold text-white/40">
                        No hay filas con este filtro.
                      </td>
                    </tr>
                  ) : null}
                  {trackingBusy ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center font-semibold text-white/40">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="border-[3px] border-red-300/25 bg-[#0c0c0c] p-4 sm:p-5">
        <h3 className="font-black uppercase">Bajas de correo y motivos</h3>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-white/45">
          Motivos recibidos desde la página de preferencias. Estos correos ya están excluidos de campañas y recordatorios opcionales.
        </p>
        <div className="mt-4 space-y-2">
          {data?.unsubscribes.map((item) => {
            const date = item.unsubscribedAt || item.createdAt;
            return (
              <div key={`${item.email}-${date || "baja"}`} className="border-2 border-white/10 bg-black/30 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-white">{item.email}</span>
                  <span className="font-black uppercase text-red-200">{OPT_OUT_REASON_LABELS[item.reason || ""] || item.reason || "Sin motivo"}</span>
                </div>
                {item.feedback && <p className="mt-2 whitespace-pre-wrap font-semibold leading-relaxed text-white/60">&quot;{item.feedback}&quot;</p>}
                {date && <p className="mt-2 font-semibold text-white/30">{new Date(date).toLocaleString("es-CR")}</p>}
              </div>
            );
          })}
          {data && !data.unsubscribes.length && <p className="text-sm font-semibold text-white/40">Todavía no hay motivos de salida registrados.</p>}
        </div>
      </section>
    </div>
  );
}
