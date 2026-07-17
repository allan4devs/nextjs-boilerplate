"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, Mail, RefreshCw, Send } from "lucide-react";

type AudienceId = "imported" | "unregistered" | "pending" | "inactive" | "members" | "all";
type CenterData = {
  audiences: Record<AudienceId, number> & { suppressed: number };
  campaigns: Array<{
    id: string;
    subject: string;
    audience: AudienceId;
    status: "queued" | "processing" | "completed";
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    createdAt: string;
  }>;
};

const AUDIENCES: Array<{ id: AudienceId; label: string; detail: string }> = [
  { id: "unregistered", label: "Sin registro", detail: "Importados que todavía no tienen perfil ni invitación pendiente" },
  { id: "pending", label: "Registro pendiente", detail: "Pidieron acceso, pero aún no confirmaron su correo" },
  { id: "inactive", label: "Sin abrir app 14 d", detail: "Socios sin apertura registrada durante los últimos 14 días" },
  { id: "members", label: "Socios con correo", detail: "Todos los perfiles registrados con correo disponible" },
  { id: "imported", label: "Lista importada", detail: "Contactos activos pegados o cargados desde una hoja" },
  { id: "all", label: "Todos, sin duplicados", detail: "Importados, pendientes y socios consolidados" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitRow(line: string, delimiter: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(value.trim());
      value = "";
    } else value += char;
  }
  cells.push(value.trim());
  return cells;
}

function parseSpreadsheet(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const delimiter = text.includes("\t") ? "\t" : text.includes(";") ? ";" : ",";
  const rows = lines.map((line) => splitRow(line, delimiter));
  const first = (rows[0] || []).map((cell) => cell.toLowerCase());
  const header = first.some((cell) => /correo|email|nombre|name|telefono|teléfono|phone/.test(cell));
  const emailIndex = header ? first.findIndex((cell) => /correo|email/.test(cell)) : -1;
  const nameIndex = header ? first.findIndex((cell) => /nombre|name/.test(cell)) : -1;
  const phoneIndex = header ? first.findIndex((cell) => /telefono|teléfono|phone|celular/.test(cell)) : -1;
  const contacts = (header ? rows.slice(1) : rows).map((cells) => {
    const dynamicEmailIndex = emailIndex >= 0 ? emailIndex : cells.findIndex((cell) => EMAIL_RE.test(cell.trim().toLowerCase()));
    const email = cells[dynamicEmailIndex]?.trim().toLowerCase() || "";
    const other = cells.filter((_, index) => index !== dynamicEmailIndex);
    return {
      email,
      name: nameIndex >= 0 ? cells[nameIndex] || "" : other[0] || "",
      phone: phoneIndex >= 0 ? cells[phoneIndex] || "" : other.find((cell) => /\d{7,}/.test(cell.replace(/\D/g, ""))) || "",
    };
  });
  return contacts.filter((row) => row.email || row.name || row.phone);
}

export default function EmailCampaignCenter() {
  const [data, setData] = useState<CenterData | null>(null);
  const [sheet, setSheet] = useState("");
  const [importConsent, setImportConsent] = useState(false);
  const [campaignConsent, setCampaignConsent] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    audience: "unregistered" as AudienceId,
    subject: "",
    title: "",
    message: "",
    ctaLabel: "Conocer Xtreme Gym",
    ctaPath: "/primer-dia",
  });
  const parsed = useMemo(() => parseSpreadsheet(sheet), [sheet]);
  const validCount = useMemo(() => new Set(parsed.filter((row) => EMAIL_RE.test(row.email)).map((row) => row.email)).size, [parsed]);

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
  }, []);

  useEffect(() => { void load(); }, [load]);

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
      const json = (await response.json()) as { recipients?: number; error?: string };
      if (!response.ok) throw new Error(json.error || "No se pudo crear la campaña.");
      setNotice(`Campaña en cola para ${json.recipients} destinatarios. Se enviará en lotes automáticos.`);
      setCampaignConsent(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo crear la campaña."); }
    finally { setBusy(""); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-[3px] border-lime-300/35 bg-lime-300/[0.06] p-4 sm:p-5">
        <div><div className="flex items-center gap-2 text-lime-200"><Mail className="h-5 w-5" /><h2 className="font-black uppercase">Centro de correos</h2></div><p className="mt-2 max-w-3xl text-sm font-semibold text-white/55">Importá contactos, armá audiencias sin duplicados y enviá en lotes. Las bajas se excluyen automáticamente.</p></div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 border-2 border-white/20 px-3 text-xs font-black uppercase"><RefreshCw className={`h-4 w-4 ${busy === "load" ? "animate-spin" : ""}`} />Actualizar</button>
      </div>

      {(notice || error) && <div className={`border-[3px] px-4 py-3 text-sm font-bold ${error ? "border-red-400/50 bg-red-500/10 text-red-200" : "border-lime-300/50 bg-lime-300/10 text-lime-100"}`}>{error || notice}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AUDIENCES.map((item) => <div key={item.id} className="border-2 border-white/15 bg-[#0c0c0c] p-4"><div className="text-2xl font-black text-lime-200">{data?.audiences[item.id] ?? "—"}</div><div className="mt-1 text-xs font-black uppercase">{item.label}</div><p className="mt-2 text-xs font-semibold leading-relaxed text-white/40">{item.detail}</p></div>)}
      </div>
      <p className="text-xs font-bold text-white/40">Bajas/supresiones protegidas: {data?.audiences.suppressed ?? "—"}</p>

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
          <div className="flex items-center gap-2"><Send className="h-5 w-5 text-lime-300" /><h3 className="font-black uppercase">Nueva campaña</h3></div>
          <label className="mt-4 block text-[10px] font-black uppercase tracking-widest text-white/45">Audiencia<select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as AudienceId })} className="mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3 text-sm font-bold text-white">{AUDIENCES.map((item) => <option key={item.id} value={item.id}>{item.label} ({data?.audiences[item.id] ?? 0})</option>)}</select></label>
          {[{ key: "subject", label: "Asunto", placeholder: "Tu primer entreno te espera" }, { key: "title", label: "Título", placeholder: "Empezá con Xtreme" }].map((field) => <label key={field.key} className="mt-3 block text-[10px] font-black uppercase tracking-widest text-white/45">{field.label}<input value={form[field.key as "subject" | "title"]} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} placeholder={field.placeholder} className="mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3 text-sm font-bold text-white outline-none focus:border-lime-300" /></label>)}
          <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-white/45">Mensaje<textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={5} className="mt-1 w-full border-2 border-white/20 bg-black p-3 text-sm font-semibold text-white outline-none focus:border-lime-300" /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-black uppercase tracking-widest text-white/45">Texto del botón<input value={form.ctaLabel} onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })} className="mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3 text-sm text-white" /></label><label className="text-[10px] font-black uppercase tracking-widest text-white/45">Ruta interna<input value={form.ctaPath} onChange={(event) => setForm({ ...form, ctaPath: event.target.value })} className="mt-1 min-h-11 w-full border-2 border-white/20 bg-black px-3 text-sm text-white" /></label></div>
          <label className="mt-4 flex items-start gap-3 text-xs font-semibold leading-relaxed text-white/60"><input type="checkbox" checked={campaignConsent} onChange={(event) => setCampaignConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-lime-300" /><span>Revisé asunto, contenido, audiencia y permiso. Entiendo que esto crea una campaña real en cola.</span></label>
          <button type="button" disabled={!campaignConsent || !form.subject || !form.title || !form.message || Boolean(busy)} onClick={() => void queueCampaign()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-lime-300 px-4 text-xs font-black uppercase text-black disabled:opacity-40">{busy === "campaign" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Confirmar y poner en cola</button>
        </section>
      </div>

      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5"><h3 className="font-black uppercase">Campañas recientes</h3><div className="mt-3 space-y-2">{data?.campaigns.map((campaign) => <div key={campaign.id} className="grid gap-2 border-2 border-white/10 bg-black/30 p-3 text-xs sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="font-black text-white">{campaign.subject}</div><div className="mt-1 font-semibold text-white/40">{campaign.audience} · {new Date(campaign.createdAt).toLocaleString("es-CR")}</div></div><div className="font-black uppercase text-lime-200">{campaign.status} · {campaign.sent}/{campaign.total} enviados{campaign.failed ? ` · ${campaign.failed} fallidos` : ""}{campaign.skipped ? ` · ${campaign.skipped} omitidos` : ""}</div></div>)}{data && !data.campaigns.length && <p className="text-sm font-semibold text-white/40">Todavía no hay campañas.</p>}</div></section>
    </div>
  );
}
