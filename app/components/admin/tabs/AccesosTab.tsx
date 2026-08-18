"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  DoorOpen,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Search,
  UserRound,
} from "lucide-react";
import { STATUS_LABEL, STATUS_STYLES } from "../constants";
import { isValidEmail, membershipReminderText, waLink } from "../helpers";
import type { AdminData, AdminMember, CheckinRow, MembershipStatus } from "../types";

/** Acciones de socio que el acceso necesita; subconjunto del objeto de la página. */
type Actions = {
  openDetail: (member: AdminMember) => void;
  openEdit: (member: AdminMember) => void;
};

export type AccesosTabProps = {
  data: AdminData;
  actions: Actions;
  busy: string;
  /** Envía recordatorio de pago por correo al mejor contacto en ficha. */
  onRemindEmail: (member: AdminMember) => void;
};

const METHOD_LABEL: Record<string, string> = {
  code: "Código",
  name: "Nombre",
  pin: "PIN",
  admin: "Manual",
  cedula: "Cédula",
  face: "Rostro",
};

const VIA_LABEL: Record<string, string> = {
  kiosk: "Kiosco",
  reception: "Recepción",
  admin: "Admin",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function normStatus(status: string): MembershipStatus {
  return (["active", "warning", "expired"].includes(status) ? status : "expired") as MembershipStatus;
}

function StatusBadge({ status }: { status: string }) {
  const key = normStatus(status);
  return (
    <span className={`inline-block border px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_STYLES[key]}`}>
      {STATUS_LABEL[key]}
    </span>
  );
}

export function AccesosTab({ data, actions, busy, onRemindEmail }: AccesosTabProps) {
  const [query, setQuery] = useState("");

  const memberMap = useMemo(() => {
    const map = new Map<string, AdminMember>();
    for (const m of data.members) map.set(m.normalizedName, m);
    return map;
  }, [data.members]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.checkins
      .map((c) => ({ c, member: memberMap.get(c.normalizedName) ?? null }))
      .filter(({ c, member }) => {
        if (!q) return true;
        return (
          c.memberName.toLowerCase().includes(q) ||
          c.accessCode.toLowerCase().includes(q) ||
          (member?.cedula ?? "").toLowerCase().includes(q) ||
          (member?.plan ?? "").toLowerCase().includes(q)
        );
      });
  }, [data.checkins, memberMap, query]);

  // Resumen del día basado en el estado VIVO de quienes entraron (socios únicos).
  const summary = useMemo(() => {
    const seen = new Map<string, AdminMember | null>();
    for (const c of data.checkins) {
      if (!seen.has(c.normalizedName)) seen.set(c.normalizedName, memberMap.get(c.normalizedName) ?? null);
    }
    let active = 0;
    let warning = 0;
    let expired = 0;
    let enteredExpired = 0;
    for (const c of data.checkins) {
      if (normStatus(c.membershipStatus) === "expired") enteredExpired += 1;
    }
    for (const m of seen.values()) {
      if (!m) continue;
      if (m.membershipStatus === "active") active += 1;
      else if (m.membershipStatus === "warning") warning += 1;
      else expired += 1;
    }
    return { unique: seen.size, active, warning, expired, enteredExpired };
  }, [data.checkins, memberMap]);

  return (
    <div className="space-y-4">
      {/* Encabezado + resumen */}
      <div className="flex flex-col gap-4 border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <DoorOpen className="h-5 w-5 text-cyan-300" />
            <div>
              <h2 className="text-lg font-black uppercase">Ingresos de hoy ({data.checkins.length})</h2>
              <p className="text-xs font-semibold text-white/45">
                Tocá una tarjeta para ver y editar la ficha completa del socio.
              </p>
            </div>
          </div>
          <Link href="/recepcion" className="text-xs font-black uppercase text-cyan-300 hover:underline">
            Reception OS →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="border border-white/10 bg-black/25 px-3 py-2">
            <div className="text-2xl font-black text-lime-300">{summary.active}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Activos ahora</div>
          </div>
          <div className="border border-white/10 bg-black/25 px-3 py-2">
            <div className="text-2xl font-black text-orange-300">{summary.warning}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Por vencer</div>
          </div>
          <div className="border border-white/10 bg-black/25 px-3 py-2">
            <div className="text-2xl font-black text-red-300">{summary.expired}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Vencidos ahora</div>
          </div>
          <div className="border border-white/10 bg-black/25 px-3 py-2">
            <div className="text-2xl font-black text-white/80">{summary.enteredExpired}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Entraron vencidos</div>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, código, cédula o plan"
            autoComplete="off"
            className="min-h-11 w-full border border-white/12 bg-black/40 pl-10 pr-3 text-sm font-semibold outline-none focus:border-cyan-300"
          />
        </div>
      </div>

      {/* Lista de ingresos */}
      <div className="space-y-3">
        {rows.map(({ c, member }) => (
          <AccessCard
            key={c.id}
            checkin={c}
            member={member}
            busy={busy}
            onOpenDetail={actions.openDetail}
            onOpenEdit={actions.openEdit}
            onRemindEmail={onRemindEmail}
          />
        ))}
        {!rows.length && (
          <div className="border border-white/10 bg-white/[0.04] px-5 py-12 text-center text-sm font-semibold text-white/45">
            {query.trim()
              ? "Ningún ingreso coincide con la búsqueda."
              : "Nadie ha ingresado hoy. Usa Reception OS (/recepcion) o el botón de puerta en socios."}
          </div>
        )}
      </div>
    </div>
  );
}

function AccessCard({
  checkin: c,
  member,
  busy,
  onOpenDetail,
  onOpenEdit,
  onRemindEmail,
}: {
  checkin: CheckinRow;
  member: AdminMember | null;
  busy: string;
  onOpenDetail: (m: AdminMember) => void;
  onOpenEdit: (m: AdminMember) => void;
  onRemindEmail: (m: AdminMember) => void;
}) {
  const time = new Date(c.checkedInAt).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  const entryStatus = normStatus(c.membershipStatus);
  const liveStatus = member?.membershipStatus;
  const statusChanged = Boolean(member) && liveStatus !== undefined && liveStatus !== entryStatus;
  const hasEmail = member ? isValidEmail(member.email) : false;
  const wa = member ? waLink(member.phone, membershipReminderText(member)) : "";
  const busyThis = member ? busy === `remind-${member.normalizedName}` : false;

  const open = () => member && onOpenDetail(member);

  return (
    <div
      className={`border ${
        member ? "border-white/12 hover:border-cyan-300/40" : "border-white/8"
      } bg-white/[0.04] transition`}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        {/* Hora */}
        <div className="flex items-center gap-3 sm:w-28 sm:flex-col sm:items-start sm:gap-0.5">
          <div className="font-mono text-sm font-black text-white/80">{time}</div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
            {METHOD_LABEL[c.method] ?? c.method} · {VIA_LABEL[c.by] ?? c.by}
          </div>
        </div>

        {/* Identidad */}
        <button
          type="button"
          onClick={open}
          disabled={!member}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
        >
          {member?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.photoUrl} alt={c.memberName} className="h-11 w-11 shrink-0 border-2 border-white/15 object-cover" />
          ) : (
            <div className="grid h-11 w-11 shrink-0 place-items-center border-2 border-white/15 bg-black/30 text-sm font-black text-white/70">
              {member ? initials(c.memberName) : <UserRound className="h-5 w-5" />}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-black uppercase sm:text-base">{c.memberName}</span>
              <StatusBadge status={liveStatus ?? c.membershipStatus} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-white/45">
              <span className="font-mono tracking-wider text-cyan-200/80">{c.accessCode}</span>
              {member?.cedula && <span>Céd. {member.cedula}</span>}
              {statusChanged && (
                <span className="text-white/60">
                  Entró <span className="text-red-300">{STATUS_LABEL[entryStatus]}</span> → ahora{" "}
                  <span className="text-lime-300">{STATUS_LABEL[normStatus(liveStatus!)]}</span>
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Membresía */}
        <div className="grid grid-cols-3 gap-3 sm:w-72 sm:shrink-0">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Plan</div>
            <div className="truncate text-xs font-bold text-white/80">{member?.plan ?? "—"}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Próx. pago</div>
            <div className="truncate text-xs font-bold text-white/80">{member?.nextBillingDate || "—"}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Restante</div>
            <div className="text-xs font-bold text-white/80">
              {member ? (member.daysRemaining < 0 ? "vencido" : `${member.daysRemaining} d`) : "—"}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {member ? (
            <>
              <button
                type="button"
                onClick={() => onOpenDetail(member)}
                className="inline-flex min-h-9 items-center gap-1.5 border-2 border-cyan-300/50 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-black uppercase text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-300/20"
              >
                Ficha <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onOpenEdit(member)}
                title="Editar perfil"
                className="grid h-9 w-9 place-items-center border-2 border-white/15 text-white/60 transition hover:border-white/40 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {hasEmail && (
                <button
                  type="button"
                  onClick={() => onRemindEmail(member)}
                  disabled={busyThis}
                  title={`Recordatorio a ${member.email}`}
                  className="grid h-9 w-9 place-items-center border-2 border-lime-300/50 bg-lime-300/10 text-lime-200 transition hover:border-lime-300 hover:bg-lime-300/20 disabled:opacity-50"
                >
                  {busyThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                </button>
              )}
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  title={`WhatsApp a ${member.phone}`}
                  className="grid h-9 w-9 place-items-center border-2 border-emerald-400/50 bg-emerald-400/10 text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-400/20"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/35">
              <CalendarClock className="h-3.5 w-3.5" /> Ficha no encontrada
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
