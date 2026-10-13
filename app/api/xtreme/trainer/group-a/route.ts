import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/helpers/mongodb";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { MEMBERS_COLLECTION, type MemberDoc } from "@/lib/xtreme/shared";
import { businessDate } from "@/lib/xtreme/business-date";
import { GROUP_A_ID, alignGroupExercise, isGroupEquipmentAvailable, validGroupDate, type GroupExercise, type GroupExercisePatch, type GroupLog, type GroupRoutine } from "@/lib/xtreme/trainer-group-a-model";
import { GROUP_A_COLLECTION, getGroupDashboard, groupInventory, saveGroupRecord, type GroupRecord } from "@/lib/xtreme/trainer-group-a";

export const dynamic = "force-dynamic";
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function parseExercisePatch(value: unknown): GroupExercisePatch | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const patch: GroupExercisePatch = {};
  const textFields = ["muscle", "name", "equipment", "sourceMachine", "time"] as const;
  for (const key of textFields) {
    if (raw[key] !== undefined) {
      if (typeof raw[key] !== "string") return null;
      patch[key] = raw[key].trim().slice(0, key === "time" ? 40 : 160);
    }
  }
  for (const key of ["sets", "reps"] as const) {
    if (raw[key] !== undefined) {
      if (raw[key] !== null && (typeof raw[key] !== "number" || !Number.isInteger(raw[key]) || Number(raw[key]) < 0 || Number(raw[key]) > 500)) return null;
      patch[key] = raw[key] === null ? null : Number(raw[key]);
    }
  }
  if (raw.weightKg !== undefined) {
    if (raw.weightKg !== null && (typeof raw.weightKg !== "number" || !Number.isFinite(raw.weightKg) || raw.weightKg < 0 || raw.weightKg > 1000)) return null;
    patch.weightKg = raw.weightKg === null ? null : Number(raw.weightKg);
  }
  return Object.keys(patch).length ? patch : null;
}

function allExercises(dashboard: Awaited<ReturnType<typeof getGroupDashboard>>) {
  return dashboard.routines.flatMap((routine) => routine.days.flatMap((day) => day.exercises));
}

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "trainer");
  if (session?.role !== "trainer") return fail("Sesión de entrenador requerida.", 401);
  try {
    return NextResponse.json(await getGroupDashboard(await getDb()), { headers: { "Cache-Control": "no-store" } });
  } catch { return fail("No se pudo cargar el Grupo A. Volvé a intentar.", 503); }
}

export async function POST(req: NextRequest) {
  const session = await resolveStaffSession(req, "trainer");
  if (session?.role !== "trainer") return fail("Sesión de entrenador requerida.", 401);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !Number.isInteger(body.revision) || Number(body.revision) < 0) return fail("Solicitud o versión inválida.");
  const revision = Number(body.revision);
  const trainer = session.staffName || session.staffId || "Entrenador Xtreme";
  const updatedAt = new Date().toISOString();
  try {
    const db = await getDb();
    let saved = false;
    const dashboard = await getGroupDashboard(db);
    let createdRoutineId = "";
    let createdDayId = "";
    if (body.action === "create_group") {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
      if (name.length < 2) return fail("El grupo necesita un nombre.");
      if (dashboard.groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) return fail("Ya existe un grupo con ese nombre.");
      const groupId = `group-${randomUUID().slice(0, 8)}`;
      saved = await saveGroupRecord(db, `group:${groupId}`, 0, {
        kind: "group", groupId, groupName: name, updatedBy: trainer, updatedAt,
      });
    } else if (body.action === "delete_group") {
      const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
      if (!groupId || groupId === GROUP_A_ID) return fail("El Grupo A principal no se puede eliminar.");
      if (!dashboard.groups.some((group) => group.id === groupId)) return fail("Grupo inválido.");
      if (dashboard.profiles.some((profile) => profile.groupId === groupId)) return fail("Quitá primero las personas de este grupo.", 409);
      const result = await db.collection<GroupRecord>(GROUP_A_COLLECTION).deleteOne({ _id: `group:${groupId}`, kind: "group" });
      if (!result.deletedCount) return fail("No se pudo eliminar el grupo.", 409);
      saved = true;
    } else if (body.action === "create_routine") {
      const objective = typeof body.objective === "string" ? body.objective.trim().slice(0, 120) : "";
      const startDate = typeof body.startDate === "string" ? body.startDate : "";
      const endDate = typeof body.endDate === "string" ? body.endDate : "";
      const dayLabel = typeof body.dayLabel === "string" ? body.dayLabel.trim().slice(0, 80) : "";
      const focus = typeof body.focus === "string" ? body.focus.trim().slice(0, 120) : "";
      const moduleCount = Number(body.moduleCount ?? 1);
      const templateRoutineId = typeof body.templateRoutineId === "string" ? body.templateRoutineId.trim() : "";
      const templateDayId = typeof body.templateDayId === "string" ? body.templateDayId.trim() : "";
      if (objective.length < 2) return fail("La rutina necesita un nombre u objetivo.");
      if (!validGroupDate(startDate, "9999-12-31") || !validGroupDate(endDate, "9999-12-31") || endDate < startDate) return fail("Revisá las fechas de la rutina.");
      if (dayLabel.length < 2) return fail("Agregá el nombre del Día 1.");
      if (!Number.isInteger(moduleCount) || moduleCount < 1 || moduleCount > 7) return fail("La rutina debe tener entre 1 y 7 días.");
      const templateDay = templateRoutineId
        ? dashboard.routines.find((entry) => entry.id === templateRoutineId)?.days.find((entry) => entry.id === templateDayId)
        : undefined;
      if (templateRoutineId && !templateDay) return fail("La rutina base o su día no son válidos.");
      createdRoutineId = `routine-${randomUUID().slice(0, 8)}`;
      const routine: GroupRoutine = {
        id: createdRoutineId, sourceFile: "Creada en Trainer OS", objective, startDate, endDate,
        coach: trainer,
        days: Array.from({ length: moduleCount }, (_, index) => ({
          id: `day-${randomUUID().slice(0, 8)}`,
          label: `Día ${index + 1}`,
          focus: index === 0 ? (focus || dayLabel) : `Día ${index + 1}`,
          exercises: index === 0 && templateDay ? templateDay.exercises.map((exercise) => ({ ...exercise, id: `custom-${randomUUID().slice(0, 12)}` })) : [],
        })),
      };
      saved = await saveGroupRecord(db, `routine:${createdRoutineId}`, 0, {
        kind: "routine", routineId: createdRoutineId, routine, updatedBy: trainer, updatedAt,
      });
    } else if (body.action === "add_day") {
      const routineId = typeof body.routineId === "string" ? body.routineId.trim() : "";
      const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : "";
      const focus = typeof body.focus === "string" ? body.focus.trim().slice(0, 120) : "";
      const routine = dashboard.routines.find((entry) => entry.id === routineId);
      if (!routine) return fail("Rutina inválida.");
      if (label.length < 2) return fail("El día necesita un nombre.");
      if (routine.days.some((day) => day.label.toLowerCase() === label.toLowerCase())) return fail("Ya existe un día con ese nombre.");
      createdDayId = `day-${randomUUID().slice(0, 8)}`;
      saved = await saveGroupRecord(db, `day:${routineId}:${createdDayId}`, 0, {
        kind: "day", routineId, dayId: createdDayId,
        day: { id: createdDayId, label, focus: focus || label, exercises: [] },
        updatedBy: trainer, updatedAt,
      });
    } else if (body.action === "add_member") {
      const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
      const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
      const routineId = typeof body.routineId === "string" ? body.routineId.trim() : dashboard.routines[0]?.id;
      const group = dashboard.groups.find((entry) => entry.id === groupId);
      if (!group || !ObjectId.isValid(memberId)) return fail("Grupo o socio invalido.");
      if (!routineId || !dashboard.routines.some((routine) => routine.id === routineId)) return fail("Rutina invalida.");
      const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ _id: new ObjectId(memberId) }, { projection: { memberName: 1 } });
      if (!member) return fail("Socio no encontrado.", 404);
      const records = db.collection<GroupRecord>(GROUP_A_COLLECTION);
      await records.updateMany({ kind: "membership", memberId, active: { $ne: false } }, { $set: { active: false, updatedBy: trainer, updatedAt }, $inc: { revision: 1 } });
      for (const link of dashboard.links.filter((entry) => entry.memberId === memberId)) {
        const profile = dashboard.profiles.find((entry) => entry.id === link.profileId);
        const overrideId = `membership:${GROUP_A_ID}:${link.profileId}`;
        const current = await records.findOne({ _id: overrideId });
        const overrideSaved = await saveGroupRecord(db, overrideId, current?.revision ?? 0, {
          kind: "membership", groupId: GROUP_A_ID, profileId: link.profileId, memberId,
          routineId: profile?.routineId, name: profile?.name, active: false, updatedBy: trainer, updatedAt,
        });
        if (!overrideSaved) return fail("Otro entrenador actualizo la pertenencia del socio. Actualiza el grupo.", 409);
      }
      const profileId = `member:${memberId}`;
      const membershipId = `membership:${groupId}:${memberId}`;
      const current = await records.findOne({ _id: membershipId });
      saved = await saveGroupRecord(db, membershipId, current?.revision ?? 0, {
        kind: "membership", groupId, profileId, memberId, name: member.memberName || memberId,
        routineId, active: true, updatedBy: trainer, updatedAt,
      });
    } else if (body.action === "assign_routine") {
      const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
      const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
      const routineId = typeof body.routineId === "string" ? body.routineId.trim() : "";
      const profile = dashboard.profiles.find((entry) => entry.groupId === groupId && entry.id === profileId);
      if (!dashboard.groups.some((entry) => entry.id === groupId) || !profile) return fail("Persona o grupo inválido.");
      if (!dashboard.routines.some((entry) => entry.id === routineId)) return fail("Elegí una rutina válida.");
      const current = await db.collection<GroupRecord>(GROUP_A_COLLECTION).findOne({ _id: `routine-assignment:${profileId}`, kind: "routine_assignment" });
      if ((current?.revision ?? 0) !== revision) return fail("La asignación cambió en otra pantalla. Actualizá el grupo e intentá de nuevo.", 409);
      saved = await saveGroupRecord(db, `routine-assignment:${profileId}`, revision, {
        kind: "routine_assignment", profileId, groupId, routineId, updatedBy: trainer, updatedAt,
      });
    } else if (body.action === "remove_member") {
      const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
      const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
      const profile = dashboard.profiles.find((entry) => entry.groupId === groupId && entry.id === profileId);
      if (!dashboard.groups.some((group) => group.id === groupId) || !profile) return fail("Persona o grupo invalido.");
      const records = db.collection<GroupRecord>(GROUP_A_COLLECTION);
      const current = await records.findOne({ kind: "membership", groupId, profileId });
      saved = await saveGroupRecord(db, current?._id ?? `membership:${groupId}:${profileId}`, current?.revision ?? 0, {
        kind: "membership", groupId, profileId, memberId: profile.memberId, name: profile.name,
        routineId: profile.routineId, active: false, updatedBy: trainer, updatedAt,
      });
    } else if (body.action === "add_exercise") {
      const routineId = typeof body.routineId === "string" ? body.routineId.trim() : "";
      const dayId = typeof body.dayId === "string" ? body.dayId.trim() : "";
      const patch = parseExercisePatch(body.patch);
      const day = dashboard.routines.find((routine) => routine.id === routineId)?.days.find((entry) => entry.id === dayId);
      if (!day || !patch?.name?.trim()) return fail("Rutina, día y nombre del ejercicio son requeridos.");
      const id = `custom-${randomUUID().slice(0, 12)}`;
      const exercise: GroupExercise = {
        id, muscle: patch.muscle ?? "general", name: patch.name.trim(), equipment: patch.equipment ?? "",
        sourceMachine: patch.sourceMachine ?? "", sets: patch.sets ?? null, reps: patch.reps ?? null,
        time: patch.time ?? "", weightKg: patch.weightKg ?? null, sourcePage: 0,
      };
      saved = await saveGroupRecord(db, `exercise:${id}`, 0, {
        kind: "exercise", exerciseId: id, routineId, dayId, isCustom: true, exercise, exercisePatch: patch,
        updatedBy: trainer, updatedAt,
      });
    }
    if (body.action === "create_group" || body.action === "delete_group" || body.action === "create_routine" || body.action === "add_day" || body.action === "add_member" || body.action === "assign_routine" || body.action === "remove_member" || body.action === "add_exercise") {
      if (!saved) return fail("Otro entrenador actualizo este registro. Actualiza el grupo antes de guardar.", 409);
      return NextResponse.json({ ok: true, ...(createdRoutineId ? { routineId: createdRoutineId } : {}), ...(createdDayId ? { dayId: createdDayId } : {}) });
    }
    if (body.action === "mapping") {
      const exercise = allExercises(dashboard).find((e) => e.id === body.exerciseId);
      if (!exercise || typeof body.assetId !== "string") return fail("Ejercicio o máquina inválidos.");
      const inventory = await groupInventory(db);
      const machineGuideId = typeof body.machineGuideId === "string" ? body.machineGuideId.trim() : "";
      const candidates = machineGuideId
        ? inventory.filter((asset) => asset.machineGuideId === machineGuideId)
        : alignGroupExercise(exercise, inventory).candidates;
      const asset = candidates.find((a) => a.id === body.assetId);
      if (!asset || !isGroupEquipmentAvailable(asset)) return fail("Elegí una unidad compatible que esté disponible.");
      saved = await saveGroupRecord(db, `mapping:${exercise.id}`, revision, {
        kind: "mapping", exerciseId: exercise.id, assetId: asset.id,
        ...(machineGuideId ? { machineGuideId } : {}), updatedBy: trainer, updatedAt,
      });
    } else if (body.action === "exercise") {
      const exerciseId = typeof body.exerciseId === "string" ? body.exerciseId.trim() : "";
      const exercise = allExercises(dashboard).find((entry) => entry.id === exerciseId);
      const patch = parseExercisePatch(body.patch);
      if (!exercise || !patch) return fail("Ejercicio o valores inválidos.");
      const id = `exercise:${exercise.id}`;
      const current = revision > 0
        ? await db.collection<GroupRecord>(GROUP_A_COLLECTION).findOne({ _id: id, revision })
        : null;
      if (revision > 0 && (!current || current.kind !== "exercise")) {
        return fail("Otro entrenador actualizo este ejercicio. Actualiza el grupo antes de guardar.", 409);
      }
      const mergedPatch = { ...(current?.exercisePatch ?? {}), ...patch };
      saved = await saveGroupRecord(db, id, revision, current?.isCustom && current.exercise ? {
        kind: "exercise", exerciseId: exercise.id, routineId: current.routineId, dayId: current.dayId, isCustom: true,
        exercise: { ...current.exercise, ...patch }, exercisePatch: mergedPatch, updatedBy: trainer, updatedAt,
      } : {
        kind: "exercise", exerciseId: exercise.id,
        exercisePatch: mergedPatch, updatedBy: trainer, updatedAt,
      });
    } else {
      const profile = dashboard.profiles.find((p) => p.id === body.profileId);
      if (!profile) return fail("Persona del grupo inválida.");
      if (body.action === "link") {
        if (typeof body.memberId !== "string" || (body.memberId && !ObjectId.isValid(body.memberId))) return fail("Ficha inválida.");
        if (body.memberId && !await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ _id: new ObjectId(body.memberId) })) return fail("Socio no encontrado.", 404);
        saved = await saveGroupRecord(db, `link:${profile.id}`, revision, {
          kind: "link", profileId: profile.id, memberId: body.memberId, updatedBy: trainer, updatedAt,
        });
      } else if (body.action === "log") {
        const day = dashboard.routines.find((r) => r.id === profile.routineId)?.days.find((d) => d.id === body.dayId);
        if (!day || !validGroupDate(body.date, businessDate())) return fail("Día o fecha inválidos. No se pueden registrar sesiones futuras.");
        if (new Date(`${body.date}T12:00:00Z`).getUTCDay() === 0) return fail("El domingo el gimnasio no trabaja; no se registran seguimientos.");
        if (!Array.isArray(body.completedIds) || body.completedIds.length > day.exercises.length ||
          body.completedIds.some((id) => typeof id !== "string" || !day.exercises.some((e) => e.id === id))) return fail("Ejercicios realizados inválidos.");
        if (typeof body.note !== "string" || body.note.length > 2000) return fail("La observación admite hasta 2000 caracteres.");
        const weights = body.weights && typeof body.weights === "object" && !Array.isArray(body.weights) ? body.weights as Record<string, unknown> : {};
        if (Object.entries(weights).some(([id, value]) => !day.exercises.some((e) => e.id === id) ||
          (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1000)))) return fail("Cargas inválidas (0 a 1000 kg).");
        const completedIds = [...new Set(body.completedIds as string[])];
        if (!completedIds.length && !body.note.trim()) return fail("Marcá un ejercicio realizado o escribí una observación.");
        const [inventory, mappings] = await Promise.all([
          groupInventory(db), db.collection<GroupRecord>(GROUP_A_COLLECTION).find({ kind: "mapping" }).toArray(),
        ]);
        const id = `log:${profile.id}:${body.date}:${day.id}`;
        const log: GroupLog = {
          id, profileId: profile.id, routineId: profile.routineId, dayId: day.id, date: body.date, completedIds, note: body.note.trim(),
          trainer, updatedAt, revision: revision + 1,
          executions: completedIds.map((exerciseId) => {
            const exercise = day.exercises.find((e) => e.id === exerciseId)!;
            const mapping = mappings.find((r) => r.exerciseId === exerciseId);
            const result = alignGroupExercise(exercise, inventory, mapping ? { exerciseId, assetId: mapping.assetId!, revision: mapping.revision, updatedBy: mapping.updatedBy } : undefined);
            if (result.status === "review") throw new Error("ALIGNMENT_REQUIRED");
            const asset = result.asset;
            return { exerciseId, assetId: asset?.id ?? "", machineCode: asset?.code ?? "", machineName: asset?.name ?? exercise.equipment,
              weightKg: typeof weights[exerciseId] === "number" ? weights[exerciseId] as number : null };
          }),
        };
        saved = await saveGroupRecord(db, id, revision, { kind: "log", profileId: profile.id, log, updatedBy: trainer, updatedAt });
      } else return fail("Acción inválida.");
    }
    if (!saved) return fail("Otro entrenador actualizó este registro. Actualizá el grupo antes de guardar.", 409);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ALIGNMENT_REQUIRED") return fail("Vinculá una máquina disponible para los ejercicios realizados antes de guardar.", 409);
    return fail("No se pudo guardar. Conservá tus cambios y volvé a intentar.", 503);
  }
}
