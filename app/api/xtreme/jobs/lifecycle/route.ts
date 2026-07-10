import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  emailEnabled,
  sendMembershipReminderEmail,
  sendMilestoneEmail,
  sendMonthlyRecapEmail,
  sendStreakRiskEmail,
  sendWinBackEmail,
  type SendEmailResult,
} from "@/lib/helpers/email";
import { sendMemberPush } from "@/lib/helpers/push";
import { evaluateLifecycle, type LifecycleTrigger } from "@/lib/xtreme/lifecycle";
import { MEMBERS_COLLECTION, todayIso, type MemberDoc } from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DeliveryDoc = {
  deliveryKey: string;
  memberKey: string;
  kind: LifecycleTrigger["kind"];
  createdAt: Date;
  sentAt?: Date;
  status: "sending" | "sent";
};

const DELIVERIES_COLLECTION = "xtreme_gym_lifecycle_deliveries";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

async function deliver(trigger: LifecycleTrigger, member: MemberDoc): Promise<SendEmailResult> {
  const to = member.email || "";
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
  if (!emailEnabled()) return NextResponse.json({ error: "Resend no está configurado." }, { status: 503 });

  try {
    const db = await getDb();
    const deliveries = db.collection<DeliveryDoc>(DELIVERIES_COLLECTION);
    await deliveries.createIndex({ deliveryKey: 1 }, { unique: true });

    const members = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({ email: { $type: "string", $ne: "" } }).toArray();
    const today = todayIso();
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

        const result = await deliver(trigger, member);
        if (result.ok) {
          sent += 1;
          await deliveries.updateOne({ deliveryKey }, { $set: { status: "sent", sentAt: new Date() } });
          const pushPayload =
            trigger.kind === "streak-risk"
              ? { title: "Tu racha sigue viva 🔥", body: `Llevás ${trigger.streak} días. Entrená hoy para mantenerla.` }
              : trigger.kind === "milestone"
                ? { title: "¡Nuevo hito! 🏆", body: `Llegaste a ${trigger.streak} días de constancia.`, url: "/app" }
              : trigger.kind === "win-back"
                ? { title: "Volvé a Xtreme", body: "Lo importante no es la pausa: es retomar.", url: "/primer-dia#reservar" }
                : trigger.kind === "monthly-recap"
                  ? { title: "Tu mes en Xtreme 💪", body: `${trigger.workouts} entrenos y ${trigger.minutes} minutos.`, url: "/app" }
                  : { title: "Tu membresía Xtreme", body: "Revisá tu fecha de renovación y mantené tu ritmo.", url: "/precios" };
          await sendMemberPush(db, memberKey, pushPayload);
        } else {
          failed += 1;
          await deliveries.deleteOne({ deliveryKey });
        }
      }
    }

    return NextResponse.json({ ok: true, date: today, members: members.length, sent, skipped, failed });
  } catch (error) {
    console.error("XTREME LIFECYCLE JOB", error);
    return NextResponse.json({ error: "No se pudo ejecutar el ciclo de avisos." }, { status: 500 });
  }
}
