/**
 * Xtreme Gym — Entitlement engine (Strategy 2.0 §6.1).
 * Pure decision + ledger-backed grants. Payments create entitlements;
 * reservations consume them; refunds revoke them.
 */
import type { Db } from "mongodb";
import {
  ENTITLEMENT_LEDGER_COLLECTION,
  ENTITLEMENTS_COLLECTION,
  MEMBERS_COLLECTION,
  membershipStatus,
  todayIso,
  type MemberDoc,
} from "./shared";

export type EntitlementKind = "plan" | "day_pass" | "class_credit" | "referral_bonus" | "admin_grant";

export type EntitlementStatus = "active" | "exhausted" | "revoked" | "expired";

export type EntitlementSource = {
  type: "payment" | "referral" | "admin" | "migration" | "renewal";
  id: string;
};

export type EntitlementDoc = {
  id: string;
  memberKey: string;
  kind: EntitlementKind;
  /** Catalog option id: week, month, day-pass, etc. */
  offerId?: string;
  label?: string;
  /** Empty / omit = all trainings */
  trainingIds?: string[];
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD inclusive
  /** null = unlimited class bookings within window */
  remainingBookings: number | null;
  source: EntitlementSource;
  status: EntitlementStatus;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date | null;
  revokeReason?: string;
};

export type LedgerEntry = {
  id: string;
  memberKey: string;
  entitlementId: string;
  action: "grant" | "extend" | "consume" | "revoke" | "refund";
  deltaDays?: number;
  deltaBookings?: number;
  note?: string;
  source: EntitlementSource;
  at: Date;
};

export type BookDecision =
  | { allowed: true; entitlementId: string; entitlement: EntitlementDoc }
  | {
      allowed: false;
      reason: "expired" | "payment_required" | "limit_reached" | "wrong_class" | "no_member";
      message: string;
    };

export function newEntitlementId(prefix = "ent") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newLedgerId() {
  return `led-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function coversTraining(ent: EntitlementDoc, trainingId?: string) {
  if (!trainingId) return true;
  const list = ent.trainingIds;
  if (!list || !list.length) return true;
  return list.includes(trainingId);
}

function isActiveOn(ent: EntitlementDoc, date: string) {
  if (ent.status === "revoked" || ent.status === "exhausted") return false;
  if (date < ent.startsOn || date > ent.endsOn) return false;
  if (ent.remainingBookings !== null && ent.remainingBookings <= 0) return false;
  return true;
}

/**
 * Pure decision: can this member book this class on this date?
 * Prefer the tightest (soonest-ending) matching entitlement.
 */
export function canBook(
  entitlements: EntitlementDoc[],
  args: { trainingId?: string; date?: string; nowDate?: string } = {},
): BookDecision {
  const date = args.date || args.nowDate || todayIso();
  const active = entitlements
    .filter((e) => isActiveOn(e, date) && coversTraining(e, args.trainingId))
    .sort((a, b) => a.endsOn.localeCompare(b.endsOn) || a.createdAt.getTime() - b.createdAt.getTime());

  if (!active.length) {
    const anyEver = entitlements.some((e) => e.status !== "revoked");
    if (!anyEver) {
      return {
        allowed: false,
        reason: "payment_required",
        message: "Necesita un plan activo o un pase del dia para reservar.",
      };
    }
    const limited = entitlements.some(
      (e) => e.remainingBookings !== null && e.remainingBookings <= 0 && date >= e.startsOn && date <= e.endsOn,
    );
    if (limited) {
      return {
        allowed: false,
        reason: "limit_reached",
        message: "Ya uso los cupos incluidos en su pase. Compre otro o active un plan.",
      };
    }
    return {
      allowed: false,
      reason: "expired",
      message: "Su membresia o pase no cubre esta fecha. Renueve o compre un pase del dia.",
    };
  }

  const chosen = active[0];
  return { allowed: true, entitlementId: chosen.id, entitlement: chosen };
}

/** Map checkout option → entitlement shape. */
export function entitlementFromPayment(args: {
  memberKey: string;
  optionId: string;
  optionLabel: string;
  paymentId: string;
  startDate?: string;
  category?: string;
}): Omit<EntitlementDoc, "createdAt" | "updatedAt"> {
  const start = args.startDate || todayIso();
  const id = newEntitlementId();
  const source: EntitlementSource = { type: "payment", id: args.paymentId };

  switch (args.optionId) {
    case "day-pass":
      return {
        id,
        memberKey: args.memberKey,
        kind: "day_pass",
        offerId: "day-pass",
        label: args.optionLabel,
        startsOn: start,
        endsOn: start,
        remainingBookings: 1,
        source,
        status: "active",
      };
    case "week":
      return planEntitlement(id, args.memberKey, "week", args.optionLabel, source, start, 7, null);
    case "fortnight":
      return planEntitlement(id, args.memberKey, "fortnight", args.optionLabel, source, start, 15, null);
    case "month":
      return planEntitlement(id, args.memberKey, "month", args.optionLabel, source, start, 30, null);
    case "senior":
      return {
        id,
        memberKey: args.memberKey,
        kind: "class_credit",
        offerId: "senior",
        label: args.optionLabel,
        trainingIds: undefined,
        startsOn: start,
        endsOn: addDaysIso(start, 30),
        remainingBookings: 12,
        source,
        status: "active",
      };
    default:
      return planEntitlement(id, args.memberKey, args.optionId, args.optionLabel, source, start, 30, null);
  }
}

function planEntitlement(
  id: string,
  memberKey: string,
  offerId: string,
  label: string,
  source: EntitlementSource,
  start: string,
  days: number,
  remainingBookings: number | null,
): Omit<EntitlementDoc, "createdAt" | "updatedAt"> {
  return {
    id,
    memberKey,
    kind: "plan",
    offerId,
    label,
    startsOn: start,
    endsOn: addDaysIso(start, days),
    remainingBookings,
    source,
    status: "active",
  };
}

export function addDaysIso(date: string, days: number) {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function listActiveEntitlements(db: Db, memberKey: string, onDate = todayIso()) {
  const docs = await db
    .collection<EntitlementDoc>(ENTITLEMENTS_COLLECTION)
    .find({
      memberKey,
      status: { $in: ["active", "exhausted"] },
      startsOn: { $lte: onDate },
      endsOn: { $gte: onDate },
      revokedAt: null,
    })
    .sort({ endsOn: 1 })
    .toArray();
  return docs.filter((e) => isActiveOn(e, onDate) || e.status === "exhausted");
}

export async function listMemberEntitlements(db: Db, memberKey: string) {
  return db
    .collection<EntitlementDoc>(ENTITLEMENTS_COLLECTION)
    .find({ memberKey })
    .sort({ endsOn: -1 })
    .limit(50)
    .toArray();
}

/**
 * Backfill a synthetic entitlement from legacy membership fields so existing
 * active members are not locked out the day we turn on the gate.
 */
export async function ensureLegacyEntitlement(db: Db, member: MemberDoc): Promise<EntitlementDoc[]> {
  const memberKey = member.normalizedName || "";
  if (!memberKey) return [];

  const existing = await listMemberEntitlements(db, memberKey);
  const today = todayIso();
  const hasLive = existing.some((e) => isActiveOn(e, today));
  if (hasLive) return existing.filter((e) => isActiveOn(e, today) || e.status === "active");

  const ms = membershipStatus(member.membership);
  if (ms.status === "expired" || ms.daysRemaining < 0) {
    return existing;
  }

  const now = new Date();
  const endsOn = ms.nextBillingDate || today;
  const startsOn = member.membership?.startedAt || today;
  const doc: EntitlementDoc = {
    id: newEntitlementId("legacy"),
    memberKey,
    kind: "plan",
    offerId: "legacy-membership",
    label: ms.plan || "Membresia",
    startsOn: startsOn <= endsOn ? startsOn : endsOn,
    endsOn,
    remainingBookings: null,
    source: { type: "migration", id: "membership-field" },
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<EntitlementDoc>(ENTITLEMENTS_COLLECTION).insertOne(doc);
  await writeLedger(db, {
    memberKey,
    entitlementId: doc.id,
    action: "grant",
    note: "Migrated from membership.nextBillingDate",
    source: doc.source,
  });
  return [...existing, doc];
}

export async function grantEntitlement(
  db: Db,
  partial: Omit<EntitlementDoc, "createdAt" | "updatedAt" | "status"> & { status?: EntitlementStatus },
) {
  const now = new Date();
  const doc: EntitlementDoc = {
    ...partial,
    status: partial.status ?? "active",
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
  };
  await db.collection<EntitlementDoc>(ENTITLEMENTS_COLLECTION).insertOne(doc);
  await writeLedger(db, {
    memberKey: doc.memberKey,
    entitlementId: doc.id,
    action: "grant",
    note: doc.label,
    source: doc.source,
  });

  // Keep legacy membership field in sync for admin UI / lifecycle.
  if (doc.kind === "plan" || doc.kind === "day_pass" || doc.kind === "referral_bonus") {
    const planLabel =
      doc.kind === "referral_bonus"
        ? undefined // extend dates only; keep existing plan name when present
        : doc.label || doc.offerId || "Plan";
    const existing = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne(
      { normalizedName: doc.memberKey },
      { projection: { membership: 1 } },
    );
    const nextBillingDate =
      existing?.membership?.nextBillingDate && existing.membership.nextBillingDate > doc.endsOn
        ? existing.membership.nextBillingDate
        : doc.endsOn;
    const label = planLabel || existing?.membership?.plan || doc.label || "Plan";
    await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
      { normalizedName: doc.memberKey },
      {
        $set: {
          "membership.plan": label,
          "membership.nextBillingDate": nextBillingDate,
          "membership.status": membershipStatus({
            plan: label,
            nextBillingDate,
            startedAt: existing?.membership?.startedAt || doc.startsOn,
          }).status,
          updatedAt: now,
        },
        $setOnInsert: {
          normalizedName: doc.memberKey,
          workouts: [],
          bodyMetrics: [],
          createdAt: now,
          "membership.startedAt": doc.startsOn,
        },
      },
      { upsert: true },
    );
  }

  return doc;
}

export async function extendEntitlement(
  db: Db,
  args: {
    entitlementId: string;
    memberKey: string;
    days: number;
    source: EntitlementSource;
    note?: string;
  },
) {
  const col = db.collection<EntitlementDoc>(ENTITLEMENTS_COLLECTION);
  const current = await col.findOne({ id: args.entitlementId, memberKey: args.memberKey });
  if (!current) return null;
  const base = current.endsOn > todayIso() ? current.endsOn : todayIso();
  const endsOn = addDaysIso(base, args.days);
  await col.updateOne(
    { id: args.entitlementId },
    { $set: { endsOn, status: "active", updatedAt: new Date() } },
  );
  await writeLedger(db, {
    memberKey: args.memberKey,
    entitlementId: args.entitlementId,
    action: "extend",
    deltaDays: args.days,
    note: args.note,
    source: args.source,
  });
  await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
    { normalizedName: args.memberKey },
    { $set: { "membership.nextBillingDate": endsOn, "membership.status": "active", updatedAt: new Date() } },
  );
  return col.findOne({ id: args.entitlementId });
}

export async function consumeBookingEntitlement(db: Db, entitlementId: string, memberKey: string) {
  const col = db.collection<EntitlementDoc>(ENTITLEMENTS_COLLECTION);
  const current = await col.findOne({ id: entitlementId, memberKey });
  if (!current) return { ok: false as const, reason: "missing" };
  if (current.remainingBookings === null) {
    await writeLedger(db, {
      memberKey,
      entitlementId,
      action: "consume",
      deltaBookings: 0,
      note: "unlimited plan booking",
      source: current.source,
    });
    return { ok: true as const, entitlement: current };
  }
  if (current.remainingBookings <= 0) return { ok: false as const, reason: "limit_reached" };

  const result = await col.findOneAndUpdate(
    { id: entitlementId, memberKey, remainingBookings: { $gt: 0 } },
    [
      {
        $set: {
          remainingBookings: { $subtract: ["$remainingBookings", 1] },
          status: {
            $cond: [{ $lte: [{ $subtract: ["$remainingBookings", 1] }, 0] }, "exhausted", "active"],
          },
          updatedAt: new Date(),
        },
      },
    ],
    { returnDocument: "after" },
  );

  const updated = result as EntitlementDoc | null;
  if (!updated) return { ok: false as const, reason: "limit_reached" };

  await writeLedger(db, {
    memberKey,
    entitlementId,
    action: "consume",
    deltaBookings: -1,
    source: current.source,
  });
  return { ok: true as const, entitlement: updated };
}

export async function releaseBookingEntitlement(db: Db, entitlementId: string, memberKey: string) {
  const col = db.collection<EntitlementDoc>(ENTITLEMENTS_COLLECTION);
  const current = await col.findOne({ id: entitlementId, memberKey });
  if (!current || current.remainingBookings === null) return;

  await col.updateOne(
    { id: entitlementId },
    {
      $inc: { remainingBookings: 1 },
      $set: { status: "active", updatedAt: new Date() },
    },
  );
  await writeLedger(db, {
    memberKey,
    entitlementId,
    action: "extend",
    deltaBookings: 1,
    note: "booking cancelled — credit restored",
    source: current.source,
  });
}

export async function revokeEntitlement(
  db: Db,
  entitlementId: string,
  reason: string,
  source: EntitlementSource,
) {
  const col = db.collection<EntitlementDoc>(ENTITLEMENTS_COLLECTION);
  const current = await col.findOne({ id: entitlementId });
  if (!current) return null;
  await col.updateOne(
    { id: entitlementId },
    { $set: { status: "revoked", revokedAt: new Date(), revokeReason: reason, updatedAt: new Date() } },
  );
  await writeLedger(db, {
    memberKey: current.memberKey,
    entitlementId,
    action: "revoke",
    note: reason,
    source,
  });
  return col.findOne({ id: entitlementId });
}

async function writeLedger(
  db: Db,
  entry: Omit<LedgerEntry, "id" | "at"> & { at?: Date },
) {
  const doc: LedgerEntry = {
    id: newLedgerId(),
    at: entry.at ?? new Date(),
    memberKey: entry.memberKey,
    entitlementId: entry.entitlementId,
    action: entry.action,
    deltaDays: entry.deltaDays,
    deltaBookings: entry.deltaBookings,
    note: entry.note,
    source: entry.source,
  };
  try {
    await db.collection<LedgerEntry>(ENTITLEMENT_LEDGER_COLLECTION).insertOne(doc);
  } catch (err) {
    console.error("ENTITLEMENT LEDGER", err);
  }
  return doc;
}

/**
 * Load entitlements (with legacy backfill) and run canBook.
 */
export async function decideBooking(
  db: Db,
  memberKey: string,
  args: { trainingId?: string; date?: string },
): Promise<BookDecision & { entitlements: EntitlementDoc[] }> {
  const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName: memberKey });
  if (!member) {
    return {
      allowed: false,
      reason: "no_member",
      message: "Perfil no encontrado.",
      entitlements: [],
    };
  }
  const entitlements = await ensureLegacyEntitlement(db, member);
  const decision = canBook(entitlements, args);
  return { ...decision, entitlements };
}
