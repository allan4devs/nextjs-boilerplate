export const INVESTMENT_STATUS_LABEL = {
  reported: "Reportado", pending_delivery: "Pendiente de entrega", delivered: "Entregado",
} as const;
export type InvestmentStatus = keyof typeof INVESTMENT_STATUS_LABEL;
export type ProductInvestor = { id: string; name: string; description: string; active: boolean; revision: number };
export const DEFAULT_PRODUCT_INVESTORS: ProductInvestor[] = [
  { id: "david", name: "David Mendoza", description: "Barritas", active: true, revision: 0 },
  { id: "aurelia", name: "Aurelia", description: "Productos de batidos", active: true, revision: 0 },
  { id: "alberto", name: "Alberto", description: "Latas", active: true, revision: 0 },
];
export type InvestmentInput = {
  accountingMonth: string; investorId: string; concept: string; amountCrc: number | null;
  quantity: number | null; purchaseDate: string | null; needsVerification: boolean;
  status: InvestmentStatus; note: string; invoiceReference: string;
};
export type ProductInvestmentEntry = Omit<InvestmentInput, "investorId"> & {
  id: string; investorId: string | null; revision: number; source: string; updatedBy: string;
};
export function investmentMonthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const from = new Date(`${month}-01T00:00:00-06:00`);
  if (!Number.isFinite(from.getTime())) return null;
  const to = new Date(from);
  to.setUTCMonth(to.getUTCMonth() + 1);
  if (!Number.isFinite(to.getTime())) return null;
  return { from, to };
}
function boundedText(value: unknown, label: string, max: number, required = false) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new Error(`${label}: revisá el texto (máximo ${max} caracteres).`);
  return value.trim();
}
function optionalNumber(value: unknown, label: string, max: number, integer = false) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) throw new Error(`${label}: ingresá un número válido entre 0 y ${max}.`);
  return Math.round(value * 100) / 100;
}
export function validateInvestment(input: Record<string, unknown>): InvestmentInput {
  const accountingMonth = boundedText(input.accountingMonth, "Mes", 7, true);
  if (!investmentMonthRange(accountingMonth)) throw new Error("Elegí un mes contable válido.");
  const purchaseDate = input.purchaseDate === null ? null : boundedText(input.purchaseDate, "Fecha", 10, true);
  if (purchaseDate && (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) || !Number.isFinite(Date.parse(`${purchaseDate}T12:00:00Z`)) || new Date(`${purchaseDate}T12:00:00Z`).toISOString().slice(0, 10) !== purchaseDate)) throw new Error("La fecha de compra no es válida.");
  if (typeof input.needsVerification !== "boolean" || typeof input.status !== "string" || !Object.hasOwn(INVESTMENT_STATUS_LABEL, input.status)) throw new Error("Revisá el estado de la inversión.");
  return {
    accountingMonth, purchaseDate,
    investorId: boundedText(input.investorId, "Inversionista", 80, true),
    concept: boundedText(input.concept, "Concepto", 160, true),
    amountCrc: optionalNumber(input.amountCrc, "Monto", 1_000_000_000),
    quantity: optionalNumber(input.quantity, "Cantidad", 1_000_000, true),
    needsVerification: input.needsVerification, status: input.status as InvestmentStatus,
    note: boundedText(input.note, "Detalle", 2000),
    invoiceReference: boundedText(input.invoiceReference, "Factura / referencia", 120),
  };
}
export function validateInvestor(input: Record<string, unknown>) {
  if (typeof input.active !== "boolean") throw new Error("Revisá si el inversionista está activo.");
  return {
    name: boundedText(input.name, "Nombre", 100, true),
    description: boundedText(input.description, "Descripción", 160), active: input.active,
  };
}
export function investorNameKey(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
export function summarizeInvestments(entries: ProductInvestmentEntry[], investors: ProductInvestor[], totalIncome: number, saleCount: number) {
  const sum = (rows: ProductInvestmentEntry[]) => rows.reduce((total, row) => total + (row.amountCrc ?? 0), 0);
  const reportedInvestment = sum(entries);
  const byInvestor = investors.map((investor) => {
    const rows = entries.filter((entry) => entry.investorId === investor.id);
    return { ...investor, reportedInvestment: sum(rows), entryCount: rows.length,
      pendingAmounts: rows.filter((entry) => entry.amountCrc === null).length,
      pendingDeliveries: rows.filter((entry) => entry.status === "pending_delivery").length };
  });
  const unassigned = entries.filter((entry) => !investors.some((investor) => investor.id === entry.investorId));
  return { byInvestor, summary: {
    totalIncome, saleCount, reportedInvestment,
    investmentToVerify: sum(entries.filter((entry) => entry.needsVerification)),
    pendingAmounts: entries.filter((entry) => entry.amountCrc === null).length,
    unassignedCount: unassigned.length, unassignedInvestment: sum(unassigned),
    balance: totalIncome - reportedInvestment,
    remainingToRecover: Math.max(0, reportedInvestment - totalIncome),
    recoveryPercent: reportedInvestment > 0 ? Math.min(100, totalIncome / reportedInvestment * 100) : null,
  } };
}
export type ProductInvestmentReport = ReturnType<typeof summarizeInvestments> & {
  month: string; entries: ProductInvestmentEntry[]; investors: ProductInvestor[];
};
