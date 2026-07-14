export type XtremeCheckoutOption = {
  id: string;
  label: string;
  category: "Plan" | "Clase";
  priceCrc: number;
  priceLabel: string;
  usdAmount: string;
};

/** Fuente única de precios para la web, Member OS y las órdenes PayPal. */
export const XTREME_CHECKOUT_OPTIONS: XtremeCheckoutOption[] = [
  { id: "day-pass", label: "Pase del día", category: "Clase", priceCrc: 3000, priceLabel: "CRC 3.000", usdAmount: "6.00" },
  { id: "week", label: "Plan semanal", category: "Plan", priceCrc: 8000, priceLabel: "CRC 8.000", usdAmount: "16.00" },
  { id: "fortnight", label: "Plan quincenal", category: "Plan", priceCrc: 13500, priceLabel: "CRC 13.500", usdAmount: "27.00" },
  { id: "month", label: "Plan mensual", category: "Plan", priceCrc: 23000, priceLabel: "CRC 23.000", usdAmount: "46.00" },
  { id: "senior", label: "Clase adultos mayores", category: "Clase", priceCrc: 16000, priceLabel: "CRC 16.000", usdAmount: "32.00" },
];

export function getXtremeCheckoutOption(optionId: unknown) {
  return XTREME_CHECKOUT_OPTIONS.find((option) => option.id === String(optionId ?? ""));
}

export function isFreeOption(option: Pick<XtremeCheckoutOption, "priceCrc"> | undefined | null) {
  return Boolean(option) && Number(option?.priceCrc ?? 0) <= 0;
}
