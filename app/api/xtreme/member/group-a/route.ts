import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { businessDate } from "@/lib/xtreme/business-date";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import { MEMBERS_COLLECTION, type MemberDoc } from "@/lib/xtreme/shared";
import {
  GROUP_A_COLLECTION,
  getGroupAMemberView,
  getGroupDashboard,
  groupInventory,
  saveGroupRecord,
  type GroupRecord,
} from "@/lib/xtreme/trainer-group-a";
import { validGroupDate, type GroupLog } from "@/lib/xtreme/trainer-group-a-model";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function memberContext(req: NextRequest) {
  const session = await requireMemberSession(req);
  if (!isSession(session)) return { response: session } as const;
  const db = await getDb();
  const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne(
    { normalizedName: session.memberKey },
    { projection: { _id: 1 } },
  );
  if (!member) return { response: fail("No encontramos tu perfil de socio.", 404) } as const;
  return { db, memberId: member._id.toString() } as const;
}

export async function GET(req: NextRequest) {
  try {
    const context = await memberContext(req);
    if ("response" in context) return context.response;
    const groupA = await getGroupAMemberView(context.db, context.memberId);
    return NextResponse.json({ groupA }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("XTREME MEMBER GROUP A GET", error);
    return fail("No se pudo cargar tu plan de entrenador.", 503);
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await memberContext(req);
    if ("response" in context) return context.response;
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || body.action !== "log" || !Number.isInteger(body.revision) || Number(body.revision) < 0) {
      return fail("Solicitud o versión inválida.");
    }

    const date = typeof body.date === "string" ? body.date : "";
    const dayId = typeof body.dayId === "string" ? body.dayId.trim() : "";
    const completedIds = Array.isArray(body.completedIds) ? body.completedIds : [];
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
    if (date !== businessDate() || !validGroupDate(date, businessDate()) || !dayId) {
      return fail("Solo podés actualizar la sesión de hoy.");
    }
    if (completedIds.some((id) => typeof id !== "string") || (!completedIds.length && !note)) {
      return fail("Marcá un ejercicio realizado o escribí una observación.");
    }

    const weights = body.weights && typeof body.weights === "object" && !Array.isArray(body.weights)
      ? body.weights as Record<string, unknown>
      : {};
    if (Object.values(weights).some((value) => value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1000))) {
      return fail("Las cargas deben estar entre 0 y 1000 kg.");
    }

    const dashboard = await getGroupDashboard(context.db);
    const profile = dashboard.profiles.find((entry) => entry.groupId === "group-a" && entry.memberId === context.memberId);
    const routine = profile && dashboard.routines.find((entry) => entry.id === profile.routineId);
    const day = routine?.days.find((entry) => entry.id === dayId);
    if (!profile || !routine || !day) return fail("No encontramos tu rutina del Grupo A.", 404);
    if (completedIds.length > day.exercises.length || completedIds.some((id) => !day.exercises.some((exercise) => exercise.id === id))) {
      return fail("Hay ejercicios inválidos en la sesión.");
    }

    const uniqueCompletedIds = [...new Set(completedIds as string[])];
    const id = `log:${profile.id}:${date}:${day.id}`;
    const revision = Number(body.revision);
    const current = dashboard.logs.find((entry) => entry.id === id);
    if ((current?.revision ?? 0) !== revision) {
      return fail("Tu plan cambió en otra pantalla. Actualizá e intentá de nuevo.", 409);
    }
    const [inventory, mappingRecords] = await Promise.all([
      groupInventory(context.db),
      context.db.collection<GroupRecord>(GROUP_A_COLLECTION).find({ kind: "mapping" }).toArray(),
    ]);
    const log: GroupLog = {
      id,
      profileId: profile.id,
      dayId: day.id,
      date,
      completedIds: uniqueCompletedIds,
      note,
      trainer: "Socio",
      updatedAt: new Date().toISOString(),
      revision: revision + 1,
      executions: uniqueCompletedIds.map((exerciseId) => {
        const exercise = day.exercises.find((entry) => entry.id === exerciseId)!;
        const mapping = mappingRecords.find((entry) => entry.exerciseId === exerciseId);
        const asset = mapping ? inventory.find((entry) => entry.id === mapping.assetId) : undefined;
        return {
          exerciseId,
          assetId: asset?.id ?? "",
          machineCode: asset?.code ?? "",
          machineName: asset?.name ?? exercise.equipment,
          weightKg: typeof weights[exerciseId] === "number" ? weights[exerciseId] as number : null,
        };
      }),
    };
    const saved = await saveGroupRecord(context.db, id, revision, {
      kind: "log",
      profileId: profile.id,
      log,
      updatedBy: "member-os",
      updatedAt: log.updatedAt,
    });
    if (!saved) return fail("Tu plan cambió en otra pantalla. Actualizá e intentá de nuevo.", 409);

    const groupA = await getGroupAMemberView(context.db, context.memberId, date);
    return NextResponse.json({ ok: true, groupA }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("XTREME MEMBER GROUP A POST", error);
    return fail("No se pudo guardar tu avance. Conservá tus cambios e intentá de nuevo.", 503);
  }
}
