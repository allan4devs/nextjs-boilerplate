import {
  addCalendarMonths,
  addDays,
  isoDateOrEmpty,
  toUtcDate,
} from "./shared/dates";

export type BillingPeriod =
  | { unit: "days"; count: number }
  | { unit: "months"; count: number };

export type BillingPeriodInput = {
  optionId?: unknown;
  planLabel?: unknown;
  canonicalRate?: unknown;
  fallbackDays?: unknown;
};

function normalized(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es-CR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Resuelve solamente períodos cobrables; matrícula y pases gratuitos quedan fuera. */
export function billingPeriodFor(input: BillingPeriodInput): BillingPeriod | null {
  const optionId = normalized(input.optionId);
  const label = normalized(input.planLabel);
  const rate = normalized(input.canonicalRate);
  const text = `${optionId} ${label} ${rate}`;

  if (/matricul|primer dia|gratis|free|sin plan/.test(text)) return null;
  if (/trimes|quarter/.test(text) || Number(input.fallbackDays) === 90) {
    return { unit: "months", count: 3 };
  }
  if (/quincen|fortnight/.test(text) || Number(input.fallbackDays) === 15) {
    return { unit: "days", count: 15 };
  }
  if (/seman|week/.test(text) || Number(input.fallbackDays) === 7) {
    return { unit: "days", count: 7 };
  }
  if (
    /mensual|month|adultos? mayores?|senior|regular/.test(text) ||
    Number(input.fallbackDays) === 30
  ) {
    return { unit: "months", count: 1 };
  }
  const fallbackDays = Number(input.fallbackDays);
  if (Number.isInteger(fallbackDays) && fallbackDays > 0 && fallbackDays <= 365) {
    return { unit: "days", count: fallbackDays };
  }
  return null;
}

function moveBillingDate(dateIso: unknown, period: BillingPeriod, direction: 1 | -1) {
  const date = isoDateOrEmpty(dateIso);
  if (!date) return "";
  const base = toUtcDate(date);
  const moved =
    period.unit === "months"
      ? addCalendarMonths(base, period.count * direction)
      : addDays(base, period.count * direction);
  return moved.toISOString().slice(0, 10);
}

/** Próximo cobro calculado exclusivamente desde la fecha real del pago. */
export function nextBillingDateFromPayment(
  paymentDate: unknown,
  input: BillingPeriodInput,
): string {
  const period = billingPeriodFor(input);
  return period ? moveBillingDate(paymentDate, period, 1) : "";
}

/** Último pago inferido desde un vencimiento importado y su tarifa conocida. */
export function previousPaymentDateFromBilling(
  nextBillingDate: unknown,
  input: BillingPeriodInput,
): string {
  const period = billingPeriodFor(input);
  return period ? moveBillingDate(nextBillingDate, period, -1) : "";
}
