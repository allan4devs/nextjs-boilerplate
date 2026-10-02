import type { Db } from "mongodb";
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type ProductSaleDoc,
} from "@/lib/xtreme/product-inventory";
import {
  AUDIT_COLLECTION,
  PRODUCT_INVENTORY_COLLECTION,
  PRODUCT_SALES_COLLECTION,
  type AuditDoc,
} from "@/lib/xtreme/shared";

export type ReportCategory = ProductCategory | "otros";

export type ProductSalesReport = {
  range: { from: Date; to: Date };
  summary: {
    totalIncome: number;
    saleCount: number;
    unitsSold: number;
    averageTicket: number;
    cashIncome: number;
    sinpeIncome: number;
    cashSaleCount: number;
    sinpeSaleCount: number;
    mixedSaleCount: number;
    adjustmentCount: number;
  };
  categorySummary: Array<{
    category: ReportCategory;
    unitsSold: number;
    saleCount: number;
    totalIncome: number;
    products: Array<{
      productId: string;
      name: string;
      unitsSold: number;
      saleCount: number;
      totalIncome: number;
      averageUnitPrice: number;
    }>;
  }>;
  sales: ProductSaleDoc[];
  adjustments: Array<{
    id: string;
    at: Date;
    actorRole: string;
    summary: string;
    productId: string;
    meta: AuditDoc["meta"];
  }>;
};

export const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  bebidas: "Bebidas",
  proteinas: "Proteínas",
  creatinas: "Creatinas",
  hidratantes: "Hidratantes",
  chicles: "Chicles",
  otros: "Otros productos",
};

const REPORT_CATEGORY_ORDER: ReportCategory[] = [...PRODUCT_CATEGORIES, "otros"];

function normalizedProductName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function reportCategoryFor(category: unknown, productName: string): ReportCategory {
  if (PRODUCT_CATEGORIES.includes(category as ProductCategory)) return category as ProductCategory;

  const name = normalizedProductName(productName);
  if (/agua|monster|powerade|redcon|\busn\b|c4 en lata|amino energy lata/.test(name)) return "bebidas";
  if (/barra|barrita|batido/.test(name)) return "proteinas";
  if (/creatina/.test(name)) return "creatinas";
  if (/\bc4\b|electrolito|hidrat/.test(name)) return "hidratantes";
  if (/chicle|pina/.test(name)) return "chicles";
  return "otros";
}

export async function getProductSalesReport(db: Db, from: Date, to: Date): Promise<ProductSalesReport> {
  const safeFrom = from <= to ? from : to;
  const safeTo = from <= to ? to : from;
  const salesRange = { createdAt: { $gte: safeFrom, $lte: safeTo } };
  const adjustmentRange = { action: "product_inventory_adjusted", at: { $gte: safeFrom, $lte: safeTo } };

  const [sales, totals, adjustments, adjustmentCount, productSummary] = await Promise.all([
    db.collection<ProductSaleDoc>(PRODUCT_SALES_COLLECTION)
      .find(salesRange)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
    db.collection<ProductSaleDoc>(PRODUCT_SALES_COLLECTION)
      .aggregate<{
        totalIncome: number;
        saleCount: number;
        unitsSold: number;
        cashIncome: number;
        sinpeIncome: number;
        cashSaleCount: number;
        sinpeSaleCount: number;
        mixedSaleCount: number;
      }>([
        { $match: salesRange },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: "$total" },
            saleCount: { $sum: 1 },
            cashIncome: { $sum: { $ifNull: ["$cashAmount", 0] } },
            sinpeIncome: { $sum: { $ifNull: ["$sinpeAmount", 0] } },
            cashSaleCount: { $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, 1, 0] } },
            sinpeSaleCount: { $sum: { $cond: [{ $eq: ["$paymentMethod", "sinpe"] }, 1, 0] } },
            mixedSaleCount: { $sum: { $cond: [{ $eq: ["$paymentMethod", "mixed"] }, 1, 0] } },
            unitsSold: {
              $sum: {
                $reduce: {
                  input: "$items",
                  initialValue: 0,
                  in: { $add: ["$$value", "$$this.quantity"] },
                },
              },
            },
          },
        },
      ])
      .next(),
    db.collection<AuditDoc>(AUDIT_COLLECTION)
      .find(adjustmentRange)
      .sort({ at: -1 })
      .limit(100)
      .toArray(),
    db.collection<AuditDoc>(AUDIT_COLLECTION).countDocuments(adjustmentRange),
    db.collection<ProductSaleDoc>(PRODUCT_SALES_COLLECTION)
      .aggregate<{
        _id: { productId: string; category?: ProductCategory };
        name: string;
        unitsSold: number;
        totalIncome: number;
        saleIds: string[];
      }>([
        { $match: salesRange },
        { $sort: { createdAt: 1 } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: PRODUCT_INVENTORY_COLLECTION,
            localField: "items.productId",
            foreignField: "id",
            as: "inventoryProduct",
          },
        },
        {
          $set: {
            reportCategory: {
              $ifNull: [
                "$items.category",
                { $arrayElemAt: ["$inventoryProduct.category", 0] },
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              productId: {
                $ifNull: [
                  "$items.productId",
                  { $toLower: { $trim: { input: "$items.name" } } },
                ],
              },
              category: "$reportCategory",
            },
            name: { $last: "$items.name" },
            unitsSold: { $sum: "$items.quantity" },
            totalIncome: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } },
            saleIds: { $addToSet: "$id" },
          },
        },
        { $sort: { unitsSold: -1, totalIncome: -1, name: 1 } },
      ])
      .toArray(),
  ]);

  const totalIncome = totals?.totalIncome ?? 0;
  const saleCount = totals?.saleCount ?? 0;
  const unitsSold = totals?.unitsSold ?? 0;
  const categoryBuckets = new Map<ReportCategory, {
    unitsSold: number;
    totalIncome: number;
    saleIds: Set<string>;
    products: ProductSalesReport["categorySummary"][number]["products"];
  }>();

  for (const product of productSummary) {
    const category = reportCategoryFor(product._id.category, product.name);
    const bucket = categoryBuckets.get(category) ?? {
      unitsSold: 0,
      totalIncome: 0,
      saleIds: new Set<string>(),
      products: [],
    };
    bucket.unitsSold += product.unitsSold;
    bucket.totalIncome += product.totalIncome;
    for (const saleId of product.saleIds) bucket.saleIds.add(saleId);
    bucket.products.push({
      productId: product._id.productId,
      name: product.name,
      unitsSold: product.unitsSold,
      saleCount: product.saleIds.length,
      totalIncome: product.totalIncome,
      averageUnitPrice: product.unitsSold
        ? Math.round(product.totalIncome / product.unitsSold)
        : 0,
    });
    categoryBuckets.set(category, bucket);
  }

  const categorySummary = REPORT_CATEGORY_ORDER.flatMap((category) => {
    const bucket = categoryBuckets.get(category);
    if (!bucket) return [];
    return [{
      category,
      unitsSold: bucket.unitsSold,
      saleCount: bucket.saleIds.size,
      totalIncome: bucket.totalIncome,
      products: bucket.products.sort((a, b) =>
        b.unitsSold - a.unitsSold || b.totalIncome - a.totalIncome || a.name.localeCompare(b.name, "es"),
      ),
    }];
  });

  return {
    range: { from: safeFrom, to: safeTo },
    summary: {
      totalIncome,
      saleCount,
      unitsSold,
      averageTicket: saleCount ? Math.round(totalIncome / saleCount) : 0,
      cashIncome: totals?.cashIncome ?? 0,
      sinpeIncome: totals?.sinpeIncome ?? 0,
      cashSaleCount: totals?.cashSaleCount ?? 0,
      sinpeSaleCount: totals?.sinpeSaleCount ?? 0,
      mixedSaleCount: totals?.mixedSaleCount ?? 0,
      adjustmentCount,
    },
    categorySummary,
    sales,
    adjustments: adjustments.map((entry) => ({
      id: entry.id,
      at: entry.at,
      actorRole: entry.actorRole,
      summary: entry.summary,
      productId: entry.targetId,
      meta: entry.meta ?? {},
    })),
  };
}
