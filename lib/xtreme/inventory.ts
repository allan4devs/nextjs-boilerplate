/**
 * Xtreme Gym — Class session inventory + atomic booking (Strategy 2.0 §6.2).
 * Capacity is an atomic counter on the session document — no count-then-insert race.
 */
import type { Db } from "mongodb";
import {
  BOOKINGS_COLLECTION,
  CLASS_SESSIONS_COLLECTION,
  CLASS_TEMPLATES_COLLECTION,
  TRAININGS,
  todayIso,
} from "./shared";
import { classDurationMin, classStartAt } from "./class-schedule";
import {
  consumeBookingEntitlement,
  decideBooking,
  releaseBookingEntitlement,
  type EntitlementDoc,
} from "./entitlements";

export type ClassTemplateDoc = {
  id: string;
  name: string;
  durationMin: number;
  capacity: number;
  zone: string;
  defaultCoach?: string;
  trainingId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassSessionDoc = {
  id: string;
  templateId: string;
  trainingId: string;
  trainingName: string;
  /** Calendar date YYYY-MM-DD (gym local day key). */
  date: string;
  startAt: Date;
  endAt: Date;
  capacity: number;
  /** Atomic reserved slots (excludes cancelled). */
  bookedCount: number;
  coach?: string;
  status: "scheduled" | "cancelled" | "completed";
  bookingCutoffAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BookingStatus =
  | "reserved"
  | "cancelled"
  | "attended"
  | "no_show"
  | "late_cancel"
  | "waitlisted";

export type BookingDoc = {
  id: string;
  sessionId: string;
  trainingId: string;
  trainingName: string;
  trainingDate: string;
  memberKey: string;
  memberName: string;
  entitlementId: string;
  paymentId?: string | null;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date | null;
};

export type WaitlistDoc = {
  id: string;
  sessionId: string;
  memberKey: string;
  memberName: string;
  position: number;
  status: "waiting" | "offered" | "accepted" | "expired" | "cancelled";
  offeredAt?: Date | null;
  offerExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function newSessionId(trainingId: string, date: string) {
  return `ses-${trainingId}-${date}`;
}

export function newBookingId() {
  return `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Seed templates from the existing TRAININGS constant if the collection is empty. */
export async function ensureDefaultTemplates(db: Db) {
  const col = db.collection<ClassTemplateDoc>(CLASS_TEMPLATES_COLLECTION);
  const count = await col.countDocuments();
  if (count > 0) return;

  const now = new Date();
  const docs: ClassTemplateDoc[] = TRAININGS.map((t) => ({
    id: `tpl-${t.id}`,
    name: t.name,
    durationMin: 55,
    capacity: t.capacity,
    zone: t.name,
    trainingId: t.id,
    active: true,
    createdAt: now,
    updatedAt: now,
  }));
  if (docs.length) await col.insertMany(docs);
}

/**
 * Resolve or create the daily session for a training (back-compat with
 * trainingId + date reservations from the 1.0 app).
 */
export async function ensureClassSession(
  db: Db,
  args: { trainingId: string; trainingName: string; date: string; capacity?: number },
): Promise<ClassSessionDoc> {
  await ensureDefaultTemplates(db);
  const id = newSessionId(args.trainingId, args.date);
  const col = db.collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION);
  const existing = await col.findOne({ id });
  if (existing) return existing;

  const template = await db.collection<ClassTemplateDoc>(CLASS_TEMPLATES_COLLECTION).findOne({
    trainingId: args.trainingId,
  });
  const capacity = args.capacity ?? template?.capacity ?? 12;
  const scheduledStart = classStartAt(args.trainingId, args.date);
  const startAt = scheduledStart ?? new Date(`${args.date}T12:00:00.000Z`);
  const durationMin =
    template?.durationMin ?? classDurationMin(args.trainingId, 55);
  const endAt = new Date(startAt.getTime() + durationMin * 60_000);
  const now = new Date();
  const doc: ClassSessionDoc = {
    id,
    templateId: template?.id ?? `tpl-${args.trainingId}`,
    trainingId: args.trainingId,
    trainingName: args.trainingName || template?.name || args.trainingId,
    date: args.date,
    startAt,
    endAt,
    capacity,
    bookedCount: 0,
    coach: template?.defaultCoach,
    status: "scheduled",
    bookingCutoffAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await col.insertOne(doc);
    return doc;
  } catch (err) {
    // Race: another request created it
    if ((err as { code?: number }).code === 11000) {
      const again = await col.findOne({ id });
      if (again) return again;
    }
    throw err;
  }
}

export type BookResult =
  | {
      ok: true;
      booking: BookingDoc;
      session: ClassSessionDoc;
      entitlementId: string;
      duplicate?: boolean;
    }
  | {
      ok: false;
      code:
        | "payment_required"
        | "expired"
        | "limit_reached"
        | "full"
        | "cutoff"
        | "cancelled_session"
        | "no_member"
        | "wrong_class";
      message: string;
      entitlement?: EntitlementDoc;
    };

/**
 * Atomic booking:
 * 1) entitlement check
 * 2) atomic $inc bookedCount only if bookedCount < capacity
 * 3) insert booking; roll back counter on failure
 * 4) consume limited entitlements
 */
export async function bookSession(
  db: Db,
  args: {
    memberKey: string;
    memberName: string;
    trainingId: string;
    trainingName: string;
    date: string;
    paymentId?: string;
    /** Skip entitlement gate (admin / already-paid capture path that already granted). */
    entitlementId?: string;
    forceEntitlementId?: string;
  },
): Promise<BookResult> {
  const session = await ensureClassSession(db, {
    trainingId: args.trainingId,
    trainingName: args.trainingName,
    date: args.date,
  });

  const scheduledStart = classStartAt(args.trainingId, args.date);
  if (!scheduledStart) {
    return { ok: false, code: "wrong_class", message: "Esta clase no se imparte hoy." };
  }
  if (new Date() >= scheduledStart) {
    return { ok: false, code: "cutoff", message: "La clase ya inició y cerró sus reservas." };
  }

  if (session.status !== "scheduled") {
    return { ok: false, code: "cancelled_session", message: "Esta clase no esta disponible." };
  }
  if (session.bookingCutoffAt && new Date() > new Date(session.bookingCutoffAt)) {
    return { ok: false, code: "cutoff", message: "El plazo de reserva ya cerro." };
  }

  // Idempotent: already reserved
  const existing = await db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne({
    sessionId: session.id,
    memberKey: args.memberKey,
    status: "reserved",
  });
  if (existing) {
    return { ok: true, booking: existing, session, entitlementId: existing.entitlementId, duplicate: true };
  }

  let entitlementId = args.forceEntitlementId || args.entitlementId;
  if (!entitlementId) {
    const decision = await decideBooking(db, args.memberKey, {
      trainingId: args.trainingId,
      date: args.date,
    });
    if (!decision.allowed) {
      return {
        ok: false,
        code: decision.reason,
        message: decision.message,
      };
    }
    entitlementId = decision.entitlementId;
  }

  // Atomic capacity claim
  const claimed = await db.collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION).findOneAndUpdate(
    {
      id: session.id,
      status: "scheduled",
      $expr: { $lt: ["$bookedCount", "$capacity"] },
    },
    { $inc: { bookedCount: 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  const claimedDoc = claimed as ClassSessionDoc | null;

  if (!claimedDoc) {
    return {
      ok: false,
      code: "full",
      message: "Clase llena. Probá otro horario o unase a la lista de espera.",
    };
  }

  const now = new Date();
  const booking: BookingDoc = {
    id: newBookingId(),
    sessionId: session.id,
    trainingId: args.trainingId,
    trainingName: args.trainingName,
    trainingDate: args.date,
    memberKey: args.memberKey,
    memberName: args.memberName,
    entitlementId,
    paymentId: args.paymentId ?? null,
    status: "reserved",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.collection<BookingDoc>(BOOKINGS_COLLECTION).insertOne(booking);
  } catch (err) {
    // Unique race: same member double-submit
    await db.collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION).updateOne(
      { id: session.id, bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 }, $set: { updatedAt: new Date() } },
    );
    if ((err as { code?: number }).code === 11000) {
      const again = await db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne({
        sessionId: session.id,
        memberKey: args.memberKey,
        status: "reserved",
      });
      if (again) {
        return { ok: true, booking: again, session: claimedDoc, entitlementId: again.entitlementId, duplicate: true };
      }
    }
    throw err;
  }

  const consumed = await consumeBookingEntitlement(db, entitlementId, args.memberKey);
  if (!consumed.ok && consumed.reason === "limit_reached") {
    // Roll back booking + capacity
    await db.collection<BookingDoc>(BOOKINGS_COLLECTION).updateOne(
      { id: booking.id },
      { $set: { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() } },
    );
    await db.collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION).updateOne(
      { id: session.id, bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 }, $set: { updatedAt: new Date() } },
    );
    return {
      ok: false,
      code: "limit_reached",
      message: "Ya uso los cupos de su pase.",
    };
  }

  return { ok: true, booking, session: claimedDoc, entitlementId };
}

export async function cancelBooking(
  db: Db,
  args: { memberKey: string; trainingId: string; date: string },
): Promise<{ ok: boolean; message?: string }> {
  const sessionId = newSessionId(args.trainingId, args.date);
  const col = db.collection<BookingDoc>(BOOKINGS_COLLECTION);
  const booking = await col.findOne({
    sessionId,
    memberKey: args.memberKey,
    status: "reserved",
  });
  if (!booking) {
    // Also try loose match for older data
    const loose = await col.findOne({
      memberKey: args.memberKey,
      trainingId: args.trainingId,
      trainingDate: args.date,
      status: "reserved",
    });
    if (!loose) return { ok: true, message: "Sin reserva activa." };
    return cancelBookingDoc(db, loose);
  }
  return cancelBookingDoc(db, booking);
}

async function cancelBookingDoc(db: Db, booking: BookingDoc) {
  const now = new Date();
  const result = await db.collection<BookingDoc>(BOOKINGS_COLLECTION).updateOne(
    { id: booking.id, status: "reserved" },
    { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } },
  );
  if (!result.modifiedCount) return { ok: true };

  await db.collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION).updateOne(
    { id: booking.sessionId, bookedCount: { $gt: 0 } },
    { $inc: { bookedCount: -1 }, $set: { updatedAt: now } },
  );
  await releaseBookingEntitlement(db, booking.entitlementId, booking.memberKey);
  // Waitlist promotion can be hooked here later.
  return { ok: true };
}

export async function sessionSnapshot(db: Db, date: string, memberKey = "") {
  await ensureDefaultTemplates(db);
  const templates = await db
    .collection<ClassTemplateDoc>(CLASS_TEMPLATES_COLLECTION)
    .find({ active: true })
    .toArray();

  const byTraining: Record<
    string,
    {
      sessionId: string;
      reserved: number;
      capacity: number;
      remaining: number;
      isMine: boolean;
      status: string;
    }
  > = {};

  for (const t of templates.length ? templates : TRAININGS.map((x) => ({
    id: `tpl-${x.id}`,
    trainingId: x.id,
    name: x.name,
    capacity: x.capacity,
  }))) {
    const session = await ensureClassSession(db, {
      trainingId: t.trainingId,
      trainingName: t.name,
      date,
      capacity: t.capacity,
    });
    const isMine = memberKey
      ? Boolean(
          await db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne({
            sessionId: session.id,
            memberKey,
            status: "reserved",
          }),
        )
      : false;
    byTraining[t.trainingId] = {
      sessionId: session.id,
      reserved: session.bookedCount,
      capacity: session.capacity,
      remaining: Math.max(0, session.capacity - session.bookedCount),
      isMine,
      status: session.status,
    };
  }

  return byTraining;
}

export async function markAttendance(
  db: Db,
  args: { bookingId: string; status: "attended" | "no_show" | "late_cancel" },
) {
  const now = new Date();
  await db.collection<BookingDoc>(BOOKINGS_COLLECTION).updateOne(
    { id: args.bookingId },
    { $set: { status: args.status, updatedAt: now } },
  );
}

/** Admin: create or update a concrete session (custom coach/capacity/time). */
export async function upsertClassSession(
  db: Db,
  input: {
    trainingId: string;
    trainingName: string;
    date: string;
    capacity?: number;
    coach?: string;
    startHourUtc?: number;
    status?: ClassSessionDoc["status"];
  },
) {
  const base = await ensureClassSession(db, {
    trainingId: input.trainingId,
    trainingName: input.trainingName,
    date: input.date,
    capacity: input.capacity,
  });
  const hour = input.startHourUtc ?? 12;
  const startAt = new Date(`${input.date}T00:00:00.000Z`);
  startAt.setUTCHours(hour, 0, 0, 0);
  const endAt = new Date(startAt.getTime() + 55 * 60_000);
  const set: Partial<ClassSessionDoc> = {
    trainingName: input.trainingName,
    startAt,
    endAt,
    updatedAt: new Date(),
  };
  if (input.capacity !== undefined) set.capacity = Math.max(1, Math.min(100, input.capacity));
  if (input.coach !== undefined) set.coach = input.coach;
  if (input.status) set.status = input.status;

  await db.collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION).updateOne({ id: base.id }, { $set: set });
  return db.collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION).findOne({ id: base.id });
}

export async function listSessionsForDate(db: Db, date = todayIso()) {
  await ensureDefaultTemplates(db);
  // Ensure today's default sessions exist for admin view
  for (const t of TRAININGS) {
    await ensureClassSession(db, { trainingId: t.id, trainingName: t.name, date, capacity: t.capacity });
  }
  return db
    .collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION)
    .find({ date })
    .sort({ startAt: 1 })
    .toArray();
}
