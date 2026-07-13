"use client";

import { Calendar, CheckCircle2, Clock, CreditCard, Receipt, XCircle } from "lucide-react";
import { GamePanel } from "../GameOS";
import type { EntitlementRecord, PaymentRecord } from "./types";

function formatCrc(amount: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("es-CR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const METHOD_LABELS: Record<string, string> = {
  paypal: "PayPal",
  cash: "Efectivo",
  transfer: "Transferencia",
  sinpe: "SINPE Móvil",
  other: "Otro",
};

const STATUS_ICONS = {
  completed: CheckCircle2,
  pending: Clock,
  refunded: XCircle,
};

export default function PaymentHistory({
  payments,
  entitlements,
}: {
  payments: PaymentRecord[];
  entitlements: EntitlementRecord[];
}) {
  return (
    <div className="space-y-4">
      {/* Active Entitlements */}
      {entitlements.length > 0 && (
        <GamePanel title="Membresías Activas" icon={CreditCard}>
          <div className="space-y-2">
            {entitlements.map((ent) => (
              <div
                key={ent.id}
                className="flex items-center justify-between rounded-lg border border-[#d8ff3e]/20 bg-black/20 p-3"
              >
                <div>
                  <p className="font-bold text-white">{ent.label || ent.kind}</p>
                  <p className="text-sm text-gray-400">
                    {formatDate(ent.startsOn)} - {formatDate(ent.endsOn)}
                  </p>
                  {ent.remainingBookings !== null && (
                    <p className="text-xs text-[#d8ff3e]">
                      {ent.remainingBookings} clases disponibles
                    </p>
                  )}
                </div>
                <div
                  className={`rounded px-2 py-1 text-xs font-bold ${
                    ent.status === "active" ? "bg-[#d8ff3e] text-black" : "bg-gray-600 text-white"
                  }`}
                >
                  {ent.status}
                </div>
              </div>
            ))}
          </div>
        </GamePanel>
      )}

      {/* Payment History */}
      <GamePanel title="Historial de Pagos" icon={Receipt}>
        {payments.length === 0 ? (
          <p className="py-6 text-center text-gray-400">No hay pagos registrados aún.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => {
              const StatusIcon =
                STATUS_ICONS[payment.status as keyof typeof STATUS_ICONS] || CheckCircle2;
              return (
                <div
                  key={payment.id}
                  className="rounded-lg border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4 text-[#d8ff3e]" />
                        <p className="font-bold text-white">{payment.optionLabel}</p>
                      </div>
                      <div className="mt-1 space-y-1 text-sm text-gray-400">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {formatDate(payment.date)}
                        </p>
                        <p>
                          Método:{" "}
                          <span className="text-white">
                            {METHOD_LABELS[payment.method] || payment.method}
                          </span>
                        </p>
                        {payment.note && <p className="italic text-xs">{payment.note}</p>}
                        {payment.paypalCaptureId && (
                          <p className="font-mono text-xs text-gray-500">
                            ID: {payment.paypalCaptureId.slice(-8)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#d8ff3e]">
                        {formatCrc(payment.amountCrc)}
                      </p>
                      <p className="text-xs text-gray-500">${payment.amountUsd.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GamePanel>
    </div>
  );
}
