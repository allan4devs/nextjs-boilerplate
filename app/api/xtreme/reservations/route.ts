import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { sendReservationEmail } from "@/lib/helpers/email";

export const dynamic = "force-dynamic";

const RESERVATIONS_COLLECTION = "xtreme_gym_class_reservations";
const MEMBERS_COLLECTION = "xtreme_gym_members";

const TRAINING_CAPACITY: Record<string, number> = {
  "fuerza-total": 8,
  "hiit-quemador": 12,
  "glute-lab": 10,
  "xtreme-core": 15,
};

type ReservationDoc = {
  memberName: string;
  normalizedName: string;
  trainingId: string;
  trainingName: string;
  trainingDate: string;
  status: "reserved" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
};

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}

function isoDate(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
}

async function reservationSnapshot(trainingDate: string, memberName = "") {
  const db = await getDb();
  const normalizedName = normalizeKey(memberName);
  const docs = await db
    .collection<ReservationDoc>(RESERVATIONS_COLLECTION)
    .find({ trainingDate, status: "reserved" })
    .toArray();

  const byTraining: Record<string, { reserved: number; capacity: number; remaining: number; isMine: boolean }> = {};

  for (const [trainingId, capacity] of Object.entries(TRAINING_CAPACITY)) {
    const reservations = docs.filter((doc) => doc.trainingId === trainingId);
    byTraining[trainingId] = {
      reserved: reservations.length,
      capacity,
      remaining: Math.max(0, capacity - reservations.length),
      isMine: Boolean(normalizedName && reservations.some((doc) => doc.normalizedName === normalizedName)),
    };
  }

  return byTraining;
}

export async function GET(req: NextRequest) {
  try {
    const trainingDate = isoDate(req.nextUrl.searchParams.get("date"));
    const memberName = normalizeName(req.nextUrl.searchParams.get("memberName"));
    return NextResponse.json({
      date: trainingDate,
      reservations: await reservationSnapshot(trainingDate, memberName),
    });
  } catch (err) {
    console.error("XTREME RESERVATIONS GET", err);
    return NextResponse.json({ error: "No se pudieron cargar las reservas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const memberName = normalizeName(body.memberName);
    const trainingId = String(body.trainingId ?? "").trim();
    const trainingName = String(body.trainingName ?? "").trim();
    const trainingDate = isoDate(body.trainingDate);
    const capacity = TRAINING_CAPACITY[trainingId];

    if (!memberName || !trainingId || !trainingName || !capacity) {
      return NextResponse.json({ error: "Faltan datos de la reserva." }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection<ReservationDoc>(RESERVATIONS_COLLECTION);
    const normalizedName = normalizeKey(memberName);

    const existing = await col.findOne({ normalizedName, trainingId, trainingDate, status: "reserved" });
    if (existing) {
      return NextResponse.json({
        ok: true,
        reservations: await reservationSnapshot(trainingDate, memberName),
      });
    }

    const reserved = await col.countDocuments({ trainingId, trainingDate, status: "reserved" });
    if (reserved >= capacity) {
      return NextResponse.json(
        {
          error: "Clase llena. Probá otro horario.",
          reservations: await reservationSnapshot(trainingDate, memberName),
        },
        { status: 409 },
      );
    }

    const now = new Date();
    await col.insertOne({
      memberName,
      normalizedName,
      trainingId,
      trainingName,
      trainingDate,
      status: "reserved",
      createdAt: now,
      updatedAt: now,
    });

    // Confirmacion por correo si el socio tiene email registrado
    const member = await db
      .collection<{ email?: string; memberName?: string }>(MEMBERS_COLLECTION)
      .findOne({ normalizedName }, { projection: { email: 1, memberName: 1 } });
    if (member?.email) {
      await sendReservationEmail({
        to: member.email,
        memberName: member.memberName || memberName,
        trainingName,
        trainingDate,
      });
    }

    return NextResponse.json({
      ok: true,
      reservations: await reservationSnapshot(trainingDate, memberName),
    });
  } catch (err) {
    console.error("XTREME RESERVATIONS POST", err);
    return NextResponse.json({ error: "No se pudo reservar la clase." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const memberName = normalizeName(body.memberName);
    const trainingId = String(body.trainingId ?? "").trim();
    const trainingDate = isoDate(body.trainingDate);

    if (!memberName || !trainingId) {
      return NextResponse.json({ error: "Faltan datos para cancelar." }, { status: 400 });
    }

    const db = await getDb();
    await db.collection<ReservationDoc>(RESERVATIONS_COLLECTION).updateOne(
      {
        normalizedName: normalizeKey(memberName),
        trainingId,
        trainingDate,
        status: "reserved",
      },
      { $set: { status: "cancelled", updatedAt: new Date() } },
    );

    return NextResponse.json({
      ok: true,
      reservations: await reservationSnapshot(trainingDate, memberName),
    });
  } catch (err) {
    console.error("XTREME RESERVATIONS DELETE", err);
    return NextResponse.json({ error: "No se pudo cancelar la reserva." }, { status: 500 });
  }
}
