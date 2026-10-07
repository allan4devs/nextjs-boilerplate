import { MongoServerError, type ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { MEMBERS_COLLECTION, type MemberDoc } from "@/lib/xtreme/shared";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import {
  sanitizeTrainerHealth,
  validateTrainerHealth,
  type TrainerHealthData,
  type TrainerHealthRevision,
} from "@/lib/xtreme/trainer-health";

export const dynamic = "force-dynamic";

const COLLECTION = "xtreme_gym_trainer_health";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
type HealthDoc = { _id: string; version: number; data: TrainerHealthData; history: TrainerHealthRevision[] };
type MemberWithId = MemberDoc & { _id: ObjectId };

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: PRIVATE_HEADERS });
}

function initialData(member: MemberWithId) {
  const profile = member.adminProfile;
  return sanitizeTrainerHealth({
    personal: {
      cedula: member.cedula,
      phone: member.phone,
      email: member.email,
      birthDate: profile?.birthDate,
      sex: profile?.gender,
      address: profile?.address,
      occupation: profile?.occupation,
      emergencyName: profile?.emergencyContact?.name,
      emergencyPhone: profile?.emergencyContact?.phone,
      emergencyRelation: profile?.emergencyContact?.relation,
    },
  });
}

async function getMember(memberKey: string) {
  const db = await getDb();
  return db.collection<MemberWithId>(MEMBERS_COLLECTION).findOne({ normalizedName: memberKey }, {
    projection: { memberName: 1, normalizedName: 1, cedula: 1, phone: 1, email: 1, adminProfile: 1 },
  });
}

function payload(member: MemberWithId, record: HealthDoc | null) {
  const memberId = member._id.toHexString();
  return {
    memberId,
    memberName: member.memberName ?? "",
    version: record?.version ?? 0,
    data: record ? sanitizeTrainerHealth(record.data) : initialData(member),
    history: record?.history ?? [],
    receptionMedicalNotes: member.adminProfile?.medicalNotes ?? "",
  };
}

export async function GET(req: NextRequest) {
  const session = await requireMemberSession(req);
  if (!isSession(session)) return session;
  try {
    const member = await getMember(session.memberKey);
    if (!member) return response({ error: "Socio no encontrado." }, 404);
    const db = await getDb();
    const record = await db.collection<HealthDoc>(COLLECTION).findOne({ _id: member._id.toHexString() });
    return response(payload(member, record));
  } catch (error) {
    console.error("MEMBER HEALTH READ", error);
    return response({ error: "No se pudo cargar tu ficha. Intentá de nuevo." }, 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireMemberSession(req);
  if (!isSession(session)) return session;
  const body = await req.json().catch(() => null) as { version?: unknown; data?: unknown } | null;
  if (!body || !Number.isSafeInteger(body.version) || Number(body.version) < 0) {
    return response({ error: "Versión de ficha inválida." }, 400);
  }
  const invalid = validateTrainerHealth(body.data);
  if (invalid) return response({ error: invalid }, 400);

  try {
    const member = await getMember(session.memberKey);
    if (!member) return response({ error: "Socio no encontrado." }, 404);
    const db = await getDb();
    const memberId = member._id.toHexString();
    const collection = db.collection<HealthDoc>(COLLECTION);
    const current = await collection.findOne({ _id: memberId });
    const submitted = sanitizeTrainerHealth(body.data);
    // El seguimiento del entrenador es privado: el socio llena su parte, pero no lo pisa.
    const data = sanitizeTrainerHealth({
      ...submitted,
      trainerNotes: current ? sanitizeTrainerHealth(current.data).trainerNotes : "",
    });
    const version = Number(body.version);
    const revision: TrainerHealthRevision = {
      version: version + 1,
      savedAt: new Date().toISOString(),
      savedBy: `${member.memberName ?? "Socio"} (socio)`,
      staffId: null,
      data,
    };
    let record: HealthDoc | null;
    if (version === 0) {
      record = { _id: memberId, version: 1, data, history: [revision] };
      await collection.insertOne(record);
    } else {
      record = await collection.findOneAndUpdate(
        { _id: memberId, version },
        { $set: { data }, $inc: { version: 1 }, $push: { history: { $each: [revision], $slice: -20 } } },
        { returnDocument: "after" },
      );
      if (!record) return response({ error: "La ficha cambió en otra pantalla. Recargala antes de guardar.", code: "health_conflict" }, 409);
    }
    return response(payload(member, record));
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return response({ error: "La ficha se creó en otra pantalla. Recargala antes de guardar.", code: "health_conflict" }, 409);
    }
    console.error("MEMBER HEALTH SAVE", error);
    return response({ error: "No se pudo guardar la ficha. Tus cambios siguen en pantalla." }, 500);
  }
}
