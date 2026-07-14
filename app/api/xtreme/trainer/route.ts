import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import {
  MEMBERS_COLLECTION,
  membershipStatus,
  normalizeKey,
  normalizeName,
  sanitizePlan,
  toAdminPlan,
  type MemberDoc,
} from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

async function requireTrainer(req: NextRequest) {
  const session = await resolveStaffSession(req, "trainer");
  return session?.role === "trainer" ? session : null;
}

function trainerMemberView(member: MemberDoc) {
  const membership = membershipStatus(member.membership);
  const workouts = [...(member.workouts ?? [])]
    .sort((a, b) => String(b.completedAt ?? "").localeCompare(String(a.completedAt ?? "")))
    .slice(0, 12)
    .map((workout) => ({
      id: workout.id,
      completedDate: workout.completedDate,
      trainingName: workout.trainingName,
      minutes: workout.minutes,
      planItemId: workout.planItemId,
      exercises: workout.exercises ?? [],
    }));
  return {
    memberName: member.memberName ?? "",
    normalizedName: member.normalizedName ?? normalizeKey(member.memberName ?? ""),
    goal: member.goal ?? "",
    coach: member.coach ?? "",
    photoUrl: member.photoUrl ?? "",
    membershipStatus: membership.status,
    trainingPlan: toAdminPlan(member.trainingPlan),
    activePlanWorkout: member.activePlanWorkout ?? null,
    recentWorkouts: workouts,
    latestMetrics: [...(member.bodyMetrics ?? [])]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
  };
}

export async function GET(req: NextRequest) {
  if (!(await requireTrainer(req))) {
    return NextResponse.json({ error: "Sesion de entrenador requerida." }, { status: 401 });
  }
  const db = await getDb();
  const members = await db.collection<MemberDoc>(MEMBERS_COLLECTION)
    .find({}, { projection: { memberName: 1, normalizedName: 1, goal: 1, coach: 1, photoUrl: 1, membership: 1, trainingPlan: 1, activePlanWorkout: 1, workouts: 1, bodyMetrics: 1 } })
    .sort({ memberName: 1 })
    .toArray();
  return NextResponse.json({ role: "trainer", members: members.map(trainerMemberView) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await requireTrainer(req);
  if (!session) return NextResponse.json({ error: "Sesion de entrenador requerida." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const memberName = normalizeName(body.memberName);
  if (!memberName) return NextResponse.json({ error: "Socio requerido." }, { status: 400 });
  const plan = sanitizePlan(body.plan);
  if (!plan.title || !plan.items.length) {
    return NextResponse.json({ error: "El plan necesita titulo y al menos una sesion." }, { status: 400 });
  }
  const normalizedName = normalizeKey(memberName);
  const db = await getDb();
  const existing = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
  if (!existing) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
  if (existing.activePlanWorkout) {
    return NextResponse.json(
      { error: "El socio tiene un entreno activo. Espere a que lo finalice o cancele." },
      { status: 409 },
    );
  }
  const now = new Date();
  const coachName = String(body.coachName ?? existing.coach ?? "Entrenador Xtreme").trim().slice(0, 60);
  await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
    { normalizedName },
    {
      $set: {
        coach: coachName,
        trainingPlan: { ...plan, createdAt: existing.trainingPlan?.createdAt ?? now, updatedAt: now },
        updatedAt: now,
      },
    },
  );
  await writeAudit(db, {
    actorRole: "trainer",
    action: "trainer.save_plan",
    targetType: "member",
    targetId: normalizedName,
    summary: `Plan ${plan.title} guardado para ${memberName}`,
    meta: { sessions: plan.items.length, coachName },
  });
  const updated = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
  return NextResponse.json({ ok: true, member: updated ? trainerMemberView(updated) : null });
}
