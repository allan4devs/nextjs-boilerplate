"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageCircle,
  Search,
  Wallet,
} from "lucide-react";
import { STATUS_LABEL, STATUS_STYLES } from "../constants";
import { isValidEmail, membershipReminderText, waLink } from "../helpers";
import { Kpi } from "../ui";
import type { AdminData, AdminMember } from "../types";

/** Base sobre la que se mide "reciente": cuándo se tocó la ficha vs. fecha de pago. */
type Basis = "updated" | "paid";
type Windowed = "today" | "d7" | "d30" | "month" | "all";

const WINDOWS: Array<{ id: Windowed; label: string }> = [
  { id: "today", label: "Hoy" },
  { id: "d7", label: "7 días" },
  { id: "d30", label: "30 días" },
  { id: "month", label: "Este mes" },
  { id: "all", label: "Todo" },
];

const BASES: Array<{ id: Basis; label: string; hint: string }> = [
  { id: "updated", label: "Actualización", hint: "Cuándo se tocó la ficha (import de Latinsoft, cobro o edición)" },
  { id: "paid", label: "Último pago", hint: "Fecha registrada del último pago del socio" },
];

/** `YYYY-MM-DD` de una fecha ISO o vacío si no hay dato. */
function dayKey(value?: string | null): string {
  if (!value) return "";
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
}

function addDaysIso(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00.000Z`);
  const b = Date.parse(`${toIso}T00:00:00.000Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
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
  const [windowed, setWindowed] = useState<Windowed>("today");
  const [query, setQuery] = useState("");

  const monthStart = `${today.slice(0, 7)}-01`;
  const d7Start = addDaysIso(today, -6);
  const d30Start = addDaysIso(today, -29);

  /** Fecha base de cada socio según la vista elegida. */
  const basisDate = (m: AdminMember) => (basis === "updated" ? dayKey(m.updatedAt) : dayKey(m.lastPaidAt));

  const inWindow = (date: string) => {
    if (!date) return false;
    switch (windowed) {
      case "today":
        return date === today;
      case "d7":
        return date >= d7Start;
      case "d30":
        return date >= d30Start;
      case "month":
        return date >= monthStart;
      case "all":
        return true;
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => !m.seeded)
      .map((m) => ({ m, date: basisDate(m) }))
      .filter(({ date }) => inWindow(date))
      .filter(({ m }) => {
        if (!q) return true;
        return (
          m.memberName.toLowerCase().includes(q) ||
          (m.cedula ?? "").toLowerCase().includes(q) ||
          m.plan.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.m.memberName.localeCompare(b.m.memberName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, basis, windowed, query, today]);

  // KPIs siempre sobre la base activa, sin importar la ventana seleccionada.
  const real = useMemo(() => members.filter((m) => !m.seeded), [members]);
  const countIn = (predicate: (date: string) => boolean) =>
    real.filter((m) => {
      const date = basisDate(m);
      return date && predicate(date);
    }).length;

  const kToday = countIn((d) => d === today);
  const k7 = countIn((d) => d >= d7Start);
  const kMonth = countIn((d) => d >= monthStart);
  const kActive = real.filter((m) => m.membershipStatus === "active").length;

  const activeBasis = BASES.find((b) => b.id === basis)!;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={CalendarCheck2} label="Actualizados hoy" value={`${kToday}`} accent="from-lime-300 to-emerald-400" />
        <Kpi icon={CalendarClock} label="Últimos 7 días" value={`${k7}`} accent="from-cyan-300 to-sky-500" />
        <Kpi icon={Wallet} label="Este mes" value={`${kMonth}`} accent="from-amber-300 to-yellow-400" />
        <Kpi icon={CheckCircle2} label="Membresía activa" value={`${kActive}`} accent="from-fuchsia-400 to-rose-400" />
      </div>

      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-lime-300" />
            <h2 className="text-lg font-black uppercase">Auditoría de pagos recientes</h2>
          </div>
          <p className="text-sm font-semibold text-white/45">
            Quién pagó / renovó según los datos de la ficha. Para montos por transacción, mirá{" "}
            <span className="font-black text-white/70">Ingresos</span>. El recordatorio va al mejor
            correo en ficha (aunque no esté verificado); si no hay correo, por WhatsApp. No usa el
            sistema de campañas.
          </p>
        </div>

        {/* Base de medición */}
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Medir por</p>
          <div className="flex flex-wrap gap-2">
            {BASES.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBasis(b.id)}
                className={`min-h-11 border-2 px-3 py-2 text-xs font-black uppercase transition ${
                  basis === b.id
                    ? "border-lime-300 bg-lime-300/15 text-lime-200"
                    : "border-white/15 text-white/55 hover:border-white/35 hover:text-white/80"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-white/40">{activeBasis.hint}</p>
        </div>

        {/* Ventana + búsqueda */}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWindowed(w.id)}
                className={`min-h-11 border-2 px-3 py-2 text-xs font-black uppercase transition ${
                  windowed === w.id
                    ? "border-amber-300 bg-amber-300/15 text-amber-200"
                    : "border-white/15 text-white/55 hover:border-white/35 hover:text-white/80"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nombre, cédula o plan"
              autoComplete="off"
              className="min-h-11 w-full border border-white/12 bg-black/40 pl-10 pr-3 text-sm font-semibold outline-none focus:border-lime-300"
            />
          </div>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.04]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-black uppercase text-white/70">
            {rows.length} socio{rows.length === 1 ? "" : "s"}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
                <th className="px-5 py-3">Socio</th>
                <th className="px-3 py-3">Cédula</th>
                <th className="px-3 py-3">Plan</th>
                <th className="px-3 py-3">Último pago</th>
                <th className="px-3 py-3">Próximo pago</th>
                <th className="px-3 py-3">Restante</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Actualizado</th>
                <th className="px-3 py-3">Recordatorio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, date }) => {
                const paid = dayKey(m.lastPaidAt);
                const updated = dayKey(m.updatedAt);
                const isToday = date === today;
                const hasEmail = isValidEmail(m.email);
                const wa = waLink(m.phone, membershipReminderText(m));
                const busyThis = busy === `remind-${m.normalizedName}`;
                return (
                  <tr
                    key={m.normalizedName}
                    className={`border-b border-white/[0.06] ${isToday ? "bg-lime-300/[0.04]" : ""}`}
                  >
                    <td className={`px-5 py-3 font-black uppercase ${isToday ? "border-l-2 border-lime-300" : ""}`}>
                      {m.memberName}
                    </td>
                    <td className="px-3 py-3 text-white/60">{m.cedula || "—"}</td>
                    <td className="px-3 py-3 text-white/80">{m.plan}</td>
                    <td className="px-3 py-3 text-white/70">
                      {paid || "—"}
                      <div className="text-[11px] text-white/35">{relativeLabel(paid, today)}</div>
                    </td>
                    <td className="px-3 py-3 text-white/70">{m.nextBillingDate || "—"}</td>
                    <td className="px-3 py-3 font-black text-white/80">
                      {m.daysRemaining < 0 ? "—" : `${m.daysRemaining} d`}
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
                        {hasEmail && (
                          <button
                            type="button"
                            onClick={() => onRemindEmail(m)}
                            disabled={busyThis}
                            title={`Enviar recordatorio a ${m.email}`}
                            className="inline-flex min-h-9 items-center gap-1.5 border-2 border-lime-300/50 bg-lime-300/10 px-2.5 py-1.5 text-[11px] font-black uppercase text-lime-200 transition hover:border-lime-300 hover:bg-lime-300/20 disabled:opacity-50"
                          >
                            {busyThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                            Correo
                          </button>
                        )}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            title={`WhatsApp a ${m.phone}`}
                            className="inline-flex min-h-9 items-center gap-1.5 border-2 border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] font-black uppercase text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-400/20"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        )}
                        {!hasEmail && !wa && (
                          <span className="text-[11px] font-semibold text-white/30">Sin contacto</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-white/45">
                    {query.trim()
                      ? "Ningún socio coincide con la búsqueda en esta ventana."
                      : "Sin registros en esta ventana. Probá ampliar el rango o cambiar la base de medición."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
