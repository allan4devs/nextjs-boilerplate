import type { Db } from "mongodb";
import { PRODUCT_SALES_COLLECTION } from "./shared/config";
import {
  DEFAULT_PRODUCT_INVESTORS, investmentMonthRange, summarizeInvestments,
  type InvestmentInput, type ProductInvestor, type ProductInvestmentEntry, type ProductInvestmentReport,
} from "./product-investment-model";

export { investmentMonthRange } from "./product-investment-model";
export type { ProductInvestmentReport } from "./product-investment-model";
export const PRODUCT_INVESTMENTS_COLLECTION = "xtreme_gym_product_investments";
export const PRODUCT_INVESTORS_COLLECTION = "xtreme_gym_product_investors";
export type ProductInvestmentDoc = Omit<InvestmentInput, "investorId" | "status" | "invoiceReference"> & {
  id: string; investorId?: string; status?: InvestmentInput["status"]; invoiceReference?: string;
  revision?: number; source: string; reportedAt: Date; createdAt: Date;
  updatedAt?: Date; updatedBy?: string; updatedById?: string; deletedAt?: Date;
};
export type ProductInvestorDoc = ProductInvestor & { _id: string; nameKey: string; updatedAt: Date; updatedBy: string };

export async function listProductInvestors(db: Db): Promise<ProductInvestor[]> {
  const stored = await db.collection<ProductInvestorDoc>(PRODUCT_INVESTORS_COLLECTION).find({}).toArray();
  const merged = new Map(DEFAULT_PRODUCT_INVESTORS.map((row) => [row.id, row]));
  for (const row of stored) merged.set(row.id, { id: row.id, name: row.name, description: row.description, active: row.active, revision: row.revision });
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getProductInvestmentReport(db: Db, month: string): Promise<ProductInvestmentReport> {
  const range = investmentMonthRange(month);
  if (!range) throw new Error("invalid_month");
  const [docs, sales, investors] = await Promise.all([
    db.collection<ProductInvestmentDoc>(PRODUCT_INVESTMENTS_COLLECTION)
      .find({ accountingMonth: month, deletedAt: { $exists: false } }, { projection: { _id: 0 } })
      .sort({ createdAt: 1, id: 1 }).toArray(),
    db.collection(PRODUCT_SALES_COLLECTION).aggregate<{ totalIncome: number; saleCount: number }>([
      { $match: { createdAt: { $gte: range.from, $lt: range.to } } },
      { $group: { _id: null, totalIncome: { $sum: "$total" }, saleCount: { $sum: 1 } } },
    ]).next(),
    listProductInvestors(db),
  ]);
  const entries: ProductInvestmentEntry[] = docs.map((row) => ({
    id: row.id, accountingMonth: row.accountingMonth, investorId: row.investorId ?? null,
    concept: row.concept, amountCrc: row.amountCrc, quantity: row.quantity,
    purchaseDate: row.purchaseDate, needsVerification: row.needsVerification,
    status: row.status ?? "reported", note: row.note, invoiceReference: row.invoiceReference ?? "",
    revision: row.revision ?? 0, source: row.source, updatedBy: row.updatedBy ?? "",
  }));
  return { month, entries, investors, ...summarizeInvestments(entries, investors, sales?.totalIncome ?? 0, sales?.saleCount ?? 0) };
}
