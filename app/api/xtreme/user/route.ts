import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { sendWelcomeEmail, sendAdminNewMemberNotification } from "@/lib/helpers/email";
import { businessDate } from "@/lib/xtreme/business-date";
import { recordEvent } from "@/lib/xtreme/events";
import { grantFreeFirstDayIfEligible } from "@/lib/xtreme/entitlements";
import {
  cedulaDigits,
  clampPinnedBadges,
  findMemberByCedula,
  formatAccessCode,
  matchCedula,
  memberAccessCode,
  MEMBERS_COLLECTION,
  mergeNotificationPrefs,
  normalizeCedula,
  PINS_COLLECTION,
  sanitizeWorkoutExercises,
  type ActivePlanWorkout,
} from "@/lib/xtreme/shared";
import {
  WEEKLY_GOAL_DEFAULT,
  WEEKLY_GOAL_MAX,
  WEEKLY_GOAL_MIN,
} from "@/lib/xtreme/gamification";
import { isSession, requireMemberSession, resolveMemberSession } from "@/lib/xtreme/session";
import { pickNextBestAction } from "@/lib/xtreme/next-best-action";
import {
  normalizeIsoDate,
  normalizeMemberEmail,
  normalizeMemberKey,
  normalizeMemberName,
  normalizeMemberPhone,
  normalizeMemberPhoto,
} from "@/lib/xtreme/members/normalizers";
import { createFreeFirstDayMembership } from "@/lib/xtreme/members/membership";
import { MemberWorkoutError } from "@/lib/xtreme/members/errors";
import { syncMemberGamification } from "@/lib/xtreme/members/gamification-service";
import { getMemberLeaderboard } from "@/lib/xtreme/members/leaderboard";
import { toPublicMember } from "@/lib/xtreme/members/presenter";
import { createMongoMemberRepository } from "@/lib/xtreme/members/repository";
import type { BodyMetric, XtremeMemberDoc } from "@/lib/xtreme/members/types";
import { completeTodayWorkout } from "@/lib/xtreme/members/complete-today-workout";
import {
  badgeNamesFromNewBadges,
  queuePushMemberEvent,
} from "@/lib/xtreme/member-push";

export const dynamic = "force-dynamic";

/** Push de Member OS tras un entreno (y badges si hubo). No bloquea la respuesta. */
function queueWorkoutPush(
  db: Awaited<ReturnType<typeof getDb>>,
  memberKey: string,
  args: {
    trainingName: string;
    minutes?: number;
    plan?: boolean;
    newBadges?: unknown;
    streak?: number;
  },
) {
  queuePushMemberEvent(db, memberKey, {
    type: args.plan ? "plan_finished" : "workout_done",
    trainingName: args.trainingName,
    minutes: args.minutes,
    streak: args.streak,
  });
  const names = badgeNamesFromNewBadges(args.newBadges);
  if (names.length) {
    queuePushMemberEvent(db, memberKey, { type: "badge_earned", badgeNames: names });
  }
}

async function buildAuthenticatedMemberPayload(
  db: Awaited<ReturnType<typeof getDb>>,
  normalizedName: string,
  today: string,
  extra: Record<string, unknown> = {},
) {
  const memberRepository = createMongoMemberRepository(db);
  const newBadges = await syncMemberGamification(memberRepository, normalizedName, { today });
  const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
  const member = toPublicMember(doc, today);
  const gami = member.gamification;
  const trainedToday = member.lastWorkoutDate === today;
  const nextBadge = (gami?.badges ?? []).find(
    (b: { earned: boolean; progress: { current: number; target: number } | null }) =>
      !b.earned && b.progress && b.progress.current < b.progress.target,
  ) as { name: string; progress: { current: number; target: number } } | undefined;

  const nextBestAction = pickNextBestAction({
    trainedToday,
    weekCount: gami?.weekCount ?? 0,
    weeklyGoal: gami?.weeklyGoal ?? WEEKLY_GOAL_DEFAULT,
    streak: gami?.streak ?? member.streak,
    freezesAvailable: gami?.freezesAvailable ?? 0,
    daysRemaining: member.membership.daysRemaining,
    membershipStatus: member.membership.status,
    totalWorkouts: member.totalWorkouts,
    lastWorkoutDate: member.lastWorkoutDate,
    today,
    hasUnseenCoachNote: Boolean(
      doc?.trainingPlan?.coachNote &&
        String(doc.trainingPlan.coachNote).trim() &&
        (doc.trainingPlan.items?.some((item) => !item.done) ?? true),
    ),
    nextBadgeName: nextBadge?.name ?? null,
    nextBadgeRemaining: nextBadge
      ? Math.max(0, nextBadge.progress.target - nextBadge.progress.current)
      : null,
    buddyInviteAvailable: (doc?.buddies?.length ?? 0) < 3 && member.totalWorkouts >= 3,
  });

  return {
    member,
    exists: Boolean(doc),
    newBadges,
    leaderboard: await getMemberLeaderboard(memberRepository, today),
    nextBestAction,
    ...extra,
  };
}

/** Minimal bootstrap for login — no phone/email/metrics/access code. */
async function bootstrapLookup(
  db: Awaited<ReturnType<typeof getDb>>,
  normalizedName: string,
  resolvedBy: "name" | "cedula",
  digits: string,
) {
  const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne(
    { normalizedName },
    { projection: { memberName: 1, normalizedName: 1, cedula: 1 } },
  );
  if (!doc) {
    return {
      member: null,
      exists: false,
      lookup: resolvedBy,
      cedula: digits,
      hasPinSet: false,
      leaderboard: [],
      nextBestAction: null,
    };
  }
  const pinDoc = await db
    .collection(PINS_COLLECTION)
    .findOne({ normalizedName }, { projection: { pinHash: 1 } });
  return {
    member: {
      memberName: doc.memberName ?? "",
      normalizedName: doc.normalizedName ?? normalizedName,
      // Only last digits hint for UI confirmation — not full cédula
      cedula: "",
    },
    exists: true,
    lookup: resolvedBy,
    cedula: digits || "",
    hasPinSet: Boolean(pinDoc?.pinHash),
    leaderboard: [],
    nextBestAction: null,
  };
}

export async function GET(req: NextRequest) {
  const memberNameParam = normalizeMemberName(req.nextUrl.searchParams.get("memberName"));
  const cedulaParam = String(req.nextUrl.searchParams.get("cedula") ?? "").trim();
  const digits = cedulaDigits(cedulaParam);

  try {
    const db = await getDb();
    const today = businessDate();
    const session = await resolveMemberSession(req);

    // Authenticated: full profile for the session member (optional lookup must match).
    if (session) {
      let normalizedName = session.memberKey;
      let resolvedBy: "name" | "cedula" | "session" = "session";

      if (digits.length >= 6) {
        const candidates = await db
          .collection<XtremeMemberDoc>(MEMBERS_COLLECTION)
          .find(
            { cedula: { $exists: true, $type: "string", $ne: "" } },
            { projection: { memberName: 1, normalizedName: 1, cedula: 1 } },
          )
          .toArray();
        const hit = findMemberByCedula(candidates, digits);
        if (hit?.normalizedName && hit.normalizedName !== session.memberKey) {
          // Different cédula than session → bootstrap only (switch account flow)
          return NextResponse.json(await bootstrapLookup(db, hit.normalizedName, "cedula", digits));
        }
        if (hit?.normalizedName) {
          normalizedName = hit.normalizedName;
          resolvedBy = "cedula";
        }
      } else if (memberNameParam) {
        const key = normalizeMemberKey(memberNameParam);
        if (key !== session.memberKey) {
          return NextResponse.json(await bootstrapLookup(db, key, "name", digits));
        }
        resolvedBy = "name";
      }

      const payload = await buildAuthenticatedMemberPayload(db, normalizedName, today, {
        lookup: resolvedBy,
        cedula: digits || undefined,
      });
      return NextResponse.json(payload);
    }

    // Unauthenticated without lookup keys
    if (!memberNameParam && digits.length < 6) {
      return NextResponse.json({
        member: null,
        exists: false,
        leaderboard: [],
        nextBestAction: null,
      });
    }

    let normalizedName = memberNameParam ? normalizeMemberKey(memberNameParam) : "";
    let resolvedBy: "name" | "cedula" = "name";

    if (!normalizedName && digits.length >= 6) {
      const candidates = await db
        .collection<XtremeMemberDoc>(MEMBERS_COLLECTION)
        .find(
          { cedula: { $exists: true, $type: "string", $ne: "" } },
          { projection: { memberName: 1, normalizedName: 1, cedula: 1 } },
        )
        .toArray();
      const hit = findMemberByCedula(candidates, digits);
      if (!hit?.normalizedName) {
        return NextResponse.json({
          member: null,
          exists: false,
          lookup: "cedula" as const,
          cedula: digits,
          hasPinSet: false,
          leaderboard: [],
          nextBestAction: null,
        });
      }
      normalizedName = hit.normalizedName;
      resolvedBy = "cedula";
    }

    return NextResponse.json(await bootstrapLookup(db, normalizedName, resolvedBy, digits));
  } catch (err) {
    console.error("XTREME USER GET", err);
    return NextResponse.json({ error: "No se pudo cargar Xtreme Gym." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const memberName = normalizeMemberName(body.memberName);
    const goal = String(body.goal ?? "").trim().slice(0, 80);
    const favoriteTraining = String(body.favoriteTraining ?? "").trim().slice(0, 80);
    const phone = normalizeMemberPhone(body.phone);
    const email = normalizeMemberEmail(body.email);
    const photo = normalizeMemberPhoto(body.photo);
    const cedulaRaw = body.cedula !== undefined ? normalizeCedula(body.cedula) : "";
    const cedulaKey = cedulaDigits(cedulaRaw);

    if (!memberName) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }
    if (body.cedula !== undefined && cedulaKey && cedulaKey.length < 6) {
      return NextResponse.json({ error: "Cedula invalida. Use al menos 6 digitos." }, { status: 400 });
    }

    const db = await getDb();
    const memberRepository = createMongoMemberRepository(db);
    const normalizedName = normalizeMemberKey(memberName);
    const now = new Date();
    const today = businessDate(now);
    const existing = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });

    // Updates to an existing profile require a matching session (photo, contacts, etc.).
    if (existing) {
      const sessionOrErr = await requireMemberSession(req, normalizedName);
      if (!isSession(sessionOrErr)) return sessionOrErr;
    }

    // Create path: cédula required for self-serve alta (anti-orphan profiles).
    if (!existing) {
      if (!cedulaKey || cedulaKey.length < 6) {
        return NextResponse.json(
          { error: "Para crear perfil se requiere cedula (minimo 6 digitos)." },
          { status: 400 },
        );
      }
      if (!phone) {
        return NextResponse.json(
          { error: "Para crear perfil se requiere telefono." },
          { status: 400 },
        );
      }
    }

    if (phone || email || cedulaKey) {
      const orFilters: Record<string, unknown>[] = [];
      if (phone) orFilters.push({ phone });
      if (email) orFilters.push({ email });
      if (cedulaKey) orFilters.push({ cedula: { $exists: true, $type: "string", $ne: "" } });

      const contactCandidates = await db
        .collection<XtremeMemberDoc>(MEMBERS_COLLECTION)
        .find(
          {
            normalizedName: { $ne: normalizedName },
            ...(orFilters.length ? { $or: orFilters } : {}),
          } as Record<string, unknown>,
          { projection: { memberName: 1, phone: 1, email: 1, cedula: 1, normalizedName: 1 } },
        )
        .toArray();

      const duplicate =
        contactCandidates.find((d) => {
          if (phone && d.phone && d.phone === phone) return true;
          if (email && d.email && d.email === email) return true;
          if (cedulaKey && matchCedula(d.cedula, cedulaKey)) return true;
          return false;
        }) ?? null;

      if (duplicate) {
        return NextResponse.json(
          {
            error: `Ese contacto/cedula ya esta ligado a ${duplicate.memberName}. Use ese perfil o hable con recepcion.`,
            duplicate: {
              memberName: duplicate.memberName,
            },
          },
          { status: 409 },
        );
      }
    }

    const set: Partial<XtremeMemberDoc> = {
      normalizedName,
      memberName,
      updatedAt: now,
    };

    if (body.goal !== undefined) set.goal = goal;
    if (body.favoriteTraining !== undefined) set.favoriteTraining = favoriteTraining;
    if (phone) set.phone = phone;
    if (email) set.email = email;
    if (photo) set.photoUrl = photo;
    if (body.cedula !== undefined && cedulaRaw) set.cedula = cedulaRaw;

    if (!existing) {
      // Ignore client plan/dates — self-serve always starts as free first day.
      set.membership = createFreeFirstDayMembership(today);
    }

    await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
      { normalizedName },
      {
        $set: set,
        $setOnInsert: {
          workouts: [],
          bodyMetrics: [],
          createdAt: now,
        },
      },
      { upsert: true },
    );

    if (!existing) {
      await grantFreeFirstDayIfEligible(db, normalizedName, today);
      if (email) {
        await sendWelcomeEmail({
          to: email,
          memberName,
          accessCode: formatAccessCode(memberAccessCode(normalizedName)),
        });
      }
      // Notificar al admin sobre el nuevo registro
      await sendAdminNewMemberNotification({
        memberName,
        phone,
        email: email || undefined,
        cedula: cedulaRaw || undefined,
      });
      await recordEvent(db, {
        type: "profile_created",
        memberId: normalizedName,
        source: "member_app",
        entity: { type: "member", id: normalizedName },
        properties: {
          hasEmail: Boolean(email),
          hasPhone: Boolean(phone),
          freeFirstDay: true,
        },
      });
    }

    const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
    return NextResponse.json({
      member: toPublicMember(doc, today),
      leaderboard: existing
        ? await getMemberLeaderboard(memberRepository, today)
        : [],
      freeFirstDay: !existing,
    });
  } catch (err) {
    console.error("XTREME USER POST", err);
    return NextResponse.json({ error: "No se pudo guardar el usuario." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    // Strategy 2.0: identity from session cookie — body.memberName is not authorization.
    const sessionOrErr = await requireMemberSession(req);
    if (!isSession(sessionOrErr)) return sessionOrErr;
    const memberName = sessionOrErr.memberName;
    const action = String(body.action ?? "workout");
    const trainingId = String(body.trainingId ?? "").trim();
    const trainingName = String(body.trainingName ?? "").trim();
    const intensity = String(body.intensity ?? "").trim();
    const minutes = Math.max(1, Math.min(240, Number(body.minutes) || 45));
    const completedDate = normalizeIsoDate(body.completedDate);
    const db = await getDb();
    const memberRepository = createMongoMemberRepository(db);
    const today = businessDate();

    if (action === "weeklyGoal") {
      const weeklyGoal = Math.max(
        WEEKLY_GOAL_MIN,
        Math.min(WEEKLY_GOAL_MAX, Number(body.weeklyGoal) || WEEKLY_GOAL_DEFAULT),
      );
      if (!memberName) {
        return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
      }
      const normalizedName = sessionOrErr.memberKey;
      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        { $set: { weeklyGoal, updatedAt: new Date() } },
      );
      const newBadges = await syncMemberGamification(memberRepository, normalizedName, { today });
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: toPublicMember(doc, today), newBadges, leaderboard: await getMemberLeaderboard(memberRepository, today) });
    }

    if (action === "badgesSeen") {
      const normalizedName = sessionOrErr.memberKey;
      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        { $set: { "earnedBadges.$[].seen": true, updatedAt: new Date() } },
      );
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: toPublicMember(doc, today) });
    }

    if (action === "tourDone") {
      const normalizedName = sessionOrErr.memberKey;
      const now = new Date();
      const result = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName, tourDoneAt: { $exists: false } },
        { $set: { tourDoneAt: now, updatedAt: now } },
      );
      if (result.modifiedCount) {
        await recordEvent(db, {
          type: "tour_completed",
          memberId: normalizedName,
          source: "member_app",
          properties: {},
        });
      }
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: toPublicMember(doc, today) });
    }

    // Perfil self-service (Fase 3): prefs, showcase, meta/contacto
    if (action === "profile") {
      const normalizedName = sessionOrErr.memberKey;
      const existing = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!existing) {
        return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
      }

      const set: Partial<XtremeMemberDoc> = { updatedAt: new Date() };

      if (body.goal !== undefined) set.goal = String(body.goal ?? "").trim().slice(0, 80);
      if (body.favoriteTraining !== undefined) {
        set.favoriteTraining = String(body.favoriteTraining ?? "").trim().slice(0, 80);
      }
      if (body.phone !== undefined) {
        const phone = normalizeMemberPhone(body.phone);
        // Permitir guardar telefono nuevo; string vacio no borra el existente.
        if (phone) set.phone = phone;
      }
      if (body.email !== undefined) {
        const rawEmail = String(body.email ?? "").trim();
        if (rawEmail) {
          const email = normalizeMemberEmail(rawEmail);
          // Validacion basica: debe parecer un correo real.
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
              { error: "Correo invalido. Ejemplo: nombre@gmail.com" },
              { status: 400 },
            );
          }
          set.email = email;
        }
      }
      if (body.cedula !== undefined) {
        const cedulaRaw = normalizeCedula(body.cedula);
        const cedulaKey = cedulaDigits(cedulaRaw);
        if (cedulaKey && cedulaKey.length < 6) {
          return NextResponse.json({ error: "Cedula invalida." }, { status: 400 });
        }
        if (cedulaKey) {
          const others = await db
            .collection<XtremeMemberDoc>(MEMBERS_COLLECTION)
            .find(
              {
                normalizedName: { $ne: normalizedName },
                cedula: { $exists: true, $type: "string", $ne: "" },
              },
              { projection: { memberName: 1, cedula: 1 } },
            )
            .toArray();
          const taken = others.find((d) => matchCedula(d.cedula, cedulaKey));
          if (taken) {
            return NextResponse.json(
              { error: `Esa cedula ya esta ligada a ${taken.memberName}.` },
              { status: 409 },
            );
          }
          set.cedula = cedulaRaw;
        }
      }
      if (body.weeklyGoal !== undefined) {
        set.weeklyGoal = Math.max(
          WEEKLY_GOAL_MIN,
          Math.min(WEEKLY_GOAL_MAX, Number(body.weeklyGoal) || WEEKLY_GOAL_DEFAULT),
        );
      }
      if (body.notificationPrefs !== undefined && body.notificationPrefs && typeof body.notificationPrefs === "object") {
        const raw = body.notificationPrefs as Record<string, unknown>;
        set.notificationPrefs = mergeNotificationPrefs({
          ...existing.notificationPrefs,
          ...(raw.streakRisk !== undefined ? { streakRisk: Boolean(raw.streakRisk) } : {}),
          ...(raw.milestones !== undefined ? { milestones: Boolean(raw.milestones) } : {}),
          ...(raw.renewalReminders !== undefined
            ? { renewalReminders: Boolean(raw.renewalReminders) }
            : {}),
          ...(raw.winBack !== undefined ? { winBack: Boolean(raw.winBack) } : {}),
          ...(raw.weeklyRecap !== undefined ? { weeklyRecap: Boolean(raw.weeklyRecap) } : {}),
        });
      }
      if (body.pinnedBadges !== undefined) {
        const earnedIds = new Set((existing.earnedBadges ?? []).map((b) => b.badgeId));
        set.pinnedBadges = clampPinnedBadges(body.pinnedBadges).filter((id) => earnedIds.has(id));
      }

      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne({ normalizedName }, { $set: set });
      if (
        set.notificationPrefs &&
        Object.values(set.notificationPrefs).some(Boolean)
      ) {
        const preferenceEmail = String(set.email || existing.email || "").trim().toLowerCase();
        if (preferenceEmail) {
          await Promise.all([
            db.collection("xtreme_gym_email_suppressions").deleteOne({ email: preferenceEmail }),
            db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
              { normalizedName },
              { $unset: { emailUnsubscribe: "" } },
            ),
          ]);
        }
      }
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: toPublicMember(doc, today), leaderboard: await getMemberLeaderboard(memberRepository, today) });
    }

    if (action === "planWorkoutStart") {
      const itemId = String(body.itemId ?? "").trim();
      if (!itemId) return NextResponse.json({ error: "Falta la sesion del plan." }, { status: 400 });
      const normalizedName = sessionOrErr.memberKey;
      const member = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member?.trainingPlan) return NextResponse.json({ error: "No hay un plan activo." }, { status: 404 });
      const item = member.trainingPlan.items?.find((entry) => entry.id === itemId);
      if (!item) return NextResponse.json({ error: "No se encontro la sesion del plan." }, { status: 404 });
      if (item.done) return NextResponse.json({ error: "Esta sesion ya fue completada." }, { status: 409 });
      if (member.activePlanWorkout) {
        if (member.activePlanWorkout.planItemId !== itemId) {
          return NextResponse.json({ error: "Finalice o cancele el entreno activo primero." }, { status: 409 });
        }
        return NextResponse.json({ member: toPublicMember(member, today) });
      }
      const now = new Date();
      const activePlanWorkout: ActivePlanWorkout = {
        id: `plan-workout-${now.getTime()}`,
        planItemId: item.id,
        planTitle: member.trainingPlan.title || "Plan personalizado",
        trainingName: item.focus || item.day || "Entrenamiento del plan",
        startedAt: now,
        exercises: (item.prescribedExercises ?? []).map((exercise) => ({
          id: exercise.id,
          machineId: exercise.machineId,
          machineName: exercise.machineName,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets,
          reps: exercise.reps,
          weightKg: exercise.weightKg,
          seconds: 0,
          notes: exercise.notes,
        })),
      };
      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        { $set: { activePlanWorkout, updatedAt: now } },
      );
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: toPublicMember(doc, today) });
    }

    if (action === "planWorkoutSave") {
      const normalizedName = sessionOrErr.memberKey;
      const member = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member?.activePlanWorkout) return NextResponse.json({ error: "No hay un entreno activo." }, { status: 409 });
      const exercises = sanitizeWorkoutExercises(body.exercises);
      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName, "activePlanWorkout.id": member.activePlanWorkout.id },
        { $set: { "activePlanWorkout.exercises": exercises, updatedAt: new Date() } },
      );
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: toPublicMember(doc, today) });
    }

    if (action === "planWorkoutCancel") {
      const normalizedName = sessionOrErr.memberKey;
      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        { $unset: { activePlanWorkout: "" }, $set: { updatedAt: new Date() } },
      );
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: toPublicMember(doc, today) });
    }

    if (action === "planWorkoutFinish") {
      const normalizedName = sessionOrErr.memberKey;
      const member = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      const active = member?.activePlanWorkout;
      if (!member?.trainingPlan || !active) return NextResponse.json({ error: "No hay un entreno activo." }, { status: 409 });
      const item = member.trainingPlan.items?.find((entry) => entry.id === active.planItemId);
      if (!item) return NextResponse.json({ error: "La sesion ya no existe en el plan." }, { status: 409 });
      const exercises = body.exercises === undefined
        ? active.exercises
        : sanitizeWorkoutExercises(body.exercises);
      const startedAt = new Date(active.startedAt);
      const elapsedMinutes = Math.max(1, Math.min(240, Math.round((Date.now() - startedAt.getTime()) / 60_000)));
      const { member: completed, newBadges } = await completeTodayWorkout(
        {
          repository: memberRepository,
          recordWorkoutCompleted: async ({ memberKey, checkinId, workout }) => {
            await recordEvent(db, {
              type: "workout_logged",
              memberId: memberKey,
              source: "member_app",
              entity: { type: "workout", id: workout.id },
              properties: { planItemId: active.planItemId, minutes: workout.minutes, checkinId },
            });
          },
        },
        {
          memberKey: normalizedName,
          trainingId: `plan-${active.planItemId}`,
          trainingName: active.trainingName,
          intensity: item.focus || "Plan coach",
          minutes: elapsedMinutes,
          planItemId: active.planItemId,
          planTitle: active.planTitle,
          startedAt,
          exercises,
        },
      );
      const workout = completed.workouts.at(-1);
      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $set: {
            "trainingPlan.items.$[el].done": true,
            "trainingPlan.items.$[el].doneDate": today,
            "trainingPlan.items.$[el].doneWorkoutId": workout?.id ?? null,
            "trainingPlan.updatedAt": new Date(),
            updatedAt: new Date(),
          },
          $unset: { activePlanWorkout: "" },
        },
        { arrayFilters: [{ "el.id": active.planItemId }] },
      );
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      const publicMember = toPublicMember(doc, today);
      queueWorkoutPush(db, normalizedName, {
        trainingName: active.trainingName,
        minutes: elapsedMinutes,
        plan: true,
        newBadges,
        streak: publicMember.streak ?? publicMember.gamification?.streak,
      });
      return NextResponse.json({
        member: publicMember,
        newBadges,
        leaderboard: await getMemberLeaderboard(memberRepository, today),
      });
    }

    if (action === "planItem") {
      const itemId = String(body.itemId ?? "").trim();
      if (!itemId) {
        return NextResponse.json({ error: "Falta la sesion del plan." }, { status: 400 });
      }

      const normalizedName = sessionOrErr.memberKey;
      const done = Boolean(body.done);
      if (done) {
        return NextResponse.json(
          { error: "Inicie y finalice la sesion para marcarla completada." },
          { status: 409 },
        );
      }
      const result = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $set: {
            "trainingPlan.items.$[el].done": done,
            "trainingPlan.items.$[el].doneDate": done ? completedDate : null,
            "trainingPlan.items.$[el].doneWorkoutId": null,
            updatedAt: new Date(),
          },
        },
        { arrayFilters: [{ "el.id": itemId }] },
      );

      if (!result.matchedCount) {
        return NextResponse.json({ error: "No se encontro la sesion." }, { status: 404 });
      }

      const newBadges = await syncMemberGamification(memberRepository, normalizedName, { today });
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: toPublicMember(doc, today), newBadges, leaderboard: await getMemberLeaderboard(memberRepository, today) });
    }

    if (action === "bodyMetric") {
      const weightKg = Math.max(1, Math.min(400, Number(body.weightKg) || 0));
      const waistCm = Math.max(1, Math.min(300, Number(body.waistCm) || 0));
      const note = String(body.note ?? "").trim().slice(0, 120);

      if (!weightKg || !waistCm) {
        return NextResponse.json({ error: "Faltan medidas." }, { status: 400 });
      }

      const normalizedName = sessionOrErr.memberKey;
      const now = new Date();
      const metric: BodyMetric = {
        id: `metric-${completedDate}-${now.getTime()}`,
        date: completedDate,
        weightKg,
        waistCm,
        note,
        createdAt: now,
      };

      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $set: {
            normalizedName,
            memberName,
            updatedAt: now,
          },
          $setOnInsert: {
            goal: "",
            favoriteTraining: "",
            workouts: [],
            membership: createFreeFirstDayMembership(today),
            createdAt: now,
          },
          $push: { bodyMetrics: metric },
        },
        { upsert: true },
      );

      const newBadges = await syncMemberGamification(memberRepository, normalizedName, { today });
      await recordEvent(db, {
        type: "body_metric_logged",
        memberId: normalizedName,
        source: "member_app",
        entity: { type: "body_metric", id: metric.id },
        properties: { date: completedDate },
      });
      const names = badgeNamesFromNewBadges(newBadges);
      queuePushMemberEvent(db, normalizedName, {
        type: "metric_logged",
        weightKg: weightKg,
      });
      if (names.length) {
        queuePushMemberEvent(db, normalizedName, { type: "badge_earned", badgeNames: names });
      }
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: toPublicMember(doc, today), newBadges, leaderboard: await getMemberLeaderboard(memberRepository, today) });
    }

    if (!trainingId || !trainingName) {
      return NextResponse.json({ error: "Faltan datos del entreno." }, { status: 400 });
    }

    const { member: doc, newBadges } = await completeTodayWorkout(
      {
        repository: memberRepository,
        recordWorkoutCompleted: async ({
          memberKey,
          memberName: persistedMemberName,
          checkinId,
          workout,
        }) => {
          await recordEvent(db, {
            type: "workout_logged",
            memberId: memberKey,
            source: "member_app",
            entity: { type: "workout", id: workout.id },
            properties: {
              trainingId: workout.trainingId,
              trainingName: workout.trainingName,
              minutes: workout.minutes,
              intensity: workout.intensity,
              completedDate: workout.completedDate,
              checkinId,
              memberName: persistedMemberName,
            },
          });
        },
      },
      {
        memberKey: sessionOrErr.memberKey,
        trainingId,
        trainingName,
        intensity,
        minutes,
      },
    );
    const publicMember = toPublicMember(doc, today);
    queueWorkoutPush(db, sessionOrErr.memberKey, {
      trainingName,
      minutes,
      newBadges,
      streak: publicMember.streak ?? publicMember.gamification?.streak,
    });
    return NextResponse.json({
      member: publicMember,
      newBadges,
      leaderboard: await getMemberLeaderboard(memberRepository, today),
    });
  } catch (err) {
    if (err instanceof MemberWorkoutError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("XTREME USER PATCH", err);
    return NextResponse.json({ error: "No se pudo registrar el entreno." }, { status: 500 });
  }
}
