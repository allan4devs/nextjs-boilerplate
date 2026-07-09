import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  CHECKINS_COLLECTION,
  GYM_CAPACITY,
  MEMBERS_COLLECTION,
  PAYMENTS_COLLECTION,
  PINS_COLLECTION,
  RESERVATIONS_COLLECTION,
  TRAININGS,
  type AdminRole,
  type CheckinDoc,
  type MemberDoc,
  type PaymentDoc,
  addDays,
  formatAccessCode,
  hourLoadBoost,
  memberAccessCode,
  membershipStatus,
  normalizeKey,
  normalizeName,
  resolveAdminRole,
  sanitizePlan,
  todayIso,
  toAdminMember,
  toUtcDate,
} from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

function roleFromReq(req: NextRequest): AdminRole | null {
  return resolveAdminRole(req.headers.get("x-xtreme-admin") ?? "");
}

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Solo super admin." }, { status: 403 });
}

function startOfMonthIso() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function daysAgoIso(days: number) {
  return addDays(toUtcDate(todayIso()), -days).toISOString().slice(0, 10);
}

async function revenueSummary(db: Awaited<ReturnType<typeof getDb>>) {
  const date = todayIso();
  const weekStart = daysAgoIso(6);
  const monthStart = startOfMonthIso();

  const payments = await db
    .collection<PaymentDoc>(PAYMENTS_COLLECTION)
    .find({ status: "completed" })
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  const sum = (list: PaymentDoc[]) => ({
    count: list.length,
    crc: list.reduce((s, p) => s + (p.amountCrc || 0), 0),
    usd: Math.round(list.reduce((s, p) => s + (p.amountUsd || 0), 0) * 100) / 100,
  });

  const today = payments.filter((p) => p.date === date);
  const week = payments.filter((p) => p.date >= weekStart);
  const month = payments.filter((p) => p.date >= monthStart);

  const byOption: Record<string, { label: string; count: number; crc: number }> = {};
  const byMethod: Record<string, { count: number; crc: number }> = {};
  for (const p of month) {
    const key = p.optionId || "other";
    if (!byOption[key]) byOption[key] = { label: p.optionLabel || key, count: 0, crc: 0 };
    byOption[key].count += 1;
    byOption[key].crc += p.amountCrc || 0;

    const method = p.method || "other";
    if (!byMethod[method]) byMethod[method] = { count: 0, crc: 0 };
    byMethod[method].count += 1;
    byMethod[method].crc += p.amountCrc || 0;
  }

  return {
    today: sum(today),
    week: sum(week),
    month: sum(month),
    all: sum(payments),
    byOption: Object.entries(byOption)
      .map(([id, v]) => ({ optionId: id, ...v }))
      .sort((a, b) => b.crc - a.crc),
    byMethod: Object.entries(byMethod)
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.crc - a.crc),
    recent: payments.slice(0, 40).map((p) => ({
      id: p.id,
      customerName: p.customerName || p.memberName,
      memberName: p.memberName,
      optionLabel: p.optionLabel,
      category: p.category,
      amountCrc: p.amountCrc,
      amountUsd: p.amountUsd,
      method: p.method,
      status: p.status,
      date: p.date,
      note: p.note || "",
      paypalCaptureId: p.paypalCaptureId ?? null,
      recordedBy: p.recordedBy,
    })),
  };
}

export async function GET(req: NextRequest) {
  const role = roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const db = await getDb();
    const date = todayIso();

    const docs = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray();
    const members = docs
      .map(toAdminMember)
      .sort(
        (a, b) =>
          b.streak - a.streak ||
          b.totalWorkouts - a.totalWorkouts ||
          b.totalMinutes - a.totalMinutes ||
          a.memberName.localeCompare(b.memberName),
      );

    const activeToday = members.filter((m) => m.lastWorkoutDate === date).length;
    const totalWorkouts = members.reduce((s, m) => s + m.totalWorkouts, 0);
    const totalMinutes = members.reduce((s, m) => s + m.totalMinutes, 0);
    const avgStreak = members.length
      ? Math.round((members.reduce((s, m) => s + m.streak, 0) / members.length) * 10) / 10
      : 0;
    const withPlan = members.filter((m) => m.trainingPlan).length;
    const expiringSoon = members.filter((m) => m.membershipStatus === "warning").length;
    const expired = members.filter((m) => m.membershipStatus === "expired").length;
    const activeMemberships = members.filter((m) => m.membershipStatus === "active").length;

    const reservationDocs = await db
      .collection<{ trainingId: string }>(RESERVATIONS_COLLECTION)
      .find({ trainingDate: date, status: "reserved" })
      .toArray();

    const classes = TRAININGS.map((t) => ({
      trainingId: t.id,
      trainingName: t.name,
      capacity: t.capacity,
      reserved: reservationDocs.filter((r) => r.trainingId === t.id).length,
    }));

    const checkinDocs = await db
      .collection<CheckinDoc>(CHECKINS_COLLECTION)
      .find({ date })
      .sort({ checkedInAt: -1 })
      .limit(100)
      .toArray();

    const checkinsToday = checkinDocs.length;
    const uniqueCheckins = new Set(checkinDocs.map((c) => c.normalizedName)).size;
    const reservationsToday = reservationDocs.length;
    const currentPeople = Math.min(
      GYM_CAPACITY,
      Math.max(uniqueCheckins, 0) + Math.ceil(reservationsToday * 0.25) + hourLoadBoost(),
    );
    const occupancyPct = Math.round((currentPeople / GYM_CAPACITY) * 100);
    const level = occupancyPct >= 78 ? "Lleno" : occupancyPct >= 48 ? "Medio" : "Tranquilo";

    const payload: Record<string, unknown> = {
      role,
      members,
      totals: {
        memberCount: members.length,
        seededCount: members.filter((m) => m.seeded).length,
        activeToday,
        totalWorkouts,
        totalMinutes,
        avgStreak,
        withPlan,
        expiringSoon,
        expired,
        activeMemberships,
      },
      today: {
        date,
        capacity: GYM_CAPACITY,
        currentPeople,
        occupancyPct,
        level,
        checkinsToday,
        uniqueCheckins,
        reservationsToday,
        classes,
      },
      checkins: checkinDocs.map((c) => ({
        id: c.id,
        memberName: c.memberName,
        accessCode: c.accessCode,
        method: c.method,
        membershipStatus: c.membershipStatus,
        checkedInAt: c.checkedInAt,
        by: c.by,
        note: c.note ?? "",
      })),
    };

    if (role === "super") {
      payload.revenue = await revenueSummary(db);
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("XTREME ADMIN GET", err);
    return NextResponse.json({ error: "No se pudo cargar el panel." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const role = roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "plan");

    // Plan personalizado
    if (action === "plan") {
      const memberName = normalizeName(body.memberName);
      if (!memberName) {
        return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
      }
      const plan = sanitizePlan(body.plan);
      if (!plan.title) {
        return NextResponse.json({ error: "El plan necesita un titulo." }, { status: 400 });
      }

      const db = await getDb();
      const normalizedName = normalizeKey(memberName);
      const now = new Date();
      await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $set: {
            normalizedName,
            memberName,
            trainingPlan: { ...plan, createdAt: now },
            updatedAt: now,
          },
          $setOnInsert: { workouts: [], bodyMetrics: [], createdAt: now },
        },
        { upsert: true },
      );
      return NextResponse.json({ ok: true });
    }

    // Perfil / membresia personalizada
    if (action === "member") {
      const memberName = normalizeName(body.memberName);
      if (!memberName) {
        return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
      }

      const db = await getDb();
      const normalizedName = normalizeKey(memberName);
      const now = new Date();
      const existing = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });

      const plan = String(body.plan ?? existing?.membership?.plan ?? "Xtreme Mensual")
        .trim()
        .slice(0, 80);
      const nextBillingDate =
        String(body.nextBillingDate ?? existing?.membership?.nextBillingDate ?? todayIso()).slice(0, 10) ||
        todayIso();
      const startedAt =
        String(body.startedAt ?? existing?.membership?.startedAt ?? todayIso()).slice(0, 10) || todayIso();

      await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $set: {
            normalizedName,
            memberName: normalizeName(body.displayName) || memberName,
            goal: String(body.goal ?? existing?.goal ?? "").trim().slice(0, 80),
            favoriteTraining: String(body.favoriteTraining ?? existing?.favoriteTraining ?? "")
              .trim()
              .slice(0, 80),
            phone: String(body.phone ?? existing?.phone ?? "").trim().slice(0, 40),
            email: String(body.email ?? existing?.email ?? "").trim().slice(0, 80),
            coach: String(body.coach ?? existing?.coach ?? "").trim().slice(0, 60),
            notes: String(body.notes ?? existing?.notes ?? "").trim().slice(0, 800),
            membership: {
              plan,
              nextBillingDate,
              startedAt,
              status: membershipStatus({ plan, nextBillingDate, startedAt }).status,
            },
            updatedAt: now,
          },
          $setOnInsert: { workouts: [], bodyMetrics: [], createdAt: now },
        },
        { upsert: true },
      );

      return NextResponse.json({ ok: true });
    }

    // Ingreso manual (admin desde panel)
    if (action === "checkin") {
      const memberName = normalizeName(body.memberName);
      if (!memberName) {
        return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
      }

      const db = await getDb();
      const normalizedName = normalizeKey(memberName);
      const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member) {
        return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
      }

      const ms = membershipStatus(member.membership);
      const now = new Date();
      const date = todayIso();
      const accessCode = formatAccessCode(memberAccessCode(normalizedName));

      // Evitar check-in duplicado en los ultimos 20 minutos
      const recent = await db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne({
        normalizedName,
        date,
        checkedInAt: { $gte: new Date(now.getTime() - 20 * 60 * 1000) },
      });
      if (recent) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          message: "Ya tiene un ingreso reciente.",
          checkin: recent,
          membershipStatus: ms.status,
        });
      }

      const checkin: CheckinDoc = {
        id: `chk-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        memberName: member.memberName || memberName,
        normalizedName,
        accessCode,
        method: "admin",
        membershipStatus: ms.status,
        date,
        checkedInAt: now,
        by: "admin",
        note: String(body.note ?? "").trim().slice(0, 120),
      };

      await db.collection<CheckinDoc>(CHECKINS_COLLECTION).insertOne(checkin);
      return NextResponse.json({ ok: true, checkin, membershipStatus: ms.status });
    }

    // Pago manual — solo super admin
    if (action === "payment") {
      if (role !== "super") return forbidden();

      const customerName = normalizeName(body.customerName || body.memberName);
      if (!customerName) {
        return NextResponse.json({ error: "Cliente requerido." }, { status: 400 });
      }

      const amountCrc = Math.max(0, Math.round(Number(body.amountCrc) || 0));
      if (!amountCrc) {
        return NextResponse.json({ error: "Monto CRC invalido." }, { status: 400 });
      }

      const methodRaw = String(body.method ?? "cash");
      const method = (
        ["paypal", "cash", "transfer", "sinpe", "other"].includes(methodRaw) ? methodRaw : "cash"
      ) as PaymentDoc["method"];

      const now = new Date();
      const payment: PaymentDoc = {
        id: `pay-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        memberName: customerName,
        normalizedName: normalizeKey(customerName),
        customerName,
        phone: String(body.phone ?? "").trim().slice(0, 40),
        email: String(body.email ?? "").trim().slice(0, 80),
        optionId: String(body.optionId ?? "manual").trim().slice(0, 40),
        optionLabel: String(body.optionLabel ?? "Pago manual").trim().slice(0, 80),
        category: (["Plan", "Clase", "Otro"].includes(String(body.category))
          ? String(body.category)
          : "Otro") as PaymentDoc["category"],
        amountCrc,
        amountUsd: Math.max(0, Math.round((Number(body.amountUsd) || amountCrc / 500) * 100) / 100),
        currency: "CRC",
        method,
        status: "completed",
        paypalOrderId: null,
        paypalCaptureId: null,
        note: String(body.note ?? "").trim().slice(0, 200),
        date: String(body.date ?? todayIso()).slice(0, 10) || todayIso(),
        createdAt: now,
        recordedBy: "admin",
      };

      const db = await getDb();
      await db.collection<PaymentDoc>(PAYMENTS_COLLECTION).insertOne(payment);

      // Extender membresia si se elige plan y existe el socio
      if (body.extendMembership && payment.category === "Plan") {
        const days = Math.max(1, Math.min(365, Number(body.extendDays) || 30));
        const member = await db
          .collection<MemberDoc>(MEMBERS_COLLECTION)
          .findOne({ normalizedName: payment.normalizedName });
        const base =
          member?.membership?.nextBillingDate && member.membership.nextBillingDate > todayIso()
            ? member.membership.nextBillingDate
            : todayIso();
        const nextBillingDate = addDays(toUtcDate(base), days).toISOString().slice(0, 10);
        await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
          { normalizedName: payment.normalizedName },
          {
            $set: {
              normalizedName: payment.normalizedName,
              memberName: customerName,
              "membership.plan": payment.optionLabel,
              "membership.nextBillingDate": nextBillingDate,
              "membership.status": "active",
              updatedAt: now,
            },
            $setOnInsert: {
              workouts: [],
              bodyMetrics: [],
              goal: "",
              favoriteTraining: "",
              createdAt: now,
              "membership.startedAt": todayIso(),
            },
          },
          { upsert: true },
        );
      }

      return NextResponse.json({ ok: true, payment });
    }

    // Registrar metrica corporal (para que la entrenadora personal haga seguimiento)
    if (action === "metric") {
      const memberName = normalizeName(body.memberName);
      if (!memberName) {
        return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
      }
      const weightKg = Number(body.weightKg);
      const waistCm = Number(body.waistCm);
      if (!weightKg || !waistCm) {
        return NextResponse.json({ error: "Peso y cintura son requeridos." }, { status: 400 });
      }

      const db = await getDb();
      const normalizedName = normalizeKey(memberName);
      const now = new Date();
      const date = String(body.date ?? todayIso()).slice(0, 10) || todayIso();
      const note = String(body.note ?? "").trim().slice(0, 200);

      const metric = {
        id: `metric-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        date,
        weightKg: Math.round(weightKg * 10) / 10,
        waistCm: Math.round(waistCm),
        note,
        createdAt: now,
      };

      await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $push: { bodyMetrics: metric },
          $set: { updatedAt: now },
          $setOnInsert: { workouts: [], createdAt: now },
        },
        { upsert: true },
      );

      return NextResponse.json({ ok: true, metric });
    }

    return NextResponse.json({ error: "Accion invalida." }, { status: 400 });
  } catch (err) {
    console.error("XTREME ADMIN POST", err);
    return NextResponse.json({ error: "No se pudo procesar." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const role = roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as {
      memberName?: string;
      itemId?: string;
      done?: boolean;
    };
    const memberName = normalizeName(body.memberName);
    const itemId = String(body.itemId ?? "").trim();
    if (!memberName || !itemId) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }

    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    const done = Boolean(body.done);
    const result = await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
      { normalizedName },
      {
        $set: {
          "trainingPlan.items.$[el].done": done,
          "trainingPlan.items.$[el].doneDate": done ? todayIso() : null,
          "trainingPlan.updatedAt": new Date(),
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "el.id": itemId }] },
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Sesion no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("XTREME ADMIN PATCH", err);
    return NextResponse.json({ error: "No se pudo actualizar el avance." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const role = roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as { memberName?: string; paymentId?: string };
    const paymentId = String(body.paymentId ?? "").trim();

    if (paymentId) {
      if (role !== "super") return forbidden();
      const db = await getDb();
      await db.collection(PAYMENTS_COLLECTION).deleteOne({ id: paymentId });
      return NextResponse.json({ ok: true });
    }

    const memberName = normalizeName(body.memberName);
    if (!memberName) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }

    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    await Promise.all([
      db.collection(MEMBERS_COLLECTION).deleteOne({ normalizedName }),
      db.collection(PINS_COLLECTION).deleteOne({ normalizedName }),
      db.collection(RESERVATIONS_COLLECTION).deleteMany({ normalizedName }),
      db.collection(CHECKINS_COLLECTION).deleteMany({ normalizedName }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("XTREME ADMIN DELETE", err);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
}
