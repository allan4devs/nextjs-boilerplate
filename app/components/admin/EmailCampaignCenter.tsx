"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, Mail, RefreshCw, Send } from "lucide-react";

type AudienceId =
  | "imported"
  | "unregistered"
  | "never_registered"
  | "pending"
  | "never_opened"
  | "inactive"
  | "members"
  | "plan_week"
  | "plan_fortnight"
  | "plan_month"
  | "plan_quarter"
  | "plan_free_day"
  | "plan_senior"
  | "plan_other"
  | "no_plan"
  | "all";
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
  { id: "never_registered", label: "Nunca registrados", detail: "Contactos importados o con invitación pendiente que todavía no tienen perfil" },
  { id: "unregistered", label: "Importados sin registro", detail: "Contactos de la lista importada que no tienen perfil ni invitación pendiente" },
  { id: "pending", label: "Registro pendiente", detail: "Pidieron acceso, pero aún no confirmaron su correo" },
  { id: "never_opened", label: "Nunca entraron a la app", detail: "Socios registrados sin ninguna apertura de la app en el historial" },
  { id: "inactive", label: "Sin abrir app 14 d", detail: "Socios sin apertura registrada durante los últimos 14 días" },
  { id: "members", label: "Socios con correo", detail: "Todos los perfiles registrados con correo disponible" },
  { id: "plan_week", label: "Plan semanal", detail: "Socios cuyo tipo de plan registrado es semanal" },
  { id: "plan_fortnight", label: "Plan quincenal", detail: "Socios cuyo tipo de plan registrado es quincenal" },
  { id: "plan_month", label: "Plan mensual", detail: "Socios cuyo tipo de plan registrado es mensual" },
  { id: "plan_quarter", label: "Plan trimestral", detail: "Socios cuyo tipo de plan registrado es trimestral" },
  { id: "plan_free_day", label: "Primer día gratis", detail: "Socios que todavía conservan el plan de primer día gratis" },
  { id: "plan_senior", label: "Adultos mayores", detail: "Socios con plan o clases para adultos mayores" },
  { id: "no_plan", label: "Sin plan", detail: "Socios registrados que no tienen un tipo de plan asignado" },
  { id: "plan_other", label: "Otros planes", detail: "Socios con un plan que no coincide con las categorías principales" },
  { id: "imported", label: "Lista importada", detail: "Contactos activos pegados o cargados desde una hoja" },
  { id: "all", label: "Todos, sin duplicados", detail: "Importados, pendientes y socios consolidados" },
];
const AUDIENCE_LABELS = Object.fromEntries(AUDIENCES.map((item) => [item.id, item.label])) as Record<AudienceId, string>;

type CampaignTemplate = {
  subject: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaPath: string;
};

/** Plantillas listas por audiencia — tono tico, claro, sin regalar promesas falsas. */
const CAMPAIGN_TEMPLATES: Record<AudienceId, CampaignTemplate> = {
  never_registered: {
    subject: "Tu acceso a Xtreme Gym te está esperando",
    title: "Activá tu cuenta en 2 minutos",
    message:
      "Hola. En Xtreme Gym ya tenés ficha lista, pero todavía no activaste tu acceso a la app.\n\n" +
      "Con el enlace podés confirmar tu correo, revisar o corregir tu cédula y teléfono (el sistema viejo a veces los traía mal) y crear tu PIN.\n\n" +
      "Así reservás clases, ves tu carné digital y seguís tu racha. Si no pediste este correo, podés ignorarlo.",
    ctaLabel: "Activar mi acceso",
    ctaPath: "/app",
  },
  unregistered: {
    subject: "Volvé a Xtreme Gym — tu cupo te espera en Ciudad Quesada",
    title: "Te extrañamos en el piso",
    message:
      "Hola. Estamos armando de nuevo la comunidad de Xtreme Gym con app, reservas y planes claros.\n\n" +
      "Si entrenabas con nosotros o te dejaron en la lista del gym, este es el momento de registrarte con tu correo y volver sin complicaciones.\n\n" +
      "Primer día gratis si es tu primera vez, o elegí el plan que te calce. Estamos en Barrio San Pablo, Ciudad Quesada.",
    ctaLabel: "Quiero mi primer día gratis",
    ctaPath: "/primer-dia",
  },
  pending: {
    subject: "Te falta un paso: confirmá tu correo en Xtreme",
    title: "Tu registro quedó a medias",
    message:
      "Hola. Empezaste el registro en Xtreme Gym pero todavía no confirmaste el correo.\n\n" +
      "Sin ese paso no podés crear tu PIN ni entrar a la app. Abrí el enlace del correo anterior (si venció, volvé a registrarte desde el sitio) y terminá tu perfil con nombre, cédula y teléfono.\n\n" +
      "Si no fuiste vos, ignorá este mensaje.",
    ctaLabel: "Terminar mi registro",
    ctaPath: "/primer-dia",
  },
  never_opened: {
    subject: "Ya tenés cuenta en Xtreme — abrí la app",
    title: "Tu Member OS te está esperando",
    message:
      "Hola. Tu perfil en Xtreme Gym ya está creado, pero todavía no abriste la app.\n\n" +
      "Entrá con tu cédula y tu PIN. Ahí ves reservas, entrenos, rachas y tu carné digital. Si nunca creaste el PIN, usá el enlace de invitación o pedí ayuda en recepción.\n\n" +
      "Cualquier duda escribinos por WhatsApp o pasá por el gym.",
    ctaLabel: "Abrir mi app",
    ctaPath: "/app",
  },
  inactive: {
    subject: "Hace rato no te vemos en Xtreme — ¿volvemos?",
    title: "Tu racha te extraña",
    message:
      "Hola. Notamos que hace un tiempo no abrís la app ni marcás entrenos en Xtreme Gym.\n\n" +
      "No pasa nada: el piso sigue listo, las máquinas te esperan y podés retomar a tu ritmo. Entrá a la app, revisá tu plan o pasá a recepción si necesitás reactivar la membresía.\n\n" +
      "Cuando quieras, te recibimos en Ciudad Quesada. Pura vida.",
    ctaLabel: "Volver a la app",
    ctaPath: "/app",
  },
  members: {
    subject: "Novedades Xtreme Gym — tu app y el gym",
    title: "Para vos que ya sos de la casa",
    message:
      "Hola. Este correo es para socios con cuenta en Xtreme Gym.\n\n" +
      "Recordá: con la app reservás clases, marcás entrenos, cuidás tu racha y llevás tu carné digital. Si algo de tu perfil (correo o cédula) está mal, actualizalo en Perfil o pedí ayuda en recepción.\n\n" +
      "Gracias por entrenar con nosotros. Nos vemos en el piso.",
    ctaLabel: "Ir a mi app",
    ctaPath: "/app",
  },
  plan_week: {
    subject: "Tu plan semanal en Xtreme — sacale el jugo",
    title: "Semana de entreno, bien enfocada",
    message:
      "Hola. Tenés un plan semanal activo en Xtreme Gym: ideal para meterle con constancia sin enredos.\n\n" +
      "Tip: abrí la app al llegar, marcá el entreno y reservá la clase que te interese. Si querés pasar a quincenal o mensual, en recepción o en Precios te guiamos.\n\n" +
      "Que esta semana se sienta fuerte.",
    ctaLabel: "Ver mi app",
    ctaPath: "/app",
  },
  plan_fortnight: {
    subject: "Tu plan quincenal Xtreme — 15 días para rendir",
    title: "Quincena en marcha",
    message:
      "Hola. Vas con plan quincenal en Xtreme Gym: dos semanas para armar hábito y ver progreso.\n\n" +
      "Usá la app para registrar entrenos y no perder el hilo. Si se te acerca el vencimiento, renovamos en recepción o desde la web de precios.\n\n" +
      "Cualquier duda sobre horarios o zonas, escribinos.",
    ctaLabel: "Abrir la app",
    ctaPath: "/app",
  },
  plan_month: {
    subject: "Tu plan mensual Xtreme — el ritmo que funciona",
    title: "Mes de constancia",
    message:
      "Hola. Tu plan mensual en Xtreme Gym te da el mes completo para entrenar a tu ritmo: fuerza, cardio o funcional.\n\n" +
      "En la app ves tu racha, reservas y perfil. Si querés sumar un plan de trabajo con el coach o medir progreso, pedilo en recepción.\n\n" +
      "Gracias por confiar en nosotros este mes.",
    ctaLabel: "Ir a mi perfil",
    ctaPath: "/app",
  },
  plan_quarter: {
    subject: "Plan trimestral Xtreme — 3 meses de progresión",
    title: "Vas a largo plazo",
    message:
      "Hola. Con el plan trimestral en Xtreme Gym tenés tiempo de verdad para subir cargas, mejorar técnica y armar hábito.\n\n" +
      "Aprovechá la app para no perder entrenos y pedí en recepción una revisión de metas a mitad del trimestre si querés.\n\n" +
      "Estamos con vos en el piso. Pura vida.",
    ctaLabel: "Abrir Member OS",
    ctaPath: "/app",
  },
  plan_free_day: {
    subject: "Tu primer día en Xtreme — no lo dejes pasar",
    title: "El primer día gratis te espera",
    message:
      "Hola. Activaste el primer día gratis en Xtreme Gym. Cuando vengas, presentate en recepción con tu nombre; el equipo te orienta en las zonas.\n\n" +
      "Después podés elegir plan semanal, quincenal, mensual o trimestral sin presión. Mientras, abrí la app y conocé cómo se marcan los entrenos.\n\n" +
      "Te esperamos en Barrio San Pablo, Ciudad Quesada.",
    ctaLabel: "Cómo es el primer día",
    ctaPath: "/primer-dia",
  },
  plan_senior: {
    subject: "Clases de adultos mayores en Xtreme Gym",
    title: "Movimiento con acompañamiento",
    message:
      "Hola. Este mensaje es para quienes están en el plan o las clases de adultos mayores en Xtreme Gym.\n\n" +
      "Trabajamos fuerza suave, movilidad y constancia con acompañamiento. Si necesitás horarios, cupo o cambiar de clase, pasá por recepción o escribinos.\n\n" +
      "Cuidar el cuerpo también es entrenar. Te esperamos.",
    ctaLabel: "Ver adultos mayores",
    ctaPath: "/adultos-mayores",
  },
  plan_other: {
    subject: "Tu plan en Xtreme Gym — un recordatorio amable",
    title: "Seguimos con vos",
    message:
      "Hola. Tenés un plan especial o personalizado en Xtreme Gym.\n\n" +
      "Si tenés dudas de fechas, beneficios o cómo usar la app, recepción te ayuda al toque. También podés entrar a Precios para comparar opciones cuando te toque renovar.\n\n" +
      "Gracias por ser parte de Xtreme.",
    ctaLabel: "Ver precios y planes",
    ctaPath: "/precios",
  },
  no_plan: {
    subject: "Activá tu plan en Xtreme Gym cuando quieras",
    title: "Cuenta lista, plan pendiente",
    message:
      "Hola. Ya tenés perfil en Xtreme Gym, pero todavía no figura un plan activo.\n\n" +
      "Podés elegir en la web (primer día gratis, semanal, quincenal, mensual o trimestral) o en recepción el mismo día. Con plan activo aprovechás el piso y la app al máximo.\n\n" +
      "Cuando estés listo, te esperamos.",
    ctaLabel: "Elegir mi plan",
    ctaPath: "/precios",
  },
  imported: {
    subject: "Xtreme Gym te escribe — lista del gimnasio",
    title: "Seguimos en contacto",
    message:
      "Hola. Formás parte de la lista de contactos de Xtreme Gym en Ciudad Quesada.\n\n" +
      "Queremos invitarte a conocer (o reencontrarte con) el gym: máquinas, zona funcional, app de socios y planes claros. Si ya no querés recibir correos, usá el enlace de preferencias al pie de este mensaje.\n\n" +
      "Pura vida — el equipo Xtreme.",
    ctaLabel: "Conocer Xtreme Gym",
    ctaPath: "/",
  },
  all: {
    subject: "Xtreme Gym · un mensaje para la comunidad",
    title: "Comunidad Xtreme en Ciudad Quesada",
    message:
      "Hola. Este es un aviso general de Xtreme Gym para nuestra comunidad (socios, invitados y lista de contacto).\n\n" +
      "Si ya tenés app, entrá con tu cédula. Si todavía no, registrate o pedí invitación en recepción. Horarios, zonas y precios están en el sitio.\n\n" +
      "Gracias por leernos. Nos vemos en el piso.",
    ctaLabel: "Ir al sitio",
    ctaPath: "/",
  },
};

const DEFAULT_AUDIENCE: AudienceId = "never_registered";

function templateFor(audience: AudienceId): CampaignTemplate {
  return CAMPAIGN_TEMPLATES[audience] ?? CAMPAIGN_TEMPLATES.all;
}

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
  const [form, setForm] = useState(() => {
    const seed = templateFor(DEFAULT_AUDIENCE);
    return {
      audience: DEFAULT_AUDIENCE as AudienceId,
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
              {AUDIENCES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} ({data?.audiences[item.id] ?? 0})
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 border-2 border-white/10 bg-black/40 px-3 py-2 text-[11px] font-semibold leading-relaxed text-white/50">
            Plantilla activa: <span className="font-black text-lime-200">{AUDIENCE_LABELS[form.audience]}</span>
            {" · "}CTA → <span className="text-cyan-200">{activeTemplate.ctaPath}</span>
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
          <button
            type="button"
            disabled={!campaignConsent || !form.subject || !form.title || !form.message || Boolean(busy)}
            onClick={() => void queueCampaign()}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-lime-300 px-4 text-xs font-black uppercase text-black disabled:opacity-40"
          >
            {busy === "campaign" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Confirmar y poner en cola
          </button>
        </section>
      </div>

      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 sm:p-5"><h3 className="font-black uppercase">Campañas recientes</h3><div className="mt-3 space-y-2">{data?.campaigns.map((campaign) => <div key={campaign.id} className="grid gap-2 border-2 border-white/10 bg-black/30 p-3 text-xs sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="font-black text-white">{campaign.subject}</div><div className="mt-1 font-semibold text-white/40">{AUDIENCE_LABELS[campaign.audience] ?? campaign.audience} · {new Date(campaign.createdAt).toLocaleString("es-CR")}</div></div><div className="font-black uppercase text-lime-200">{campaign.status} · {campaign.sent}/{campaign.total} enviados{campaign.failed ? ` · ${campaign.failed} fallidos` : ""}{campaign.skipped ? ` · ${campaign.skipped} omitidos` : ""}</div></div>)}{data && !data.campaigns.length && <p className="text-sm font-semibold text-white/40">Todavía no hay campañas.</p>}</div></section>
    </div>
  );
}
