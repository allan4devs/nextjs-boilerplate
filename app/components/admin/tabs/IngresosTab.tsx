"use client";

import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Search,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import {
  GameChip,
} from "../../GameOS";
import {
  BarTrendChart,
  CHART_LIME,
} from "../../charts";
import { money } from "../helpers";
import { Kpi } from "../ui";
import type { PaymentDraft } from "../hooks/usePaymentDraft";
import type { Revenue } from "../types";

export type IngresosTabProps = {
  /** Prop propia y no `revenue`: sin ingresos este tab no se muestra. */
  revenue: Revenue;
  busy: string;
  payments: PaymentDraft;
  onSavePayment: () => void;
  onDeletePayment: (id: string) => void;
  /** Reporta un error de validación del formulario de cobro. */
  onError: (message: string) => void;
};

export function IngresosTab({ revenue, busy, payments, onSavePayment, onDeletePayment, onError }: IngresosTabProps) {
  const {
    paymentForm,
    setPaymentForm,
    paymentMemberQuery,
    setPaymentMemberQuery,
    selectedPaymentMember,
    setSelectedPaymentMember,
    paymentMemberMatches,
  } = payments;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Banknote} label="Hoy" value={money(revenue.today.crc)} accent="from-amber-300 to-yellow-400" />
        <Kpi icon={TrendingUp} label="7 dias" value={money(revenue.week.crc)} accent="from-lime-300 to-emerald-400" />
        <Kpi icon={CreditCard} label="Mes" value={money(revenue.month.crc)} accent="from-cyan-300 to-sky-500" />
        <Kpi icon={Trophy} label="Pagos mes" value={`${revenue.month.count}`} accent="from-fuchsia-400 to-rose-400" />
      </div>

      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-lime-300" />
          <h2 className="text-lg font-black uppercase">Ingresos por dia - ultimos 14 dias</h2>
        </div>
        <div className="mt-4 border border-white/10 bg-black/25 p-3">
          <BarTrendChart
            data={(revenue.daily ?? []).map((d) => ({ date: d.date, value: d.crc }))}
            unit="CRC"
            color={CHART_LIME}
            height={170}
            compactValue={(v) =>
              v >= 1000 ? `${(v / 1000).toLocaleString("es-CR", { maximumFractionDigits: 1 })}k` : `${v}`
            }
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-black uppercase text-white/70">Por producto (mes)</h2>
          <div className="mt-4 space-y-3">
            {revenue.byOption.map((o) => (
              <div key={o.optionId} className="flex items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 py-2.5">
                <div>
                  <p className="text-sm font-black uppercase">{o.label}</p>
                  <p className="text-[11px] text-white/40">{o.count} pagos</p>
                </div>
                <span className="font-black text-amber-200">{money(o.crc)}</span>
              </div>
            ))}
            {!revenue.byOption.length && (
              <p className="text-sm font-semibold text-white/40">Sin pagos este mes.</p>
            )}
          </div>
        </div>
        <div className="border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-black uppercase text-white/70">Registrar pago manual</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="relative sm:col-span-2">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                Socio registrado
              </p>
              {selectedPaymentMember ? (
                <div className="flex items-center gap-3 border border-lime-300/60 bg-lime-300/10 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center bg-lime-300 font-black text-black">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase">
                      {selectedPaymentMember.memberName}
                    </p>
                    <p className="truncate text-xs font-semibold text-white/45">
                      {selectedPaymentMember.cedula
                        ? `Céd. ${selectedPaymentMember.cedula} · `
                        : ""}
                      {selectedPaymentMember.email || selectedPaymentMember.accessCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPaymentMember(null);
                      setPaymentMemberQuery("");
                    }}
                    className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 text-white/55 hover:border-white/40 hover:text-white"
                    aria-label="Cambiar socio"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      value={paymentMemberQuery}
                      onChange={(event) => setPaymentMemberQuery(event.target.value)}
                      placeholder="Buscar nombre, cédula, correo o código"
                      autoComplete="off"
                      className="min-h-12 w-full border border-white/12 bg-black/40 pl-10 pr-3 text-sm font-semibold outline-none focus:border-lime-300"
                    />
                  </div>
                  {paymentMemberQuery.trim() && (
                    <div className="xg-mobile-scroll absolute inset-x-0 top-full z-20 max-h-64 overflow-y-auto border border-white/15 bg-[#111] shadow-2xl">
                      {paymentMemberMatches.map((member) => (
                        <button
                          key={member.normalizedName}
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMember(member);
                            setPaymentMemberQuery(member.memberName);
                            onError("");
                          }}
                          className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-left transition last:border-b-0 hover:bg-lime-300/10"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black uppercase">
                              {member.memberName}
                            </span>
                            <span className="block truncate text-xs font-semibold text-white/40">
                              {member.cedula ? `Céd. ${member.cedula} · ` : ""}
                              {member.email || member.phone || member.accessCode}
                            </span>
                          </span>
                          <GameChip tone={member.membershipStatus === "expired" ? "orange" : "lime"}>
                            {member.membershipStatus === "expired" ? "Vencido" : member.plan || "Socio"}
                          </GameChip>
                        </button>
                      ))}
                      {!paymentMemberMatches.length && (
                        <p className="px-3 py-5 text-center text-sm font-semibold text-white/40">
                          No encontramos un socio registrado.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <input
              value={paymentForm.amountCrc}
              onChange={(e) => setPaymentForm((f) => ({ ...f, amountCrc: e.target.value }))}
              placeholder="Monto CRC"
              type="number"
              className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
            />
            <select
              value={paymentForm.method}
              onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
              className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
            >
              <option value="cash">Efectivo</option>
              <option value="sinpe">SINPE</option>
              <option value="transfer">Transferencia</option>
              <option value="paypal">En línea</option>
              <option value="other">Otro</option>
            </select>
            <input
              value={paymentForm.optionLabel}
              onChange={(e) => setPaymentForm((f) => ({ ...f, optionLabel: e.target.value }))}
              placeholder="Concepto"
              className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
            />
            <select
              value={paymentForm.category}
              onChange={(e) => setPaymentForm((f) => ({ ...f, category: e.target.value }))}
              className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
            >
              <option value="Plan">Plan</option>
              <option value="Clase">Clase</option>
              <option value="Otro">Otro</option>
            </select>
            <input
              value={paymentForm.note}
              onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Nota"
              className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300 sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-xs font-bold text-white/60 sm:col-span-2">
              <input
                type="checkbox"
                checked={paymentForm.extendMembership}
                onChange={(e) => setPaymentForm((f) => ({ ...f, extendMembership: e.target.checked }))}
              />
              Extender membresia
              <input
                type="number"
                min={1}
                max={365}
                value={paymentForm.extendDays}
                onChange={(e) => setPaymentForm((f) => ({ ...f, extendDays: e.target.value }))}
                className="w-16 border border-white/12 bg-black/40 px-2 py-1 text-sm"
              />
              dias
            </label>
            <button
              type="button"
              onClick={() => void onSavePayment()}
              disabled={busy === "payment" || !selectedPaymentMember}
              className="inline-flex items-center justify-center gap-2 bg-amber-300 px-4 py-2.5 text-sm font-black uppercase text-black transition hover:bg-white disabled:opacity-50 sm:col-span-2"
            >
              {busy === "payment" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              Guardar pago
            </button>
          </div>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.04]">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-black uppercase">Ultimos pagos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Concepto</th>
                <th className="px-3 py-3">Metodo</th>
                <th className="px-3 py-3">Monto</th>
                <th className="px-3 py-3">Origen</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {revenue.recent.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.06]">
                  <td className="px-5 py-3 text-white/60">{p.date}</td>
                  <td className="px-3 py-3 font-black uppercase">{p.customerName}</td>
                  <td className="px-3 py-3">
                    <div>{p.optionLabel}</div>
                    <div className="text-[11px] text-white/40">{p.category}</div>
                  </td>
                  <td className="px-3 py-3 uppercase text-white/60">{p.method}</td>
                  <td className="px-3 py-3 font-black text-amber-200">{money(p.amountCrc)}</td>
                  <td className="px-3 py-3 text-xs text-white/40">
                    <span className="block uppercase">{p.recordedBy}</span>
                    {p.recordedByStaffName ? (
                      <span className="mt-0.5 block font-bold text-white/65">
                        {p.recordedByStaffName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => void onDeletePayment(p.id)}
                      className="grid h-8 w-8 place-items-center border border-white/10 text-white/40 hover:border-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!revenue.recent.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-white/45">
                    Sin pagos. Usa onSeed demo o registra uno manual.
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
