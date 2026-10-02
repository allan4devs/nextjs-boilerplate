import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/helpers/mongodb";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { MEMBERS_COLLECTION, type MemberDoc } from "@/lib/xtreme/shared";
import { businessDate } from "@/lib/xtreme/business-date";
import { GROUP_A_PROFILES, alignGroupExercise, isGroupEquipmentAvailable, validGroupDate, type GroupLog } from "@/lib/xtreme/trainer-group-a-model";
import { GROUP_A_ROUTINES, GROUP_A_COLLECTION, getGroupDashboard, groupInventory, saveGroupRecord, type GroupRecord } from "@/lib/xtreme/trainer-group-a";

export const dynamic = "force-dynamic";
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

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
    if (body.action === "mapping") {
      const exercise = GROUP_A_ROUTINES.flatMap((r) => r.days.flatMap((d) => d.exercises)).find((e) => e.id === body.exerciseId);
      if (!exercise || typeof body.assetId !== "string") return fail("Ejercicio o máquina inválidos.");
      const inventory = await groupInventory(db);
      const asset = alignGroupExercise(exercise, inventory).candidates.find((a) => a.id === body.assetId);
      if (!asset || !isGroupEquipmentAvailable(asset)) return fail("Elegí una unidad compatible que esté disponible.");
      saved = await saveGroupRecord(db, `mapping:${exercise.id}`, revision, {
        kind: "mapping", exerciseId: exercise.id, assetId: asset.id, updatedBy: trainer, updatedAt,
      });
    } else {
      const profile = GROUP_A_PROFILES.find((p) => p.id === body.profileId);
      if (!profile) return fail("Persona del grupo inválida.");
      if (body.action === "link") {
        if (typeof body.memberId !== "string" || (body.memberId && !ObjectId.isValid(body.memberId))) return fail("Ficha inválida.");
        if (body.memberId && !await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ _id: new ObjectId(body.memberId) })) return fail("Socio no encontrado.", 404);
        saved = await saveGroupRecord(db, `link:${profile.id}`, revision, {
          kind: "link", profileId: profile.id, memberId: body.memberId, updatedBy: trainer, updatedAt,
        });
      } else if (body.action === "log") {
        const day = GROUP_A_ROUTINES.find((r) => r.id === profile.routineId)?.days.find((d) => d.id === body.dayId);
        if (!day || !validGroupDate(body.date, businessDate())) return fail("Día o fecha inválidos. No se pueden registrar sesiones futuras.");
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
          id, profileId: profile.id, dayId: day.id, date: body.date, completedIds, note: body.note.trim(),
          trainer, updatedAt, revision: revision + 1,
          executions: completedIds.map((exerciseId) => {
            const exercise = day.exercises.find((e) => e.id === exerciseId)!;
            const mapping = mappings.find((r) => r.exerciseId === exerciseId);
            const result = alignGroupExercise(exercise, inventory, mapping ? { exerciseId, assetId: mapping.assetId!, revision: mapping.revision, updatedBy: mapping.updatedBy } : undefined);
            if (result.status === "review" || result.status === "unavailable") throw new Error("ALIGNMENT_REQUIRED");
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
