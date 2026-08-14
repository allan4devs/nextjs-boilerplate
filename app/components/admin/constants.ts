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
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type {
  AdminTabId,
  InviteFilter,
  MembershipFilter,
  MembershipStatus,
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
  icon: LucideIcon;
  /** Solo visible para super admin (Allan, Alejandro, Eileen). */
  superOnly?: boolean;
};

export const ADMIN_TABS: AdminTabDefinition[] = [
  { id: "resumen", label: "Resumen", icon: Activity },
  { id: "socios", label: "Socios", icon: Users },
  { id: "accesos", label: "Accesos", icon: DoorOpen },
  { id: "bitacora", label: "Bitácora", icon: ClipboardList },
  { id: "gamificacion", label: "Game", icon: Trophy },
  { id: "correos", label: "Correos", icon: Mail, superOnly: true },
  { id: "ingresos", label: "Ingresos", icon: Banknote, superOnly: true },
];

/** Páginas visibles en el paginador antes de colapsar con elipsis. */
export const MEMBER_PAGE_WINDOW = 7;
