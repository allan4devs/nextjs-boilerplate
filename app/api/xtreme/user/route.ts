import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { sendWelcomeEmail } from "@/lib/helpers/email";
import { recordEvent } from "@/lib/xtreme/events";
import {
  clampPinnedBadges,
  computeStreak as sharedComputeStreak,
  formatAccessCode,
  memberAccessCode,
  mergeNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/xtreme/shared";
import {
  BADGES,
  WEEKLY_GOAL_DEFAULT,
  WEEKLY_GOAL_MAX,
  WEEKLY_GOAL_MIN,
  buildMemberView,
  computeWeeklyStats,
  computeXp,
  evaluateBadges,
  freezesAvailable,
  levelForXp,
  planFreezeUsage,
  reconcileBadges,
  type EarnedBadge,
} from "@/lib/xtreme/gamification";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import { pickNextBestAction } from "@/lib/xtreme/next-best-action";

export const dynamic = "force-dynamic";

const MEMBERS_COLLECTION = "xtreme_gym_members";
const MAX_PHOTO_CHARS = 400_000; // ~300 KB binario en base64

type WorkoutEntry = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: Date;
};

type Membership = {
  plan: string;
  status: "active" | "warning" | "expired";
  nextBillingDate: string;
  startedAt: string;
};

type BodyMetric = {
  id: string;
  date: string;
  weightKg: number;
  waistCm: number;
  note: string;
  createdAt: Date;
};

type PlanItem = {
  id: string;
  day: string;
  focus: string;
  exercises: string;
  targetMinutes: number;
  done: boolean;
  doneDate: string | null;
};

type TrainingPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
};

type XtremeMemberDoc = {
  normalizedName: string;
  memberName: string;
  goal: string;
  favoriteTraining: string;
  phone?: string;
  email?: string;
  cedula?: string;
  emailVerified?: boolean;
  photoUrl?: string;
  workouts: WorkoutEntry[];
  membership?: Membership;
  bodyMetrics?: BodyMetric[];
  trainingPlan?: TrainingPlan;
  weeklyGoal?: number;
  earnedBadges?: EarnedBadge[];
  freezeHistory?: string[];
  xpBonus?: number;
  freezesBonus?: number;
  notificationPrefs?: Partial<NotificationPrefs>;
  pinnedBadges?: string[];
  buddies?: string[];
  referredBy?: string;
  referralCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/[^\d+]/g, "").slice(0, 24);
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 80);
}

function isoDate(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
}

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function computeStreak(workouts: WorkoutEntry[]) {
  return sharedComputeStreak(workouts);
}

function normalizePhoto(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!raw.startsWith("data:image/") || raw.length > MAX_PHOTO_CHARS) return "";
  return raw;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function defaultMembership() {
  const now = new Date();
  return {
    plan: "Xtreme Mensual",
    status: "active" as const,
    startedAt: now.toISOString().slice(0, 10),
    nextBillingDate: addMonths(now, 1).toISOString().slice(0, 10),
  };
}

function membershipWithStatus(membership?: Membership) {
  const current = membership ?? defaultMembership();
  const today = toUtcDate(new Date().toISOString().slice(0, 10));
  const nextBilling = toUtcDate(current.nextBillingDate);
  const daysRemaining = Math.ceil((nextBilling.getTime() - today.getTime()) / 86_400_000);
  const status: Membership["status"] =
    daysRemaining < 0 ? "expired" : daysRemaining <= 5 ? "warning" : "active";

  return {
    ...current,
    status,
    daysRemaining,
  };
}

function publicPlan(plan?: TrainingPlan) {
  if (!plan) return null;
  const items = plan.items ?? [];
  const doneItems = items.filter((item) => item.done).length;
  const totalItems = items.length;
  return {
    title: plan.title ?? "",
    objective: plan.objective ?? "",
    coachNote: plan.coachNote ?? "",
    startDate: plan.startDate ?? "",
    endDate: plan.endDate ?? "",
    weeklySessions: plan.weeklySessions ?? 0,
    items,
    doneItems,
    totalItems,
    progressPct: totalItems ? Math.round((doneItems / totalItems) * 100) : 0,
  };
}

function gamificationFor(doc: XtremeMemberDoc | null) {
  const workouts = doc?.workouts ?? [];
  const freezeHistory = doc?.freezeHistory ?? [];
  const weeklyGoal = doc?.weeklyGoal ?? WEEKLY_GOAL_DEFAULT;
  const xpBonus = Number(doc?.xpBonus) || 0;
  const freezesBonus = Number(doc?.freezesBonus) || 0;
  const planItems = doc?.trainingPlan?.items ?? [];
  const planItemsDone = planItems.filter((item) => item.done).length;
  const planProgressPct = planItems.length
    ? Math.round((planItemsDone / planItems.length) * 100)
    : 0;

  const view = buildMemberView({
    workouts,
    weeklyGoal,
    freezeHistory,
    metricsCount: doc?.bodyMetrics?.length ?? 0,
    planProgressPct,
  });
  const weekly = computeWeeklyStats(workouts, weeklyGoal);
  const earned = doc?.earnedBadges ?? [];
  const earnedIds = earned.map((badge) => badge.badgeId);
  const xp = computeXp({
    totalWorkouts: view.totalWorkouts,
    totalMinutes: view.totalMinutes,
    metricsCount: view.metricsCount,
    planItemsDone,
    totalWeeksMet: weekly.totalWeeksMet,
    earnedBadgeIds: earnedIds,
    xpBonus,
  });

  const badges = BADGES.filter((def) => !def.secret || earnedIds.includes(def.id)).map((def) => {
    const entry = earned.find((badge) => badge.badgeId === def.id);
    return {
      id: def.id,
      name: def.name,
      desc: def.desc,
      icon: def.icon,
      tier: def.tier,
      secret: Boolean(def.secret),
      earned: Boolean(entry),
      earnedAt: entry?.earnedAt ?? null,
      seen: entry?.seen ?? true,
      progress: def.progress ? def.progress(view) : null,
    };
  });

  const pinnedBadges = clampPinnedBadges(doc?.pinnedBadges).filter((id) => earnedIds.includes(id));

  return {
    streak: view.streak,
    weeklyGoal,
    weekCount: weekly.weekCount,
    weekMet: weekly.weekMet,
    weeksStreak: weekly.weeksStreak,
    totalWeeksMet: weekly.totalWeeksMet,
    freezesAvailable: freezesAvailable(view.totalWorkouts, freezeHistory, freezesBonus),
    freezesUsed: freezeHistory.length,
    freezeHistory,
    xp,
    level: levelForXp(xp),
    badges,
    earnedBadgeCount: earnedIds.length,
    unseenBadgeIds: earned.filter((badge) => !badge.seen).map((badge) => badge.badgeId),
    pinnedBadges,
  };
}

/**
 * Consume protectores de racha y otorga badges nuevos. Persiste solo si
 * hay cambios. Devuelve los ids recien ganados (para celebrar en cliente).
 */
async function syncGamification(normalizedName: string): Promise<string[]> {
  const db = await getDb();
  const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
  if (!doc) return [];

  const workouts = doc.workouts ?? [];
  const freezeHistory = doc.freezeHistory ?? [];
  const workoutDates = new Set(
    workouts.map((workout) => workout.completedDate).filter(Boolean),
  );
  const newFreezes = planFreezeUsage(
    workoutDates,
    freezeHistory,
    workouts.length,
    undefined,
    Number(doc.freezesBonus) || 0,
  );
  const allFreezes = [...freezeHistory, ...newFreezes];

  const planItems = doc.trainingPlan?.items ?? [];
  const planItemsDone = planItems.filter((item) => item.done).length;
  const view = buildMemberView({
    workouts,
    weeklyGoal: doc.weeklyGoal ?? WEEKLY_GOAL_DEFAULT,
    freezeHistory: allFreezes,
    metricsCount: doc.bodyMetrics?.length ?? 0,
    planProgressPct: planItems.length ? Math.round((planItemsDone / planItems.length) * 100) : 0,
  });
  const { all, newlyEarned } = reconcileBadges(evaluateBadges(view), doc.earnedBadges ?? []);

  if (newFreezes.length || newlyEarned.length) {
    await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
      { normalizedName },
      { $set: { freezeHistory: allFreezes, earnedBadges: all, updatedAt: new Date() } },
    );
  }
  return newlyEarned;
}

function publicMember(doc: XtremeMemberDoc | null, entitlements: unknown[] = []) {
  const workouts = doc?.workouts ?? [];
  const bodyMetrics = [...(doc?.bodyMetrics ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const totalMinutes = workouts.reduce((sum, workout) => sum + (workout.minutes || 0), 0);
  const favoriteTraining = doc?.favoriteTraining || workouts.at(-1)?.trainingName || "";
  const gamification = gamificationFor(doc);

  return {
    memberName: doc?.memberName ?? "",
    normalizedName: doc?.normalizedName ?? "",
    goal: doc?.goal ?? "",
    favoriteTraining,
    phone: doc?.phone ?? "",
    email: doc?.email ?? "",
    cedula: doc?.cedula ?? "",
    emailVerified: Boolean(doc?.emailVerified),
    photoUrl: doc?.photoUrl ?? "",
    accessCode: formatAccessCode(memberAccessCode(doc?.normalizedName ?? "")),
    workouts,
    streak: gamification.streak || computeStreak(workouts),
    totalWorkouts: workouts.length,
    totalMinutes,
    lastWorkoutDate: workouts.at(-1)?.completedDate ?? null,
    membership: membershipWithStatus(doc?.membership),
    bodyMetrics,
    latestBodyMetric: bodyMetrics.at(-1) ?? null,
    trainingPlan: publicPlan(doc?.trainingPlan),
    notificationPrefs: mergeNotificationPrefs(doc?.notificationPrefs),
    pinnedBadges: gamification.pinnedBadges,
    gamification,
    entitlements,
  };
}

async function leaderboard() {
  const db = await getDb();
  const docs = await db
    .collection<XtremeMemberDoc>(MEMBERS_COLLECTION)
    .find({}, { projection: { memberName: 1, normalizedName: 1, workouts: 1, favoriteTraining: 1, goal: 1, photoUrl: 1, weeklyGoal: 1, freezeHistory: 1, earnedBadges: 1 } })
    .toArray();

  return docs
    .map((doc) => publicMember(doc))
    .sort(
      (a, b) =>
        b.streak - a.streak ||
        b.totalWorkouts - a.totalWorkouts ||
        b.totalMinutes - a.totalMinutes ||
        a.memberName.localeCompare(b.memberName),
    )
    .slice(0, 12);
}

export async function GET(req: NextRequest) {
  const memberName = normalizeName(req.nextUrl.searchParams.get("memberName"));
  if (!memberName) {
    return NextResponse.json({ member: null, leaderboard: await leaderboard() });
  }

  try {
    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    // Consumir protectores / otorgar badges pendientes antes de responder.
    const newBadges = await syncGamification(normalizedName);
    const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
    const member = publicMember(doc);
    const gami = member.gamification;
    const today = new Date().toISOString().slice(0, 10);
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
          // surface coach note when plan exists and not fully done
          (doc.trainingPlan.items?.some((item) => !item.done) ?? true),
      ),
      nextBadgeName: nextBadge?.name ?? null,
      nextBadgeRemaining: nextBadge
        ? Math.max(0, nextBadge.progress.target - nextBadge.progress.current)
        : null,
      buddyInviteAvailable: (doc?.buddies?.length ?? 0) < 3 && member.totalWorkouts >= 3,
    });

    return NextResponse.json({
      member,
      exists: Boolean(doc),
      newBadges,
      leaderboard: await leaderboard(),
      nextBestAction,
    });
  } catch (err) {
    console.error("XTREME USER GET", err);
    return NextResponse.json({ error: "No se pudo cargar Xtreme Gym." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const memberName = normalizeName(body.memberName);
    const goal = String(body.goal ?? "").trim().slice(0, 80);
    const favoriteTraining = String(body.favoriteTraining ?? "").trim().slice(0, 80);
    const plan = String(body.plan ?? "Xtreme Mensual").trim().slice(0, 80);
    const nextBillingDate = isoDate(body.nextBillingDate);
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);
    const photo = normalizePhoto(body.photo);

    if (!memberName) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }

    const db = await getDb();
    const normalizedName = normalizeKey(memberName);
    const now = new Date();
    const existing = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });

    if (phone || email) {
      const duplicate = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({
        normalizedName: { $ne: normalizedName },
        $or: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error: `Ese contacto ya esta ligado a ${duplicate.memberName}. Use ese perfil o hable con recepcion.`,
            duplicate: {
              memberName: duplicate.memberName,
              phone: duplicate.phone ?? "",
              email: duplicate.email ?? "",
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

    // Solo tocar campos que el cliente mando, para no borrar datos existentes
    if (body.goal !== undefined) set.goal = goal;
    if (body.favoriteTraining !== undefined) set.favoriteTraining = favoriteTraining;
    if (phone) set.phone = phone;
    if (email) set.email = email;
    if (photo) set.photoUrl = photo;

    if (!existing) {
      set.membership = {
        plan,
        nextBillingDate,
        startedAt: new Date().toISOString().slice(0, 10),
        status: "active",
      };
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

    // Correo de bienvenida con el codigo de acceso al crear el perfil
    if (!existing && email) {
      await sendWelcomeEmail({
        to: email,
        memberName,
        accessCode: formatAccessCode(memberAccessCode(normalizedName)),
      });
    }

    const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
    if (!existing) {
      await recordEvent(db, {
        type: "profile_created",
        memberId: normalizedName,
        source: "member_app",
        entity: { type: "member", id: normalizedName },
        properties: { hasEmail: Boolean(email), hasPhone: Boolean(phone), plan },
      });
    }
    return NextResponse.json({ member: publicMember(doc), leaderboard: await leaderboard() });
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
    const completedDate = isoDate(body.completedDate);

    if (action === "weeklyGoal") {
      const weeklyGoal = Math.max(
        WEEKLY_GOAL_MIN,
        Math.min(WEEKLY_GOAL_MAX, Number(body.weeklyGoal) || WEEKLY_GOAL_DEFAULT),
      );
      if (!memberName) {
        return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
      }
      const db = await getDb();
      const normalizedName = sessionOrErr.memberKey;
      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        { $set: { weeklyGoal, updatedAt: new Date() } },
      );
      const newBadges = await syncGamification(normalizedName);
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: publicMember(doc), newBadges, leaderboard: await leaderboard() });
    }

    if (action === "badgesSeen") {
      const db = await getDb();
      const normalizedName = sessionOrErr.memberKey;
      await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        { $set: { "earnedBadges.$[].seen": true, updatedAt: new Date() } },
      );
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: publicMember(doc) });
    }

    // Perfil self-service (Fase 3): prefs, showcase, meta/contacto
    if (action === "profile") {
      const db = await getDb();
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
        const phone = normalizePhone(body.phone);
        if (phone) set.phone = phone;
      }
      if (body.email !== undefined) {
        const email = normalizeEmail(body.email);
        if (email) set.email = email;
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
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: publicMember(doc), leaderboard: await leaderboard() });
    }

    if (action === "planItem") {
      const itemId = String(body.itemId ?? "").trim();
      if (!itemId) {
        return NextResponse.json({ error: "Falta la sesion del plan." }, { status: 400 });
      }

      const db = await getDb();
      const normalizedName = sessionOrErr.memberKey;
      const done = Boolean(body.done);
      const result = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        {
          $set: {
            "trainingPlan.items.$[el].done": done,
            "trainingPlan.items.$[el].doneDate": done ? completedDate : null,
            updatedAt: new Date(),
          },
        },
        { arrayFilters: [{ "el.id": itemId }] },
      );

      if (!result.matchedCount) {
        return NextResponse.json({ error: "No se encontro la sesion." }, { status: 404 });
      }

      const newBadges = await syncGamification(normalizedName);
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: publicMember(doc), newBadges, leaderboard: await leaderboard() });
    }

    if (action === "bodyMetric") {
      const weightKg = Math.max(1, Math.min(400, Number(body.weightKg) || 0));
      const waistCm = Math.max(1, Math.min(300, Number(body.waistCm) || 0));
      const note = String(body.note ?? "").trim().slice(0, 120);

      if (!weightKg || !waistCm) {
        return NextResponse.json({ error: "Faltan medidas." }, { status: 400 });
      }

      const db = await getDb();
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
            membership: defaultMembership(),
            createdAt: now,
          },
          $push: { bodyMetrics: metric },
        },
        { upsert: true },
      );

      const newBadges = await syncGamification(normalizedName);
      await recordEvent(db, {
        type: "body_metric_logged",
        memberId: normalizedName,
        source: "member_app",
        entity: { type: "body_metric", id: metric.id },
        properties: { date: completedDate },
      });
      const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ member: publicMember(doc), newBadges, leaderboard: await leaderboard() });
    }

    if (!trainingId || !trainingName) {
      return NextResponse.json({ error: "Faltan datos del entreno." }, { status: 400 });
    }

    const db = await getDb();
    const normalizedName = sessionOrErr.memberKey;
    const now = new Date();
    const entry: WorkoutEntry = {
      id: `${trainingId}-${completedDate}-${now.getTime()}`,
      trainingId,
      trainingName,
      intensity,
      minutes,
      completedDate,
      completedAt: now,
    };

    await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).updateOne(
      { normalizedName },
      {
        $set: {
          normalizedName,
          memberName,
          favoriteTraining: trainingName,
          updatedAt: now,
        },
        $setOnInsert: {
          goal: "",
          membership: defaultMembership(),
          bodyMetrics: [],
          createdAt: now,
        },
        $push: { workouts: entry },
      },
      { upsert: true },
    );

    const newBadges = await syncGamification(normalizedName);
    await recordEvent(db, {
      type: "workout_logged",
      memberId: normalizedName,
      source: "member_app",
      entity: { type: "workout", id: entry.id },
      properties: { trainingId, trainingName, minutes, intensity, completedDate },
    });
    const doc = await db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
    return NextResponse.json({ member: publicMember(doc), newBadges, leaderboard: await leaderboard() });
  } catch (err) {
    console.error("XTREME USER PATCH", err);
    return NextResponse.json({ error: "No se pudo registrar el entreno." }, { status: 500 });
  }
}
