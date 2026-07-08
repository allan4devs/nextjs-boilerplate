import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";

export const dynamic = "force-dynamic";

const MEMBERS_COLLECTION = "xtreme_gym_members";
const RESERVATIONS_COLLECTION = "xtreme_gym_class_reservations";
const PINS_COLLECTION = "xtreme_gym_pins";
const PEPPER = "xtreme-gym-member-pin-v1";
const ADMIN_CODE = process.env.XTREME_ADMIN_CODE || "xtreme-admin";
const SEED_PIN = "1234";

const TRAININGS = [
  { id: "fuerza-total", name: "Fuerza Total", intensity: "Pesado", minutes: 55, capacity: 8 },
  { id: "hiit-quemador", name: "HIIT Quemador", intensity: "Alta", minutes: 35, capacity: 12 },
  { id: "glute-lab", name: "Glute Lab", intensity: "Media", minutes: 45, capacity: 10 },
  { id: "xtreme-core", name: "Xtreme Core", intensity: "Control", minutes: 40, capacity: 15 },
];

const NAMES = [
  "Kengie Araya",
  "Maria Jose Vargas",
  "Carlos Jimenez",
  "Daniela Soto",
  "Josue Mora",
  "Fabiola Chaves",
  "Andres Quesada",
  "Gabriela Rojas",
  "Diego Herrera",
  "Valeria Campos",
  "Bryan Salas",
  "Natalia Ugalde",
  "Esteban Blanco",
  "Kimberly Solis",
  "Randall Vega",
  "Melissa Arce",
  "Jefferson Mena",
  "Priscilla Nunez",
];

const GOALS = ["Ganar fuerza", "Bajar grasa", "Ser constante", "Volver al ritmo"];
const PLANS = ["Xtreme Mensual", "Xtreme Trimestral", "Xtreme Anual"];

function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hashPin(pin: string, normalizedName: string) {
  return createHash("sha256").update(`${normalizedName}|${pin}|${PEPPER}`).digest("hex");
}

type SeedWorkout = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: Date;
};

function makeWorkout(training: (typeof TRAININGS)[number], date: string): SeedWorkout {
  return {
    id: `${training.id}-${date}-${Math.floor(Math.random() * 1e9)}`,
    trainingId: training.id,
    trainingName: training.name,
    intensity: training.intensity,
    minutes: Math.max(20, training.minutes + randInt(-5, 12)),
    completedDate: date,
    completedAt: new Date(`${date}T12:00:00.000Z`),
  };
}

function buildWorkouts(streak: number, older: number) {
  const workouts: SeedWorkout[] = [];
  // Bloque consecutivo terminando hoy => racha exacta.
  for (let d = 0; d < streak; d++) {
    workouts.push(makeWorkout(pick(TRAININGS), isoDaysAgo(d)));
  }
  // Entrenos viejos dispersos, dejando un hueco despues de la racha.
  for (let i = 0; i < older; i++) {
    workouts.push(makeWorkout(pick(TRAININGS), isoDaysAgo(randInt(streak + 2, 85))));
  }
  workouts.sort(
    (a, b) =>
      a.completedDate.localeCompare(b.completedDate) ||
      a.completedAt.getTime() - b.completedAt.getTime(),
  );
  return workouts;
}

function buildMembership(kind: "active" | "warning" | "expired") {
  const plan = pick(PLANS);
  const startedAt = isoDaysAgo(randInt(30, 320));
  const nextBillingDate =
    kind === "expired"
      ? isoDaysAgo(randInt(1, 25))
      : kind === "warning"
        ? isoDaysAgo(-randInt(1, 5))
        : isoDaysAgo(-randInt(9, 30));
  return { plan, status: kind, startedAt, nextBillingDate };
}

function buildMetrics() {
  const n = randInt(3, 6);
  const startWeight = randInt(58, 96);
  return Array.from({ length: n }, (_, i) => {
    const daysAgo = (n - i) * 15;
    return {
      id: `metric-${isoDaysAgo(daysAgo)}-${Math.floor(Math.random() * 1e9)}`,
      date: isoDaysAgo(daysAgo),
      weightKg: Math.max(45, startWeight - i * randInt(0, 2)),
      waistCm: Math.max(58, randInt(70, 102) - i),
      note: "",
      createdAt: new Date(),
    };
  });
}

export async function POST(req: NextRequest) {
  if ((req.headers.get("x-xtreme-admin") ?? "") !== ADMIN_CODE) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { wipeAll?: boolean };
    const wipeAll = Boolean(body.wipeAll);

    const db = await getDb();
    const membersCol = db.collection(MEMBERS_COLLECTION);
    const reservationsCol = db.collection(RESERVATIONS_COLLECTION);
    const pinsCol = db.collection(PINS_COLLECTION);

    const clearFilter = wipeAll ? {} : { seeded: true };
    await Promise.all([
      membersCol.deleteMany(clearFilter),
      reservationsCol.deleteMany(clearFilter),
      pinsCol.deleteMany(clearFilter),
    ]);

    const now = new Date();
    const members = NAMES.map((name, idx) => {
      const streak = randInt(0, 18);
      const older = randInt(4, 42);
      const kind = idx % 6 === 0 ? "expired" : idx % 4 === 0 ? "warning" : "active";
      const workouts = buildWorkouts(streak, older);
      return {
        normalizedName: normalizeKey(name),
        memberName: name,
        goal: pick(GOALS),
        favoriteTraining: workouts.at(-1)?.trainingName ?? "",
        workouts,
        membership: buildMembership(kind),
        bodyMetrics: buildMetrics(),
        seeded: true,
        createdAt: now,
        updatedAt: now,
      };
    });

    if (members.length) await membersCol.insertMany(members);

    // Reservas de hoy por clase (respetando capacidad).
    const today = isoDaysAgo(0);
    const reservations: Record<string, unknown>[] = [];
    for (const training of TRAININGS) {
      const count = randInt(2, training.capacity);
      const chosen = [...members].sort(() => Math.random() - 0.5).slice(0, count);
      for (const member of chosen) {
        reservations.push({
          memberName: member.memberName,
          normalizedName: member.normalizedName,
          trainingId: training.id,
          trainingName: training.name,
          trainingDate: today,
          status: "reserved",
          seeded: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    if (reservations.length) await reservationsCol.insertMany(reservations);

    // PIN por defecto (1234) para poder entrar como cualquier cliente demo.
    await pinsCol.bulkWrite(
      members.map((member) => ({
        updateOne: {
          filter: { normalizedName: member.normalizedName },
          update: {
            $set: {
              normalizedName: member.normalizedName,
              memberName: member.memberName,
              pinHash: hashPin(SEED_PIN, member.normalizedName),
              seeded: true,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      })),
    );

    return NextResponse.json({
      ok: true,
      wipeAll,
      insertedMembers: members.length,
      insertedReservations: reservations.length,
      pin: SEED_PIN,
    });
  } catch (err) {
    console.error("XTREME SEED POST", err);
    return NextResponse.json({ error: "No se pudo generar el seed." }, { status: 500 });
  }
}
