import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  emailEnabled,
  sendAdminDailySummary,
  sendAdminOperationalAlert,
  sendMembershipReminderEmail,
  sendMilestoneEmail,
  sendMonthlyRecapEmail,
  sendStreakRiskEmail,
  sendWinBackEmail,
  type SendEmailResult,
} from "@/lib/helpers/email";
import { sendMemberPush } from "@/lib/helpers/push";
import { recordEvent } from "@/lib/xtreme/events";
import { businessDate } from "@/lib/xtreme/business-date";
import { notificationClickToken } from "@/lib/xtreme/notification-token";
import { listOpenOpsAlerts, recordOpsAlert, resolveOpsAlert } from "@/lib/xtreme/ops-alerts";
import { processFreeDayNudges } from "@/lib/xtreme/free-day-nudge";
import { evaluateLifecycle, type LifecycleTrigger } from "@/lib/xtreme/lifecycle";
import {
  CHECKINS_COLLECTION,
  MEMBERS_COLLECTION,
  PAYMENTS_COLLECTION,
  PAYPAL_ORDERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  membershipStatus,
  type MemberDoc,
  type PaymentDoc,
} from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DeliveryDoc = {
  deliveryKey: string;
  memberKey: string;
  kind: LifecycleTrigger["kind"] | "pending-profile" | "upgrade-plan";
  createdAt: Date;
  sentAt?: Date;
  status: "sending" | "sent" | "skipped";
};

const DELIVERIES_COLLECTION = "xtreme_gym_lifecycle_deliveries";
const JOB_RUNS_COLLECTION = "xtreme_gym_job_runs";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

async function deliver(trigger: LifecycleTrigger, member: MemberDoc): Promise<SendEmailResult> {
  const to = member.email || "";
  if (!to || !emailEnabled()) return { ok: false, skipped: true };
  const memberName = member.memberName || "Socio Xtreme";
  if (trigger.kind === "streak-risk") {
    return sendStreakRiskEmail({ to, memberName, streak: trigger.streak });
  }
  if (trigger.kind === "milestone") {
    return sendMilestoneEmail({ to, memberName, streak: trigger.streak });
  }
  if (trigger.kind === "win-back") {
    return sendWinBackEmail({ to, memberName, inactiveDays: trigger.inactiveDays });
  }
  if (trigger.kind === "monthly-recap") {
    return sendMonthlyRecapEmail({ to, memberName, ...trigger });
  }
  return sendMembershipReminderEmail({
    to,
    memberName,
    plan: trigger.plan,
    nextBillingDate: trigger.nextBillingDate,
    daysRemaining: trigger.daysRemaining,
  });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let db: Awaited<ReturnType<typeof getDb>> | null = null;
  const runId = `lifecycle-${Date.now()}`;
  try {
    db = await getDb();
    await db.collection(JOB_RUNS_COLLECTION).insertOne({
      id: runId,
      job: "lifecycle",
      status: "running",
      startedAt: new Date(),
    });
    const deliveries = db.collection<DeliveryDoc>(DELIVERIES_COLLECTION);
    await deliveries.createIndex({ deliveryKey: 1 }, { unique: true });
    // A process can die after claiming a delivery. Release stale claims so the next run can retry.
    await deliveries.deleteMany({
      status: "sending",
      createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
    });

    const now = new Date();
    const members = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray();
    const today = businessDate(now);
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const member of members) {
      const memberKey = member.normalizedName || member.memberName || "unknown";
      for (const trigger of evaluateLifecycle(member, today)) {
        const deliveryKey = `${memberKey}:${trigger.key}`;
        try {
          await deliveries.insertOne({
            deliveryKey,
            memberKey,
            kind: trigger.kind,
            createdAt: new Date(),
            status: "sending",
          });
        } catch (error) {
          if ((error as { code?: number }).code === 11000) {
            skipped += 1;
            continue;
          }
          throw error;
        }

        const emailResult = await deliver(trigger, member);
        const pushPayload =
            trigger.kind === "streak-risk"
              ? { title: "Tu racha sigue viva 🔥", body: `Llevás ${trigger.streak} días. Entrená hoy para mantenerla.` }
              : trigger.kind === "milestone"
                ? { title: "¡Nuevo hito! 🏆", body: `Llegaste a ${trigger.streak} días de constancia.`, url: "/app" }
              : trigger.kind === "win-back"
                ? { title: "Volvé a Xtreme", body: "Lo importante no es la pausa: es retomar.", url: "/app" }
                : trigger.kind === "monthly-recap"
                  ? { title: "Tu mes en Xtreme 💪", body: `${trigger.workouts} entrenos y ${trigger.minutes} minutos.`, url: "/app" }
                  : { title: "Tu membresía Xtreme", body: "Revisá tu fecha de renovación y mantené tu ritmo.", url: "/app" };
        const pushResult = await sendMemberPush(db, memberKey, {
          ...pushPayload,
          deliveryKey,
          memberKey,
          clickToken: notificationClickToken(memberKey, deliveryKey),
        });
        if (emailResult.ok || pushResult.sent > 0) {
          sent += 1;
          await deliveries.updateOne({ deliveryKey }, { $set: { status: "sent", sentAt: new Date() } });
          await recordEvent(db, {
            type: "notification_sent",
            memberId: memberKey,
            source: "job",
            entity: { type: "lifecycle_delivery", id: deliveryKey },
            properties: { campaign: trigger.kind, email: emailResult.ok, pushDevices: pushResult.sent },
          });
        } else if (emailResult.skipped && (pushResult.skipped || pushResult.attempted === 0)) {
          skipped += 1;
          await deliveries.updateOne(
            { deliveryKey },
            { $set: { status: "skipped", sentAt: new Date() } },
          );
        } else {
          failed += 1;
          await deliveries.deleteOne({ deliveryKey });
        }
      }
    }

    const freeDayNudges = await processFreeDayNudges(db, now);
    sent += freeDayNudges.sent;
    skipped += freeDayNudges.skipped;
    failed += freeDayNudges.failed;

    if (failed > 0) {
      await recordOpsAlert(db, {
        fingerprint: "lifecycle-delivery-failures",
        kind: "lifecycle_delivery",
        severity: "warning",
        title: "Avisos automáticos sin entregar",
        detail: `${failed} aviso(s) no pudieron enviarse ni por correo ni por push en la ejecución diaria.`,
        context: { runId, date: today, failed, sent, skipped },
      });
    } else {
      await resolveOpsAlert(db, "lifecycle-delivery-failures");
    }
    await resolveOpsAlert(db, "lifecycle-job-failed");

    const [paymentDocs, checkins, pendingInvites, abandonedPayPalOrders] = await Promise.all([
      db
        .collection<PaymentDoc>(PAYMENTS_COLLECTION)
        .find({ date: today, status: "completed" })
        .project<Pick<PaymentDoc, "amountCrc">>({ amountCrc: 1 })
        .toArray(),
      db.collection(CHECKINS_COLLECTION).countDocuments({ date: today }),
      db.collection(PENDING_REGISTRATIONS_COLLECTION).countDocuments({
        confirmedAt: null,
        expiresAt: { $gt: now },
      }),
      db.collection(PAYPAL_ORDERS_COLLECTION).countDocuments({
        status: "created",
        createdAt: {
          $gte: new Date(now.getTime() - 24 * 60 * 60_000),
          $lt: new Date(now.getTime() - 30 * 60_000),
        },
      }),
    ]);
    const membershipStates = members.map((member) => membershipStatus(member.membership).status);
    const openAlerts = await listOpenOpsAlerts(db, 50);
    const dailyEmail = await sendAdminDailySummary({
      date: today,
      members: members.length,
      activeMemberships: membershipStates.filter((status) => status === "active").length,
      expiringMemberships: membershipStates.filter((status) => status === "warning").length,
      expiredMemberships: membershipStates.filter((status) => status === "expired").length,
      payments: paymentDocs.length,
      revenueCrc: paymentDocs.reduce((sum, payment) => sum + Number(payment.amountCrc || 0), 0),
      checkins,
      notificationsSent: sent,
      notificationsFailed: failed,
      pendingInvites,
      abandonedPayPalOrders,
      openAlerts: openAlerts.length,
      freeDayNudgesSent: freeDayNudges.sent,
    });
    if (!dailyEmail.ok) {
      await recordOpsAlert(db, {
        fingerprint: "admin-daily-email-failed",
        kind: "admin_email",
        severity: "critical",
        title: "El resumen diario no llegó al administrador",
        detail: dailyEmail.error || "El proveedor de correo no está configurado o rechazó el mensaje.",
        context: { runId, date: today },
      });
    } else {
      await resolveOpsAlert(db, "admin-daily-email-failed");
    }

    const summary = {
      members: members.length,
      sent,
      skipped,
      failed,
      payments: paymentDocs.length,
      checkins,
      pendingInvites,
      abandonedPayPalOrders,
      openAlerts: openAlerts.length,
      adminEmailSent: dailyEmail.ok,
      freeDayNudgesSent: freeDayNudges.sent,
      freeDayNudgesSkipped: freeDayNudges.skipped,
      freeDayNudgesFailed: freeDayNudges.failed,
    };
    await db.collection(JOB_RUNS_COLLECTION).updateOne(
      { id: runId },
      {
        $set: {
          status: failed || !dailyEmail.ok ? "completed_with_errors" : "completed",
          finishedAt: new Date(),
          summary,
        },
      },
    );
    return NextResponse.json({ ok: true, runId, date: today, ...summary });
  } catch (error) {
    console.error("XTREME LIFECYCLE JOB", error);
    const detail = error instanceof Error ? error.message : "Error desconocido";
    if (db) {
      try {
        await db.collection(JOB_RUNS_COLLECTION).updateOne(
          { id: runId },
          {
            $set: {
              status: "failed",
              finishedAt: new Date(),
              summary: { error: detail.slice(0, 500) },
            },
          },
        );
        await recordOpsAlert(db, {
          fingerprint: "lifecycle-job-failed",
          kind: "lifecycle_job",
          severity: "critical",
          title: "Falló el proceso automático diario",
          detail,
          context: { runId },
        });
        await sendAdminOperationalAlert({
          severity: "critical",
          title: "Falló el proceso automático diario",
          detail,
          context: { runId },
        });
      } catch (alertError) {
        console.error("XTREME LIFECYCLE ALERT", alertError);
      }
    }
    return NextResponse.json({ error: "No se pudo ejecutar el ciclo de avisos." }, { status: 500 });
  }
}
