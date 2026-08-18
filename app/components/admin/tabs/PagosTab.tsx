"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Loader2,
  Mail,
  MessageCircle,
  Search,
  type LucideIcon,
} from "lucide-react";
import { STATUS_LABEL, STATUS_STYLES } from "../constants";
import { isValidEmail, membershipReminderText, waLink, waNumber } from "../helpers";
import { FilterChipRow } from "../ui";
import type { AdminData, AdminMember, SortDirection } from "../types";
import { billingPeriodFor } from "@/lib/xtreme/membership-billing";

/** Base sobre la que se filtra la actividad reciente de una ficha. */
type Basis = "updated" | "paid";
type Windowed = "all" | "today" | "d7" | "d30" | "month";
type DueFilter = "all" | "next7" | "today" | "next3" | "next30" | "expired" | "no_date";
type ContactFilter = "all" | "whatsapp" | "email" | "none";
type PaymentSortKey = "due" | "member" | "paid" | "updated";
type PaymentSort = { key: PaymentSortKey; direction: SortDirection };

const DUE_FILTERS: Array<{ id: DueFilter; label: string }> = [
  { id: "next7", label: "Próximos 7 días" },
  { id: "today", label: "Vence hoy" },
  { id: "next3", label: "Próximos 3 días" },
  { id: "next30", label: "Próximos 30 días" },
  { id: "expired", label: "Vencidos" },
  { id: "no_date", label: "Sin fecha" },
  { id: "all", label: "Todos" },
];

const CONTACT_FILTERS: Array<{ id: ContactFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "whatsapp", label: "Con WhatsApp" },
  { id: "email", label: "Con correo" },
  { id: "none", label: "Sin contacto" },
];

const WINDOWS: Array<{ id: Windowed; label: string }> = [
  { id: "all", label: "Cualquier fecha" },
  { id: "today", label: "Hoy" },
  { id: "d7", label: "7 días" },
  { id: "d30", label: "30 días" },
  { id: "month", label: "Este mes" },
];

const BASES: Array<{ id: Basis; label: string; hint: string }> = [
  {
    id: "updated",
    label: "Actualización",
    hint: "Cuándo se tocó la ficha: import de Latinsoft, cobro o edición.",
  },
  {
    id: "paid",
    label: "Último pago",
    hint: "Fecha registrada del último pago del socio.",
  },
];

const SORT_OPTIONS: Array<{ value: string; sort: PaymentSort; label: string }> = [
  {
    value: "due-asc",
    sort: { key: "due", direction: "asc" },
    label: "Vencimiento: más urgente",
  },
  {
    value: "due-desc",
    sort: { key: "due", direction: "desc" },
    label: "Vencimiento: más lejano",
  },
  {
    value: "member-asc",
    sort: { key: "member", direction: "asc" },
    label: "Nombre: A–Z",
  },
  {
    value: "member-desc",
    sort: { key: "member", direction: "desc" },
    label: "Nombre: Z–A",
  },
  {
    value: "paid-desc",
    sort: { key: "paid", direction: "desc" },
    label: "Último pago: más reciente",
  },
  {
    value: "paid-asc",
    sort: { key: "paid", direction: "asc" },
    label: "Último pago: más antiguo",
  },
  {
    value: "updated-desc",
    sort: { key: "updated", direction: "desc" },
    label: "Ficha: actualización reciente",
  },
  {
    value: "updated-asc",
    sort: { key: "updated", direction: "asc" },
    label: "Ficha: actualización antigua",
  },
];

const PAGE_SIZES = [25, 50, 100];

/** `YYYY-MM-DD` de una fecha ISO o vacío si no hay dato. */
function dayKey(value?: string | null): string {
  if (!value) return "";
  const stringValue = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(stringValue) ? stringValue.slice(0, 10) : "";
}

function addDaysIso(base: string, days: number): string {
  const date = new Date(`${base}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00.000Z`);
  const to = Date.parse(`${toIso}T00:00:00.000Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

function relativeLabel(dateIso: string, todayIso: string): string {
  if (!dateIso) return "—";
  const diff = daysBetween(dateIso, todayIso);
  if (diff <= 0) return "Hoy";
  if (diff === 1) return "Ayer";
  if (diff < 7) return `hace ${diff} días`;
  if (diff < 30) return `hace ${Math.floor(diff / 7)} sem`;
  if (diff < 365) return `hace ${Math.floor(diff / 30)} mes(es)`;
  return `hace ${Math.floor(diff / 365)} año(s)`;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function hasDueDate(member: AdminMember): boolean {
  return Boolean(dayKey(member.nextBillingDate));
}

function matchesDueFilter(member: AdminMember, filter: DueFilter): boolean {
  const hasDate = hasDueDate(member);
  const recurring = Boolean(billingPeriodFor({ planLabel: member.plan }));
  switch (filter) {
    case "next7":
      return recurring && hasDate && member.daysRemaining >= 0 && member.daysRemaining <= 7;
    case "today":
      return recurring && hasDate && member.daysRemaining === 0;
    case "next3":
      return recurring && hasDate && member.daysRemaining >= 0 && member.daysRemaining <= 3;
    case "next30":
      return recurring && hasDate && member.daysRemaining >= 0 && member.daysRemaining <= 30;
    case "expired":
      return recurring && member.membershipStatus === "expired";
    case "no_date":
      return !hasDate;
    default:
      return true;
  }
}

function matchesContactFilter(member: AdminMember, filter: ContactFilter): boolean {
  const email = isValidEmail(member.email);
  const whatsapp = Boolean(waNumber(member.phone));
  switch (filter) {
    case "email":
      return email;
    case "whatsapp":
      return whatsapp;
    case "none":
      return !email && !whatsapp;
    default:
      return true;
  }
}

function matchesWindow(date: string, filter: Windowed, today: string): boolean {
  if (filter === "all") return true;
  if (!date) return false;
  if (filter === "today") return date === today;
  if (filter === "d7") return date >= addDaysIso(today, -6);
  if (filter === "d30") return date >= addDaysIso(today, -29);
  return date >= `${today.slice(0, 7)}-01`;
}

function matchesQuery(member: AdminMember, rawQuery: string): boolean {
  const query = normalizeSearch(rawQuery);
  if (!query) return true;
  const compact = query.replace(/\s/g, "");
  const searchable = [
    member.memberName,
    member.normalizedName,
    member.cedula,
    member.phone,
    member.email,
    member.accessCode,
    member.plan,
    member.nextBillingDate,
  ];
  return searchable.some((value) => {
    const normalized = normalizeSearch(String(value ?? ""));
    return normalized.includes(query) || normalized.replace(/\s/g, "").includes(compact);
  });
}

function sortPaymentRows(
  rows: Array<{ m: AdminMember; activityDate: string }>,
  sort: PaymentSort,
): Array<{ m: AdminMember; activityDate: string }> {
  const collator = new Intl.Collator("es-CR", { numeric: true, sensitivity: "base" });
  const direction = sort.direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    let comparison = 0;
    if (sort.key === "member") {
      comparison = collator.compare(left.m.memberName, right.m.memberName);
    } else {
      const leftDate =
        sort.key === "due"
          ? dayKey(left.m.nextBillingDate)
          : sort.key === "paid"
            ? dayKey(left.m.lastPaidAt)
            : dayKey(left.m.updatedAt);
      const rightDate =
        sort.key === "due"
          ? dayKey(right.m.nextBillingDate)
          : sort.key === "paid"
            ? dayKey(right.m.lastPaidAt)
            : dayKey(right.m.updatedAt);

      // Los datos faltantes siempre terminan al final, independientemente del orden.
      if (!leftDate || !rightDate) {
        if (leftDate !== rightDate) return leftDate ? -1 : 1;
      } else {
        comparison = leftDate.localeCompare(rightDate);
      }
    }

    return comparison
      ? comparison * direction
      : collator.compare(left.m.memberName, right.m.memberName);
  });
}

function dueLabel(member: AdminMember): string {
  if (!hasDueDate(member)) return "Sin fecha de vencimiento";
  if (member.daysRemaining < 0) {
    const days = Math.abs(member.daysRemaining);
    return `Venció hace ${days} día${days === 1 ? "" : "s"}`;
  }
  if (member.daysRemaining === 0) return "Vence hoy";
  if (member.daysRemaining === 1) return "Vence mañana";
  return `Vence en ${member.daysRemaining} días`;
}

function dueTone(member: AdminMember): string {
  if (!hasDueDate(member)) return "text-white/35";
  if (member.daysRemaining < 0) return "text-red-300";
  if (member.daysRemaining <= 3) return "text-orange-300";
  if (member.daysRemaining <= 7) return "text-amber-200";
  return "text-lime-200";
}

type SummaryButtonProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
  active: boolean;
  onClick: () => void;
};

function SummaryButton({ icon: Icon, label, value, accent, active, onClick }: SummaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full border-[3px] bg-[#0c0c0c] p-3 text-left shadow-[4px_4px_0_rgba(0,0,0,.55)] transition sm:p-4 ${
        active ? "border-lime-300" : "border-white/20 hover:border-white/40"
      }`}
    >
      <span
        className={`mb-2 grid h-10 w-10 place-items-center border-2 border-black/30 bg-gradient-to-br ${accent} text-black`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="block text-2xl font-black leading-none text-white sm:text-3xl">{value}</span>
      <span className="mt-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
    </button>
  );
}

type SortHeaderProps = {
  label: string;
  sortKey: PaymentSortKey;
  sort: PaymentSort;
  onSort: (key: PaymentSortKey) => void;
  className?: string;
};

function SortHeader({ label, sortKey, sort, onSort, className = "px-3 py-3" }: SortHeaderProps) {
  const active = sort.key === sortKey;
  const SortIcon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={className}
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap transition hover:text-white ${
          active ? "text-lime-200" : "text-white/40"
        }`}
      >
        {label}
        <SortIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

export type PagosTabProps = {
  members: AdminData["members"];
  /** Fecha "hoy" del servidor, `YYYY-MM-DD`, para medir ventanas sin depender del reloj local. */
  today: string;
  busy: string;
  /** Envía el recordatorio de pago por correo al mejor contacto en ficha. */
  onRemindEmail: (member: AdminMember) => void;
};

export function PagosTab({ members, today, busy, onRemindEmail }: PagosTabProps) {
  const [basis, setBasis] = useState<Basis>("updated");
  const [windowed, setWindowed] = useState<Windowed>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("next7");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PaymentSort>({ key: "due", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const realMembers = useMemo(() => members.filter((member) => !member.seeded), [members]);

  const counts = useMemo(
    () => ({
      next7: realMembers.filter((member) => matchesDueFilter(member, "next7")).length,
      today: realMembers.filter((member) => matchesDueFilter(member, "today")).length,
      next3: realMembers.filter((member) => matchesDueFilter(member, "next3")).length,
      next30: realMembers.filter((member) => matchesDueFilter(member, "next30")).length,
      expired: realMembers.filter((member) => matchesDueFilter(member, "expired")).length,
      no_date: realMembers.filter((member) => matchesDueFilter(member, "no_date")).length,
      whatsapp: realMembers.filter((member) => matchesContactFilter(member, "whatsapp")).length,
      email: realMembers.filter((member) => matchesContactFilter(member, "email")).length,
      none: realMembers.filter((member) => matchesContactFilter(member, "none")).length,
    }),
    [realMembers],
  );

  const rows = useMemo(() => {
    const filtered = realMembers
      .map((member) => ({
        m: member,
        activityDate: basis === "updated" ? dayKey(member.updatedAt) : dayKey(member.lastPaidAt),
      }))
      .filter(
        ({ m, activityDate }) =>
          matchesDueFilter(m, dueFilter) &&
          matchesContactFilter(m, contactFilter) &&
          matchesWindow(activityDate, windowed, today) &&
          matchesQuery(m, query),
      );
    return sortPaymentRows(filtered, sort);
  }, [basis, contactFilter, dueFilter, query, realMembers, sort, today, windowed]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = rows.length ? (safePage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(safePage * pageSize, rows.length);
  const activeBasis = BASES.find((item) => item.id === basis)!;
  const selectedSort = SORT_OPTIONS.find(
    (option) => option.sort.key === sort.key && option.sort.direction === sort.direction,
  );
  const hasChangedFilters =
    dueFilter !== "next7" ||
    contactFilter !== "all" ||
    windowed !== "all" ||
    basis !== "updated" ||
    Boolean(query.trim());

  function changeDueFilter(next: DueFilter) {
    setDueFilter(next);
    setPage(1);
  }

  function changeContactFilter(next: ContactFilter) {
    setContactFilter(next);
    setPage(1);
  }

  function toggleSort(key: PaymentSortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key
          ? current.direction === "asc"
            ? "desc"
            : "asc"
          : key === "member" || key === "due"
            ? "asc"
            : "desc",
    }));
  }

  function clearFilters() {
    setDueFilter("next7");
    setContactFilter("all");
    setWindowed("all");
    setBasis("updated");
    setQuery("");
    setSort({ key: "due", direction: "asc" });
    setPage(1);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryButton
          icon={AlertTriangle}
          label="Vencen hoy"
          value={counts.today}
          accent="from-red-300 to-orange-400"
          active={dueFilter === "today"}
          onClick={() => changeDueFilter("today")}
        />
        <SummaryButton
          icon={Clock3}
          label="Próximos 3 días"
          value={counts.next3}
          accent="from-orange-300 to-amber-400"
          active={dueFilter === "next3"}
          onClick={() => changeDueFilter("next3")}
        />
        <SummaryButton
          icon={CalendarClock}
          label="Próximos 7 días"
          value={counts.next7}
          accent="from-lime-300 to-emerald-400"
          active={dueFilter === "next7"}
          onClick={() => changeDueFilter("next7")}
        />
        <SummaryButton
          icon={CircleDollarSign}
          label="Membresías vencidas"
          value={counts.expired}
          accent="from-fuchsia-400 to-rose-400"
          active={dueFilter === "expired"}
          onClick={() => changeDueFilter("expired")}
        />
      </div>

      <section className="border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-lime-300" />
            <h2 className="text-lg font-black uppercase">Cobros por vencer</h2>
          </div>
          <p className="text-sm font-semibold text-white/45">
            La vista abre con quienes vencen en los próximos 7 días, ordenados por la fecha más
            urgente. Podés avisar por correo o abrir el mensaje listo en WhatsApp. Cuando Latinsoft
            no trae el pago, se reconstruye desde el vencimiento y la tarifa del plan.
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <label className="relative block">
            <span className="sr-only">Buscar socio</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar nombre, cédula, teléfono, correo, código o plan"
              autoComplete="off"
              className="min-h-11 w-full border border-white/12 bg-black/40 pl-10 pr-3 text-sm font-semibold text-white outline-none focus:border-lime-300"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 border border-white/12 bg-black/40 px-3">
            <span className="shrink-0 text-[10px] font-black uppercase text-white/40">Ordenar</span>
            <select
              value={selectedSort?.value ?? "due-asc"}
              onChange={(event) => {
                const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
                if (option) setSort(option.sort);
              }}
              className="min-w-0 flex-1 bg-transparent text-xs font-black text-white outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-black">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-3 border border-white/10 bg-black/20 p-3 sm:p-4">
          <FilterChipRow
            label="Vencimiento"
            options={DUE_FILTERS}
            value={dueFilter}
            onChange={changeDueFilter}
            counts={{
              next7: counts.next7,
              today: counts.today,
              next3: counts.next3,
              next30: counts.next30,
              expired: counts.expired,
              no_date: counts.no_date,
            }}
            activeTone="orange"
          />
          <FilterChipRow
            label="Contacto"
            options={CONTACT_FILTERS}
            value={contactFilter}
            onChange={changeContactFilter}
            counts={{
              whatsapp: counts.whatsapp,
              email: counts.email,
              none: counts.none,
            }}
            activeTone="cyan"
          />
        </div>

        <details className="mt-3 border border-white/10 bg-black/20">
          <summary className="cursor-pointer px-3 py-3 text-[11px] font-black uppercase text-white/55 hover:text-white">
            Filtrar por actividad o último pago
            {windowed !== "all" ? " · filtro activo" : ""}
          </summary>
          <div className="space-y-4 border-t border-white/10 p-3 sm:p-4">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                Medir actividad por
              </p>
              <div className="flex flex-wrap gap-2">
                {BASES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setBasis(item.id);
                      setPage(1);
                    }}
                    className={`min-h-10 border-2 px-3 py-2 text-xs font-black uppercase transition ${
                      basis === item.id
                        ? "border-lime-300 bg-lime-300/15 text-lime-200"
                        : "border-white/15 text-white/55 hover:border-white/35 hover:text-white/80"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold text-white/40">{activeBasis.hint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {WINDOWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setWindowed(item.id);
                    setPage(1);
                  }}
                  className={`min-h-10 border-2 px-3 py-2 text-xs font-black uppercase transition ${
                    windowed === item.id
                      ? "border-amber-300 bg-amber-300/15 text-amber-200"
                      : "border-white/15 text-white/55 hover:border-white/35 hover:text-white/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </details>

        {hasChangedFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-[10px] font-black uppercase text-white/45 underline decoration-white/25 underline-offset-2 hover:text-lime-200"
          >
            Restablecer vista de próximos 7 días
          </button>
        )}
      </section>

      <section className="border border-white/10 bg-white/[0.04]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-black uppercase text-white/70">
              {rows.length} socio{rows.length === 1 ? "" : "s"} encontrado{rows.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-1 text-[11px] font-semibold text-white/35">
              Mostrando {rangeStart}–{rangeEnd} de {rows.length}
            </p>
          </div>
          <label className="flex items-center gap-2 text-[11px] font-black uppercase text-white/45">
            Por página
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) || 25);
                setPage(1);
              }}
              className="border border-white/15 bg-black/40 px-2 py-1.5 text-xs font-black text-white outline-none focus:border-lime-300"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
                <SortHeader
                  label="Socio"
                  sortKey="member"
                  sort={sort}
                  onSort={toggleSort}
                  className="px-5 py-3"
                />
                <th className="px-3 py-3">Contacto</th>
                <th className="px-3 py-3">Plan</th>
                <SortHeader label="Vencimiento" sortKey="due" sort={sort} onSort={toggleSort} />
                <SortHeader label="Último pago" sortKey="paid" sort={sort} onSort={toggleSort} />
                <th className="px-3 py-3">Estado</th>
                <SortHeader label="Actualizado" sortKey="updated" sort={sort} onSort={toggleSort} />
                <th className="px-3 py-3">Avisar</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map(({ m }) => {
                const paid = dayKey(m.lastPaidAt);
                const updated = dayKey(m.updatedAt);
                const hasEmail = isValidEmail(m.email);
                const whatsapp = waLink(m.phone, membershipReminderText(m));
                const busyThis = busy === `remind-${m.normalizedName}`;
                const reminderSent = m.paymentReminderSent === true;
                const urgent = hasDueDate(m) && m.daysRemaining >= 0 && m.daysRemaining <= 3;

                return (
                  <tr
                    key={m.normalizedName}
                    className={`border-b border-white/[0.06] transition hover:bg-white/[0.03] ${
                      urgent ? "bg-orange-300/[0.035]" : ""
                    }`}
                  >
                    <td className={`px-5 py-3 ${urgent ? "border-l-2 border-orange-300" : ""}`}>
                      <div className="font-black uppercase text-white">{m.memberName}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-white/35">
                        Cédula {m.cedula || "—"} · Código {m.accessCode || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-white/55">
                      <div>{m.phone || "Sin teléfono"}</div>
                      <div className="max-w-[190px] truncate">{m.email || "Sin correo"}</div>
                    </td>
                    <td className="px-3 py-3 text-white/80">{m.plan || "Sin plan"}</td>
                    <td className="px-3 py-3">
                      <div className={`font-black tabular-nums ${dueTone(m)}`}>{dueLabel(m)}</div>
                      <div className="mt-0.5 text-[11px] text-white/35">
                        {m.nextBillingDate || "Revisar ficha"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-white/70">
                      {paid || "—"}
                      <div className="text-[11px] text-white/35">{relativeLabel(paid, today)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block border px-2 py-1 text-[10px] font-black uppercase ${STATUS_STYLES[m.membershipStatus]}`}
                      >
                        {STATUS_LABEL[m.membershipStatus]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-white/60">{relativeLabel(updated, today)}</div>
                      <div className="text-[11px] text-white/30">{updated || "—"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {whatsapp && (
                          <a
                            href={whatsapp}
                            target="_blank"
                            rel="noreferrer"
                            title={`WhatsApp a ${m.phone}`}
                            className="inline-flex min-h-9 items-center gap-1.5 border-2 border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] font-black uppercase text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-400/20"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        )}
                        {hasEmail && (
                          <button
                            type="button"
                            onClick={() => onRemindEmail(m)}
                            disabled={busyThis || reminderSent}
                            title={
                              reminderSent
                                ? "El recordatorio de este vencimiento ya fue enviado"
                                : `Enviar recordatorio a ${m.email}`
                            }
                            className="inline-flex min-h-9 items-center gap-1.5 border-2 border-lime-300/50 bg-lime-300/10 px-2.5 py-1.5 text-[11px] font-black uppercase text-lime-200 transition hover:border-lime-300 hover:bg-lime-300/20 disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/5 disabled:text-white/35"
                          >
                            {busyThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : reminderSent ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                            {reminderSent ? "Enviado" : "Correo"}
                          </button>
                        )}
                        {!hasEmail && !whatsapp && (
                          <span className="text-[11px] font-semibold text-white/30">Sin contacto</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!pagedRows.length && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm font-semibold text-white/45">
                    No hay socios que coincidan. Probá otro rango o restablecé los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className="inline-flex min-h-9 items-center gap-1.5 border border-white/15 px-3 text-[11px] font-black uppercase text-white/65 transition hover:border-lime-300 hover:text-lime-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-[11px] font-black uppercase text-white/45">
              Página {safePage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              className="inline-flex min-h-9 items-center gap-1.5 border border-white/15 px-3 text-[11px] font-black uppercase text-white/65 transition hover:border-lime-300 hover:text-lime-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </>
  );
}
