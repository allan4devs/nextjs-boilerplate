import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  CHECKINS_COLLECTION,
  MEMBERS_COLLECTION,
  PAYMENTS_COLLECTION,
  PINS_COLLECTION,
  RESERVATIONS_COLLECTION,
  TRAININGS,
  formatAccessCode,
  hashPin,
  memberAccessCode,
  normalizeKey,
  todayIso,
} from "@/lib/xtreme/shared";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

const SEED_PIN = "1234";

const SEED_TRAININGS = [
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
const PLANS = [
  { id: "month", label: "Plan mensual", crc: 23000, usd: 46, days: 30, category: "Plan" as const },
  { id: "fortnight", label: "Plan quincenal", crc: 13500, usd: 27, days: 15, category: "Plan" as const },
  { id: "week", label: "Plan semanal", crc: 8000, usd: 16, days: 7, category: "Plan" as const },
  { id: "day-pass", label: "Pase del día / funcional", crc: 3000, usd: 6, days: 1, category: "Clase" as const },
  { id: "senior", label: "Clase adultos mayores", crc: 16000, usd: 32, days: 30, category: "Clase" as const },
];
const COACHES = ["Coach Xtreme", "Funcional", "Zona lower", "Circuito"];
const METHODS = ["cash", "sinpe", "transfer", "paypal"] as const;

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

type SeedWorkout = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: Date;
};

function makeWorkout(training: (typeof SEED_TRAININGS)[number], date: string): SeedWorkout {
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
  for (let d = 0; d < streak; d++) {
    workouts.push(makeWorkout(pick(SEED_TRAININGS), isoDaysAgo(d)));
  }
  for (let i = 0; i < older; i++) {
    workouts.push(makeWorkout(pick(SEED_TRAININGS), isoDaysAgo(randInt(streak + 2, 85))));
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
  return { plan: plan.label, status: kind, startedAt, nextBillingDate };
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

function buildPlan(name: string, goal: string) {
  const sessions = [
    { day: "Lunes", focus: "Fuerza upper", exercises: "Press banca 4x8, Remo 4x10, Press militar 3x10" },
    { day: "Miercoles", focus: "Lower + core", exercises: "Sentadilla 4x8, Peso muerto 3x8, Plancha 3x40s" },
    { day: "Viernes", focus: "HIIT / condicion", exercises: "Air bike 8x30s, Burpees 4x12, Farmer walk 3x40m" },
  ];
  return {
    title: `Plan de ${name.split(" ")[0]}`,
    objective: goal,
    coachNote: "Prioriza tecnica y constancia. Hidratacion y sueno primero.",
    startDate: isoDaysAgo(7),
    endDate: isoDaysAgo(-21),
    weeklySessions: 3,
    items: sessions.map((s, i) => ({
      id: `seed-plan-${name}-${i}`,
      day: s.day,
      focus: s.focus,
      exercises: s.exercises,
      targetMinutes: 45 + i * 5,
      done: i === 0,
      doneDate: i === 0 ? isoDaysAgo(2) : null,
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Live production and local `next start` - never seed/wipe real data. Preview (VERCEL_ENV=preview) may still seed. */
function seedDisabledInThisEnv() {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") return false;
  return process.env.NODE_ENV === "production";
}

export async function POST(req: NextRequest) {
  if (seedDisabledInThisEnv()) {
    return NextResponse.json(
      { error: "Seed deshabilitado en produccion." },
      { status: 403 },
    );
  }

  const session = await resolveStaffSession(req, "admin");
  const role = session?.role === "admin" || session?.role === "super" ? session.role : null;
  if (!role) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { wipeAll?: boolean };
    const wipeAll = Boolean(body.wipeAll);
    if (wipeAll && role !== "super") {
      return NextResponse.json(
        { error: "Solo super admin puede hacer reset total." },
        { status: 403 },
      );
    }

    const db = await getDb();
    const membersCol = db.collection(MEMBERS_COLLECTION);
    const reservationsCol = db.collection(RESERVATIONS_COLLECTION);
    const pinsCol = db.collection(PINS_COLLECTION);
    const paymentsCol = db.collection(PAYMENTS_COLLECTION);
    const checkinsCol = db.collection(CHECKINS_COLLECTION);

    const clearFilter = wipeAll ? {} : { seeded: true };
    await Promise.all([
      membersCol.deleteMany(clearFilter),
      reservationsCol.deleteMany(clearFilter),
      pinsCol.deleteMany(clearFilter),
      paymentsCol.deleteMany(clearFilter),
      checkinsCol.deleteMany(clearFilter),
    ]);

    const now = new Date();
    const members = NAMES.map((name, idx) => {
      const streak = randInt(0, 18);
      const older = randInt(4, 42);
      const kind = idx % 6 === 0 ? "expired" : idx % 4 === 0 ? "warning" : "active";
      const workouts = buildWorkouts(streak, older);
      const goal = pick(GOALS);
      return {
        normalizedName: normalizeKey(name),
        memberName: name,
        goal,
        favoriteTraining: workouts.at(-1)?.trainingName ?? "",
        phone: `8888${String(1000 + idx).slice(0, 4)}`,
        email: `${name.split(" ")[0].toLowerCase()}@demo.xtreme.cr`,
        coach: pick(COACHES),
        notes: idx % 3 === 0 ? "Prefiere entrenar temprano." : "",
        workouts,
        membership: buildMembership(kind),
        bodyMetrics: buildMetrics(),
        trainingPlan: idx % 2 === 0 ? buildPlan(name, goal) : undefined,
        seeded: true,
        createdAt: now,
        updatedAt: now,
      };
    });

    if (members.length) await membersCol.insertMany(members);

    const today = todayIso();
    const reservations: Record<string, unknown>[] = [];
    for (const training of TRAININGS) {
      const meta = SEED_TRAININGS.find((t) => t.id === training.id)!;
      const count = randInt(2, meta.capacity);
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

    // Pagos demo (ultimos 30 dias) para super admin
    const payments = Array.from({ length: 28 }, (_, i) => {
      const member = pick(members);
      const plan = pick(PLANS);
      const method = pick([...METHODS]);
      const daysAgo = randInt(0, 28);
      const createdAt = new Date();
      createdAt.setUTCDate(createdAt.getUTCDate() - daysAgo);
      createdAt.setUTCHours(randInt(8, 20), randInt(0, 59), 0, 0);
      return {
        id: `seed-pay-${i}-${createdAt.getTime()}`,
        memberName: member.memberName,
        normalizedName: member.normalizedName,
        customerName: member.memberName,
        phone: member.phone,
        email: member.email,
        optionId: plan.id,
        optionLabel: plan.label,
        category: plan.category,
        amountCrc: plan.crc,
        amountUsd: plan.usd,
        currency: method === "paypal" ? "USD" : "CRC",
        method,
        status: "completed" as const,
        paypalOrderId: method === "paypal" ? `DEMO-ORDER-${i}` : null,
        paypalCaptureId: method === "paypal" ? `DEMO-CAP-${i}` : null,
        note: i % 5 === 0 ? "Pago en recepcion" : "",
        date: isoDaysAgo(daysAgo),
        createdAt,
        recordedBy: "seed" as const,
        seeded: true,
      };
    });
    if (payments.length) await paymentsCol.insertMany(payments);

    // Check-ins de hoy
    const checkins = members.slice(0, randInt(6, 12)).map((member, i) => {
      const checkedInAt = new Date();
      checkedInAt.setHours(checkedInAt.getHours() - i, randInt(0, 50), 0, 0);
      return {
        id: `seed-chk-${i}-${checkedInAt.getTime()}`,
        memberName: member.memberName,
        normalizedName: member.normalizedName,
        accessCode: formatAccessCode(memberAccessCode(member.normalizedName)),
        method: i % 3 === 0 ? "pin" : i % 2 === 0 ? "code" : "name",
        membershipStatus: member.membership.status,
        date: today,
        checkedInAt,
        by: "kiosk" as const,
        note: "",
        seeded: true,
      };
    });
    if (checkins.length) await checkinsCol.insertMany(checkins);

    return NextResponse.json({
      ok: true,
      wipeAll,
      insertedMembers: members.length,
      insertedReservations: reservations.length,
      insertedPayments: payments.length,
      insertedCheckins: checkins.length,
      pin: SEED_PIN,
    });
  } catch (err) {
    console.error("XTREME SEED POST", err);
    return NextResponse.json({ error: "No se pudo generar el seed." }, { status: 500 });
  }
}
