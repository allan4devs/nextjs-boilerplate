/**
 * Xtreme Gym — Phase 3 offers (day-pass → plan credit).
 * Server-calculated pricing; client never supplies the trusted amount.
 */
import type { Db } from "mongodb";
import { todayIso } from "./shared";
import { addDaysIso } from "./entitlements";

/** Minimal catalog shape for server-side pricing (avoids importing app routes). */
export type PricedOption = {
  id: string;
  priceCrc: number;
  usdAmount: string;
};

export const DAY_PASS_CREDITS_COLLECTION = "xtreme_gym_day_pass_credits";

/** CRC amount applied toward a weekly/monthly plan after a day-pass. */
export const DAY_PASS_CREDIT_CRC = 3000;
/** USD equivalent used for PayPal discount (matches catalog day-pass). */
export const DAY_PASS_CREDIT_USD = 6;
/** Days after day-pass purchase during which credit can be applied. */
export const DAY_PASS_CREDIT_WINDOW_DAYS = 7;

export type DayPassCreditStatus = "pending" | "applied" | "expired" | "revoked";

export type DayPassCreditDoc = {
  id: string;
  memberKey: string;
  memberName: string;
  sourcePaymentId: string;
  amountCrc: number;
  amountUsd: number;
  status: DayPassCreditStatus;
  /** Inclusive expiry date YYYY-MM-DD */
  expiresOn: string;
  createdAt: Date;
  updatedAt: Date;
  appliedAt?: Date | null;
  appliedPaymentId?: string | null;
  appliedOptionId?: string | null;
};

export function newCreditId() {
  return `dpc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function planOptionsEligibleForCredit(optionId: string) {
  return optionId === "week" || optionId === "fortnight" || optionId === "month";
}

/** Server price after applying at most one pending day-pass credit. */
export function priceWithDayPassCredit(option: PricedOption, credit: DayPassCreditDoc | null) {
  if (!credit || credit.status !== "pending") {
    return {
      priceCrc: option.priceCrc,
      usdAmount: option.usdAmount,
      creditAppliedCrc: 0,
      creditAppliedUsd: 0,
      creditId: null as string | null,
    };
  }
  if (!planOptionsEligibleForCredit(option.id)) {
    return {
      priceCrc: option.priceCrc,
      usdAmount: option.usdAmount,
      creditAppliedCrc: 0,
      creditAppliedUsd: 0,
      creditId: null as string | null,
    };
  }
  const creditCrc = Math.min(credit.amountCrc, option.priceCrc);
  const baseUsd = Number(option.usdAmount);
  const creditUsd = Math.min(credit.amountUsd, Math.max(0, baseUsd - 1)); // keep ≥ $1 for PayPal
  const finalUsd = Math.max(1, Math.round((baseUsd - creditUsd) * 100) / 100);
  return {
    priceCrc: Math.max(0, option.priceCrc - creditCrc),
    usdAmount: finalUsd.toFixed(2),
    creditAppliedCrc: creditCrc,
    creditAppliedUsd: Math.round((baseUsd - finalUsd) * 100) / 100,
    creditId: credit.id,
  };
}

export async function ensureCreditIndexes(db: Db) {
  await db.collection(DAY_PASS_CREDITS_COLLECTION).createIndex({ memberKey: 1, status: 1, expiresOn: 1 });
  await db.collection(DAY_PASS_CREDITS_COLLECTION).createIndex({ sourcePaymentId: 1 }, { unique: true });
  await db.collection(DAY_PASS_CREDITS_COLLECTION).createIndex({ id: 1 }, { unique: true });
}

export async function grantDayPassCredit(
  db: Db,
  args: {
    memberKey: string;
    memberName: string;
    paymentId: string;
    startDate?: string;
  },
): Promise<DayPassCreditDoc> {
  await ensureCreditIndexes(db);
  const now = new Date();
  const start = args.startDate || todayIso();
  const doc: DayPassCreditDoc = {
    id: newCreditId(),
    memberKey: args.memberKey,
    memberName: args.memberName,
    sourcePaymentId: args.paymentId,
    amountCrc: DAY_PASS_CREDIT_CRC,
    amountUsd: DAY_PASS_CREDIT_USD,
    status: "pending",
    expiresOn: addDaysIso(start, DAY_PASS_CREDIT_WINDOW_DAYS),
    createdAt: now,
    updatedAt: now,
    appliedAt: null,
    appliedPaymentId: null,
    appliedOptionId: null,
  };
  try {
    await db.collection<DayPassCreditDoc>(DAY_PASS_CREDITS_COLLECTION).insertOne(doc);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      const existing = await db
        .collection<DayPassCreditDoc>(DAY_PASS_CREDITS_COLLECTION)
        .findOne({ sourcePaymentId: args.paymentId });
      if (existing) return existing;
    }
    throw error;
  }
  return doc;
}

export async function findPendingDayPassCredit(
  db: Db,
  memberKey: string,
  onDate = todayIso(),
): Promise<DayPassCreditDoc | null> {
  if (!memberKey) return null;
  // Expire stale credits lazily
  await db.collection<DayPassCreditDoc>(DAY_PASS_CREDITS_COLLECTION).updateMany(
    { memberKey, status: "pending", expiresOn: { $lt: onDate } },
    { $set: { status: "expired", updatedAt: new Date() } },
  );
  return db.collection<DayPassCreditDoc>(DAY_PASS_CREDITS_COLLECTION).findOne({
    memberKey,
    status: "pending",
    expiresOn: { $gte: onDate },
  });
}

export async function markDayPassCreditApplied(
  db: Db,
  args: { creditId: string; paymentId: string; optionId: string },
) {
  const now = new Date();
  const result = await db.collection<DayPassCreditDoc>(DAY_PASS_CREDITS_COLLECTION).findOneAndUpdate(
    { id: args.creditId, status: "pending" },
    {
      $set: {
        status: "applied",
        appliedAt: now,
        appliedPaymentId: args.paymentId,
        appliedOptionId: args.optionId,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  return result;
}
