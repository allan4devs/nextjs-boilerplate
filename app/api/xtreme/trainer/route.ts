import { NextRequest, NextResponse } from "next/server";
import type { WithId } from "mongodb";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import { expelClassAttendee, toggleClassAvailability } from "@/lib/xtreme/inventory";
import { queuePushMemberEvent } from "@/lib/xtreme/member-push";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { businessDate } from "@/lib/xtreme/business-date";
import { getTrainerClassesForDate } from "@/lib/xtreme/trainer-classes";
import { listEquipmentAssets } from "@/lib/xtreme/equipment";
import {
  assignDefaultProgramsToMembers,
  assignTrainingProgram,
  listTrainingPrograms,
  updateTrainingProgramFromPlan,
} from "@/lib/xtreme/training-programs";
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

function trainerMemberView(member: WithId<MemberDoc>) {
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
    memberId: member._id?.toString() ?? "",
    memberName: member.memberName ?? "",
    normalizedName: member.normalizedName ?? normalizeKey(member.memberName ?? ""),
    goal: member.goal ?? "",
    coach: member.coach ?? "",
    photoUrl: member.photoUrl ?? "",
    membershipStatus: membership.status,
    trainingPlan: toAdminPlan(member.trainingPlan),
    trainingProgramAssignment: member.trainingProgramAssignment
      ? {
          ...member.trainingProgramAssignment,
          assignedAt: new Date(member.trainingProgramAssignment.assignedAt).toISOString(),
        }
      : null,
    activePlanWorkout: member.activePlanWorkout
      ? {
          id: member.activePlanWorkout.id,
          planItemId: member.activePlanWorkout.planItemId,
          planTitle: member.activePlanWorkout.planTitle,
          trainingName: member.activePlanWorkout.trainingName,
          startedAt: member.activePlanWorkout.startedAt,
        }
      : null,
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
  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : businessDate();

  if (req.nextUrl.searchParams.get("view") === "classes") {
    return NextResponse.json(
      { date, todayClasses: await getTrainerClassesForDate(db, date) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const [members, todayClasses, equipmentAssets, programDocs] = await Promise.all([
    db.collection<MemberDoc>(MEMBERS_COLLECTION)
      .find({}, { projection: { memberName: 1, normalizedName: 1, goal: 1, coach: 1, photoUrl: 1, membership: 1, trainingPlan: 1, trainingProgramAssignment: 1, activePlanWorkout: 1, workouts: 1, bodyMetrics: 1 } })
      .sort({ memberName: 1 })
      .toArray(),
    getTrainerClassesForDate(db, date),
    listEquipmentAssets(db, { kind: "machine" }),
    listTrainingPrograms(db),
  ]);
  const equipment = equipmentAssets.map((asset) => ({
    assetId: asset.id,
    ...(asset.machineGuideId ? { machineGuideId: asset.machineGuideId } : {}),
    code: asset.code,
    name: asset.name,
    area: asset.area,
    location: asset.location,
    floor: asset.floor ?? 1,
    status: asset.status,
  }));
  const programCounts = new Map<string, number>();
  for (const member of members) {
    const programId = member.trainingProgramAssignment?.programId;
    if (programId) programCounts.set(programId, (programCounts.get(programId) ?? 0) + 1);
  }
  const programs = programDocs.map((program) => ({
    id: program.id,
    name: program.name,
    shortName: program.shortName,
    description: program.description,
    objective: program.objective,
    coachNote: program.coachNote,
    weeklySessions: program.weeklySessions,
    durationWeeks: program.durationWeeks,
    level: program.level,
    audience: program.audience,
    accent: program.accent,
    sessions: program.sessions,
    revision: program.revision,
    memberCount: programCounts.get(program.id) ?? 0,
  }));
  return NextResponse.json(
    {
      role: "trainer",
      date,
      todayClasses,
      members: members.map(trainerMemberView),
      equipment,
      programs,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const session = await requireTrainer(req);
  if (!session) return NextResponse.json({ error: "Sesion de entrenador requerida." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const db = await getDb();

  const action = String(body.action ?? "").trim();
  const actorName = session.staffName || "Entrenador Xtreme";
  if (action === "assign_default_programs") {
    const result = await assignDefaultProgramsToMembers(db, actorName);
    await writeAudit(db, {
      actorRole: "trainer",
      actorId: session.staffId,
      actorName,
      action: "trainer.assign_default_programs",
      targetType: "system",
      targetId: "training-programs",
      summary: `${result.assigned} socios sin plan recibieron un programa base`,
      meta: result,
    });
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "assign_program") {
    const memberKey = normalizeKey(String(body.memberKey ?? body.memberName ?? ""));
    const programId = String(body.programId ?? "").trim();
    if (!memberKey || !programId) return NextResponse.json({ error: "Socio y programa requeridos." }, { status: 400 });
    const result = await assignTrainingProgram({ db, memberKey, programId, assignedBy: actorName });
    if (result.status === "missing") return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    if (result.status === "missing_program") return NextResponse.json({ error: "Programa no encontrado." }, { status: 404 });
    if (result.status === "active_workout") return NextResponse.json({ error: "El socio tiene un entreno activo. Finalizalo antes de cambiar de grupo." }, { status: 409 });
    await writeAudit(db, {
      actorRole: "trainer",
      actorId: session.staffId,
      actorName,
      action: "trainer.assign_program",
      targetType: "member",
      targetId: memberKey,
      summary: `${result.member?.memberName || memberKey} se unió al programa ${programId}`,
      meta: { programId },
    });
    return NextResponse.json({ ok: true, member: result.member ? trainerMemberView(result.member) : null });
  }

  if (action === "update_training_program") {
    const programId = String(body.programId ?? "").trim();
    const plan = sanitizePlan(body.plan);
    if (!programId || !plan.title || !plan.items.length) {
      return NextResponse.json({ error: "Programa, título y sesiones requeridos." }, { status: 400 });
    }
    const result = await updateTrainingProgramFromPlan({ db, programId, plan, actorName });
    if (result.status === "missing_program") return NextResponse.json({ error: "Programa no encontrado." }, { status: 404 });
    if (result.status === "invalid_machine") return NextResponse.json({ error: "Cada ejercicio del grupo debe apuntar a una máquina del catálogo." }, { status: 400 });
    if (result.status === "conflict") return NextResponse.json({ error: "Otro entrenador actualizó el programa. Refrescá antes de reintentar." }, { status: 409 });
    await writeAudit(db, {
      actorRole: "trainer",
      actorId: session.staffId,
      actorName,
      action: "trainer.update_training_program",
      targetType: "system",
      targetId: programId,
      summary: `${actorName} actualizó ${plan.title} para ${result.synced} socios`,
      meta: { programId, revision: result.program.revision, synced: result.synced, deferred: result.deferred },
    });
    return NextResponse.json({ ok: true, synced: result.synced, deferred: result.deferred });
  }
  if (action === "toggle_class") {
    const trainingId = String(body.trainingId ?? "").trim();
    const date = String(body.date ?? businessDate()).trim();
    const status = body.status === "scheduled" ? "scheduled" : "cancelled";
    if (!trainingId) return NextResponse.json({ error: "Clase requerida." }, { status: 400 });
    const result = await toggleClassAvailability(db, { trainingId, date, status });
    return NextResponse.json({ ...result, todayClasses: await getTrainerClassesForDate(db, date) });
  }

  if (action === "expel_attendee") {
    const bookingId = String(body.bookingId ?? "").trim();
    const date = String(body.date ?? businessDate()).trim();
    if (!bookingId) return NextResponse.json({ error: "Reserva requerida." }, { status: 400 });
    const result = await expelClassAttendee(db, { bookingId });
    return NextResponse.json({ ...result, todayClasses: await getTrainerClassesForDate(db, date) });
  }

  const memberName = normalizeName(body.memberName);
  if (!memberName) return NextResponse.json({ error: "Socio requerido." }, { status: 400 });
  const plan = sanitizePlan(body.plan);
  if (!plan.title || !plan.items.length) {
    return NextResponse.json({ error: "El plan necesita titulo y al menos una sesion." }, { status: 400 });
  }
  if (plan.items.some((item) => !item.prescribedExercises?.length)) {
    return NextResponse.json({ error: "Cada sesion necesita al menos una maquina fisica." }, { status: 400 });
  }
  const normalizedName = normalizeKey(memberName);
  const existing = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
  if (!existing) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
  if (existing.activePlanWorkout) {
    return NextResponse.json(
      { error: "El socio tiene un entreno activo. Esperá a que lo finalice o cancele." },
      { status: 409 },
    );
  }

  const prescribed = plan.items.flatMap((item) => item.prescribedExercises ?? []);
  const equipment = await listEquipmentAssets(db, { kind: "machine" });
  const equipmentById = new Map(equipment.map((asset) => [asset.id, asset]));
  const missingMachine = prescribed.find((exercise) => !exercise.assetId || !equipmentById.has(exercise.assetId));
  if (missingMachine) {
    return NextResponse.json(
      { error: `Vinculá ${missingMachine.exerciseName || "cada ejercicio"} con una máquina física válida.` },
      { status: 400 },
    );
  }
  const unavailableMachine = prescribed.find((exercise) => equipmentById.get(exercise.assetId!)?.status === "fuera_de_servicio");
  if (unavailableMachine) {
    return NextResponse.json(
      { error: `${unavailableMachine.machineCode || unavailableMachine.machineName || "La máquina elegida"} está fuera de servicio. Elegí otra unidad.` },
      { status: 409 },
    );
  }
  const linkedPlan = {
    ...plan,
    items: plan.items.map((item) => ({
      ...item,
      prescribedExercises: (item.prescribedExercises ?? []).map((exercise) => {
        const machine = equipmentById.get(exercise.assetId!);
        if (!machine) return exercise;
        return {
          ...exercise,
          machineId: machine.machineGuideId ?? "",
          machineName: machine.name,
          machineCode: machine.code,
          machineArea: machine.area,
          machineLocation: machine.location,
          machineFloor: machine.floor ?? 1,
        };
      }),
    })),
  };

  const now = new Date();
  const coachName = String(body.coachName ?? existing.coach ?? "Entrenador Xtreme").trim().slice(0, 60);
  const customAssignment = {
    programId: `custom-${normalizedName}`,
    programName: linkedPlan.title,
    programRevision: (existing.trainingProgramAssignment?.programRevision ?? 0) + 1,
    groupId: `custom-${normalizedName}`,
    cohort: `custom-${normalizedName}`,
    source: "trainer_custom" as const,
    cycle: existing.trainingProgramAssignment?.cycle ?? 0,
    assignedBy: coachName,
    assignedAt: now,
  };
  await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
    { normalizedName },
    {
      $set: {
        coach: coachName,
        trainingPlan: {
          ...linkedPlan,
          programId: customAssignment.programId,
          programName: customAssignment.programName,
          programRevision: customAssignment.programRevision,
          groupId: customAssignment.groupId,
          assignmentSource: "custom" as const,
          cycle: customAssignment.cycle,
          createdAt: existing.trainingPlan?.createdAt ?? now,
          updatedAt: now,
        },
        trainingProgramAssignment: customAssignment,
        updatedAt: now,
      },
    },
  );
  queuePushMemberEvent(db, normalizedName, {
    type: "trainer_plan_assigned",
    planName: linkedPlan.title || "Nueva rutina personalizada",
  });
  await writeAudit(db, {
    actorRole: "trainer",
    action: "trainer.save_plan",
    targetType: "member",
    targetId: normalizedName,
    summary: `Plan ${linkedPlan.title} guardado para ${memberName}`,
    meta: { sessions: linkedPlan.items.length, machines: prescribed.length, coachName },
  });
  const updated = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
  return NextResponse.json({ ok: true, member: updated ? trainerMemberView(updated) : null });
}
