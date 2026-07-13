import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  CHECKINS_COLLECTION,
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
  computeOccupancy,
  formatAccessCode,
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
import { writeAudit } from "@/lib/xtreme/audit";
import { sendMembershipReminderEmail, sendPaymentReceiptEmail } from "@/lib/helpers/email";

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

  // Serie diaria (ultimos 14 dias) para la grafica de ingresos
  const daily: { date: string; crc: number; count: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = daysAgoIso(i);
    const dayPayments = payments.filter((p) => p.date === day);
    daily.push({
      date: day,
      crc: dayPayments.reduce((s, p) => s + (p.amountCrc || 0), 0),
      count: dayPayments.length,
    });
  }

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
    daily,
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

    const occupancySnapshot = await computeOccupancy(db);

    // Serie de ingresos al gym de los ultimos 7 dias (para la grafica)
    const weekStartIso = daysAgoIso(6);
    const weekCheckins = await db
      .collection<CheckinDoc>(CHECKINS_COLLECTION)
      .find({ date: { $gte: weekStartIso } })
      .project<{ date: string; normalizedName: string }>({ date: 1, normalizedName: 1 })
      .toArray();
    const checkinSeries: { date: string; checkins: number; unique: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = daysAgoIso(i);
      const dayDocs = weekCheckins.filter((c) => c.date === day);
      checkinSeries.push({
        date: day,
        checkins: dayDocs.length,
        unique: new Set(dayDocs.map((c) => c.normalizedName)).size,
      });
    }

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
        capacity: occupancySnapshot.capacity,
        currentPeople: occupancySnapshot.currentPeople,
        occupancyPct: occupancySnapshot.occupancyPct,
        level: occupancySnapshot.level,
        checkinsToday: occupancySnapshot.checkinsToday,
        uniqueCheckins: occupancySnapshot.uniqueCheckins,
        reservationsToday: occupancySnapshot.reservationsToday,
        classes,
      },
      checkinSeries,
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

    // Phase 3: Growth strip for all admin roles (funnel, not full revenue detail)
    try {
      const { computeGrowthSnapshot } = await import("@/lib/xtreme/growth");
      payload.growth = await computeGrowthSnapshot(db, 30);
    } catch (growthErr) {
      console.error("XTREME ADMIN GROWTH", growthErr);
      payload.growth = null;
    }

    // System health card
    try {
      const lifecycle = await db.collection("xtreme_gym_job_runs").findOne(
        { job: "lifecycle" },
        { sort: { startedAt: -1 }, projection: { _id: 0, status: 1, startedAt: 1, finishedAt: 1, summary: 1 } },
      );
      payload.system = {
        lifecycle,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      payload.system = null;
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
      await writeAudit(db, {
        actorRole: role,
        action: "member.save_plan",
        targetType: "member",
        targetId: normalizedName,
        summary: `Plan guardado: ${plan.title} → ${memberName}`,
      });
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

      const displayName = normalizeName(body.displayName) || memberName;
      await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $set: {
            normalizedName,
            memberName: displayName,
            goal: String(body.goal ?? existing?.goal ?? "").trim().slice(0, 80),
            favoriteTraining: String(body.favoriteTraining ?? existing?.favoriteTraining ?? "")
              .trim()
              .slice(0, 80),
            phone: String(body.phone ?? existing?.phone ?? "").trim().slice(0, 40),
            email: String(body.email ?? existing?.email ?? "").trim().slice(0, 80),
            cedula: String(body.cedula ?? existing?.cedula ?? "")
              .replace(/[^\d-]/g, "")
              .slice(0, 20),
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

      await writeAudit(db, {
        actorRole: role,
        action: "member.update_profile",
        targetType: "member",
        targetId: normalizedName,
        summary: `Perfil actualizado: ${displayName}`,
        meta: { plan, nextBillingDate },
      });

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
      await writeAudit(db, {
        actorRole: role,
        action: "member.checkin",
        targetType: "member",
        targetId: normalizedName,
        summary: `Ingreso manual: ${checkin.memberName}`,
      });
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
      let nextBillingDate: string | undefined;
      if (body.extendMembership && payment.category === "Plan") {
        const days = Math.max(1, Math.min(365, Number(body.extendDays) || 30));
        const member = await db
          .collection<MemberDoc>(MEMBERS_COLLECTION)
          .findOne({ normalizedName: payment.normalizedName });
        const base =
          member?.membership?.nextBillingDate && member.membership.nextBillingDate > todayIso()
            ? member.membership.nextBillingDate
            : todayIso();
        nextBillingDate = addDays(toUtcDate(base), days).toISOString().slice(0, 10);
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

      // Create entitlement for manual payments (matching PayPal behavior)
      let entitlementId: string | null = null;
      if (payment.category === "Plan" || payment.optionId === "day-pass") {
        const { entitlementFromPayment, grantEntitlement } = await import("@/lib/xtreme/entitlements");

        const entShape = entitlementFromPayment({
          memberKey: payment.normalizedName,
          optionId: payment.optionId,
          optionLabel: payment.optionLabel,
          paymentId: payment.id,
          startDate: payment.date,
          category: payment.category,
        });

        // Align entitlement end date with membership extension if applicable
        if (nextBillingDate && entShape.kind === "plan") {
          entShape.endsOn = nextBillingDate;
        }

        const entitlement = await grantEntitlement(db, entShape);
        entitlementId = entitlement.id;
      }

      let receiptSent = false;
      if (payment.email) {
        const receipt = await sendPaymentReceiptEmail({
          to: payment.email,
          customerName: payment.customerName,
          optionLabel: payment.optionLabel,
          amountCrc: payment.amountCrc,
          amountUsd: payment.amountUsd,
          method: payment.method,
          date: payment.date,
        });
        receiptSent = receipt.ok;
      }

      await writeAudit(db, {
        actorRole: role,
        action: "payment.create",
        targetType: "payment",
        targetId: payment.id,
        summary: `Pago ${payment.amountCrc} CRC — ${payment.optionLabel} (${payment.customerName})`,
        meta: { method: payment.method, category: payment.category },
      });

      return NextResponse.json({ ok: true, payment, receiptSent, entitlementId });
    }

    // Enviar recordatorio de membresia a un socio
    if (action === "notify") {
      const memberName = normalizeName(body.memberName);
      if (!memberName) {
        return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
      }

      const db = await getDb();
      const member = await db
        .collection<MemberDoc>(MEMBERS_COLLECTION)
        .findOne({ normalizedName: normalizeKey(memberName) });
      if (!member) {
        return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
      }
      if (!member.email) {
        return NextResponse.json(
          { error: "Este socio no tiene correo registrado." },
          { status: 400 },
        );
      }

      const ms = membershipStatus(member.membership);
      const result = await sendMembershipReminderEmail({
        to: member.email,
        memberName: member.memberName || memberName,
        plan: ms.plan,
        nextBillingDate: ms.nextBillingDate,
        daysRemaining: ms.daysRemaining,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.skipped ? "Correo no configurado (RESEND_API_KEY)." : "No se pudo enviar el correo." },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: true, sentTo: member.email });
    }

    // Recordatorio masivo a membresias por vencer / vencidas
    if (action === "notifyExpiring") {
      const db = await getDb();
      const docs = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray();
      const targets = docs
        .map((doc) => ({ doc, ms: membershipStatus(doc.membership) }))
        .filter(({ doc, ms }) => doc.email && (ms.status === "warning" || ms.status === "expired"));

      let sent = 0;
      for (const { doc, ms } of targets) {
        const result = await sendMembershipReminderEmail({
          to: doc.email!,
          memberName: doc.memberName || "",
          plan: ms.plan,
          nextBillingDate: ms.nextBillingDate,
          daysRemaining: ms.daysRemaining,
        });
        if (result.ok) sent += 1;
      }

      return NextResponse.json({ ok: true, sent, eligible: targets.length });
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
