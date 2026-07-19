import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  BUDDY_REQUESTS_COLLECTION,
  MEMBERS_COLLECTION,
  REFERRALS_COLLECTION,
  normalizeKey,
  normalizeName,
  type MemberDoc,
} from "@/lib/xtreme/shared";
import { BUDDIES_MAX, REFERRAL_REDEEM_WINDOW_DAYS, REFERRAL_REWARD_DAYS, computeMonthlyXp, firstNameOf, leagueForMonthlyXp, monthKeyOf } from "@/lib/xtreme/social";
import { recordEvent } from "@/lib/xtreme/events";
import {
  ensureReferralIndexes,
  referralCodeFor,
  type ReferralDoc,
} from "@/lib/xtreme/referrals";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

type BuddyRequest = { from: string; to: string; status: "pending" | "accepted"; createdAt: Date; updatedAt: Date };

function referralCode(memberKey: string) {
  return referralCodeFor(memberKey);
}

async function socialSnapshot(memberKey: string) {
  const db = await getDb();
  const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName: memberKey });
  if (!member) return null;
  const month = monthKeyOf();
  const optedIn = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({ leaderboardOptIn: true }).toArray();
  const leaderboard = optedIn
    .map((entry) => {
      const monthlyXp = computeMonthlyXp({
        workouts: entry.workouts ?? [],
        metricDates: (entry.bodyMetrics ?? []).map((metric) => metric.date),
        weeklyGoal: entry.weeklyGoal ?? 4,
        monthKey: month,
      });
      return { firstName: firstNameOf(entry.memberName || "Socio"), memberKey: entry.normalizedName, monthlyXp, league: leagueForMonthlyXp(monthlyXp) };
    })
    .sort((a, b) => b.monthlyXp - a.monthlyXp || a.firstName.localeCompare(b.firstName))
    .slice(0, 50)
    .map((entry, index) => ({ ...entry, rank: index + 1, memberKey: entry.memberKey === memberKey ? memberKey : undefined }));

  const buddyKeys = member.buddies ?? [];
  const buddies = buddyKeys.length
    ? await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({ normalizedName: { $in: buddyKeys } }).toArray()
    : [];
  const pending = await db.collection<BuddyRequest>(BUDDY_REQUESTS_COLLECTION).find({ to: memberKey, status: "pending" }).toArray();
  const pendingNames = pending.length
    ? await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({ normalizedName: { $in: pending.map((item) => item.from) } }, { projection: { normalizedName: 1, memberName: 1 } }).toArray()
    : [];

  return {
    month,
    leaderboardOptIn: Boolean(member.leaderboardOptIn),
    leaderboard,
    league: leagueForMonthlyXp(computeMonthlyXp({ workouts: member.workouts ?? [], metricDates: (member.bodyMetrics ?? []).map((m) => m.date), weeklyGoal: member.weeklyGoal ?? 4, monthKey: month })),
    referralCode: referralCode(memberKey),
    referralCount: member.referralCount ?? 0,
    buddies: buddies.map((buddy) => ({
      memberKey: buddy.normalizedName,
      firstName: firstNameOf(buddy.memberName || "Socio"),
      lastWorkoutDate: (buddy.workouts ?? []).map((workout) => workout.completedDate ?? "").sort().at(-1) || null,
    })),
    pendingRequests: pendingNames.map((requester) => ({ memberKey: requester.normalizedName, firstName: firstNameOf(requester.memberName || "Socio") })),
  };
}

export async function GET(req: NextRequest) {
  // Phase 3: personal social graph requires session (not memberName alone)
  const sessionOrErr = await requireMemberSession(req);
  if (!isSession(sessionOrErr)) return sessionOrErr;
  const memberKey = sessionOrErr.memberKey;
  const snapshot = await socialSnapshot(memberKey);
  return snapshot ? NextResponse.json(snapshot) : NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // Strategy 2.0: session identity only
  const sessionOrErr = await requireMemberSession(req);
  if (!isSession(sessionOrErr)) return sessionOrErr;
  const memberKey = sessionOrErr.memberKey;
  const action = String(body.action ?? "");
  const db = await getDb();
  const members = db.collection<MemberDoc>(MEMBERS_COLLECTION);
  const member = await members.findOne({ normalizedName: memberKey });
  if (!member) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });

  await db.collection<BuddyRequest>(BUDDY_REQUESTS_COLLECTION).createIndex({ from: 1, to: 1 }, { unique: true });
  await ensureReferralIndexes(db);

  if (action === "leaderboard") {
    await members.updateOne({ normalizedName: memberKey }, { $set: { leaderboardOptIn: Boolean(body.enabled), updatedAt: new Date() } });
  } else if (action === "buddy-request") {
    const target = normalizeKey(normalizeName(body.target));
    if (!target || target === memberKey) return NextResponse.json({ error: "Compa inválido." }, { status: 400 });
    const targetMember = await members.findOne({ normalizedName: target });
    if (!targetMember) return NextResponse.json({ error: "No encontramos ese socio." }, { status: 404 });
    if ((member.buddies ?? []).length >= BUDDIES_MAX) return NextResponse.json({ error: "Alcanzaste el máximo de compas." }, { status: 400 });
    await db.collection<BuddyRequest>(BUDDY_REQUESTS_COLLECTION).updateOne(
      { from: memberKey, to: target },
      { $set: { status: "pending", updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
  } else if (action === "buddy-accept") {
    const from = normalizeKey(normalizeName(body.target));
    const request = await db.collection<BuddyRequest>(BUDDY_REQUESTS_COLLECTION).findOne({ from, to: memberKey, status: "pending" });
    if (!request) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    await Promise.all([
      members.updateOne({ normalizedName: memberKey }, { $addToSet: { buddies: from }, $set: { updatedAt: new Date() } }),
      members.updateOne({ normalizedName: from }, { $addToSet: { buddies: memberKey }, $set: { updatedAt: new Date() } }),
      db.collection<BuddyRequest>(BUDDY_REQUESTS_COLLECTION).updateOne({ from, to: memberKey }, { $set: { status: "accepted", updatedAt: new Date() } }),
    ]);
  } else if (action === "buddy-remove") {
    const target = normalizeKey(normalizeName(body.target));
    await Promise.all([
      members.updateOne({ normalizedName: memberKey }, { $pull: { buddies: target } }),
      members.updateOne({ normalizedName: target }, { $pull: { buddies: memberKey } }),
    ]);
  } else if (action === "referral-redeem") {
    // Phase 3: redeem only records pending referral - reward after first paid check-in
    const code = String(body.code ?? "").trim().toUpperCase();
    const accountAgeDays = member.createdAt
      ? Math.floor((Date.now() - new Date(member.createdAt).getTime()) / 86_400_000)
      : Number.POSITIVE_INFINITY;
    if (accountAgeDays > REFERRAL_REDEEM_WINDOW_DAYS) {
      return NextResponse.json({ error: "El código se puede usar durante los primeros 30 días." }, { status: 400 });
    }
    if (member.referredBy) {
      return NextResponse.json({ error: "Este socio ya usó un referido." }, { status: 409 });
    }
    const candidates = await members
      .find({}, { projection: { normalizedName: 1, memberName: 1 } })
      .toArray();
    const owner = candidates.find((candidate) => referralCode(candidate.normalizedName || "") === code);
    if (!owner) return NextResponse.json({ error: "Código de referido inválido." }, { status: 404 });
    if (owner.normalizedName === memberKey) {
      return NextResponse.json({ error: "No podés usar tu propio código." }, { status: 400 });
    }
    try {
      await db.collection<ReferralDoc>(REFERRALS_COLLECTION).insertOne({
        code,
        referrer: owner.normalizedName!,
        referred: memberKey,
        rewardDays: REFERRAL_REWARD_DAYS,
        status: "pending",
        createdAt: new Date(),
        qualifiedAt: null,
        rewardedAt: null,
        checkinId: null,
        paymentId: null,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return NextResponse.json({ error: "Este socio ya usó un referido." }, { status: 409 });
      }
      throw error;
    }
    await members.updateOne(
      { normalizedName: memberKey },
      { $set: { referredBy: owner.normalizedName, updatedAt: new Date() } },
    );
  } else {
    return NextResponse.json({ error: "Acción social inválida." }, { status: 400 });
  }

  const eventTypes: Record<string, string> = {
    leaderboard: Boolean(body.enabled) ? "leaderboard_joined" : "leaderboard_left",
    "buddy-request": "buddy_requested",
    "buddy-accept": "buddy_connected",
    "buddy-remove": "buddy_removed",
    "referral-redeem": "referral_redeemed",
  };
  await recordEvent(db, {
    type: eventTypes[action] || "social_updated",
    memberId: memberKey,
    source: "member_app",
    properties: {
      target: String(body.target ?? ""),
      codeUsed: action === "referral-redeem",
      pendingReward: action === "referral-redeem",
    },
  });

  const snapshot = await socialSnapshot(memberKey);
  return NextResponse.json({
    ...snapshot,
    ...(action === "referral-redeem"
      ? {
          referralPending: true,
          message:
            "Código guardado. Ambos ganan 7 días cuando hagas tu primer ingreso con plan o pase pagado.",
        }
      : {}),
  });
}
