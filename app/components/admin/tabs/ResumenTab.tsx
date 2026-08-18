"use client";

import {
  Activity,
  Banknote,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  Flame,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  TrendingUp,
  Trophy,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import {
  BarTrendChart,
  CHART_CYAN,
  CHART_LIME,
} from "../../charts";
import {
  money,
} from "../helpers";
import {
  Kpi,
} from "../ui";
import { useNow } from "../hooks/useNow";
import type { AdminData, AdminTabId } from "../types";

export type ResumenTabProps = {
  data: AdminData;
  isSuper: boolean;
  busy: string;
  onNotifyExpiring: () => void;
  onResolveAlert: (fingerprint: string) => void;
  /** `wipeAll` incluye la sesión propia; si no, cierra solo las demás. */
  onRevokeStaffSessions: (wipeAll: boolean) => void;
  onOpenTab: (tab: AdminTabId) => void;
  onReload: () => void;
  isLoading: boolean;
};

export function ResumenTab({ data, isSuper, busy, onNotifyExpiring, onResolveAlert, onRevokeStaffSessions, onOpenTab, onReload, isLoading }: ResumenTabProps) {
  const t = data.today;
  const now = useNow();

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        <Kpi icon={Users} label="Socios" value={`${data.totals.memberCount}`} accent="from-lime-300 to-emerald-400" />
        <Kpi icon={CalendarCheck} label="Activos hoy" value={`${data.totals.activeToday}`} accent="from-cyan-300 to-sky-500" />
        <Kpi icon={DoorOpen} label="Ingresos hoy" value={`${data.today.checkinsToday}`} accent="from-sky-300 to-blue-400" />
        <Kpi icon={Flame} label="Racha prom." value={`${data.totals.avgStreak}`} accent="from-orange-400 to-red-500" />
        <Kpi icon={ClipboardList} label="Con plan" value={`${data.totals.withPlan}`} accent="from-fuchsia-400 to-rose-400" />
        <Kpi icon={Activity} label="Ocupacion" value={`${t?.occupancyPct ?? 0}%`} accent="from-lime-300 to-cyan-300" />
      </div>

      <div className="mt-4 border-[3px] border-lime-300/35 bg-lime-300/[0.05] p-4 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-6 w-6 shrink-0 text-lime-300" />
            <div>
              <h2 className="text-lg font-black uppercase text-lime-100">
                Conectados ahora · socios
              </h2>
              <p className="mt-1 max-w-2xl text-xs font-bold leading-relaxed text-white/50">
                Quién tiene el Member OS abierto o sesión con PIN reciente (~
                {data.onlineMembers?.windowMinutes ?? 5} min). Esto es de socios: no se
                cierra con el botón de seguridad de staff.
              </p>
              <p className="mt-2 text-sm font-black text-white">
                Online:{" "}
                <span className="text-lime-200">{data.onlineMembers?.count ?? 0}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onReload()}
            disabled={isLoading || Boolean(busy)}
            className="inline-flex min-h-10 items-center gap-2 border border-lime-300/40 px-3 text-[10px] font-black uppercase text-lime-200 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
        {data.onlineMembers && data.onlineMembers.members.length > 0 ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.onlineMembers.members.map((m) => {
              const agoSec = Math.max(
                0,
                Math.round((now - new Date(m.lastSeenAt).getTime()) / 1000),
              );
              const agoLabel =
                agoSec < 60
                  ? `hace ${agoSec}s`
                  : agoSec < 3600
                    ? `hace ${Math.floor(agoSec / 60)}m`
                    : `hace ${Math.floor(agoSec / 3600)}h`;
              const viaLabel =
                m.via === "both"
                  ? "PIN + app"
                  : m.via === "session"
                    ? "Sesión PIN"
                    : "App abierta";
              return (
                <li
                  key={m.memberKey}
                  className="flex items-start justify-between gap-2 border border-lime-300/25 bg-black/35 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-lime-300 shadow-[0_0_8px_#d8ff3e]" />
                      <span className="truncate text-sm font-black uppercase text-white">
                        {m.memberName}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-white/40">
                      {viaLabel}
                      {m.path ? ` · ${m.path}` : ""}
                      {m.source ? ` · ${m.source}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-black uppercase text-lime-200/80">
                    {agoLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-xs font-semibold text-white/40">
            Nadie con sesión activa en este momento (ventana ~5 min).
          </p>
        )}
      </div>

      {isSuper && (
        <div className="mt-4 border-[3px] border-orange-300/40 bg-orange-300/[0.06] p-4 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-orange-300" />
              <div>
                <h2 className="text-lg font-black uppercase text-orange-100">
                  Seguridad · solo staff
                </h2>
                <p className="mt-1 max-w-2xl text-xs font-bold leading-relaxed text-white/50">
                  Cierra paneles de admin / recepción / ingreso / trainer.{" "}
                  <span className="text-orange-100">
                    No cierra a socios en la app
                  </span>{" "}
                  (sesiones Member OS aparte). Rotar el código en Vercel también invalida
                  solo staff (authEpoch).
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  Staff activo:{" "}
                  <span className="text-orange-200">
                    {data.staffSecurity?.total ?? "—"}
                  </span>
                  {data.staffSecurity ? (
                    <span className="ml-2 text-[11px] font-bold text-white/45">
                      admin {data.staffSecurity.bySurface.admin} · recepción{" "}
                      {data.staffSecurity.bySurface.reception} · ingreso{" "}
                      {data.staffSecurity.bySurface.ingreso} · trainer{" "}
                      {data.staffSecurity.bySurface.trainer}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {process.env.NODE_ENV !== "production" ? (
                <button
                  type="button"
                  onClick={() => onOpenTab("herramientas")}
                  className="inline-flex min-h-11 items-center gap-2 border-[3px] border-amber-300/45 bg-amber-300/10 px-3 py-2 text-[11px] font-black uppercase text-amber-100 transition hover:bg-amber-300 hover:text-black"
                >
                  <Wrench className="h-4 w-4" />
                  Herramientas dev
                </button>
              ) : null}
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void onRevokeStaffSessions(false)}
                className="inline-flex min-h-11 items-center gap-2 border-[3px] border-orange-300/50 bg-orange-300/15 px-3 py-2 text-[11px] font-black uppercase text-orange-100 transition hover:bg-orange-300 hover:text-black disabled:opacity-40"
              >
                {busy === "revoke-staff" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Cerrar staff (otros)
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void onRevokeStaffSessions(true)}
                className="inline-flex min-h-11 items-center gap-2 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-[11px] font-black uppercase text-red-200 transition hover:bg-red-400 hover:text-black disabled:opacity-40"
              >
                <ShieldAlert className="h-4 w-4" />
                Cerrar staff (todos)
              </button>
            </div>
          </div>
        </div>
      )}

      {data.opsAlerts && data.opsAlerts.length > 0 && (
        <div className="mt-4 border-[3px] border-red-400/45 bg-red-500/[0.08] p-4 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-300" />
            <div>
              <h2 className="text-lg font-black uppercase text-red-100">Atención operativa</h2>
              <p className="mt-1 text-xs font-bold text-white/48">
                {data.opsAlerts.length} incidente{data.opsAlerts.length === 1 ? "" : "s"} abierto{data.opsAlerts.length === 1 ? "" : "s"}. Los críticos también se enviaron al correo del administrador.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {data.opsAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.fingerprint}
                className={`border p-3 ${
                  alert.severity === "critical"
                    ? "border-red-300/35 bg-red-400/10"
                    : "border-orange-300/30 bg-orange-300/[0.07]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black uppercase text-white">{alert.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                      {alert.count > 1 ? `${alert.count} veces · ` : ""}
                      {new Date(alert.lastSeenAt).toLocaleString("es-CR")}
                    </span>
                    <button
                      type="button"
                      disabled={busy === `ops:${alert.fingerprint}`}
                      onClick={() => void onResolveAlert(alert.fingerprint)}
                      className="border border-white/15 px-2 py-1 text-[10px] font-black uppercase text-white/55 transition hover:border-[#d8ff3e]/50 hover:text-[#d8ff3e] disabled:opacity-40"
                    >
                      {busy === `ops:${alert.fingerprint}` ? "Guardando" : "Resolver"}
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs font-bold leading-5 text-white/52">{alert.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.growth && (
        <div className="border border-lime-300/25 bg-lime-300/[0.05] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-lime-300" />
              <div>
                <h2 className="text-lg font-black uppercase">Crecimiento (30 días)</h2>
                <p className="text-xs font-semibold text-white/45">
                  {data.growth.fromDate} → {data.growth.toDate} · embudo desde eventos
                </p>
              </div>
            </div>
            {data.system && (
              <span className={`border px-3 py-1.5 text-[11px] font-black uppercase ${
                data.system.lifecycleStale
                  ? "border-red-300/40 bg-red-400/10 text-red-200"
                  : "border-white/10 bg-black/30 text-white/55"
              }`}>
                Cron: {data.system.lifecycleStale ? "atrasado" : data.system.lifecycle?.status || "sin ejecución"}
              </span>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-white/45">Pase → visita ≤48h</p>
              <p className="mt-2 text-2xl font-black text-lime-200">{data.growth.dayPassToVisit.ratePct}%</p>
              <p className="mt-1 text-xs font-bold text-white/40">
                {data.growth.dayPassToVisit.visited}/{data.growth.dayPassToVisit.dayPasses} pases
              </p>
            </div>
            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-white/45">Pase → plan ≤7d</p>
              <p className="mt-2 text-2xl font-black text-cyan-200">{data.growth.dayPassToPlan.rate7dPct}%</p>
              <p className="mt-1 text-xs font-bold text-white/40">
                1d {data.growth.dayPassToPlan.converted1d} · 3d {data.growth.dayPassToPlan.converted3d} · 7d{" "}
                {data.growth.dayPassToPlan.converted7d}
              </p>
            </div>
            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-white/45">Retención D7</p>
              <p className="mt-2 text-2xl font-black text-orange-200">{data.growth.d7Retention.ratePct}%</p>
              <p className="mt-1 text-xs font-bold text-white/40">
                {data.growth.d7Retention.returned}/{data.growth.d7Retention.newMembers} volvieron
              </p>
            </div>
            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-white/45">Referidos</p>
              <p className="mt-2 text-2xl font-black text-fuchsia-200">
                {data.growth.referralsRewarded}
                <span className="text-base text-white/40"> / {data.growth.referralsRedeemed}</span>
              </p>
              <p className="mt-1 text-xs font-bold text-white/40">recompensados / canjeados</p>
            </div>
            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-white/45">App abierta</p>
              <p className="mt-2 text-2xl font-black text-sky-200">
                {data.growth.appOpens ?? 0}
                <span className="text-base text-white/40"> / {data.growth.appOpenMembers ?? 0}</span>
              </p>
              <p className="mt-1 text-xs font-bold text-white/40">entradas / socios distintos</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6 text-center text-xs font-bold text-white/55">
            <div className="border border-white/10 bg-black/20 px-2 py-2">Checkout {data.growth.checkoutsStarted}</div>
            <div className="border border-white/10 bg-black/20 px-2 py-2">Pagos {data.growth.paymentsCompleted}</div>
            <div className="border border-white/10 bg-black/20 px-2 py-2">Pases {data.growth.dayPasses}</div>
            <div className="border border-white/10 bg-black/20 px-2 py-2">Planes {data.growth.plansSold}</div>
            <div className="border border-white/10 bg-black/20 px-2 py-2">1er ingreso {data.growth.firstCheckins}</div>
            <div className="border border-white/10 bg-black/20 px-2 py-2">Renovaciones {data.growth.renewalsCompleted}</div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="border border-cyan-300/20 bg-black/25 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-cyan-200">Acceso y alta</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-white/60">
                <span>Identificados {data.growth.accountFunnel.lookups}</span>
                <span>Ingresaron {data.growth.accountFunnel.loginSuccess}</span>
                <span>PIN fallido {data.growth.accountFunnel.loginFailed}</span>
                <span>Bloqueados {data.growth.accountFunnel.loginBlocked}</span>
                <span>Registro iniciado {data.growth.accountFunnel.registrationsStarted}</span>
                <span>Registro completo {data.growth.accountFunnel.registrationsCompleted}</span>
                <span>Faltó completar {data.growth.accountFunnel.registrationFailed}</span>
                <span>PIN creado {data.growth.accountFunnel.pinsCreated}</span>
              </div>
            </div>
            <div className="border border-lime-300/20 bg-black/25 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-lime-200">Primer día y reservas</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-white/60">
                <span>Día gratis {data.growth.accountFunnel.freeFirstDays}</span>
                <span>Intentos {data.growth.reservations.attempted}</span>
                <span>Reservadas {data.growth.reservations.completed}</span>
                <span>Fallidas {data.growth.reservations.failed}</span>
                <span>Canceladas {data.growth.reservations.cancelled}</span>
              </div>
            </div>
            <div className="border border-orange-300/20 bg-black/25 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-orange-200">Mensualidad</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-white/60">
                <span>Checkout {data.growth.monthly.checkoutsStarted}</span>
                <span>Pagadas {data.growth.monthly.paymentsCompleted}</span>
              </div>
              <p className="mt-3 text-[10px] font-semibold text-white/35">Las cifras de pago vienen del servidor, no del navegador.</p>
            </div>
          </div>
          {data.growth.recentAccessAttempts.length > 0 && (
            <details className="mt-4 border border-white/10 bg-black/25 p-4">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-white/65">
                Quién intentó ingresar o registrarse ({data.growth.recentAccessAttempts.length})
              </summary>
              <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                {data.growth.recentAccessAttempts.map((event, index) => (
                  <div key={`${event.occurredAt}-${index}`} className="grid gap-1 border-b border-white/10 pb-2 text-[11px] sm:grid-cols-[1.2fr_.8fr_1fr_auto]">
                    <span className="font-black text-white/70">{event.memberId || event.identityHint || "Persona no identificada"}</span>
                    <span className={event.outcome === "success" ? "text-lime-200" : event.outcome === "blocked" ? "text-red-200" : "text-orange-200"}>{event.outcome}</span>
                    <span className="text-white/40">{event.stage.replaceAll("_", " ")}</span>
                    <span className="text-white/30">{new Date(event.occurredAt).toLocaleString("es-CR")}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border border-white/10 bg-white/[0.04] p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-lime-300" />
              <h2 className="text-lg font-black uppercase">Ocupacion y clases</h2>
            </div>
            <span className="text-sm font-black uppercase text-white/55">
              {t?.currentPeople}/{t?.capacity} · {t?.level}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {t?.classes.map((c) => {
              const pct = Math.min(100, Math.round((c.reserved / c.capacity) * 100));
              return (
                <div key={c.trainingId} className="border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black uppercase">{c.trainingName}</p>
                    <span className="text-sm font-black text-lime-300">
                      {c.reserved}/{c.capacity}
                    </span>
                  </div>
                  <div className="mt-3 h-2.5 border border-white/10 bg-black/45">
                    <div
                      className={`h-full ${pct >= 90 ? "bg-red-400" : pct >= 60 ? "bg-orange-300" : "bg-lime-300"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-sm font-black uppercase text-white/70">Membresias</h2>
            <div className="mt-4 space-y-3 text-sm font-bold">
              <div className="flex justify-between text-lime-200">
                <span>Activas</span>
                <span>{data.totals.activeMemberships}</span>
              </div>
              <div className="flex justify-between text-orange-200">
                <span>Por vencer</span>
                <span>{data.totals.expiringSoon}</span>
              </div>
              <div className="flex justify-between text-red-200">
                <span>Vencidas</span>
                <span>{data.totals.expired}</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Demo onSeed</span>
                <span>{data.totals.seededCount}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onNotifyExpiring()}
              disabled={Boolean(busy) || data.totals.expiringSoon + data.totals.expired === 0}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-orange-300/40 bg-orange-300/10 px-3 py-2.5 text-xs font-black uppercase text-orange-200 transition hover:bg-orange-300/20 disabled:opacity-40"
            >
              {busy === "notify-all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Recordar renovacion por correo
            </button>
          </div>
          {isSuper && data.revenue && (
            <div className="border border-amber-300/30 bg-amber-300/[0.06] p-5">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-amber-300" />
                <h2 className="text-sm font-black uppercase text-amber-100">Ingresos hoy</h2>
              </div>
              <p className="mt-3 text-2xl font-black text-white">{money(data.revenue.today.crc)}</p>
              <p className="mt-1 text-xs font-bold text-white/50">
                {data.revenue.today.count} pagos · mes {money(data.revenue.month.crc)}
              </p>
              <button
                type="button"
                onClick={() => onOpenTab("ingresos")}
                className="mt-4 text-xs font-black uppercase text-amber-200 underline-offset-2 hover:underline"
              >
                Ver detalle →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <DoorOpen className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-black uppercase">Ingresos al gym - ultimos 7 dias</h2>
          </div>
          <div className="mt-4 border border-white/10 bg-black/25 p-3">
            <BarTrendChart
              data={(data.checkinSeries ?? []).map((d) => ({ date: d.date, value: d.checkins }))}
              unit="ingresos"
              color={CHART_CYAN}
              height={160}
            />
          </div>
          <p className="mt-3 text-xs font-semibold text-white/45">
            Check-ins registrados por día (kiosk + panel). Pasá el cursor para el detalle.
          </p>
        </div>

        <div className="border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-lime-300" />
            <h2 className="text-lg font-black uppercase">Entradas al app - ultimos 7 dias</h2>
          </div>
          <div className="mt-4 border border-white/10 bg-black/25 p-3">
            <BarTrendChart
              data={(data.growth?.appOpenSeries ?? []).map((d) => ({ date: d.date, value: d.opens }))}
              unit="entradas"
              color={CHART_LIME}
              height={160}
            />
          </div>
          <p className="mt-3 text-xs font-semibold text-white/45">
            Veces que los socios abrieron el Member OS por dia (evento app_opened).
          </p>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-orange-300" />
            <h2 className="text-lg font-black uppercase">Top rachas</h2>
          </div>
          <button type="button" onClick={() => onOpenTab("socios")} className="text-xs font-black uppercase text-lime-300">
            Ver todos
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.members.slice(0, 6).map((m, i) => (
            <div key={m.normalizedName} className="flex items-center justify-between border border-white/10 bg-black/25 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase">
                  #{i + 1} {m.memberName}
                </p>
                <p className="text-[11px] font-semibold text-white/40">{m.goal || m.plan}</p>
              </div>
              <span className="inline-flex items-center gap-1 font-black text-orange-300">
                <Flame className="h-3.5 w-3.5" /> {m.streak}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
