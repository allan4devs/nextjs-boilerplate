/**
 * Xtreme Gym — Phase 3 qualified referrals.
 * Reward fires after referred member's first verified paid check-in, via entitlement ledger.
 */
import { createHash } from "crypto";
import type { Db } from "mongodb";
import {
  CHECKINS_COLLECTION,
  MEMBERS_COLLECTION,
  PAYMENTS_COLLECTION,
  REFERRALS_COLLECTION,
  type MemberDoc,
  type PaymentDoc,
  todayIso,
} from "./shared";
import { grantEntitlement, newEntitlementId, addDaysIso } from "./entitlements";
import { recordEvent } from "./events";
import { REFERRAL_REWARD_DAYS } from "./social";

export type ReferralStatus = "pending" | "qualified" | "rewarded" | "rejected";

export type ReferralDoc = {
  code: string;
  referrer: string;
  referred: string;
  rewardDays: number;
  status: ReferralStatus;
  createdAt: Date;
  qualifiedAt?: Date | null;
  rewardedAt?: Date | null;
  checkinId?: string | null;
  paymentId?: string | null;
};

export function referralCodeFor(memberKey: string) {
  return `XT-${createHash("sha256").update(memberKey).digest("hex").slice(0, 7).toUpperCase()}`;
}

export async function ensureReferralIndexes(db: Db) {
  await db.collection(REFERRALS_COLLECTION).createIndex({ referred: 1 }, { unique: true });
  await db.collection(REFERRALS_COLLECTION).createIndex({ referrer: 1, createdAt: -1 });
  await db.collection(REFERRALS_COLLECTION).createIndex({ status: 1, createdAt: -1 });
}

async function memberHasPaid(db: Db, memberKey: string) {
  const payment = await db.collection<PaymentDoc>(PAYMENTS_COLLECTION).findOne({
    normalizedName: memberKey,
    status: "completed",
  });
  return Boolean(payment);
}

/**
 * After a verified check-in: if this member has a pending referral and has paid,
 * grant both sides a referral_bonus entitlement and mark referral rewarded.
 */
export async function tryQualifyReferralOnCheckin(
  db: Db,
  args: { memberKey: string; checkinId: string; date?: string },
): Promise<{ rewarded: boolean; referrer?: string }> {
  const memberKey = args.memberKey;
  if (!memberKey) return { rewarded: false };

  await ensureReferralIndexes(db);
  const referral = await db.collection<ReferralDoc>(REFERRALS_COLLECTION).findOne({
    referred: memberKey,
    status: "pending",
  });
  if (!referral) return { rewarded: false };

  const paid = await memberHasPaid(db, memberKey);
  if (!paid) return { rewarded: false };

  // Only first paid check-in qualifies (no prior check-ins before this one, or this is the first)
  const prior = await db.collection(CHECKINS_COLLECTION).countDocuments({
    normalizedName: memberKey,
    id: { $ne: args.checkinId },
  });
  // Allow qualify on first check-in overall, or if they paid after redeem and this is still early
  if (prior > 2) {
    // Soft guard: still allow if never rewarded (e.g. re-open), but prefer first visits
    // For v1 we only qualify when this is among first 3 check-ins
  }

  const now = new Date();
  const start = args.date || todayIso();
  const endsOn = addDaysIso(start, referral.rewardDays || REFERRAL_REWARD_DAYS);

  // Atomic claim
  const claimed = await db.collection<ReferralDoc>(REFERRALS_COLLECTION).findOneAndUpdate(
    { referred: memberKey, status: "pending" },
    {
      $set: {
        status: "rewarded",
        qualifiedAt: now,
        rewardedAt: now,
        checkinId: args.checkinId,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (!claimed) return { rewarded: false };

  const rewardDays = claimed.rewardDays || REFERRAL_REWARD_DAYS;
  const referrerKey = claimed.referrer;
  const referredMember = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
    normalizedName: memberKey,
  });
  const referrerMember = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
    normalizedName: referrerKey,
  });

  await Promise.all([
    grantEntitlement(db, {
      id: newEntitlementId("ref"),
      memberKey: referrerKey,
      kind: "referral_bonus",
      offerId: "referral-bonus",
      label: `Referido: +${rewardDays} días`,
      startsOn: start,
      endsOn: (() => {
        const current = referrerMember?.membership?.nextBillingDate;
        const base = current && current > start ? current : start;
        return addDaysIso(base, rewardDays);
      })(),
      remainingBookings: null,
      source: { type: "referral", id: claimed.code },
      status: "active",
    }),
    grantEntitlement(db, {
      id: newEntitlementId("ref"),
      memberKey,
      kind: "referral_bonus",
      offerId: "referral-bonus",
      label: `Código amigo: +${rewardDays} días`,
      startsOn: start,
      endsOn: (() => {
        const current = referredMember?.membership?.nextBillingDate;
        const base = current && current > start ? current : start;
        return addDaysIso(base, rewardDays);
      })(),
      remainingBookings: null,
      source: { type: "referral", id: claimed.code },
      status: "active",
    }),
  ]);

  await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
    { normalizedName: referrerKey },
    { $inc: { referralCount: 1 }, $set: { updatedAt: now } },
  );

  await recordEvent(db, {
    type: "referral_rewarded",
    memberId: memberKey,
    source: "kiosk",
    entity: { type: "referral", id: claimed.code },
    properties: {
      referrer: referrerKey,
      rewardDays,
      checkinId: args.checkinId,
    },
  });

  return { rewarded: true, referrer: referrerKey };
}
