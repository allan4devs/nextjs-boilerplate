import { NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { emailEnabled } from "@/lib/helpers/email";
import { pushEnabled } from "@/lib/helpers/push";
import { paypalEnabled } from "@/lib/helpers/paypal";

export const dynamic = "force-dynamic";

type LifecycleRun = {
  status: string;
  startedAt: Date;
  finishedAt?: Date;
  summary?: unknown;
};

export async function GET() {
  const startedAt = Date.now();
  let database = false;
  let lifecycle: LifecycleRun | null = null;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    database = true;
    lifecycle = await db.collection("xtreme_gym_job_runs").findOne(
      { job: "lifecycle" },
      { sort: { startedAt: -1 }, projection: { _id: 0, status: 1, startedAt: 1, finishedAt: 1, summary: 1 } },
    ) as LifecycleRun | null;
  } catch (error) {
    console.error("HEALTH DATABASE", error);
  }

  const checks = {
    database,
    email: emailEnabled(),
    push: pushEnabled(),
    paypal: paypalEnabled(),
    cron: Boolean(process.env.CRON_SECRET?.trim()),
    admin: Boolean(process.env.XTREME_ADMIN_CODE?.trim() && process.env.XTREME_SUPER_ADMIN_CODE?.trim()),
    reception: Boolean(process.env.XTREME_RECEPTION_CODE?.trim()),
    trainer: Boolean(process.env.XTREME_TRAINER_CODE?.trim()),
  };
  const lifecycleFresh = Boolean(
    lifecycle?.startedAt && Date.now() - new Date(lifecycle.startedAt).getTime() <= 36 * 60 * 60_000,
  );
  const healthy = database
    && lifecycleFresh
    && checks.email
    && checks.paypal
    && checks.cron
    && checks.admin
    && checks.reception
    && checks.trainer;

  return NextResponse.json(
    { ok: healthy, checks: { ...checks, lifecycleFresh }, jobs: { lifecycle }, latencyMs: Date.now() - startedAt, checkedAt: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
