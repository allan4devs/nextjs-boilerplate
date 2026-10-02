import { ObjectId, MongoServerError } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit } from "@/lib/xtreme/audit";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { MEMBERS_COLLECTION, type MemberDoc } from "@/lib/xtreme/shared";
import { sanitizeTrainerHealth, validateTrainerHealth, type TrainerHealthData, type TrainerHealthRevision } from "@/lib/xtreme/trainer-health";

export const dynamic = "force-dynamic";
const COLLECTION = "xtreme_gym_trainer_health";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
type HealthDoc = { _id: string; version: number; data: TrainerHealthData; history: TrainerHealthRevision[] };

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: PRIVATE_HEADERS });
}

function initialData(member: MemberDoc) {
  const profile = member.adminProfile;
  return sanitizeTrainerHealth({ personal: {
    cedula: member.cedula, phone: member.phone, email: member.email,
    birthDate: profile?.birthDate, sex: profile?.gender, address: profile?.address,
    occupation: profile?.occupation, emergencyName: profile?.emergencyContact?.name,
    emergencyPhone: profile?.emergencyContact?.phone, emergencyRelation: profile?.emergencyContact?.relation,
  } });
}

async function getMember(memberId: unknown) {
  if (typeof memberId !== "string" || !/^[a-f\d]{24}$/i.test(memberId)) return null;
  const db = await getDb();
  return db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ _id: new ObjectId(memberId) }, {
    projection: { memberName: 1, cedula: 1, phone: 1, email: 1, adminProfile: 1 },
  });
}

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "trainer");
  if (session?.role !== "trainer") return response({ error: "Sesión de entrenador requerida." }, 401);
  try {
    const member = await getMember(req.nextUrl.searchParams.get("memberId"));
    if (!member) return response({ error: "Socio no encontrado." }, 404);
    const db = await getDb();
    const memberId = member._id.toHexString();
    const record = await db.collection<HealthDoc>(COLLECTION).findOne({ _id: memberId });
    return response({
      memberId, memberName: member.memberName ?? "", version: record?.version ?? 0,
      data: record ? sanitizeTrainerHealth(record.data) : initialData(member), history: record?.history ?? [],
      receptionMedicalNotes: member.adminProfile?.medicalNotes ?? "",
    });
  } catch (error) {
    console.error("TRAINER HEALTH READ", error);
    return response({ error: "No se pudo cargar la ficha. Intentá de nuevo." }, 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await resolveStaffSession(req, "trainer");
  if (session?.role !== "trainer") return response({ error: "Sesión de entrenador requerida." }, 401);
  const body = await req.json().catch(() => null);
  if (!body || !Number.isSafeInteger(body.version) || body.version < 0) return response({ error: "Versión de ficha inválida." }, 400);
  const invalid = validateTrainerHealth(body.data);
  if (invalid) return response({ error: invalid }, 400);
  try {
    const member = await getMember(body.memberId);
    if (!member) return response({ error: "Socio no encontrado." }, 404);
    const db = await getDb();
    const memberId = member._id.toHexString();
    const data = sanitizeTrainerHealth(body.data);
    const revision: TrainerHealthRevision = {
      version: body.version + 1, savedAt: new Date().toISOString(),
      savedBy: session.staffName || "Entrenador Xtreme", staffId: session.staffId, data,
    };
    const collection = db.collection<HealthDoc>(COLLECTION);
    let record: HealthDoc | null;
    if (body.version === 0) {
      // The unique _id makes simultaneous first saves conflict instead of duplicate.
      record = { _id: memberId, version: 1, data, history: [revision] };
      await collection.insertOne(record);
    } else {
      // Compare-and-set and history append are one atomic mutation.
      record = await collection.findOneAndUpdate({ _id: memberId, version: body.version }, {
        $set: { data }, $inc: { version: 1 }, $push: { history: { $each: [revision], $slice: -20 } },
      }, { returnDocument: "after" });
      if (!record) return response({ error: "Otro entrenador actualizó la ficha. Conservá tus notas y recargá la ficha antes de guardar.", code: "health_conflict" }, 409);
    }
    // The general audit contains no medical answers or notes.
    await writeAudit(db, {
      actorRole: "trainer", actorId: session.staffId, actorName: session.staffName,
      action: "trainer.save_health", targetType: "member", targetId: memberId,
      summary: "Ficha personal y de salud actualizada", meta: { version: revision.version },
    });
    return response({ memberId, memberName: member.memberName ?? "", version: record.version, data: record.data,
      history: record.history, receptionMedicalNotes: member.adminProfile?.medicalNotes ?? "" });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return response({ error: "Otro entrenador creó la ficha. Conservá tus notas y recargá la ficha antes de guardar.", code: "health_conflict" }, 409);
    console.error("TRAINER HEALTH SAVE", error);
    return response({ error: "No se pudo guardar la ficha. Tus cambios siguen en pantalla." }, 500);
  }
}
