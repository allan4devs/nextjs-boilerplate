/**
 * Catálogo de audiencias y etiquetas legibles. Es el vocabulario del centro
 * de campañas: a quién se le puede escribir y cómo se nombra cada motivo de
 * cuarentena o de baja.
 */
import type { AudienceId } from "./types";

export const QUARANTINE_REASON_LABELS: Record<string, string> = {
  placeholder: "placeholder o correo ficticio",
  shared_across_members: "compartido entre varias fichas",
  aggressive_name_mismatch: "nombre y correo no coinciden",
  name_email_mismatch: "nombre y correo no coinciden",
  shared_without_clear_owner: "sin dueño claro",
};

export const AUDIENCES: Array<{ id: AudienceId; label: string; detail: string; group: string }> = [
  // ── Re-engagement ──
  {
    id: "sent_not_registered",
    label: "★ Enviados · sin registro",
    detail:
      "Ya recibieron invitación/magic link y todavía no se registraron; se excluyen solo si recibieron campaña hoy.",
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
      "Sin verificar y sin plan, con correo nativo; excluye únicamente envíos de hoy.",
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
      "Fichas con emailRecovery que todavía no recibieron una campaña hoy.",
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
    detail: "Señal blanda (DIMEX / doc / nombres); excluye únicamente envíos de hoy.",
    group: "Segmentos",
  },
  {
    id: "never_registered",
    label: "Nunca registrados",
    detail: "Sin perfil verificado que todavía no recibió una invitación hoy.",
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
    detail: "Verificados sin apertura de app que todavía no recibieron campaña hoy.",
    group: "Segmentos",
  },
  {
    id: "inactive",
    label: "Sin abrir app 14 d",
    detail: "Verificados sin apertura en 14 d que todavía no recibieron campaña hoy.",
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
    detail: "Tarifa semanal; excluye únicamente a quienes recibieron campaña hoy.",
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
export const AUDIENCE_LABELS = Object.fromEntries(AUDIENCES.map((item) => [item.id, item.label])) as Record<AudienceId, string>;
export const OPT_OUT_REASON_LABELS: Record<string, string> = {
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
