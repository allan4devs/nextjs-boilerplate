import { NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { emailEnabled } from "@/lib/helpers/email";
import { pushEnabled } from "@/lib/helpers/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let database = false;
  let lifecycle: { status: string; startedAt: Date; finishedAt?: Date; summary?: unknown } | null = null;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    database = true;
    lifecycle = await db.collection("xtreme_gym_job_runs").findOne(
      { job: "lifecycle" },
      { sort: { startedAt: -1 }, projection: { _id: 0, status: 1, startedAt: 1, finishedAt: 1, summary: 1 } },
    ) as typeof lifecycle;
  } catch (error) {
    console.error("HEALTH DATABASE", error);
  }

  const checks = {
    database,
    email: emailEnabled(),
    push: pushEnabled(),
    paypal: Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim()),
    cron: Boolean(process.env.CRON_SECRET?.trim()),
    admin: Boolean(process.env.XTREME_ADMIN_CODE?.trim() && process.env.XTREME_SUPER_ADMIN_CODE?.trim()),
  };

  return NextResponse.json(
    { ok: database, checks, jobs: { lifecycle }, latencyMs: Date.now() - startedAt, checkedAt: new Date().toISOString() },
    { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
