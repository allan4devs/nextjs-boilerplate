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
  | "claim_active_plan"
  | "invite_recoverable"
  | "unverified_not_sent"
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
  | "all"
  | "sent_not_registered"
  | "opened_not_registered"
  | "registered_never_app"
  | "registered_inactive"
  | "active_app"
  | "plan_expiring"
  | "plan_expired_recent"
  | "free_day_convert";
type CampaignProcessSummary = {
  configured: boolean;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  campaignId?: string;
  error?: string;
  rounds?: number;
  reclaimed?: number;
  alreadySentSkipped?: number;
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
    inviteRecoverableTotal?: number;
    inviteRecoverableEmails?: number;
    unverifiedNotSentEmails?: number;
    alreadyCampaignSentEmails?: number;
    remainingActivationEmails?: number;
    sentNotRegisteredEmails?: number;
    openedNotRegisteredEmails?: number;
    activeAppEmails?: number;
    planExpiringEmails?: number;
  };
  campaigns: Array<{
    id: string;
    subject: string;
    audience: AudienceId;
    status: "queued" | "processing" | "completed" | "cancelled";
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    createdAt: string;
    lastProcessedAt?: string;
    lastError?: string;
    tracking?: {
      total: number;
      sent: number;
      opened: number;
      registered: number;
      notOpened: number;
      notRegistered: number;
      failed: number;
      skipped: number;
      queued: number;
    };
  }>;
  unsubscribes: Array<{
    email: string;
    reason?: string;
    feedback?: string;
    unsubscribedAt?: string;
    createdAt?: string;
  }>;
};

type DeliveryTrackingRow = {
  deliveryKey: string;
  campaignId: string;
  email: string;
  name: string;
  status: string;
  deliveryStatus: string;
  sentAt: string | null;
  openedAt: string | null;
  registeredAt: string | null;
  lastReminderAt: string | null;
  reminderCount: number;
  emailVerified: boolean;
  canResend: boolean;
  error?: string;
};

type CampaignTrackingPayload = {
  campaignId: string;
  stats: {
    total: number;
    sent: number;
    opened: number;
    registered: number;
    notOpened: number;
    notRegistered: number;
    failed: number;
    skipped: number;
    queued: number;
  };
  rows: DeliveryTrackingRow[];
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
  // ── Re-engagement ──
  {
    id: "sent_not_registered",
    label: "★ Enviados · sin registro",
    detail:
      "Ya recibieron invitación/magic link y todavía no se registraron. Incluye envíos anteriores para un 2.º o 3.er aviso.",
    group: "Re-engagement",
  },
  {
    id: "opened_not_registered",
    label: "★ Abrieron · sin registro",
    detail:
      "Hicieron click en el enlace de campaña y no terminaron el registro. Permanecen disponibles para seguimiento.",
    group: "Re-engagement",
  },
  {
    id: "registered_never_app",
    label: "★ Registrados · nunca app",
    detail:
      "Correo verificado y PIN listo, pero nunca abrieron la app. Empujar el primer uso.",
    group: "Re-engagement",
  },
  {
    id: "registered_inactive",
    label: "★ Registrados · inactivos 14 d",
    detail:
      "Verificados que sí entraron alguna vez pero no abren la app hace 14+ días. Traer de vuelta.",
    group: "Re-engagement",
  },
  {
    id: "active_app",
    label: "★ Activos en la app",
    detail:
      "Verificados con apertura de app en los últimos 14 días. Motivar más entrenos, reservas y racha.",
    group: "Re-engagement",
  },
  {
    id: "plan_expiring",
    label: "★ Plan por vencer (1–7 d)",
    detail:
      "Plan de pago vigente que vence en 0–7 días. Recordatorio de renovación amable.",
    group: "Re-engagement",
  },
  {
    id: "plan_expired_recent",
    label: "★ Plan vencido 1–89 d",
    detail:
      "Membresía vencida hace menos de 90 días. Win-back corto.",
    group: "Re-engagement",
  },
  {
    id: "free_day_convert",
    label: "★ Primer día → plan",
    detail:
      "Primer día gratis / pase diario. Invitar a elegir plan semanal, quincenal o mensual.",
    group: "Re-engagement",
  },
  // ── Primer contacto ──
  {
    id: "claim_recovered",
    label: "Activar · Excel / cuarentena",
    detail:
      "Sin verificar y sin plan activo, con correo alineado por Excel/cuarentena. Incluye a quien ya recibió o abrió el enlace.",
    group: "Activación",
  },
  {
    id: "claim_native",
    label: "Activar · correo nativo",
    detail:
      "Sin verificar y sin plan, con correo nativo. Incluye envíos y clics anteriores.",
    group: "Activación",
  },
  {
    id: "claim_profile",
    label: "Activar · todos sin plan",
    detail:
      "Pendientes de activar sin plan (Excel + nativos), aunque ya recibieran o abrieran el magic link.",
    group: "Activación",
  },
  {
    id: "claim_active_plan",
    label: "Confirmar · ya con plan",
    detail:
      "Pendientes de confirmar: sin verificar con plan vigente. Incluye a quien ya recibió el enlace.",
    group: "Confirmación",
  },
  {
    id: "invite_recoverable",
    label: "Invitar · sin registro",
    detail:
      "Correos recuperables sin verificar. Solo se excluyen quienes ya completaron el registro.",
    group: "Invitación masiva",
  },
  {
    id: "unverified_not_sent",
    label: "No verificados",
    detail:
      "Sin verificar, incluso si ya recibieron el correo o hicieron click sin terminar el registro.",
    group: "Invitación masiva",
  },
  {
    id: "excel_recovered",
    label: "Alineados del Excel",
    detail:
      "Fichas con emailRecovery, sin excluirlas por campañas enviadas anteriormente.",
    group: "Activación",
  },
  {
    id: "winback_90",
    label: "Win-back 90-179 d",
    detail: "Vencidos 90-179 d, aunque ya hayan recibido una campaña.",
    group: "Win-back",
  },
  {
    id: "winback_180",
    label: "Win-back 180-364 d",
    detail: "Vencidos 6-12 meses, aunque ya hayan recibido una campaña.",
    group: "Win-back",
  },
  {
    id: "winback_365",
    label: "Win-back +1 año",
    detail: "Vencidos +1 año, aunque ya hayan recibido una campaña.",
    group: "Win-back",
  },
  {
    id: "possible_foreign",
    label: "Posibles extranjeros",
    detail: "Señal blanda (DIMEX / doc / nombres), sin excluir envíos anteriores.",
    group: "Segmentos",
  },
  {
    id: "never_registered",
    label: "Nunca registrados",
    detail: "Sin perfil verificado, aunque ya se les haya enviado la invitación.",
    group: "Segmentos",
  },
  {
    id: "unregistered",
    label: "Importados sin registro",
    detail: "Importados sin perfil verificado; un envío previo no los excluye.",
    group: "Segmentos",
  },
  {
    id: "pending",
    label: "Registro pendiente",
    detail: "Pendientes de confirmar correo, incluidos quienes ya abrieron el enlace.",
    group: "Segmentos",
  },
  {
    id: "never_opened",
    label: "Nunca entraron a la app",
    detail: "Verificados sin apertura de app, sin excluir campañas anteriores.",
    group: "Segmentos",
  },
  {
    id: "inactive",
    label: "Sin abrir app 14 d",
    detail: "Verificados sin apertura en 14 d, sin excluir campañas anteriores.",
    group: "Segmentos",
  },
  {
    id: "members",
    label: "Socios verificados",
    detail: "Socios verificados, aunque ya hayan recibido campañas.",
    group: "Segmentos",
  },
  {
    id: "plan_week",
    label: "Plan semanal",
    detail: "Tarifa semanal, sin excluir campañas anteriores.",
    group: "Planes",
  },
  {
    id: "plan_fortnight",
    label: "Plan quincenal",
    detail: "Tarifa quincenal pendientes de campaña.",
    group: "Planes",
  },
  {
    id: "plan_month",
    label: "Plan mensual",
    detail: "Tarifa mensual pendientes de campaña.",
    group: "Planes",
  },
  {
    id: "plan_quarter",
    label: "Plan trimestral",
    detail: "Plan trimestral pendientes de campaña.",
    group: "Planes",
  },
  {
    id: "plan_free_day",
    label: "Diario / primer día",
    detail: "Diario o primer día sin campaña enviada aún.",
    group: "Planes",
  },
  {
    id: "plan_senior",
    label: "Adultos mayores",
    detail: "Adultos mayores pendientes de campaña.",
    group: "Planes",
  },
  {
    id: "no_plan",
    label: "Sin plan",
    detail: "Sin plan/tarifa y sin campaña enviada aún.",
    group: "Planes",
  },
  {
    id: "plan_other",
    label: "Otros planes",
    detail: "Otros planes pendientes de campaña.",
    group: "Planes",
  },
  {
    id: "imported",
    label: "Lista importada",
    detail: "Importados activos a los que aún no se les envió invitación.",
    group: "Listas",
  },
  {
    id: "all",
    label: "Todos, sin duplicados",
    detail: "Todo consolidado menos quienes ya recibieron magic link de campaña.",
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

/** Plantillas listas por audiencia - tono tico, claro y positivo. */
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
    "El enlace es personal y vence en 72 horas. Pura vida - equipo Xtreme Gym, Ciudad Quesada.",
  ctaLabel: "Revisar datos y elegir mi plan",
  // Placeholder de UI: el procesador NUNCA manda esta ruta sola.
  // Por cada destinatario emite token personal (64 hex), lo guarda en pending
  // y solo entonces envía /registro/confirmar?token=…. Sin token válido → reintento, no correo.
  ctaPath: "/registro/confirmar",
};

const CAMPAIGN_TEMPLATES: Record<AudienceId, CampaignTemplate> = {
  claim_profile: CLAIM_BASE,
  claim_recovered: {
    ...CLAIM_BASE,
    subject: "Confirmá tus datos en Xtreme Gym",
    title: "Encontramos tu ficha - activá la app",
    message:
      "Hola. Según la lista del gym, este correo te pertenece y ya teníamos tu nombre en Xtreme Gym.\n\n" +
      "Tocá el enlace personal: vas a ver nombre, teléfono y cédula para confirmarlos o corregirlos, y creás tu PIN de 4 dígitos.\n\n" +
      "Así dejás la cuenta lista para reservar clases y usar la app.\n\n" +
      "El enlace vence en 72 horas. Pura vida - Xtreme Gym, Ciudad Quesada.",
    ctaLabel: "Confirmar mis datos",
  },
  claim_native: {
    ...CLAIM_BASE,
    subject: "Activá tu correo en Xtreme Gym",
    title: "Falta un paso para entrar a la app",
    message:
      "Hola. Tu correo ya está en la ficha de Xtreme Gym, pero todavía no lo verificaste.\n\n" +
      "Con el enlace de este mensaje completás o corregís tus datos y creás tu PIN.\n\n" +
      "Pura vida - equipo Xtreme.",
  },
  claim_active_plan: {
    subject: "Tu plan en Xtreme ya está activo - confirmá tus datos",
    title: "Ya tenés plan: solo falta confirmar la cuenta",
    message:
      "Hola. En Xtreme Gym ya figurás con un plan vigente (semana, quincena, mes o adultos mayores).\n\n" +
      "Con este enlace revisás nombre, teléfono y cédula, y creás tu PIN de 4 dígitos. Al entrar a la app vas a ver tu plan tal como está en recepción.\n\n" +
      "No es una venta nueva: es solo para que uses la app con lo que ya pagaste.\n\n" +
      "El enlace vence en 72 horas. Pura vida - Xtreme Gym, Ciudad Quesada.",
    ctaLabel: "Confirmar mis datos",
    ctaPath: "/registro/confirmar",
  },
  invite_recoverable: {
    subject: "Tu invitación a la app de Xtreme Gym",
    title: "Confirmá tus datos y creá tu acceso",
    message:
      "Hola. Te escribimos de Xtreme Gym en Ciudad Quesada porque este correo figura en nuestra lista de contactos del gimnasio.\n\n" +
      "Si entrenás con nosotros o lo hiciste antes, te invitamos a activar tu cuenta en la app de socios. Es gratis y te toma un momento: con el botón de abajo abrís un enlace personal (válido por 72 horas), revisás o completás tus datos y elegís un PIN de 4 dígitos. Después entrás con tu cédula y ese PIN.\n\n" +
      "Vas a poder reservar clases, seguir tu progreso y usar las herramientas del gym desde el celular.\n\n" +
      "Si este mensaje no es para vos, podés ignorarlo o darte de baja con el enlace al final del correo. Equipo Xtreme Gym · Ciudad Quesada.",
    ctaLabel: "Confirmar mis datos y crear PIN",
    // El envío real inyecta ?token=… por persona. Sin token no se envía.
    ctaPath: "/registro/confirmar",
  },
  unverified_not_sent: {
    subject: "Tu invitación a la app de Xtreme Gym",
    title: "Confirmá tus datos y creá tu acceso",
    message:
      "Hola. Te escribimos de Xtreme Gym en Ciudad Quesada porque este correo figura en nuestra lista de contactos del gimnasio.\n\n" +
      "Si entrenás con nosotros o lo hiciste antes, te invitamos a activar tu cuenta en la app de socios. Es gratis y te toma un momento: con el botón de abajo abrís un enlace personal (válido por 72 horas), revisás o completás tus datos y elegís un PIN de 4 dígitos. Después entrás con tu cédula y ese PIN.\n\n" +
      "Vas a poder reservar clases, seguir tu progreso y usar las herramientas del gym desde el celular.\n\n" +
      "Si este mensaje no es para vos, podés ignorarlo o darte de baja con el enlace al final del correo. Equipo Xtreme Gym · Ciudad Quesada.",
    ctaLabel: "Confirmar mis datos y crear PIN",
    ctaPath: "/registro/confirmar",
  },
  excel_recovered: {
    ...CLAIM_BASE,
    subject: "Tu correo en Xtreme Gym",
    title: "Actualizamos el contacto de tu ficha",
    message:
      "Hola. Asociamos este correo a tu ficha en Xtreme Gym a partir de la lista del gimnasio (nombre y apellidos).\n\n" +
      "Si todavía no activaste la app, usá el enlace para revisar tus datos y crear tu PIN. Si ya tenés acceso, podés entrar directo a la app.\n\n" +
      "Pura vida - Xtreme Gym, Ciudad Quesada.",
  },
  winback_90: {
    subject: "Te extrañamos en Xtreme - volvé cuando quieras",
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
    subject: "Volvé a Xtreme Gym - Ciudad Quesada",
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
    subject: "Ya tenés cuenta en Xtreme - abrí la app",
    title: "Tu app te está esperando",
    message:
      "Hola. Tu correo ya está listo en Xtreme Gym, pero todavía no abriste la app.\n\n" +
      "Entrá con tu cédula y tu PIN. Si todavía no creaste el PIN, pedí el código al correo desde la app.\n\n" +
      "Cualquier duda, WhatsApp o recepción. Pura vida.",
    ctaLabel: "Abrir mi app",
    ctaPath: "/app",
  },
  inactive: {
    subject: "Hace rato no te vemos en Xtreme - ¿volvemos?",
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
    subject: "Tu plan semanal en Xtreme - sacale el jugo",
    title: "Semana de entreno, bien enfocada",
    message:
      "Hola. Tenés un plan semanal activo en Xtreme Gym: ideal para meterle con constancia sin enredos.\n\n" +
      "Tip: abrí la app al llegar, marcá el entreno y reservá la clase que te interese. Si querés pasar a quincenal o mensual, en recepción o en Precios te guiamos.\n\n" +
      "Que esta semana se sienta fuerte.",
    ctaLabel: "Ver mi app",
    ctaPath: "/app",
  },
  plan_fortnight: {
    subject: "Tu plan quincenal Xtreme - 15 días para rendir",
    title: "Quincena en marcha",
    message:
      "Hola. Vas con plan quincenal en Xtreme Gym: dos semanas para armar hábito y ver progreso.\n\n" +
      "Usá la app para registrar entrenos y no perder el hilo. Si se te acerca el vencimiento, renovamos en recepción o desde la web de precios.\n\n" +
      "Cualquier duda sobre horarios o zonas, escribinos.",
    ctaLabel: "Abrir la app",
    ctaPath: "/app",
  },
  plan_month: {
    subject: "Tu plan mensual Xtreme - el ritmo que funciona",
    title: "Mes de constancia",
    message:
      "Hola. Tu plan mensual en Xtreme Gym te da el mes completo para entrenar a tu ritmo: fuerza, cardio o funcional.\n\n" +
      "En la app ves tu racha, reservas y perfil. Si querés sumar un plan de trabajo con el coach o medir progreso, pedilo en recepción.\n\n" +
      "Gracias por confiar en nosotros este mes.",
    ctaLabel: "Ir a mi perfil",
    ctaPath: "/app",
  },
  plan_quarter: {
    subject: "Plan trimestral Xtreme - 3 meses de progresión",
    title: "Vas a largo plazo",
    message:
      "Hola. Con el plan trimestral en Xtreme Gym tenés tiempo de verdad para subir cargas, mejorar técnica y armar hábito.\n\n" +
      "Aprovechá la app para no perder entrenos y pedí en recepción una revisión de metas a mitad del trimestre si querés.\n\n" +
      "Estamos con vos en el piso. Pura vida.",
    ctaLabel: "Abrir Member OS",
    ctaPath: "/app",
  },
  plan_free_day: {
    subject: "Tu primer día en Xtreme - no lo dejes pasar",
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
    subject: "Tu plan en Xtreme Gym - un recordatorio amable",
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
    subject: "Xtreme Gym te escribe - lista del gimnasio",
    title: "Seguimos en contacto",
    message:
      "Hola. Formás parte de la lista de contactos de Xtreme Gym en Ciudad Quesada.\n\n" +
      "Queremos invitarte a conocer (o reencontrarte con) el gym: máquinas, zona funcional, app de socios y planes claros. Si ya no querés recibir correos, usá el enlace de preferencias al pie de este mensaje.\n\n" +
      "Pura vida - el equipo Xtreme.",
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
  // ── Re-engagement: plantillas listas para encolar ──
  sent_not_registered: {
    subject: "Todavía podés activar tu acceso en Xtreme Gym",
    title: "Te reenviamos el enlace personal",
    message:
      "Hola. Hace poco te escribimos de Xtreme Gym (Ciudad Quesada) para activar tu cuenta en la app de socios, y notamos que todavía no terminaste el registro.\n\n" +
      "No hay presión: si te interesa, con un toque abrís un enlace personal (válido 72 horas), confirmás o corregís tus datos y creás un PIN de 4 dígitos. Después entrás con tu cédula y ese PIN.\n\n" +
      "En la app podés reservar clases, marcar entrenos y llevar tu carné digital.\n\n" +
      "Si ya te registraste, ignorá este mensaje. Si no querés más correos, usá el enlace de preferencias al final. Equipo Xtreme Gym · Barrio San Pablo.",
    ctaLabel: "Activar mi acceso ahora",
    ctaPath: "/registro/confirmar",
  },
  opened_not_registered: {
    subject: "Te faltó un paso en Xtreme - terminá tu registro",
    title: "Abriste el enlace… y casi listo",
    message:
      "Hola. Vimos que abriste la invitación a la app de Xtreme Gym pero no se completó el registro.\n\n" +
      "A veces el enlace se cierra a mitad o vence. Acá va uno nuevo (72 horas): revisá nombre, teléfono y cédula, creá tu PIN de 4 dígitos y listo.\n\n" +
      "Si algo se trabó, escribinos o pasá a recepción y te ayudamos en un toque. Pura vida - Xtreme Gym, Ciudad Quesada.",
    ctaLabel: "Terminar mi registro",
    ctaPath: "/registro/confirmar",
  },
  registered_never_app: {
    subject: "Ya tenés cuenta en Xtreme - abrí la app 1 vez",
    title: "Tu acceso ya está listo",
    message:
      "Hola. Tu correo ya está verificado en Xtreme Gym y tu PIN quedó creado… pero todavía no abriste la app.\n\n" +
      "Te toma un minuto: entrá a la app, poné tu cédula y tu PIN. Vas a ver tu plan (si tenés), reservas, entrenos y el carné digital.\n\n" +
      "Tip: guardala en la pantalla de inicio del celu como una app. Si olvidaste el PIN, desde la misma pantalla podés pedir uno nuevo al correo.\n\n" +
      "Te esperamos en el piso. Pura vida.",
    ctaLabel: "Abrir mi app",
    ctaPath: "/app",
  },
  registered_inactive: {
    subject: "Hace rato no te vemos en la app de Xtreme",
    title: "Tu racha y el piso te esperan",
    message:
      "Hola. Notamos que hace un tiempo no abrís la app de Xtreme Gym. El gym sigue con fuerza: máquinas, zona funcional y clases.\n\n" +
      "Entrá un rato, mirá tu plan, marcá un entreno o reservá la clase que te guste. Si el plan se te venció, en Precios o recepción reactivás en minutos.\n\n" +
      "Cuando quieras, te recibimos en Barrio San Pablo, Ciudad Quesada. Pura vida.",
    ctaLabel: "Volver a la app",
    ctaPath: "/app",
  },
  active_app: {
    subject: "Vas bien en Xtreme - subí un nivel más",
    title: "Para vos que ya usás la app",
    message:
      "Hola. Gracias por estar activo en la app de Xtreme Gym. Sos de los que le meten de verdad.\n\n" +
      "Ideas rápidas para sacarle más jugo esta semana:\n" +
      "• Marcá cada entreno al salir del gym (racha y XP)\n" +
      "• Reservá clase de funcional o lo que te guste con anticipación\n" +
      "• Revisá tu perfil y medidas si querés ver progreso\n" +
      "• Activá notificaciones si todavía no, para no perder recordatorios\n\n" +
      "Si querés un plan de trabajo con el coach o una medición, pedilo en recepción.\n\n" +
      "Seguimos en el piso. Equipo Xtreme · Ciudad Quesada.",
    ctaLabel: "Seguir entrenando",
    ctaPath: "/app",
  },
  plan_expiring: {
    subject: "Tu plan en Xtreme se vence pronto",
    title: "Renová y no pierdas el ritmo",
    message:
      "Hola. Tu plan en Xtreme Gym se acerca al vencimiento (en los próximos días).\n\n" +
      "Para no perder el acceso al piso ni a la app, renovamos en recepción el mismo día o desde la web de precios cuando estés listo. Si tenés dudas de tarifa (semanal, quincenal, mensual, trimestral o adultos mayores), el equipo te orienta.\n\n" +
      "Gracias por entrenar con nosotros. Te esperamos en Barrio San Pablo, Ciudad Quesada.",
    ctaLabel: "Ver precios y renovar",
    ctaPath: "/precios",
  },
  plan_expired_recent: {
    subject: "Tu plan en Xtreme venció - volvé cuando quieras",
    title: "La puerta sigue abierta",
    message:
      "Hola. Tu membresía en Xtreme Gym se venció hace poco y nos gustaría verte de nuevo en el piso.\n\n" +
      "Podés reactivar el plan en recepción o mirar opciones en Precios. Si ya tenés la app, entrá con tu cédula y PIN; si el acceso se cerró, renovamos y listo.\n\n" +
      "Sin presión: cuando estés listo, te recibimos. Pura vida - Xtreme Gym, Ciudad Quesada.",
    ctaLabel: "Reactivar mi plan",
    ctaPath: "/precios",
  },
  free_day_convert: {
    subject: "¿Y después del primer día en Xtreme?",
    title: "Elegí el plan que te sirva",
    message:
      "Hola. Activaste el primer día o un pase diario en Xtreme Gym. Esperamos que te haya gustado el piso.\n\n" +
      "Si querés seguir, tenés planes claros: semanal, quincenal, mensual, trimestral y adultos mayores. En recepción te armamos el que mejor se acomode a tu ritmo, o mirá precios en la web.\n\n" +
      "Con plan activo aprovechás la app, reservas y todo el gym. Te esperamos en Barrio San Pablo, Ciudad Quesada.",
    ctaLabel: "Ver planes",
    ctaPath: "/precios",
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
  const [trackingCampaignId, setTrackingCampaignId] = useState("");
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [tracking, setTracking] = useState<CampaignTrackingPayload | null>(null);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [trackingSearch, setTrackingSearch] = useState("");
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
