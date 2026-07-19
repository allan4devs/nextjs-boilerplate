/** Recordatorios push diarios y de entrenos que quedaron abiertos. */
import type { Db } from "mongodb";
import {
  PUSH_SUBSCRIPTIONS_COLLECTION,
  sendMemberPush,
  type StoredPushSubscription,
} from "@/lib/helpers/push";
import { businessDate, XTREME_TIME_ZONE } from "@/lib/xtreme/business-date";
import { recordEvent } from "@/lib/xtreme/events";
import type { BookingDoc } from "@/lib/xtreme/inventory";
import { notificationClickToken } from "@/lib/xtreme/notification-token";
import {
  BOOKINGS_COLLECTION,
  CHECKINS_COLLECTION,
  MEMBERS_COLLECTION,
  membershipStatus,
  type CheckinDoc,
  type MemberDoc,
} from "@/lib/xtreme/shared";

const DELIVERIES_COLLECTION = "xtreme_gym_lifecycle_deliveries";
// 40 por corrida mantiene el cron bajo 60 s; cada 15 min cubre hasta 1.920 al día.
const DAILY_BATCH_SIZE = 40;
const ACTIVE_WORKOUT_REMINDER_MINUTES = 75;

type ReminderDelivery = {
  deliveryKey: string;
  memberKey: string;
  kind: "daily-training-reminder" | "active-workout-reminder";
  businessDate?: string;
  createdAt: Date;
  sentAt?: Date;
  status: "sending" | "sent" | "skipped";
};

export type TrainingReminderSummary = {
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
  outsideWindow?: boolean;
};

const FUNNY_MESSAGES = [
  "Las pesas preguntaron por vos. Les dijimos que venías; no nos dejés mintiendo 😅",
  "Tu sofá presentó una apelación. El gym la rechazó. Nos vemos 💪",
  "La pereza pidió descanso hoy. Qué casualidad: vos no 😏",
  "Entrenar hoy mejora el ánimo y también la calidad de las selfies. Ciencia casi exacta 😄",
  "Ese entreno no se va a hacer solo. Ya lo entrevistamos y confirmó que te necesita 🏋️",
];

function localHour(now: Date) {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: XTREME_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number(value);
}

function funnyMessage(memberKey: string, date: string) {
  const seed = `${memberKey}:${date}`
    .split("")
    .reduce((total, char) => (total + char.charCodeAt(0)) % 997, 0);
  return FUNNY_MESSAGES[seed % FUNNY_MESSAGES.length];
}

async function claim(
  db: Db,
  doc: ReminderDelivery,
): Promise<boolean> {
  try {
    await db.collection<ReminderDelivery>(DELIVERIES_COLLECTION).insertOne(doc);
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return false;
    throw error;
  }
}

async function finishDelivery(
  db: Db,
  deliveryKey: string,
  status: "sent" | "skipped",
) {
  await db.collection<ReminderDelivery>(DELIVERIES_COLLECTION).updateOne(
    { deliveryKey },
    { $set: { status, sentAt: new Date() } },
  );
}

/**
 * Una invitación graciosa por día, solo entre 8 a. m. y 8 p. m. de Costa Rica.
 * No molesta a quien ya ingresó, ya entrenó o tiene un entreno abierto.
 */
export async function processDailyTrainingReminders(
  db: Db,
  now = new Date(),
): Promise<TrainingReminderSummary> {
  const hour = localHour(now);
  if (hour < 8 || hour >= 20) {
    return { candidates: 0, sent: 0, skipped: 0, failed: 0, outsideWindow: true };
  }

  const date = businessDate(now);
  const subscriberKeys = await db
    .collection<StoredPushSubscription>(PUSH_SUBSCRIPTIONS_COLLECTION)
    .distinct("memberKey", { memberKey: { $type: "string", $ne: "" } });
  if (!subscriberKeys.length) return { candidates: 0, sent: 0, skipped: 0, failed: 0 };

  const alreadyClaimed = await db
    .collection<ReminderDelivery>(DELIVERIES_COLLECTION)
    .distinct("memberKey", { kind: "daily-training-reminder", businessDate: date });
  const claimed = new Set(alreadyClaimed);
  const pendingKeys = subscriberKeys.filter((key) => !claimed.has(key));

  const [members, visitedKeys, bookings] = await Promise.all([
    db.collection<MemberDoc>(MEMBERS_COLLECTION).find(
      { normalizedName: { $in: pendingKeys } },
      { projection: { normalizedName: 1, membership: 1, workouts: 1, activePlanWorkout: 1 } },
    ).toArray(),
    db.collection<CheckinDoc>(CHECKINS_COLLECTION).distinct("normalizedName", {
      date,
      normalizedName: { $in: pendingKeys },
    }),
    db.collection<BookingDoc>(BOOKINGS_COLLECTION).find({
      memberKey: { $in: pendingKeys },
      trainingDate: date,
      status: "reserved",
    }).toArray(),
  ]);

  const visited = new Set(visitedKeys);
  const bookingByMember = new Map(bookings.map((booking) => [booking.memberKey, booking]));
  const eligible = members.filter((member) => {
    const key = String(member.normalizedName || "");
    const trained = member.workouts?.some((workout) => workout.completedDate === date);
    return Boolean(
      key &&
      !visited.has(key) &&
      !trained &&
      !member.activePlanWorkout &&
      membershipStatus(member.membership).status !== "expired",
    );
  }).slice(0, DAILY_BATCH_SIZE);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const member of eligible) {
    const memberKey = String(member.normalizedName);
    const deliveryKey = `daily-training:${date}:${memberKey}`;
    try {
      const didClaim = await claim(db, {
        deliveryKey,
        memberKey,
        kind: "daily-training-reminder",
        businessDate: date,
        createdAt: now,
        status: "sending",
      });
      if (!didClaim) {
        skipped += 1;
        continue;
      }

      const booking = bookingByMember.get(memberKey);
      const body = booking
        ? `Tenés ${booking.trainingName} reservada hoy. Tu campo ya está calentando sin vos 😅`
        : funnyMessage(memberKey, date);
      const push = await sendMemberPush(db, memberKey, {
        title: booking ? "Hoy tenés clase reservada 📅" : "Tu dosis diaria de Xtreme 💪",
        body,
        url: "/app",
        deliveryKey,
        memberKey,
        clickToken: notificationClickToken(memberKey, deliveryKey),
      });
      if (push.sent > 0) {
        sent += 1;
        await finishDelivery(db, deliveryKey, "sent");
        await recordEvent(db, {
          type: "notification_sent",
          memberId: memberKey,
          source: "job",
          entity: { type: "daily_training_reminder", id: deliveryKey },
          properties: {
            campaign: "daily-training-reminder",
            reservedClass: Boolean(booking),
            pushDevices: push.sent,
          },
        });
      } else if (push.skipped || push.attempted === 0) {
        skipped += 1;
        await finishDelivery(db, deliveryKey, "skipped");
      } else {
        failed += 1;
        await db.collection(DELIVERIES_COLLECTION).deleteOne({ deliveryKey });
      }
    } catch (error) {
      failed += 1;
      await db.collection(DELIVERIES_COLLECTION).deleteOne({ deliveryKey }).catch(() => undefined);
      console.error("XTREME DAILY TRAINING REMINDER", error);
    }
  }

  return { candidates: eligible.length, sent, skipped, failed };
}

/** Avisa una vez cuando un entreno del plan lleva 75 min abierto. */
export async function processActiveWorkoutReminders(
  db: Db,
  now = new Date(),
): Promise<TrainingReminderSummary> {
  const cutoff = new Date(now.getTime() - ACTIVE_WORKOUT_REMINDER_MINUTES * 60_000);
  const members = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find(
    { "activePlanWorkout.startedAt": { $lte: cutoff } },
    { projection: { normalizedName: 1, activePlanWorkout: 1 } },
  ).limit(250).toArray();

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const member of members) {
    const memberKey = String(member.normalizedName || "");
    const workout = member.activePlanWorkout;
    if (!memberKey || !workout?.id) {
      skipped += 1;
      continue;
    }
    const deliveryKey = `active-workout-reminder:${workout.id}`;
    try {
      const didClaim = await claim(db, {
        deliveryKey,
        memberKey,
        kind: "active-workout-reminder",
        createdAt: now,
        status: "sending",
      });
      if (!didClaim) {
        skipped += 1;
        continue;
      }
      const push = await sendMemberPush(db, memberKey, {
        title: "¿Seguís entrenando o la mancuerna te adoptó? 😅",
        body: `${workout.trainingName || "Tu entreno"} sigue abierto. Finalizalo para guardar tiempo, series y progreso.`,
        url: "/app",
        deliveryKey,
        memberKey,
        clickToken: notificationClickToken(memberKey, deliveryKey),
      });
      if (push.sent > 0) {
        sent += 1;
        await finishDelivery(db, deliveryKey, "sent");
        await recordEvent(db, {
          type: "notification_sent",
          memberId: memberKey,
          source: "job",
          entity: { type: "active_workout_reminder", id: deliveryKey },
          properties: {
            campaign: "active-workout-reminder",
            workoutId: workout.id,
            reminderAfterMinutes: ACTIVE_WORKOUT_REMINDER_MINUTES,
            pushDevices: push.sent,
          },
        });
      } else if (push.skipped || push.attempted === 0) {
        skipped += 1;
        await finishDelivery(db, deliveryKey, "skipped");
      } else {
        failed += 1;
        await db.collection(DELIVERIES_COLLECTION).deleteOne({ deliveryKey });
      }
    } catch (error) {
      failed += 1;
      await db.collection(DELIVERIES_COLLECTION).deleteOne({ deliveryKey }).catch(() => undefined);
      console.error("XTREME ACTIVE WORKOUT REMINDER", error);
    }
  }
  return { candidates: members.length, sent, skipped, failed };
}
