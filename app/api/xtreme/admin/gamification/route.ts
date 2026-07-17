import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { listAudit, writeAudit } from "@/lib/xtreme/audit";
import { BADGES, BADGE_MAP, type BadgeTier, type EarnedBadge } from "@/lib/xtreme/gamification";
import {
  BADGES_COLLECTION,
  MEMBERS_COLLECTION,
  type AdminRole,
  type BadgeDoc,
  type MemberDoc,
  normalizeKey,
  normalizeName,
  todayIso,
  toAdminMember,
} from "@/lib/xtreme/shared";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

async function roleFromReq(req: NextRequest): Promise<AdminRole | null> {
  const session = await resolveStaffSession(req, "admin");
  return session?.role === "admin" || session?.role === "super" ? session.role : null;
}

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function loadBadgeOverrides(db: Awaited<ReturnType<typeof getDb>>) {
  return db.collection<BadgeDoc>(BADGES_COLLECTION).find({}).toArray();
}

function mergeCatalog(overrides: BadgeDoc[]) {
  const byId = new Map(overrides.map((b) => [b.id, b]));
  const catalog = BADGES.map((def) => {
    const ov = byId.get(def.id);
    return {
      id: def.id,
      name: ov?.name ?? def.name,
      description: ov?.description ?? def.desc,
      icon: ov?.icon ?? def.icon,
      tier: (ov?.tier ?? def.tier) as BadgeTier,
      source: "catalog" as const,
      active: ov?.active ?? true,
      secret: ov?.secret ?? Boolean(def.secret),
      editable: true,
    };
  });
  const manual = overrides
    .filter((b) => b.source === "manual")
    .map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      tier: b.tier,
      source: "manual" as const,
      active: b.active,
      secret: Boolean(b.secret),
      editable: true,
    }));
  return [...catalog, ...manual];
}

export async function GET(req: NextRequest) {
  const role = await roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const db = await getDb();
    const [overrides, members, audit] = await Promise.all([
      loadBadgeOverrides(db),
      db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).toArray(),
      listAudit(db, 30),
    ]);

    const badges = mergeCatalog(overrides);
    const adminMembers = members.map(toAdminMember);

    const earnCounts: Record<string, number> = {};
    for (const m of adminMembers) {
      for (const b of m.earnedBadges ?? []) {
        earnCounts[b.badgeId] = (earnCounts[b.badgeId] ?? 0) + 1;
      }
    }

    const streakBuckets = {
      zero: 0,
      "1-6": 0,
      "7-13": 0,
      "14-29": 0,
      "30+": 0,
    };
    let weeklyActive = 0;
    const weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    const weekAgoIso = weekAgo.toISOString().slice(0, 10);

    for (const m of adminMembers) {
      if (m.streak <= 0) streakBuckets.zero += 1;
      else if (m.streak < 7) streakBuckets["1-6"] += 1;
      else if (m.streak < 14) streakBuckets["7-13"] += 1;
      else if (m.streak < 30) streakBuckets["14-29"] += 1;
      else streakBuckets["30+"] += 1;
      if (m.lastWorkoutDate && m.lastWorkoutDate >= weekAgoIso) weeklyActive += 1;
    }

    const badgeEarnCounts = badges
      .map((b) => ({
        badgeId: b.id,
        name: b.name,
        tier: b.tier,
        count: earnCounts[b.id] ?? 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      role,
      badges,
      analytics: {
        memberCount: adminMembers.length,
        weeklyActiveMembers: weeklyActive,
        avgStreak:
          adminMembers.length
            ? Math.round(
                (adminMembers.reduce((s, m) => s + m.streak, 0) / adminMembers.length) * 10,
              ) / 10
            : 0,
        totalBadgesEarned: Object.values(earnCounts).reduce((s, n) => s + n, 0),
        streakDistribution: streakBuckets,
        badgeEarnCounts,
      },
      members: adminMembers.map((m) => ({
        memberName: m.memberName,
        normalizedName: m.normalizedName,
        streak: m.streak,
        weeksStreak: m.weeksStreak,
        weeklyGoal: m.weeklyGoal,
        freezesBanked: m.freezesBanked,
        freezesBonus: m.freezesBonus,
        xp: m.xp,
        xpBonus: m.xpBonus,
        levelName: m.levelName,
        levelIndex: m.levelIndex,
        earnedBadgeCount: m.earnedBadgeCount,
        earnedBadges: m.earnedBadges,
        totalWorkouts: m.totalWorkouts,
        lastWorkoutDate: m.lastWorkoutDate,
      })),
      audit,
    });
  } catch (err) {
    console.error("XTREME ADMIN GAMIFICATION GET", err);
    return NextResponse.json({ error: "No se pudo cargar gamificacion." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const role = await roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const db = await getDb();

    // --- Toggle / editar badge de catalogo o manual ---
    if (action === "upsertBadge") {
      const idRaw = String(body.id ?? "").trim();
      const name = String(body.name ?? "").trim().slice(0, 60);
      const description = String(body.description ?? body.desc ?? "").trim().slice(0, 160);
      const icon = String(body.icon ?? "Medal").trim().slice(0, 40) || "Medal";
      const tierRaw = String(body.tier ?? "bronze");
      const tier = (["bronze", "silver", "gold", "platinum"].includes(tierRaw)
        ? tierRaw
        : "bronze") as BadgeTier;
      const active = body.active === undefined ? true : Boolean(body.active);
      const secret = Boolean(body.secret);
      const isCatalog = Boolean(idRaw && BADGE_MAP.has(idRaw));

      let id = idRaw;
      if (!isCatalog) {
        id = idRaw || `manual-${slugify(name) || Date.now()}`;
        if (BADGE_MAP.has(id)) {
          return NextResponse.json(
            { error: "Ese id pertenece al catálogo. Elegí otro." },
            { status: 400 },
          );
        }
        if (!name) {
          return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
        }
      } else {
        id = idRaw;
      }

      const now = new Date();
      const catalogDef = BADGE_MAP.get(id);
      const doc: BadgeDoc = {
        id,
        name: name || catalogDef?.name || id,
        description: description || catalogDef?.desc || "",
        icon: icon || catalogDef?.icon || "Medal",
        tier: tier || catalogDef?.tier || "bronze",
        source: isCatalog ? "catalog" : "manual",
        active,
        secret: isCatalog ? Boolean(catalogDef?.secret) : secret,
        updatedAt: now,
        createdBy: role,
      };

      await db.collection<BadgeDoc>(BADGES_COLLECTION).updateOne(
        { id },
        {
          $set: doc,
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      await writeAudit(db, {
        actorRole: role,
        action: isCatalog ? "badge.upsert_catalog" : "badge.upsert_manual",
        targetType: "badge",
        targetId: id,
        summary: `${active ? "Activo" : "Inactivo"}: ${doc.name}`,
        meta: { tier: doc.tier, source: doc.source },
      });

      return NextResponse.json({ ok: true, badge: doc });
    }

    if (action === "toggleBadge") {
      const id = String(body.id ?? "").trim();
      if (!id) return NextResponse.json({ error: "Badge id requerido." }, { status: 400 });

      const existing = await db.collection<BadgeDoc>(BADGES_COLLECTION).findOne({ id });
      const nextActive = body.active !== undefined ? Boolean(body.active) : !(existing?.active ?? true);
      const catalogDef = BADGE_MAP.get(id);
      const now = new Date();

      const doc: BadgeDoc = {
        id,
        name: existing?.name || catalogDef?.name || id,
        description: existing?.description || catalogDef?.desc || "",
        icon: existing?.icon || catalogDef?.icon || "Medal",
        tier: existing?.tier || catalogDef?.tier || "bronze",
        source: existing?.source || (catalogDef ? "catalog" : "manual"),
        active: nextActive,
        secret: existing?.secret ?? Boolean(catalogDef?.secret),
        updatedAt: now,
        createdBy: role,
      };

      await db.collection<BadgeDoc>(BADGES_COLLECTION).updateOne(
        { id },
        { $set: doc, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );

      await writeAudit(db, {
        actorRole: role,
        action: "badge.toggle",
        targetType: "badge",
        targetId: id,
        summary: `${nextActive ? "Activo" : "Desactivado"}: ${doc.name}`,
      });

      return NextResponse.json({ ok: true, badge: doc });
    }

    if (action === "deleteBadge") {
      const id = String(body.id ?? "").trim();
      if (!id) return NextResponse.json({ error: "Badge id requerido." }, { status: 400 });
      if (BADGE_MAP.has(id)) {
        return NextResponse.json(
          { error: "No se puede borrar un badge del catálogo. Desactivalo." },
          { status: 400 },
        );
      }
      await db.collection(BADGES_COLLECTION).deleteOne({ id });
      await writeAudit(db, {
        actorRole: role,
        action: "badge.delete",
        targetType: "badge",
        targetId: id,
        summary: `Badge manual eliminado: ${id}`,
      });
      return NextResponse.json({ ok: true });
    }

    // --- Grant / revoke badge a un socio ---
    if (action === "grantBadge" || action === "revokeBadge") {
      const memberName = normalizeName(body.memberName);
      const badgeId = String(body.badgeId ?? "").trim();
      if (!memberName || !badgeId) {
        return NextResponse.json({ error: "Socio y badge requeridos." }, { status: 400 });
      }

      const normalizedName = normalizeKey(memberName);
      const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member) {
        return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
      }

      const overrides = await loadBadgeOverrides(db);
      const manual = overrides.find((b) => b.id === badgeId);
      if (!BADGE_MAP.has(badgeId) && !manual) {
        return NextResponse.json({ error: "Badge desconocido." }, { status: 404 });
      }

      const earned = [...(member.earnedBadges ?? [])];
      const has = earned.some((b) => b.badgeId === badgeId);

      if (action === "grantBadge") {
        if (!has) {
          const entry: EarnedBadge = {
            badgeId,
            earnedAt: todayIso(),
            seen: false,
          };
          earned.push(entry);
          await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
            { normalizedName },
            { $set: { earnedBadges: earned, updatedAt: new Date() } },
          );
        }
        await writeAudit(db, {
          actorRole: role,
          action: "member.grant_badge",
          targetType: "member",
          targetId: normalizedName,
          summary: `Badge otorgado: ${badgeId} → ${member.memberName || memberName}`,
          meta: { badgeId },
        });
        return NextResponse.json({ ok: true, earnedBadges: earned });
      }

      // revoke
      const next = earned.filter((b) => b.badgeId !== badgeId);
      await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
        { normalizedName },
        { $set: { earnedBadges: next, updatedAt: new Date() } },
      );
      await writeAudit(db, {
        actorRole: role,
        action: "member.revoke_badge",
        targetType: "member",
        targetId: normalizedName,
        summary: `Badge revocado: ${badgeId} ← ${member.memberName || memberName}`,
        meta: { badgeId },
      });
      return NextResponse.json({ ok: true, earnedBadges: next });
    }

    // --- Ajuste manual XP / freezes ---
    if (action === "adjustMember") {
      const memberName = normalizeName(body.memberName);
      if (!memberName) {
        return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
      }
      const normalizedName = normalizeKey(memberName);
      const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      if (!member) {
        return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
      }

      const set: Partial<MemberDoc> = { updatedAt: new Date() };
      if (body.xpBonus !== undefined) {
        set.xpBonus = Math.max(-50000, Math.min(50000, Math.round(Number(body.xpBonus) || 0)));
      }
      if (body.freezesBonus !== undefined) {
        set.freezesBonus = Math.max(0, Math.min(10, Math.round(Number(body.freezesBonus) || 0)));
      }
      if (body.weeklyGoal !== undefined) {
        set.weeklyGoal = Math.max(2, Math.min(7, Math.round(Number(body.weeklyGoal) || 4)));
      }

      await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne({ normalizedName }, { $set: set });

      await writeAudit(db, {
        actorRole: role,
        action: "member.adjust_gamification",
        targetType: "member",
        targetId: normalizedName,
        summary: `Ajuste gamificacion: ${member.memberName || memberName}`,
        meta: {
          xpBonus: set.xpBonus,
          freezesBonus: set.freezesBonus,
          weeklyGoal: set.weeklyGoal,
        },
      });

      const updated = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
      return NextResponse.json({ ok: true, member: updated ? toAdminMember(updated) : null });
    }

    return NextResponse.json({ error: "Accion invalida." }, { status: 400 });
  } catch (err) {
    console.error("XTREME ADMIN GAMIFICATION POST", err);
    return NextResponse.json({ error: "No se pudo procesar." }, { status: 500 });
  }
}
