/**
 * Catálogos estáticos del Admin OS: etiquetas, estilos por estado, opciones de
 * filtro y tabs. Nada acá depende de estado de React, así que se define una vez
 * a nivel de módulo en vez de re-crearse en cada render de la página.
 */
import {
  Activity,
  Banknote,
  ClipboardList,
  DoorOpen,
  Mail,
  ReceiptText,
  Trophy,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type {
  AdminTabId,
  InviteFilter,
  MembershipFilter,
  MembershipStatus,
  PaymentFilter,
  ProfileFilter,
  QuickPlanOptionId,
  RegistrationFilter,
} from "./types";

export const STATUS_STYLES: Record<MembershipStatus, string> = {
  active: "border-lime-300/40 bg-lime-300/10 text-lime-200",
  warning: "border-orange-300/40 bg-orange-300/10 text-orange-200",
  expired: "border-red-400/40 bg-red-500/10 text-red-200",
};

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: "Activa",
  warning: "Por vencer",
  expired: "Vencida",
};

export type FilterOption<T extends string> = { id: T; label: string };

export const MEMBERSHIP_FILTERS: FilterOption<MembershipFilter>[] = [
  { id: "all", label: "Todas" },
  { id: "active", label: STATUS_LABEL.active },
  { id: "warning", label: STATUS_LABEL.warning },
  { id: "expired", label: STATUS_LABEL.expired },
];

export const REGISTRATION_FILTERS: FilterOption<RegistrationFilter>[] = [
  { id: "all", label: "Todos" },
  { id: "registered", label: "Registrados" },
  { id: "not_registered", label: "Sin registrar" },
  { id: "no_email", label: "Sin correo" },
];

export const PROFILE_FILTERS: FilterOption<ProfileFilter>[] = [
  { id: "all", label: "Todas" },
  { id: "audited", label: "Ficha OK" },
  { id: "pending", label: "Sin auditar" },
];

export const INVITE_FILTERS: FilterOption<InviteFilter>[] = [
  { id: "all", label: "Todos" },
  { id: "sent", label: "Correo enviado" },
  { id: "not_sent", label: "Sin invitar" },
];

export const PAYMENT_FILTERS: FilterOption<PaymentFilter>[] = [
  { id: "all", label: "Todos" },
  { id: "expired", label: "Vencidos" },
  { id: "today", label: "Vence hoy" },
  { id: "next7", label: "Próximos 7 días" },
  { id: "no_date", label: "Sin fecha" },
];

export const QUICK_PLAN_OPTIONS: Array<{
  id: QuickPlanOptionId;
  label: string;
  days: number;
  detail: string;
}> = [
  { id: "week", label: "Semanal", days: 7, detail: "Acceso completo por 7 dias" },
  { id: "fortnight", label: "Quincenal", days: 15, detail: "Acceso completo por 15 dias" },
  { id: "month", label: "Mensual", days: 30, detail: "Acceso completo por 30 dias" },
  { id: "quarter", label: "Trimestral", days: 90, detail: "Acceso completo por 90 dias" },
];

export type AdminTabDefinition = {
  id: AdminTabId;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Solo visible para super admin (Allan, Alejandro, Eileen). */
  superOnly?: boolean;
  /** Ruta secundaria: existe, pero no ocupa espacio en la navegación principal. */
  hiddenFromNav?: boolean;
};

export const ADMIN_TABS: AdminTabDefinition[] = [
  { id: "users", label: "Users", href: "/admin/users", icon: Users },
  { id: "resumen", label: "Resumen", href: "/admin", icon: Activity, hiddenFromNav: true },
  { id: "socios", label: "Socios", href: "/admin/socios", icon: Users, hiddenFromNav: true },
  {
    id: "accesos",
    label: "Accesos",
    href: "/admin/accesos",
    icon: DoorOpen,
    hiddenFromNav: true,
  },
  {
    id: "bitacora",
    label: "Bitácora",
    href: "/analytics",
    icon: ClipboardList,
    hiddenFromNav: true,
  },
  {
    id: "gamificacion",
    label: "Game",
    href: "/admin/gamificacion",
    icon: Trophy,
    hiddenFromNav: true,
  },
  {
    id: "pagos",
    label: "Pagos",
    href: "/admin/pagos",
    icon: ReceiptText,
    superOnly: true,
    hiddenFromNav: true,
  },
  {
    id: "correos",
    label: "Correos",
    href: "/admin/correos",
    icon: Mail,
    superOnly: true,
    hiddenFromNav: true,
  },
  {
    id: "ingresos",
    label: "Ingresos",
    href: "/admin/ingresos",
    icon: Banknote,
    superOnly: true,
    hiddenFromNav: true,
  },
  {
    id: "herramientas",
    label: "Herramientas",
    href: "/admin/herramientas",
    icon: Wrench,
    superOnly: true,
    hiddenFromNav: true,
  },
];

export function adminHref(tab: AdminTabId): string {
  return ADMIN_TABS.find((item) => item.id === tab)?.href ?? "/admin";
}

/** Páginas visibles en el paginador antes de colapsar con elipsis. */
export const MEMBER_PAGE_WINDOW = 7;
