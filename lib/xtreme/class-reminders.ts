/**
 * Recordatorios push ~1 hora antes de cada clase reservada.
 * Pensado para correr cada 15 min (cron Vercel). Idempotente por booking.
 */
import type { Db } from "mongodb";
import { sendMemberPush } from "@/lib/helpers/push";
import { classStartAt, classTimeLabel } from "@/lib/xtreme/class-schedule";
import { XTREME_TIME_ZONE } from "@/lib/xtreme/business-date";
import {
  BOOKINGS_COLLECTION,
  CLASS_SESSIONS_COLLECTION,
} from "@/lib/xtreme/shared";
import type { BookingDoc, ClassSessionDoc } from "@/lib/xtreme/inventory";
import { recordEvent } from "@/lib/xtreme/events";
import { notificationClickToken } from "@/lib/xtreme/notification-token";

/** Ventana: la clase empieza entre 45 y 75 min (cubre un cron cada 15 min). */
export const REMINDER_WINDOW_MIN = 45;
export const REMINDER_WINDOW_MAX = 75;

const DELIVERIES_COLLECTION = "xtreme_gym_lifecycle_deliveries";

type DeliveryDoc = {
  deliveryKey: string;
  memberKey: string;
  kind: "class-reminder";
  createdAt: Date;
  sentAt?: Date;
  status: "sending" | "sent" | "skipped";
  sessionId?: string;
  bookingId?: string;
};

function formatStartLabel(startAt: Date) {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: XTREME_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startAt);
}

function minutesUntil(startAt: Date, now: Date) {
  return Math.max(0, Math.round((startAt.getTime() - now.getTime()) / 60_000));
}

function resolveSessionStart(session: ClassSessionDoc): Date | null {
  if (session.startAt instanceof Date && !Number.isNaN(session.startAt.getTime())) {
    return session.startAt;
  }
  if (typeof session.startAt === "string") {
    const parsed = new Date(session.startAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return classStartAt(session.trainingId, session.date);
}

export type ClassReminderSummary = {
  sessions: number;
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
};

/**
 * Busca sesiones que empiezan en la ventana de ~1 h y avisa a cada socio
 * con reserva activa (status reserved).
 */
export async function processClassReminders(
  db: Db,
  now = new Date(),
): Promise<ClassReminderSummary> {
  const windowStart = new Date(now.getTime() + REMINDER_WINDOW_MIN * 60_000);
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MAX * 60_000);

  const deliveries = db.collection<DeliveryDoc>(DELIVERIES_COLLECTION);
  await deliveries.createIndex({ deliveryKey: 1 }, { unique: true });

  // Preferir startAt en sesiones; amplía un poco el query por date del día.
  const sessions = await db
    .collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION)
    .find({
      status: "scheduled",
      startAt: { $gte: windowStart, $lte: windowEnd },
    })
    .toArray();

  // Fallback: si startAt no está indexado/guardado bien, mirar por horario canónico
  // de hoy y mañana (CR) en un rango amplio de fechas y filtrar en memoria.
  if (sessions.length === 0) {
    const todayParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: XTREME_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    // en-CA → YYYY-MM-DD
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60_000);
    const tomorrowParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: XTREME_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(tomorrow);

    const loose = await db
      .collection<ClassSessionDoc>(CLASS_SESSIONS_COLLECTION)
      .find({
        status: "scheduled",
        date: { $in: [todayParts, tomorrowParts] },
      })
      .toArray();

    for (const session of loose) {
      const start = resolveSessionStart(session);
      if (!start) continue;
      if (start >= windowStart && start <= windowEnd) sessions.push(session);
    }
  }

  // Dedup por id de sesión
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const uniqueSessions = Array.from(byId.values());

  let candidates = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const session of uniqueSessions) {
    const startAt = resolveSessionStart(session);
    if (!startAt) continue;

    const bookings = await db
      .collection<BookingDoc>(BOOKINGS_COLLECTION)
      .find({
        sessionId: session.id,
        status: "reserved",
      })
      .toArray();

    // Compat: a veces booking no trae sessionId pero sí trainingId+date
    const legacy =
      bookings.length === 0
        ? await db
            .collection<BookingDoc>(BOOKINGS_COLLECTION)
            .find({
              trainingId: session.trainingId,
              trainingDate: session.date,
              status: "reserved",
            })
            .toArray()
        : [];

    const allBookings = bookings.length ? bookings : legacy;
    candidates += allBookings.length;

    const mins = minutesUntil(startAt, now);
    const timeLabel = formatStartLabel(startAt);
    const scheduleLabel = classTimeLabel(session.trainingId);
    const trainingName = session.trainingName || session.trainingId;

    for (const booking of allBookings) {
      const memberKey = booking.memberKey;
      if (!memberKey) {
        skipped += 1;
        continue;
      }

      const deliveryKey = `class-reminder:${booking.id || `${memberKey}:${session.id}`}`;
      try {
        await deliveries.insertOne({
          deliveryKey,
          memberKey,
          kind: "class-reminder",
          createdAt: now,
          status: "sending",
          sessionId: session.id,
          bookingId: booking.id,
        });
      } catch (error) {
        if ((error as { code?: number }).code === 11000) {
          skipped += 1;
          continue;
        }
        failed += 1;
        console.error("XTREME CLASS REMINDER CLAIM", error);
        continue;
      }

      try {
        const pushResult = await sendMemberPush(db, memberKey, {
          title: "⏰ Tu clase empieza pronto",
          body: `${trainingName} a las ${timeLabel} (en ~${mins} min). ${scheduleLabel !== timeLabel ? scheduleLabel + " · " : ""}¡Alistá el bulto y nos vemos en Xtreme!`,
          url: "/app?tab=clases",
          tag: "xtreme-class-reminder",
          renotify: true,
          requireInteraction: true,
          vibrate: [150, 75, 150, 75, 150],
          actions: [{ action: "view_class", title: "Ver reserva 🧘" }],
          actionUrls: { view_class: "/app?tab=clases" },
          deliveryKey,
          memberKey,
          clickToken: notificationClickToken(memberKey, deliveryKey),
        });

        if (pushResult.sent > 0) {
          sent += 1;
          await deliveries.updateOne(
            { deliveryKey },
            { $set: { status: "sent", sentAt: new Date() } },
          );
          await recordEvent(db, {
            type: "notification_sent",
            memberId: memberKey,
            source: "job",
            entity: { type: "class_reminder", id: deliveryKey },
            properties: {
              campaign: "class-reminder",
              trainingId: session.trainingId,
              trainingName,
              minutesUntil: mins,
              pushDevices: pushResult.sent,
            },
          });
        } else if (pushResult.skipped || pushResult.attempted === 0) {
          // Sin dispositivos o VAPID off: no reintentar en loop (marcar skipped).
          skipped += 1;
          await deliveries.updateOne(
            { deliveryKey },
            { $set: { status: "skipped", sentAt: new Date() } },
          );
        } else {
          failed += 1;
          await deliveries.deleteOne({ deliveryKey });
        }
      } catch (error) {
        failed += 1;
        await deliveries.deleteOne({ deliveryKey }).catch(() => undefined);
        console.error("XTREME CLASS REMINDER SEND", error);
      }
    }
  }

  return {
    sessions: uniqueSessions.length,
    candidates,
    sent,
    skipped,
    failed,
  };
}
