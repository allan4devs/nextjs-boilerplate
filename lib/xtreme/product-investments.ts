import type { Db } from "mongodb";
import { PRODUCT_SALES_COLLECTION } from "./shared/config";

export const PRODUCT_INVESTMENTS_COLLECTION = "xtreme_gym_product_investments";

export type ProductInvestmentDoc = {
  id: string;
  accountingMonth: string;
  concept: string;
  amountCrc: number | null;
  quantity: number | null;
  purchaseDate: string | null;
  needsVerification: boolean;
  note: string;
  source: string;
  reportedAt: Date;
  createdAt: Date;
};

export function investmentMonthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  // Costa Rica is UTC-6. Use a half-open interval so midnight is counted once.
  const from = new Date(`${month}-01T00:00:00-06:00`);
  const to = new Date(from);
  to.setUTCMonth(to.getUTCMonth() + 1);
  return { from, to };
}

export async function getProductInvestmentReport(db: Db, month: string) {
  const range = investmentMonthRange(month);
  if (!range) throw new Error("invalid_month");
  const [entries, sales] = await Promise.all([
    db.collection<ProductInvestmentDoc>(PRODUCT_INVESTMENTS_COLLECTION)
      .find({ accountingMonth: month }, { projection: { _id: 0 } })
      .sort({ createdAt: 1, id: 1 }).toArray(),
    db.collection(PRODUCT_SALES_COLLECTION).aggregate<{ totalIncome: number; saleCount: number }>([
      { $match: { createdAt: { $gte: range.from, $lt: range.to } } },
      { $group: { _id: null, totalIncome: { $sum: "$total" }, saleCount: { $sum: 1 } } },
    ]).next(),
  ]);
  const reportedInvestment = entries.reduce((total, entry) => total + (entry.amountCrc ?? 0), 0);
  const investmentToVerify = entries.reduce((total, entry) => total + (entry.needsVerification ? entry.amountCrc ?? 0 : 0), 0);
  const pendingAmounts = entries.filter((entry) => entry.amountCrc === null).length;
  const totalIncome = sales?.totalIncome ?? 0;
  return {
    month, entries,
    summary: {
      totalIncome, saleCount: sales?.saleCount ?? 0,
      reportedInvestment, investmentToVerify, pendingAmounts,
      balance: totalIncome - reportedInvestment,
      remainingToRecover: Math.max(0, reportedInvestment - totalIncome),
      recoveryPercent: reportedInvestment > 0 ? Math.min(100, totalIncome / reportedInvestment * 100) : null,
    },
  };
}

export type ProductInvestmentReport = Awaited<ReturnType<typeof getProductInvestmentReport>>;
