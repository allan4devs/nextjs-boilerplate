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
  | "claim_profile"
  | "claim_recovered"
  | "claim_native"
  | "excel_recovered"
  | "winback_90"
  | "winback_180"
  | "winback_365"
  | "possible_foreign"
  | "plan_week"
  | "plan_fortnight"
  | "plan_month"
  | "plan_quarter"
  | "plan_free_day"
  | "plan_senior"
  | "plan_other"
  | "no_plan"
  | "all";
type CampaignProcessSummary = {
  configured: boolean;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  campaignId?: string;
  error?: string;
  rounds?: number;
};

type CenterData = {
  emailConfigured?: boolean;
  emailConfigError?: string | null;
  audiences: Record<AudienceId, number> & { suppressed: number };
  diagnostics: {
    totalMembers: number;
    membersWithUsableEmail: number;
    membersWithoutUsableEmail: number;
    importedContactEmails: number;
    recoveredMembers: number;
    verifiedMembers: number;
    unverifiedMembers: number;
    quarantinedMembers: number;
    quarantinePlaceholder: number;
    quarantineShared: number;
    quarantineMismatch: number;
    unsafeIdentityMatches: number;
    quarantineWithPreviousEmail?: number;
    recoveredFromQuarantine?: number;
    recoveredFromExcel?: number;
  };
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
    lastProcessedAt?: string;
    lastError?: string;
  }>;
  unsubscribes: Array<{
    email: string;
    reason?: string;
    feedback?: string;
    unsubscribedAt?: string;
    createdAt?: string;
  }>;
};

type RecipientPreview = {
  email: string;
  name: string;
  source: string;
  emailVerified: boolean;
  duplicateProfiles: boolean;
  plan: string;
  nextBillingDate: string;
};

type MemberCoverage = {
  name: string;
  email: string;
  emailVerified: boolean;
  plan: string;
  rate: string;
  sourceStatus: string;
  quarantineReason: string;
  quarantinedEmail: string;
  recoveryMethod: string;
  recoveredAt: string;
  emailSafe: boolean;
  emailNameScore: number;
};

const QUARANTINE_REASON_LABELS: Record<string, string> = {
  placeholder: "placeholder o correo ficticio",
  shared_across_members: "compartido entre varias fichas",
  aggressive_name_mismatch: "nombre y correo no coinciden",
  name_email_mismatch: "nombre y correo no coinciden",
  shared_without_clear_owner: "sin dueño claro",
};

const AUDIENCES: Array<{ id: AudienceId; label: string; detail: string; group: string }> = [
  {
    id: "claim_recovered",
    label: "Activar · Excel / cuarentena",
    detail:
      "Sin verificar, correo alineado por nombre y apellidos del Excel o re-sacado de cuarentena. Mejor lista para la campaña de activación masiva.",
    group: "Activación",
  },
  {
    id: "claim_native",
    label: "Activar · correo nativo",
    detail: "Sin verificar con correo que ya venía en la ficha (no pasó por el script de recovery).",
    group: "Activación",
  },
  {
    id: "claim_profile",
    label: "Activar · todos sin verificar",
    detail: "Unión de Excel-alineados + nativos. Ideal si querés un solo envío de claim.",
    group: "Activación",
  },
  {
    id: "excel_recovered",
    label: "Alineados del Excel",
    detail: "Todas las fichas con emailRecovery (script). Pueden estar verificadas o no.",
    group: "Activación",
  },
  {
    id: "winback_90",
    label: "Win-back 90–179 d",
    detail: "Membresía vencida hace 90–179 días, con correo único en ficha.",
    group: "Win-back",
  },
  {
    id: "winback_180",
    label: "Win-back 180–364 d",
    detail: "Vencidos hace 6–12 meses con correo usable.",
    group: "Win-back",
  },
  {
    id: "winback_365",
    label: "Win-back +1 año",
    detail: "Vencidos hace más de un año.",
    group: "Win-back",
  },
  {
    id: "possible_foreign",
    label: "Posibles extranjeros",
    detail: "Señal blanda (DIMEX / doc 8–12 dígitos / nombres). Activación por correo.",
    group: "Segmentos",
  },
  {
    id: "never_registered",
    label: "Nunca registrados",
    detail: "Contactos o invitaciones pendientes sin perfil verificado.",
    group: "Segmentos",
  },
  {
    id: "unregistered",
    label: "Importados sin registro",
    detail: "Lista importada sin perfil ni invitación pendiente.",
    group: "Segmentos",
  },
  {
    id: "pending",
    label: "Registro pendiente",
    detail: "Pidieron acceso y aún no confirmaron el correo.",
    group: "Segmentos",
  },
  {
    id: "never_opened",
    label: "Nunca entraron a la app",
    detail: "Verificados sin ninguna apertura de la app.",
    group: "Segmentos",
  },
  {
    id: "inactive",
    label: "Sin abrir app 14 d",
    detail: "Verificados sin apertura en los últimos 14 días.",
    group: "Segmentos",
  },
  {
    id: "members",
    label: "Socios verificados",
    detail: "Perfiles con correo ya verificado.",
    group: "Segmentos",
  },
  {
    id: "plan_week",
    label: "Plan semanal",
    detail: "Correos únicos con tarifa semanal (x Tarifa del Excel).",
    group: "Planes",
  },
  {
    id: "plan_fortnight",
    label: "Plan quincenal",
    detail: "Correos únicos con tarifa quincenal.",
    group: "Planes",
  },
  {
    id: "plan_month",
    label: "Plan mensual",
    detail: "Correos únicos con tarifa mensual.",
    group: "Planes",
  },
  {
    id: "plan_quarter",
    label: "Plan trimestral",
    detail: "Correos únicos con plan trimestral.",
    group: "Planes",
  },
  {
    id: "plan_free_day",
    label: "Diario / primer día",
    detail: "Tarifa diaria o plan de primer día gratis.",
    group: "Planes",
  },
  {
    id: "plan_senior",
    label: "Adultos mayores",
    detail: "Plan o clases de adultos mayores con correo usable.",
    group: "Planes",
  },
  {
    id: "no_plan",
    label: "Sin plan",
    detail: "Correos usables sin tipo de plan ni tarifa.",
    group: "Planes",
  },
  {
    id: "plan_other",
    label: "Otros planes",
    detail: "Planes especiales o matrícula fuera de las categorías principales.",
    group: "Planes",
  },
  {
    id: "imported",
    label: "Lista importada",
    detail: "Contactos activos de hoja / import.",
    group: "Listas",
  },
  {
    id: "all",
    label: "Todos, sin duplicados",
    detail: "Importados, pendientes, claim y socios consolidados.",
    group: "Listas",
  },
];
const AUDIENCE_LABELS = Object.fromEntries(AUDIENCES.map((item) => [item.id, item.label])) as Record<AudienceId, string>;
const OPT_OUT_REASON_LABELS: Record<string, string> = {
  too_many: "Recibe demasiados correos",
  not_relevant: "Contenido no relevante",
  prefer_app: "Prefiere usar la app",
  no_longer_member: "Ya no entrena en Xtreme",
  price: "Precio",
  schedule: "Horarios",
  moved_away: "Se mudó o vive lejos",
  health: "Salud o situación personal",
  bad_experience: "Mala experiencia",
  temporary_break: "Pausa temporal",
  other: "Otro motivo",
  one_click: "Baja directa desde el correo",
};

type CampaignTemplate = {
  subject: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaPath: string;
};

/** Plantillas listas por audiencia — tono tico, claro y positivo. */
const CLAIM_BASE: CampaignTemplate = {
  subject: "Activá tu plan en Xtreme Gym cuando querás",
  title: "Tu cuenta ya está lista en Xtreme Gym Ciudad Quesada",
  message:
    "Hola. Ya tenés un perfil en Xtreme Gym, pero tu correo todavía no está verificado y queremos que revisés los datos que tenemos asociados.\n\n" +
    "Cuando estés listo, activá tu cuenta y elegí el plan que mejor te funcione. Vas a poder disfrutar de más beneficios Xtreme:\n" +
    "• App de socios\n" +
    "• Reservas de clases\n" +
    "• Niveles, entrenamientos y máquinas\n" +
    "• Seguimiento de salud y progreso\n" +
    "• Promociones y comunidad\n\n" +
    "El enlace es personal y vence en 72 horas. Pura vida — equipo Xtreme Gym, Ciudad Quesada.",
  ctaLabel: "Revisar datos y elegir mi plan",
  ctaPath: "/registro/confirmar",
};

const CAMPAIGN_TEMPLATES: Record<AudienceId, CampaignTemplate> = {
  claim_profile: CLAIM_BASE,
  claim_recovered: {
    ...CLAIM_BASE,
    subject: "Confirmá tus datos en Xtreme Gym",
    title: "Encontramos tu ficha — activá la app",
    message:
      "Hola. Según la lista del gym, este correo te pertenece y ya teníamos tu nombre en Xtreme Gym.\n\n" +
      "Tocá el enlace personal: vas a ver nombre, teléfono y cédula para confirmarlos o corregirlos, y creás tu PIN de 4 dígitos.\n\n" +
      "Así dejás la cuenta lista para reservar clases y usar la app.\n\n" +
      "El enlace vence en 72 horas. Pura vida — Xtreme Gym, Ciudad Quesada.",
    ctaLabel: "Confirmar mis datos",
  },
  claim_native: {
    ...CLAIM_BASE,
    subject: "Activá tu correo en Xtreme Gym",
    title: "Falta un paso para entrar a la app",
    message:
      "Hola. Tu correo ya está en la ficha de Xtreme Gym, pero todavía no lo verificaste.\n\n" +
      "Con el enlace de este mensaje completás o corregís tus datos y creás tu PIN.\n\n" +
      "Pura vida — equipo Xtreme.",
  },
  excel_recovered: {
    ...CLAIM_BASE,
    subject: "Tu correo en Xtreme Gym",
    title: "Actualizamos el contacto de tu ficha",
    message:
      "Hola. Asociamos este correo a tu ficha en Xtreme Gym a partir de la lista del gimnasio (nombre y apellidos).\n\n" +
      "Si todavía no activaste la app, usá el enlace para revisar tus datos y crear tu PIN. Si ya tenés acceso, podés entrar directo a la app.\n\n" +
      "Pura vida — Xtreme Gym, Ciudad Quesada.",
  },
  winback_90: {
    subject: "Te extrañamos en Xtreme — volvé cuando quieras",
    title: "Tu membresía venció hace poco",
    message:
      "Hola. Hace unos meses se te venció el plan en Xtreme Gym y nos encantaría verte de nuevo en el piso.\n\n" +
      "Activá la app con este correo o pasá a recepción / Precios para reactivar tu plan.\n\n" +
      "Ciudad Quesada · Barrio San Pablo. Pura vida.",
    ctaLabel: "Ver planes y volver",
    ctaPath: "/precios",
  },
  winback_180: {
    subject: "¿Volvemos a entrenar en Xtreme Gym?",
    title: "Medio año sin verte en el gym",
    message:
      "Hola. Hace un tiempo se te venció la membresía en Xtreme Gym.\n\n" +
      "El gym sigue con fuerza, máquinas y app de socios. Si querés regresar, activá tu acceso y elegí plan de nuevo.\n\n" +
      "Te esperamos en Ciudad Quesada.",
    ctaLabel: "Quiero volver",
    ctaPath: "/precios",
  },
  winback_365: {
    subject: "Xtreme Gym te recuerda",
    title: "Siempre hay un buen día para volver",
    message:
      "Hola. Hace un buen rato que tu plan en Xtreme Gym no está activo. Si en algún momento entrenaste con nosotros, la puerta sigue abierta.\n\n" +
      "Escribinos, pasá a recepción o mirá los planes. Te esperamos en Ciudad Quesada.",
    ctaLabel: "Ver Xtreme de nuevo",
    ctaPath: "/",
  },
  possible_foreign: {
    subject: "Activá tu acceso a Xtreme Gym",
    title: "Tu cuenta con tu correo",
    message:
      "Hola. En Xtreme Gym podés activar tu acceso con este correo, sin importar si usás cédula nacional u otro documento.\n\n" +
      "Abrí el enlace de invitación, confirmá tus datos y creá tu PIN. Si necesitás ayuda en recepción, con gusto te atendemos.",
    ctaLabel: "Ir a la app",
    ctaPath: "/app",
  },
  never_registered: {
    subject: "Tu acceso a Xtreme Gym te está esperando",
    title: "Activá tu cuenta",
    message:
      "Hola. En Xtreme Gym ya tenés contacto, pero todavía no activaste el acceso a la app.\n\n" +
      "Tocá el botón de este correo: vas a ver los datos asociados a vos (si los hay), podés corregirlos y crear tu PIN.",
    ctaLabel: "Activar mi acceso",
    ctaPath: "/registro/confirmar",
  },
  unregistered: {
    subject: "Volvé a Xtreme Gym — Ciudad Quesada",
    title: "Te extrañamos en el piso",
    message:
      "Hola. Estamos armando de nuevo la comunidad de Xtreme Gym con app, reservas y planes claros.\n\n" +
      "Si entrenabas con nosotros, tocá el botón, revisá tus datos y activá tu acceso.\n\n" +
      "Barrio San Pablo, Ciudad Quesada.",
    ctaLabel: "Activar mi acceso",
    ctaPath: "/registro/confirmar",
  },
  pending: {
    subject: "Te falta un paso: confirmá tu correo en Xtreme",
    title: "Terminá tu registro",
    message:
      "Hola. Empezaste el registro en Xtreme Gym y solo falta confirmar el correo.\n\n" +
      "Tocá el botón de este mensaje, revisá tus datos y creá tu PIN.\n\n" +
      "¡Nos vemos en el gym!",
    ctaLabel: "Terminar mi registro",
    ctaPath: "/registro/confirmar",
  },
  never_opened: {
    subject: "Ya tenés cuenta en Xtreme — abrí la app",
    title: "Tu app te está esperando",
    message:
      "Hola. Tu correo ya está listo en Xtreme Gym, pero todavía no abriste la app.\n\n" +
      "Entrá con tu cédula y tu PIN. Si todavía no creaste el PIN, pedí el código al correo desde la app.\n\n" +
      "Cualquier duda, WhatsApp o recepción. Pura vida.",
    ctaLabel: "Abrir mi app",
    ctaPath: "/app",
  },
  inactive: {
    subject: "Hace rato no te vemos en Xtreme — ¿volvemos?",
    title: "Tu racha te extraña",
    message:
      "Hola. Hace un tiempo no abrís la app ni marcás entrenos en Xtreme Gym.\n\n" +
      "El piso sigue listo. Entrá a la app, revisá tu plan o pasá a recepción.\n\n" +
      "Cuando quieras, te recibimos en Ciudad Quesada. Pura vida.",
    ctaLabel: "Volver a la app",
    ctaPath: "/app",
  },
  members: {
    subject: "Novedades Xtreme Gym",
    title: "Para vos que ya sos de la casa",
    message:
      "Hola. Este correo es para socios con acceso activo en Xtreme Gym.\n\n" +
      "Con la app reservás clases, marcás entrenos y llevás tu carné digital.\n\n" +
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

const DEFAULT_AUDIENCE: AudienceId = "claim_recovered";

function templateFor(audience: AudienceId): CampaignTemplate {
  return CAMPAIGN_TEMPLATES[audience] ?? CAMPAIGN_TEMPLATES.claim_recovered;
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
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [recipients, setRecipients] = useState<RecipientPreview[]>([]);
  const [recipientsBusy, setRecipientsBusy] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [coverage, setCoverage] = useState<MemberCoverage[] | null>(null);
  const [coverageBusy, setCoverageBusy] = useState(false);
  const [coverageSearch, setCoverageSearch] = useState("");
  const [coverageFilter, setCoverageFilter] = useState<"all" | "sendable" | "missing" | "quarantined">("all");
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
  }, []);

  useEffect(() => { void load(); }, [load]);

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
  }, [form.audience]);

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
        process?: CampaignProcessSummary;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "No se pudo crear la campaña.");
      const process = json.process;
      if (process && !process.configured) {
        setError(
          `Campaña en cola (${json.recipients} destinos) pero el servidor no puede enviar: ${process.error || "revisá EMAIL_SENDING_ENABLED / Resend"}.`,
        );
      } else if (process && process.processed > 0) {
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
      } else if (!process.processed) {
        setNotice("No había correos pendientes en la cola.");
      } else {
        setNotice(
          `Lote procesado: ${process.sent} enviados · ${process.failed} fallidos · ${process.skipped} omitidos (${process.processed} revisados${process.rounds ? `, ${process.rounds} rondas` : ""}). Si quedan pendientes, volvé a tocar «Procesar cola».`,
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
            Importá contactos, armá audiencias y enviá en lotes. Las bajas de marketing se
            excluyen solas; recibos y códigos de cuenta siempre se entregan.
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
            [data?.diagnostics.recoveredMembers, "Fichas recuperadas", "Asignación segura y auditada"],
            [data?.diagnostics.recoveredFromExcel, "Desde Excel", "Alineados por nombre/apellidos"],
            [data?.diagnostics.recoveredFromQuarantine, "Desde cuarentena", "Re-sacados con match de nombre"],
            [data?.diagnostics.membersWithoutUsableEmail, "Sin correo seguro", "No se pueden incluir en un envío"],
            [(data?.diagnostics.quarantinedMembers ?? 0) + (data?.diagnostics.unsafeIdentityMatches ?? 0), "No seguros", "Aislados; nunca entran en campañas"],
          ].map(([value, label, detail]) => (
            <div key={String(label)} className="border-2 border-white/10 bg-black/40 p-3">
              <div className="text-2xl font-black text-cyan-100">{value ?? "—"}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-white">{label}</div>
              <div className="mt-1 text-[10px] font-semibold text-white/35">{detail}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] font-semibold text-white/45">
          No seguros: {data?.diagnostics.quarantinedMembers ?? "—"} en cuarentena · {data?.diagnostics.quarantineWithPreviousEmail ?? "—"} con correo anterior guardado · {data?.diagnostics.unsafeIdentityMatches ?? "—"} nombre/correo dudoso · {data?.diagnostics.quarantineShared ?? "—"} compartidos · {data?.diagnostics.quarantinePlaceholder ?? "—"} placeholders. Corré el script de recovery para realinear.
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

      {(["Activación", "Win-back", "Segmentos", "Planes", "Listas"] as const).map((group) => {
        const items = AUDIENCES.filter((item) => item.group === group);
        if (!items.length) return null;
        return (
          <section key={group} className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white/45">{group}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`border-2 bg-[#0c0c0c] p-4 ${
                    group === "Activación"
                      ? "border-lime-300/35"
                      : "border-white/15"
                  }`}
                >
                  <div className="text-2xl font-black text-lime-200">
                    {data?.audiences[item.id] ?? "—"}
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
        Bajas/supresiones protegidas: {data?.audiences.suppressed ?? "—"} · Preferí «Activar · Excel /
        cuarentena» para la campaña masiva de claim.
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
            <h3 className="font-black uppercase">Campañas recientes</h3>
            <p className="mt-2 max-w-2xl text-xs font-semibold text-white/45">
              El envío va en lotes (cron cada ~5 min). Si ves «queued» o «processing» sin avanzar, usá «Procesar cola ahora».
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
            return (
              <div
                key={campaign.id}
                className="grid gap-2 border-2 border-white/10 bg-black/30 p-3 text-xs sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="font-black text-white">{campaign.subject}</div>
                  <div className="mt-1 font-semibold text-white/40">
                    {AUDIENCE_LABELS[campaign.audience] ?? campaign.audience} ·{" "}
                    {new Date(campaign.createdAt).toLocaleString("es-CR")}
                    {campaign.lastProcessedAt
                      ? ` · último lote ${new Date(campaign.lastProcessedAt).toLocaleString("es-CR")}`
                      : ""}
                  </div>
                  {campaign.lastError ? (
                    <div className="mt-1 font-semibold text-amber-200/90">{campaign.lastError}</div>
                  ) : null}
                </div>
                <div className="font-black uppercase text-lime-200">
                  {campaign.status} · {campaign.sent}/{campaign.total} enviados
                  {campaign.failed ? ` · ${campaign.failed} fallidos` : ""}
                  {campaign.skipped ? ` · ${campaign.skipped} omitidos` : ""}
                  {remaining > 0 && campaign.status !== "completed" ? ` · ${remaining} pendientes` : ""}
                </div>
              </div>
            );
          })}
          {data && !data.campaigns.length && (
            <p className="text-sm font-semibold text-white/40">Todavía no hay campañas.</p>
          )}
        </div>
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
                {item.feedback && <p className="mt-2 whitespace-pre-wrap font-semibold leading-relaxed text-white/60">“{item.feedback}”</p>}
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
